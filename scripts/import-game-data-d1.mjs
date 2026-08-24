import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'data');
const databaseName = 'japanese-pses-production';
const target = process.argv.includes('--local') ? '--local' : '--remote';
const now = Date.now();
const sourceNames = (await readdir(dataDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => entry.name)
  .sort();

if (!sourceNames.includes('subjects_curriculum.json')) throw new Error('subjects_curriculum.json が見つかりません。');

const documents = [];
for (const name of sourceNames) {
  const filePath = path.join(dataDirectory, name);
  const body = await readFile(filePath, 'utf8');
  documents.push({
    name,
    body,
    data: JSON.parse(body),
    bytes: (await stat(filePath)).size,
    sha256: createHash('sha256').update(body).digest('hex')
  });
}

const manifest = {
  schemaVersion: 2,
  storage: 'cloudflare-d1',
  generatedAt: new Date(now).toISOString(),
  files: documents.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))
};
const manifestBody = JSON.stringify(manifest);
documents.push({
  name: 'manifest.json',
  body: manifestBody,
  data: manifest,
  bytes: Buffer.byteLength(manifestBody),
  sha256: createHash('sha256').update(manifestBody).digest('hex')
});

const statements = ['PRAGMA foreign_keys = ON;'];
for (const document of documents) {
  const chunks = splitIntoChunks(document.body, 20_000);
  statements.push(`INSERT INTO content_documents
    (document_key, content_json, etag, content_type, byte_size, schema_version, updated_at, chunk_count)
    VALUES (${sql(document.name)}, '{}', ${sql(`"${document.sha256}"`)}, 'application/json; charset=utf-8', ${document.bytes}, 2, ${now}, ${chunks.length})
    ON CONFLICT(document_key) DO UPDATE SET content_json=excluded.content_json, etag=excluded.etag,
      content_type=excluded.content_type, byte_size=excluded.byte_size,
      schema_version=excluded.schema_version, updated_at=excluded.updated_at, chunk_count=excluded.chunk_count;`);
  statements.push(`DELETE FROM content_document_chunks WHERE document_key=${sql(document.name)};`);
  for (const [chunkIndex, chunk] of chunks.entries()) {
    statements.push(`INSERT INTO content_document_chunks (document_key, chunk_index, content_chunk)
      VALUES (${sql(document.name)}, ${chunkIndex}, ${sql(chunk)});`);
  }
  statements.push(`DELETE FROM content_items WHERE source_document=${sql(document.name)};`);
  for (const item of extractItems(document.name, document.data)) {
    statements.push(`INSERT INTO content_items
      (source_document, item_type, external_key, subject_id, grade, sort_order, payload_json, updated_at)
      VALUES (${sql(document.name)}, ${sql(item.type)}, ${sql(item.key)}, ${nullableSql(item.subjectId)},
        ${nullableNumber(item.grade)}, ${item.order}, ${sql(JSON.stringify(item.payload))}, ${now});`);
  }
}

const curriculum = documents.find(item => item.name === 'subjects_curriculum.json').data;
statements.push('DELETE FROM curriculum_edges;', 'DELETE FROM curriculum_nodes;', 'DELETE FROM subjects;', 'DELETE FROM grades;');
for (const grade of asArray(curriculum.grades)) {
  statements.push(`INSERT INTO grades (grade, name, alias, payload_json, updated_at) VALUES
    (${Number(grade.id)}, ${sql(grade.name)}, ${nullableSql(grade.alias)}, ${sql(JSON.stringify(grade))}, ${now});`);
}
for (const subject of asArray(curriculum.subjects)) {
  const subjectId = subject.id || subject.subjectId;
  statements.push(`INSERT INTO subjects (subject_id, name, description, payload_json, updated_at) VALUES
    (${sql(subjectId)}, ${sql(subject.name)}, ${nullableSql(subject.description || subject.desc)}, ${sql(JSON.stringify(subject))}, ${now});`);
}
for (const node of curriculum.nodes || []) {
  statements.push(`INSERT INTO curriculum_nodes
    (node_id, subject_id, grade, name, description, game_type, bloom_depth, mext_reference, payload_json, updated_at)
    VALUES (${sql(node.id)}, ${sql(node.subjectId)}, ${Number(node.grade)}, ${sql(node.name)},
      ${nullableSql(node.desc)}, ${sql(node.gameType)}, ${Number(node.bloomDepth || 1)},
      ${nullableSql(node.mextRef)}, ${sql(JSON.stringify(node))}, ${now});`);
}
for (const node of curriculum.nodes || []) {
  for (const prerequisite of node.prerequisites || []) {
    statements.push(`INSERT INTO curriculum_edges (node_id, prerequisite_node_id) VALUES (${sql(node.id)}, ${sql(prerequisite)});`);
  }
}
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'japanese-pses-d1-'));
try {
  const sqlPath = path.join(temporaryDirectory, 'seed-game-data.sql');
  await writeFile(sqlPath, `${statements.join('\n')}\n`, 'utf8');
  const wranglerCli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const result = spawnSync(process.execPath, [wranglerCli, 'd1', 'execute', databaseName, target, '--file', sqlPath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error('D1教材インポートに失敗しました。');
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`D1教材移行完了: ${documents.length} documents / ${statements.length} statements -> ${databaseName} (${target})`);

function extractItems(name, data) {
  const items = [];
  const push = (type, key, payload, order, subjectId = null, grade = null) => items.push({ type, key: String(key), payload, order, subjectId, grade });
  for (const [index, node] of (data.nodes || []).entries()) {
    push('curriculum_node', node.id || `node-${index}`, node, index, node.subjectId || data.subjectId || null, node.grade || null);
  }
  if (name === 'kanji_1026.json') {
    for (const [gradeKey, gradeData] of Object.entries(data.grades || {})) {
      for (const [index, kanji] of (gradeData.kanjiList || []).entries()) push('kanji', `${gradeKey}:${kanji.kanji || index}`, kanji, index, 'kokugo', Number(gradeKey));
    }
  }
  for (const [index, prefecture] of (data.prefectures || []).entries()) push('prefecture', prefecture.id || prefecture.code || index, prefecture, index, 'shakai', prefecture.gradeLevel || 4);
  for (const [index, grade] of (Array.isArray(data.grades) ? data.grades : []).entries()) push('grade_metadata', grade.id || index, grade, index, null, grade.id || null);
  for (const [index, subject] of asArray(data.subjects).entries()) push('subject_metadata', subject.id || subject.subjectId || index, subject, index, subject.id || subject.subjectId || null, null);
  return items;
}

function asArray(value) { return Array.isArray(value) ? value : Object.values(value || {}); }
function splitIntoChunks(value, size) {
  const characters = Array.from(value);
  const chunks = [];
  for (let index = 0; index < characters.length; index += size) chunks.push(characters.slice(index, index + size).join(''));
  return chunks.length ? chunks : [''];
}
function sql(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function nullableSql(value) { return value == null || value === '' ? 'NULL' : sql(value); }
function nullableNumber(value) { return Number.isFinite(Number(value)) ? String(Number(value)) : 'NULL'; }
