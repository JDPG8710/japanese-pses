// Release cache-busting check for dist/ (run after `npm run build`).
//
// Fails when a same-origin reference from HTML/CSS/JS to a static file lacks
// the current `?v=<releaseId>`, when a relative import points at a file that
// is not in dist, when one module is reached through two different URLs
// (which would create duplicate module instances), or when _headers stops
// revalidating pages / caching versioned files.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_EXTENSIONS, isSourceFile, resolveReference } from '../scripts/asset-versioning.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { releaseId } = JSON.parse(await readFile(path.join(dist, 'release.json'), 'utf8'));
assert.match(releaseId, /^[a-z0-9]{8,}$/i, 'release.json has a releaseId');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(path.relative(dist, full).replaceAll('\\', '/'));
  }
  return out;
}
const files = await walk(dist);
const distFiles = new Set(files);
const sources = files.filter(isSourceFile);
const ORIGIN = 'https://release.test/';
const failures = [];
const moduleUrls = new Map(); // dist file -> Set of full URLs used to load it
let checked = 0;

const versionOf = reference => {
  const query = reference.split('#')[0].split('?')[1] || '';
  return query.split('&').filter(part => /^v=/.test(part)).map(part => part.slice(2));
};
const isAssetPath = reference => ASSET_EXTENSIONS.has(path.posix.extname(reference.split(/[?#]/)[0]).toLowerCase());
const isLocal = reference => /^(?:\.{1,2}\/|\/(?!\/))/.test(reference);

for (const file of sources) {
  const source = await readFile(path.join(dist, file), 'utf8');
  const ext = path.posix.extname(file);
  const references = [];
  // Generic: any quoted literal or CSS url() / srcset entry.
  for (const [, , ref] of source.matchAll(/(["'`])([^"'`\s<>{}()\\|^]+?)\1/g)) references.push({ ref });
  for (const [, , ref] of source.matchAll(/url\(\s*(["']?)([^"')\s]+)\1\s*\)/gi)) references.push({ ref });
  for (const [, , set] of source.matchAll(/\bsrcset\s*=\s*(["'])([^"']*)\1/gi)) for (const entry of set.split(',')) references.push({ ref: entry.trim().split(/\s+/)[0] });
  // Independent module-specifier scan: these must resolve AND be versioned,
  // so an import of a file missing from dist is reported too.
  const modulePatterns = ext === '.css'
    ? [/@import\s+(?:url\()?\s*["']([^"']+)["']/g]
    : [/\b(?:import|export)\s[^'"`;]*?\bfrom\s*["']([^"']+)["']/g, /\bimport\s*["']([^"']+)["']/g, /\bimport\(\s*["']([^"']+)["']\s*\)/g, /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g, /new\s+(?:Shared)?Worker\(\s*["']([^"']+)["']/g];
  if (ext === '.html') modulePatterns.push(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, /<link\b[^>]*\brel\s*=\s*["'](?:stylesheet|modulepreload|preload)["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi);
  for (const pattern of modulePatterns) for (const [, ref] of source.matchAll(pattern)) if (isLocal(ref) && isAssetPath(ref)) references.push({ ref, strict: true });

  for (const { ref, strict } of references) {
    const resolved = resolveReference(ref, file, distFiles);
    if (!resolved) {
      if (strict) failures.push(`${file}: ${ref} does not resolve to a file in dist`);
      continue;
    }
    checked++;
    const versions = versionOf(ref);
    if (versions.length !== 1 || versions[0] !== releaseId) failures.push(`${file}: ${ref} lacks ?v=${releaseId}`);
    if (/\.(?:m?js)$/.test(resolved.file) && (strict || ext === '.html')) {
      const url = new URL(ref, ORIGIN + file).href;
      if (new URL(url).pathname.slice(1) === resolved.file) {
        if (!moduleUrls.has(resolved.file)) moduleUrls.set(resolved.file, new Set());
        moduleUrls.get(resolved.file).add(url);
      }
    }
  }
  // Stale tokens from an older release must not survive.
  for (const [, token] of source.matchAll(/[?&]v=([A-Za-z0-9._-]+)/g)) if (token !== releaseId && !/^\d+$/.test(token)) failures.push(`${file}: stale ?v=${token}`);
}

// Versioning may only add `?v=`: apart from those tokens, every file copied
// from the repo must be byte-for-byte identical to its source. (This catches
// a rewrite that touches code, e.g. a case-insensitive `url(` match inside
// `gradeEntryUrl(`.) Files the build generates have no source and are skipped.
const stripVersions = text => text.replace(/\?v=[\w.-]+&/g, '?').replace(/[?&]v=[\w.-]+/g, '');
let compared = 0;
for (const file of sources) {
  let original;
  try { original = await readFile(path.join(root, file), 'utf8'); } catch { continue; }
  const built = await readFile(path.join(dist, file), 'utf8');
  if (stripVersions(built) === stripVersions(original)) { compared++; continue; }
  const a = stripVersions(original), b = stripVersions(built);
  let at = 0; while (at < a.length && a[at] === b[at]) at++;
  failures.push(`${file}: build changed more than ?v= near ${JSON.stringify(a.slice(Math.max(0, at - 30), at + 30))} -> ${JSON.stringify(b.slice(Math.max(0, at - 30), at + 30))}`);
}

for (const [file, urls] of moduleUrls) if (urls.size > 1) failures.push(`${file} is loaded through ${urls.size} different URLs: ${[...urls].join(' , ')}`);

// Spot checks on the pages that matter most for this bug.
const amc = await readFile(path.join(dist, 'amc.html'), 'utf8');
assert.ok(amc.includes(`/src/competitions/practice.css?v=${releaseId}`), 'amc.html versions practice.css');
assert.ok(amc.includes(`/src/competitions/amc-hub.css?v=${releaseId}`), 'amc.html versions amc-hub.css');
assert.ok(amc.includes(`/src/competitions/AmcHubApp.mjs?v=${releaseId}`), 'amc.html versions AmcHubApp.mjs');
const hubApp = await readFile(path.join(dist, 'src/competitions/AmcHubApp.mjs'), 'utf8');
assert.ok(hubApp.includes(`./AmcBank10.mjs?v=${releaseId}`), 'AmcHubApp.mjs versions its imports');

// _headers: pages revalidate, versioned code/styles are immutable.
const headers = await readFile(path.join(dist, '_headers'), 'utf8');
const rules = new Map();
let current = null;
for (const line of headers.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { current = line.trim(); rules.set(current, []); } else rules.get(current).push(line.trim());
}
const cacheOf = rule => (rules.get(rule) || []).filter(line => /^cache-control:/i.test(line)).map(line => line.split(':').slice(1).join(':').trim());
assert.deepEqual(cacheOf('/*'), ['no-cache'], 'pages and routes revalidate on every load');
for (const rule of ['/src/*', '/css/*', '/js/*', '/*.js']) {
  assert.deepEqual(cacheOf(rule), ['public, max-age=31536000, immutable'], `${rule} is cached as immutable`);
  assert.ok(rules.get(rule).includes('! Cache-Control'), `${rule} detaches the page Cache-Control first`);
}
assert.deepEqual(cacheOf('/src/*.html'), ['no-cache'], 'HTML under /src is not cached as immutable');

if (failures.length) {
  console.error(failures.slice(0, 50).join('\n'));
  assert.fail(`${failures.length} asset reference problem(s) in dist`);
}
console.log(`dist asset versions OK: release ${releaseId}, ${checked} references in ${sources.length} files, ${moduleUrls.size} modules each loaded through one URL, ${compared} files identical to source apart from ?v=`);
