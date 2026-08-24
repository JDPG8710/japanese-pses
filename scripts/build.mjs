import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'dist');

if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error(`安全でないビルド出力先です: ${output}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const rootFiles = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isFile() && (entry.name === 'index.html' || entry.name.endsWith('.js')))
  .map(entry => entry.name);

for (const name of rootFiles) {
  await cp(path.join(root, name), path.join(output, name));
}

for (const directory of ['css', 'js', 'src']) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

const releaseHash = createHash('sha256');
const releaseFiles = (await collectFiles(output)).sort();
for (const file of releaseFiles) {
  releaseHash.update(path.relative(output, file).replaceAll('\\', '/'));
  releaseHash.update(await readFile(file));
}
const releaseId = releaseHash.digest('hex').slice(0, 12);
const versionedFiles = releaseFiles.filter(file => ['.html', '.js'].includes(path.extname(file)));
for (const file of versionedFiles) {
  const source = await readFile(file, 'utf8');
  await writeFile(file, source.replace(/\?v=[A-Za-z0-9._-]+/g, `?v=${releaseId}`), 'utf8');
}

const files = await collectFiles(output);
const totalBytes = (await Promise.all(files.map(file => stat(file)))).reduce((sum, info) => sum + info.size, 0);
console.log(`ビルド完了: ${files.length}ファイル / ${totalBytes}バイト -> ${output}`);
console.log('教材JSONは静的成果物に含めず、Cloudflare D1から配信します。');

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  }));
  return nested.flat();
}
