// Piko Town i18n guard: every zh/en/ja string in the town + arcade system must exist in all
// three languages, must not be an untranslated copy of another language, and must not leak
// the wrong script (CJK in English, Chinese-only simplified hanzi in Japanese).
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {TEXT} from '../src/town/TownText.mjs';
import {ARCADE_TEXT as TOWN_ARCADE} from '../src/town/ArcadeText.mjs';
import {ARCADE_TEXT} from '../src/arcade/ArcadeText.mjs';
import {playroomText} from '../src/arena/PlayroomText.mjs';
import {AVATARS, ITEMS} from '../src/town/ArcadeRules.mjs';
import {FURNITURE} from '../src/town/TownRules.mjs';
import {townEntry} from '../src/town/TownEntry.mjs';
import {DESIGN_KITS} from '../src/arcade/DesignerCatalog.mjs';
import {breakoutLayoutFor, BREAKOUT_LAYOUT_COUNT} from '../src/arcade/BreakoutLayouts.mjs';

const LANGS = ['zh', 'en', 'ja'];
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const KANA = /[\u3040-\u30ff]/;
// Simplified-Chinese-only forms (the Japanese form is different or the character is not used in Japanese).
const ZH_ONLY = /[这们么个时说读买卖钱题关门车东话让应对发现开进过还没样认识记选择动场级难习页输错连线断设计戏乐欢帮备订单价类种间问边绿园张图灯飞龙鸟鱼马见长书风云电热语给红黄蓝紫颜员广宝战尔务经验币积护伙伴恭喜请您吗呢吧啦哦嗨销]/;
// Strings that may legitimately be identical across languages: proper nouns, key names, numbers, symbols.
const SAME_OK = new Set(['Piko', 'Mia', 'Noah', 'WASD', 'Esc', 'GT', 'Shift', 'Pro', 'iPhone', 'Huawei', 'USB-C', 'Piko Game', 'OK']);
const isNeutral = s => !/[A-Za-z\u3040-\u30ff\u3400-\u9fff]/.test(s) || SAME_OK.has(s.trim());
const strip = s => s.replace(/\$\{[^}]*\}/g, ' ');

const problems = [];
const report = (where, msg) => problems.push(`${where}: ${msg}`);

function checkOne(where, lang, value) {
  const s = strip(value);
  if (!s.trim()) return report(where, `${lang} is empty`);
  if (lang === 'en' && CJK.test(s)) report(where, `CJK characters in English: ${JSON.stringify(value)}`);
  if (lang === 'ja' && ZH_ONLY.test(s)) report(where, `Chinese-only hanzi in Japanese: ${JSON.stringify(value)} (${s.match(ZH_ONLY)[0]})`);
  if (lang === 'zh' && KANA.test(s)) report(where, `Japanese kana in Chinese: ${JSON.stringify(value)}`);
}
function checkTriple(where, t, {content = false} = {}) {
  for (const l of LANGS) {
    if (typeof t[l] !== 'string') { report(where, `missing ${l}`); continue; }
    if (!content) checkOne(where, l, t[l]);
  }
  if (content) return;
  for (const [a, b] of [['zh', 'en'], ['zh', 'ja'], ['en', 'ja']]) {
    if (typeof t[a] === 'string' && t[a] === t[b] && !isNeutral(t[a])) report(where, `${a} and ${b} are identical (untranslated?): ${JSON.stringify(t[a])}`);
  }
}

// ---------- 1. Runtime dictionaries: same keys in every language ----------
function flatten(obj, prefix = '', out = {}) {
  if (typeof obj === 'string') { out[prefix] = obj; return out; }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) if (typeof v !== 'function') flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
function checkDictionary(name, dict, filter = () => true, contentKeys = () => false) {
  const flat = Object.fromEntries(LANGS.map(l => [l, flatten(dict[l])]));
  const keys = new Set(LANGS.flatMap(l => Object.keys(flat[l]))); let n = 0;
  for (const k of keys) {
    if (!filter(k)) continue; n++;
    checkTriple(`${name}.${k}`, Object.fromEntries(LANGS.map(l => [l, flat[l][k]])), {content: contentKeys(k)});
  }
  return n;
}
const counts = {};
counts.TownText = checkDictionary('TEXT', TEXT);
counts.TownArcadeText = checkDictionary('town/ARCADE_TEXT', TOWN_ARCADE);
counts.ArcadeText = checkDictionary('arcade/ARCADE_TEXT', ARCADE_TEXT);
counts.PlayroomTown = checkDictionary('playroomText', playroomText, k => /^(town|playTown)/.test(k));
for (const [name, list] of [['AVATARS', AVATARS], ['ITEMS', ITEMS], ['FURNITURE', FURNITURE]]) {
  list.forEach((item, i) => { const t = item.names || item.name || item; checkTriple(`${name}[${i}]`, t); });
}
let designerStrings = 0;
for (const [id, kit] of Object.entries(DESIGN_KITS)) {
  checkTriple(`DESIGN_KITS.${id}.name`, kit.name); checkTriple(`DESIGN_KITS.${id}.subtitle`, kit.subtitle); designerStrings += 2;
  for (const part of kit.parts) { checkTriple(`DESIGN_KITS.${id}.parts.${part.id}`, part.names); designerStrings++; }
}
for (let level = 1; level <= BREAKOUT_LAYOUT_COUNT; level++) checkTriple(`breakout level ${level}`, Object.fromEntries(LANGS.map(l => [l, breakoutLayoutFor({level}, l).name])));
counts.Designer = designerStrings; counts.Breakout = BREAKOUT_LAYOUT_COUNT;

// ---------- 2. Static scan: every {zh,en,ja} block / inline triple in the town + arcade sources ----------
const FILES = [
  ...readdirSync(new URL('../src/town/', import.meta.url)).filter(f => f.endsWith('.mjs')).map(f => `src/town/${f}`),
  ...readdirSync(new URL('../src/arcade/', import.meta.url)).filter(f => f.endsWith('.mjs')).map(f => `src/arcade/${f}`),
];
// Content that is intentionally not translated: typing word pools are romaji / pinyin practice words.
const CONTENT_FILES = new Set(['src/arcade/NinjaTypeGame.mjs']);

// Minimal JS tokenizer: strings, template literals (their ${...} code is tokenized as separate streams),
// regex literals, identifiers and punctuation. Good enough to find locale objects in our own sources.
function skipCode(src, i, streams) { // returns index of the '}' that closes a ${ ... } block
  const start = i; let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i, streams); continue; }
    if (c === '{') depth++;
    else if (c === '}') { if (!depth) { streams.push(src.slice(start, i)); return i; } depth--; }
    i++;
  }
  return i;
}
function skipString(src, i, streams) { // returns index just after the closing quote
  const q = src[i]; let j = i + 1;
  while (j < src.length && src[j] !== q) {
    if (src[j] === '\\') { j += 2; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') { j = skipCode(src, j + 2, streams) + 1; continue; }
    j++;
  }
  return j + 1;
}
function tokenize(src, streams = []) {
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const j = skipString(src, i, streams);
      const raw = src.slice(i + 1, j - 1);
      let value = raw;
      if (c !== '`') { try { value = JSON.parse('"' + raw.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'); } catch { value = raw; } }
      out.push({t: 'str', v: value, at: i}); i = j; continue;
    }
    if (c === '/') {
      const prev = out[out.length - 1];
      const regexOk = !prev || (prev.t === 'p' && !')]}'.includes(prev.v)) || (prev.t === 'id' && ['return', 'typeof', 'case', 'in', 'of', 'void'].includes(prev.v));
      if (regexOk) {
        let j = i + 1, cls = false;
        while (j < src.length && (src[j] !== '/' || cls) && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
        j++; while (/[a-z]/.test(src[j] || '')) j++;
        out.push({t: 'regex', v: src.slice(i, j), at: i}); i = j; continue;
      }
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < src.length && /[\w$]/.test(src[j])) j++; out.push({t: 'id', v: src.slice(i, j), at: i}); i = j; continue; }
    if (/\s/.test(c)) { i++; continue; }
    out.push({t: 'p', v: c, at: i}); i++;
  }
  return out;
}
// Parse a value starting at token k. Returns [value, nextIndex]; value is string | array | object | undefined.
function parseValue(tk, k) {
  const x = tk[k];
  if (!x) return [undefined, k];
  if (x.t === 'str' && [',', '}', ']', ')'].includes(tk[k + 1]?.v)) return [x.v, k + 1];
  if (x.v === '{' || x.v === '[') {
    const close = x.v === '{' ? '}' : ']'; const isObj = x.v === '{'; const val = isObj ? {} : []; k++;
    while (tk[k] && tk[k].v !== close) {
      if (isObj) {
        const key = tk[k]; if (tk[k + 1]?.v !== ':') { k = skip(tk, k); if (tk[k]?.v === ',') k++; continue; }
        const [v, n] = parseValue(tk, k + 2); if (v !== undefined) val[key.v] = v; k = n;
      } else { const [v, n] = parseValue(tk, k); val.push(v); k = n; }
      if (tk[k]?.v === ',') k++;
    }
    return [val, k + 1];
  }
  return [undefined, skip(tk, k)];
}
function skip(tk, k) { let d = 0; for (; k < tk.length; k++) { const v = tk[k].v; if (tk[k].t !== 'p') continue; if ('([{'.includes(v)) d++; else if (')]}'.includes(v)) { if (!d) return k; d--; } else if (v === ',' && !d) return k; } return k; }

const staticBlocks = {};
let staticTriples = 0, staticKeys = 0;
for (const file of FILES) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const streams = [src];
  const content = CONTENT_FILES.has(file);
  for (let si = 0; si < streams.length; si++) {
  const tk = tokenize(streams[si], streams);
  for (let k = 0; k < tk.length; k++) {
    const a = tk[k];
    // Object.assign(X.zh, {...}) or X.zh.key = '...' style layered blocks.
    if (a.t === 'id' && LANGS.includes(a.v) && tk[k - 1]?.v === '.' && tk[k + 1]?.v === ',' && tk[k + 2]?.v === '{') {
      const [v] = parseValue(tk, k + 2);
      (staticBlocks[file] ||= []).push({lang: a.v, flat: flatten(v), at: a.at});
      continue;
    }
    if (!(a.t === 'id' || a.t === 'str') || !LANGS.includes(a.v) || tk[k + 1]?.v !== ':') continue;
    // Inline triple {zh:'..',en:'..',ja:'..'} (any order) or locale block zh:{...}.
    const [v] = parseValue(tk, k + 2);
    if (typeof v === 'string') {
      // Collect sibling locale literals in the same object.
      const open = (() => { let d = 0; for (let j = k - 1; j >= 0; j--) { const p = tk[j].v; if (tk[j].t !== 'p') continue; if (')]}'.includes(p)) d++; else if ('([{'.includes(p)) { if (!d) return j; d--; } } return -1; })();
      if (open < 0 || tk[open].v !== '{') continue;
      const [obj] = parseValue(tk, open);
      if (!obj || LANGS[0] !== a.v && typeof obj[LANGS.find(l => typeof obj[l] === 'string')] === 'string' && LANGS.find(l => typeof obj[l] === 'string') !== a.v) continue; // count each triple once (from its first locale key)
      staticTriples++;
      checkTriple(`${file}@${a.at}`, obj, {content});
    } else if (v && typeof v === 'object') {
      (staticBlocks[file] ||= []).push({lang: a.v, flat: flatten(v), at: a.at});
    }
  }
  }
  // Locale ternaries: locale==='ja'?'…':locale==='zh'?'…':'…'
  for (const m of src.matchAll(/locale\s*===\s*'(zh|en|ja)'\s*\?\s*(\[[^\]]*\]|'[^'\\]*')/g)) if (!content) for (const lit of m[2].matchAll(/'([^'\\]*)'/g)) checkOne(`${file}@${m.index}`, m[1], lit[1]);
  // Check blocks: pair by key within the file (later assignments override earlier ones).
  const merged = Object.fromEntries(LANGS.map(l => [l, {}]));
  const touched = new Set();
  for (const b of staticBlocks[file] || []) for (const [key, val] of Object.entries(b.flat)) { merged[b.lang][key] = val; touched.add(key); }
  const groups = new Set((staticBlocks[file] || []).map(b => b.lang));
  if (groups.size === 3) for (const key of touched) staticKeys++, checkTriple(`${file}:${key}`, Object.fromEntries(LANGS.map(l => [l, merged[l][key]])), {content});
  else for (const b of staticBlocks[file] || []) for (const [key, val] of Object.entries(b.flat)) if (!content) checkOne(`${file}:${b.lang}.${key}`, b.lang, val);
}

// ---------- 3. Rendered town entry card has no leaks ----------
for (const l of LANGS) {
  const text = townEntry(l).replace(/<[^>]+>/g, ' ');
  if (l === 'en') assert.doesNotMatch(text, CJK, 'town entry (en) shows CJK');
  if (l === 'ja') assert.doesNotMatch(text, ZH_ONLY, 'town entry (ja) shows Chinese-only hanzi');
}

// ---------- 4. No hardcoded English chips/signs left in the town shell ----------
const app = readFileSync(new URL('../src/town/TownApp.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(app, /<span>🔤 English<\/span>|HOME SWEET HOME/, 'TownApp has hardcoded English labels');
const html = readFileSync(new URL('../town.html', import.meta.url), 'utf8');
for (const id of ['town-eyebrow', 'guide-sub', 'shop-sub', 'home-sub', 'town-footer', 'town-map', 'town-dpad', 'town-places']) assert.match(html, new RegExp(`id="${id}"`), `town.html #${id} must be localisable`);

if (problems.length) {
  console.error(problems.map(p => '  - ' + p).join('\n'));
  assert.fail(`${problems.length} town i18n problem(s)`);
}
console.log(`Town i18n: ${Object.values(counts).reduce((a, b) => a + b, 0)} dictionary/catalogue strings, ${staticKeys} source-block keys and ${staticTriples} inline triples checked in zh/en/ja — no missing keys, untranslated copies or script leaks.`);
