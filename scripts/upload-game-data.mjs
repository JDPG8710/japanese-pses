import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'data');
const bucket = 'japanese-pses-game-data';
const files = (await readdir(dataDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => entry.name)
  .sort();

if (!files.includes('subjects_curriculum.json')) throw new Error('subjects_curriculum.json が見つかりません。');

const manifestEntries = [];
for (const name of files) {
  const file = path.join(dataDirectory, name);
  const body = await readFile(file);
  JSON.parse(body.toString('utf8'));
  manifestEntries.push({
    name,
    bytes: (await stat(file)).size,
    sha256: createHash('sha256').update(body).digest('hex')
  });
  upload(`${bucket}/game-data/${name}`, file);
}

// 旧クライアントとの互換性を維持する別名です。
upload(`${bucket}/star_graph.json`, path.join(dataDirectory, 'subjects_curriculum.json'));

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'japanese-pses-data-'));
try {
  const manifestPath = path.join(temporaryDirectory, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    files: manifestEntries
  }, null, 2), 'utf8');
  upload(`${bucket}/game-data/manifest.json`, manifestPath);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`R2教材移行完了: ${manifestEntries.length}ファイル -> ${bucket}/game-data/`);

function upload(objectName, file) {
  const wranglerCli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const result = spawnSync(process.execPath, [wranglerCli,
    'r2', 'object', 'put', objectName,
    '--file', file,
    '--content-type', 'application/json; charset=utf-8',
    '--remote'
  ], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`R2アップロードに失敗しました: ${objectName}`);
}
