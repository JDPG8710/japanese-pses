import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLearningContent } from './build-learning-content.mjs';
import { versionDist } from './asset-versioning.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'dist');

if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error(`安全でないビルド出力先です: ${output}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const publicRootFiles = new Set([
  'index.html', 'amc8.html', 'arena.html', 'updates.html', 'town.html', 'world.html', 'grades.html', 'learn.html', 'privacy.html', 'terms.html', 'robots.txt', 'sitemap.xml', 'ads.txt', 'favicon.svg', 'site.webmanifest',
  '404.html', 'about.html', '_routes.json', '_headers'
]);
const rootFiles = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isFile() && (publicRootFiles.has(entry.name) || entry.name.endsWith('.js')))
  .map(entry => entry.name);

for (const name of rootFiles) {
  await cp(path.join(root, name), path.join(output, name));
}

// Pages Function も配信ディレクトリに含める。これにより /api/* は
// 同一オリジンの Service Binding 経由で japanese-pses Worker へ届く。
for (const directory of ['assets', 'css', 'js', 'src', 'functions', 'en', 'ja', 'zh']) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

await buildLearningContent(output);

const releaseHash = createHash('sha256');
const releaseFiles = (await collectFiles(output)).sort();
for (const file of releaseFiles) {
  releaseHash.update(path.relative(output, file).replaceAll('\\', '/'));
  releaseHash.update(await readFile(file));
}
const releaseId = releaseHash.digest('hex').slice(0, 12);
// Version every same-origin static reference (HTML, CSS, JS/MJS) with the
// release id so browsers and the Cloudflare zone cache never mix releases.
// See scripts/asset-versioning.mjs and tests/test_dist_asset_versions.mjs.
const versionedFiles = await versionDist(output, releaseFiles, releaseId);
await writeFile(path.join(output, 'release.json'), `${JSON.stringify({ releaseId })}\n`, 'utf8');

const files = await collectFiles(output);
const totalBytes = (await Promise.all(files.map(file => stat(file)))).reduce((sum, info) => sum + info.size, 0);
console.log(`ビルド完了: ${files.length}ファイル / ${totalBytes}バイト -> ${output}`);
console.log(`リリースID: ${releaseId}（${versionedFiles}ファイルの参照に ?v= を付与）`);
console.log('教材JSONは静的成果物に含めず、Cloudflare D1から配信します。');

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  }));
  return nested.flat();
}
