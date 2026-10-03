// Release cache-busting for dist/.
//
// Every same-origin reference from HTML, CSS and JS/MJS to a static file that
// exists in dist gets `?v=<releaseId>`. Appending a query never changes how a
// path resolves, so the only effect is a new cache key per release. Because
// every module specifier gets the same token, importers of one module always
// resolve to one identical URL (no duplicate module instances).
//
// Covered: HTML attributes (src, href, poster, data-src, srcset, inline
// scripts/styles), CSS url() and @import, JS static/dynamic imports,
// `export … from`, new URL(…, import.meta.url), new Worker(…), fetch(…) and any
// other quoted literal path to a static file. Template literals with ${…}
// cannot be resolved at build time and are left as they are.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ASSET_EXTENSIONS = new Set([
  '.css', '.js', '.mjs', '.json', '.webmanifest', '.map',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico',
  '.mp3', '.ogg', '.oga', '.wav', '.m4a', '.aac', '.flac', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.glb', '.gltf', '.bin', '.wasm', '.ktx2', '.hdr'
]);
export const SOURCE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs']);
// Pages Functions are bundled server code, not browser assets.
export const SKIPPED_PREFIXES = ['functions/'];

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const QUOTED = /(["'`])([^"'`\s<>{}()\\|^]+?)\1/g;
// `url(` must not be the tail of an identifier such as `gradeEntryUrl(`.
const CSS_URL = /(?<![\w$.-])url\(\s*(["']?)([^"')\s]+)\1\s*\)/gi;
const SRCSET = /\bsrcset\s*=\s*(["'])([^"']*)\1/gi;

export const isSourceFile = relative => SOURCE_EXTENSIONS.has(path.posix.extname(relative)) && !SKIPPED_PREFIXES.some(prefix => relative.startsWith(prefix));

function splitReference(reference) {
  const hashAt = reference.indexOf('#');
  const hash = hashAt >= 0 ? reference.slice(hashAt) : '';
  const beforeHash = hashAt >= 0 ? reference.slice(0, hashAt) : reference;
  const queryAt = beforeHash.indexOf('?');
  return { pathname: queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash, query: queryAt >= 0 ? beforeHash.slice(queryAt + 1) : '', hash };
}

/** Resolve a reference found in `fromFile` (a dist-relative POSIX path) to a dist file, or null. */
export function resolveReference(reference, fromFile, distFiles) {
  if (!reference || EXTERNAL.test(reference)) return null;
  const { pathname, query, hash } = splitReference(reference);
  if (!pathname || !ASSET_EXTENSIONS.has(path.posix.extname(pathname).toLowerCase())) return null;
  let decoded;
  try { decoded = decodeURI(pathname); } catch { return null; }
  // Module/CSS/HTML-relative first; document-relative (site root) as a fallback
  // for classic scripts and fetch() calls made from pages at the root.
  const candidates = decoded.startsWith('/')
    ? [decoded.slice(1)]
    : [path.posix.join(path.posix.dirname(fromFile), decoded), decoded];
  for (const candidate of candidates) {
    const normalized = path.posix.normalize(candidate);
    if (!normalized.startsWith('..') && distFiles.has(normalized)) return { file: normalized, pathname, query, hash };
  }
  return null;
}

function withVersion(resolved, releaseId) {
  const params = resolved.query.split('&').filter(part => part && !/^v(?:=|$)/.test(part));
  params.push(`v=${releaseId}`);
  return `${resolved.pathname}?${params.join('&')}${resolved.hash}`;
}

export function versionSource(source, fromFile, distFiles, releaseId) {
  // Each rewrite touches only the reference itself and leaves the surrounding
  // text byte-for-byte as it was, so nothing but `?v=` can change.
  const rewrite = reference => {
    const resolved = resolveReference(reference, fromFile, distFiles);
    return resolved ? withVersion(resolved, releaseId) : reference;
  };
  let output = source.replace(SRCSET, (match, quote, value) => {
    const next = value.replace(/(^|,)(\s*)([^\s,]+)/g, (entry, comma, space, url) => `${comma}${space}${rewrite(url)}`);
    return next === value ? match : match.replace(value, next);
  });
  output = output.replace(CSS_URL, (match, quote, reference) => {
    const next = rewrite(reference);
    return next === reference ? match : match.replace(reference, next);
  });
  output = output.replace(QUOTED, (match, quote, reference) => {
    const next = rewrite(reference);
    return next === reference ? match : `${quote}${next}${quote}`;
  });
  return output;
}

export async function versionDist(output, releaseFiles, releaseId) {
  const relative = releaseFiles.map(file => path.relative(output, file).replaceAll('\\', '/'));
  const distFiles = new Set(relative);
  let changed = 0;
  for (const file of relative.filter(isSourceFile)) {
    const absolute = path.join(output, file);
    const source = await readFile(absolute, 'utf8');
    const next = versionSource(source, file, distFiles, releaseId);
    if (next !== source) { await writeFile(absolute, next, 'utf8'); changed++; }
  }
  return changed;
}
