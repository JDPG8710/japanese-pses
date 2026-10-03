// Content checks for the AMC hub: AMC 10/12 lessons, the registration guide
// and the trilingual UI strings.
import assert from 'node:assert/strict';
import { UPPER } from '../src/competitions/AmcUpperLessons.mjs';
import { AMC10_AREAS } from '../src/competitions/AmcBank10.mjs';
import { AMC12_AREAS } from '../src/competitions/AmcBank12.mjs';
import { REGISTRATION, REG_VERIFIED } from '../src/competitions/AmcRegistration.mjs';
import { HUB_TEXT } from '../src/competitions/AmcHubText.mjs';
import { aopsUrl } from '../src/competitions/AmcRealCore.mjs';
import { readFile } from 'node:fs/promises';

const locales = ['zh', 'en', 'ja'];
const isT = value => value && typeof value === 'object' && locales.some(locale => locale in value);
const checkText = (value, where) => {
  if (isT(value)) {
    for (const locale of locales) assert.ok(typeof value[locale] === 'string' && value[locale].trim(), `${where}.${locale}`);
    assert.doesNotMatch(value.en.replace(/\([^)]*\)/g, ""), /[\u3040-\u30ff\u4e00-\u9fff]/, `${where}.en has CJK`); // a native name in brackets is fine
    if (!/[\u3040-\u30ff\u4e00-\u9fff]/.test(value.ja)) assert.doesNotMatch(value.ja, /[a-z]{3,}\s+[a-z]{3,}/i, `${where}.ja looks like English`);
    if (!/[\u3040-\u30ff\u4e00-\u9fff]/.test(value.zh)) assert.doesNotMatch(value.zh, /[a-z]{3,}\s+[a-z]{3,}/i, `${where}.zh looks like English`);
    return;
  }
  if (Array.isArray(value)) value.forEach((inner, i) => checkText(inner, `${where}[${i}]`));
  else if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) checkText(inner, `${where}.${key}`);
};

// AMC 10 / AMC 12 learn content
// Optional local cross-check against a downloaded AoPS problem index (not in the repo).
const corpusFile = process.env.AMC_CORPUS || '/workspace/amcresearch/aops/probs.json';
const corpus = JSON.parse(await readFile(corpusFile, 'utf8').catch(() => 'null'));
const corpusIds = corpus ? new Set(corpus.map(p => p.id)) : null;
for (const [level, areas] of [['10', AMC10_AREAS], ['12', AMC12_AREAS]]) {
  const u = UPPER[level];
  assert.equal(u.key, `piko-amc${level}-lessons:v1`);
  for (const locale of ['zh', 'ja']) assert.deepEqual(Object.keys(u.intro[locale]).sort(), Object.keys(u.intro.en).sort());
  for (const locale of locales) for (const [key, value] of Object.entries(u.intro[locale])) assert.ok(value.trim(), `${level}.intro.${locale}.${key}`);
  checkText(u.facts, `${level}.facts`); checkText(u.stages, `${level}.stages`); checkText(u.lessons, `${level}.lessons`); checkText(u.sources, `${level}.sources`);
  assert.equal(u.facts.length, 6);
  const facts = JSON.stringify(u.facts.map(f => f.body.en));
  for (const fact of ['25', '75', 'A–E', '6 points', '1.5', '150', level === '10' ? '17.5' : '19.5', 'Nov 5, 2026', 'Nov 13, 2026', level === '10' ? '100' : '85', '13']) assert.ok(facts.includes(fact), `AMC ${level} facts mention ${fact}`);
  assert.equal(u.stages.length, 3);
  assert.equal(u.lessons.length, 9, `AMC ${level} has 9 lessons`);
  assert.equal(new Set(u.lessons.map(l => l.id)).size, 9);
  assert.deepEqual(u.stages.flatMap(s => s.lessons).sort(), u.lessons.map(l => l.id).sort(), 'every lesson is in exactly one stage');
  for (const lesson of u.lessons) {
    assert.ok(u.stages.some(s => s.id === lesson.stage), lesson.id);
    assert.ok(lesson.practice.length && lesson.practice.every(id => id === 'mock' || areas.some(a => a.id === id)), `${lesson.id} practice`);
    assert.ok(lesson.ideas.length >= 3 && lesson.example.steps.length >= 3 && lesson.traps.length >= 2, lesson.id);
    if (!lesson.practice.includes('mock')) assert.ok(lesson.models.length >= 2, `${lesson.id} cites real model problems`);
    for (const m of lesson.models) {
      assert.match(m.contest, new RegExp(`^20(19|2[0-6]) AMC ${level}[AB]$`), `${lesson.id} ${m.contest}`);
      assert.ok(m.number >= 1 && m.number <= 25);
      assert.match(aopsUrl(m.contest, m.number), /^https:\/\/artofproblemsolving\.com\/wiki\/index\.php\/20\d\d_AMC_1[02][AB]_Problems\/Problem_\d+$/);
      if (corpusIds && corpusIds.size) assert.ok(corpusIds.has(`${m.contest} #${m.number}`), `${lesson.id}: ${m.contest} #${m.number} exists`);
    }
  }
}

// Registration guide
checkText(REGISTRATION, 'registration');
assert.equal(REG_VERIFIED, '2026-10-03');
assert.deepEqual(REGISTRATION.regions.map(r => r.id), ['china', 'japan', 'usa', 'other']);
const links = [...JSON.stringify(REGISTRATION).matchAll(/"url":"([^"]+)"/g)].map(m => m[1]);
assert.ok(links.length >= 12);
for (const url of links) {
  assert.match(url, /^https:\/\//, url);
  const host = new URL(url).hostname;
  assert.ok(['maa.org', 'www.maa.org', 'www.seedasdan.asia', 'msa.com.hk', 'magicsquareassociation.org', 'docs.google.com'].includes(host), `only official organizer links: ${url}`);
}
const json = JSON.stringify(REGISTRATION);
assert.doesNotMatch(json, /amcclub|amc1[02]\.org\.cn|x-new\.cn/, 'no agency or training-business sites');
for (const needle of ['https://maa.org/amc-international/', 'https://msa.com.hk/', 'https://www.seedasdan.asia/amc10/', 'msahk@vip.qq.com', '400-9999-615', 'amcinfo@maa.org']) assert.ok(json.includes(needle), needle);
const region = id => REGISTRATION.regions.find(r => r.id === id);
// Every date row names its time zone (local) and gives Japan time when it is fixed.
for (const r of REGISTRATION.regions) for (const row of r.dates) {
  assert.match(row.local.en, /Beijing time|Hong Kong time|set by the site|chosen by the site|US Eastern/, `${r.id} ${row.event.en} has a time-zone label`);
  if (/\d\d:\d\d/.test(row.local.en)) assert.match(row.jst.en, /JST/, `${r.id} ${row.event.en} gives JST`);
}
assert.match(JSON.stringify(region('china').dates), /Nov 6, 2026[^"]*17:00–18:15 Beijing/);
assert.match(JSON.stringify(region('china').dates), /Jan 22, 2027/);
assert.match(JSON.stringify(region('japan').dates), /18:00–19:15 JST/);
assert.match(JSON.stringify(region('japan')), /Oct 28, 2026/);
assert.match(JSON.stringify(region('japan')), /laptop or iPad/);
assert.match(JSON.stringify(region('japan')), /admission ticket/);
assert.match(JSON.stringify(region('usa').dates), /Nov 5, 2026/);
assert.match(JSON.stringify(region('usa').dates), /Jan 21–27, 2027/);
assert.ok(region('china').unverified.length && region('japan').unverified.length && region('other').unverified.length, 'unverified items are flagged');
assert.ok(region('china').unverified.some(item => /Fees: see the organizer/.test(item.en)));
assert.ok(region('japan').unverified.some(item => /Fees: see the organizer/.test(item.en)));
const path = JSON.stringify(REGISTRATION.path);
for (const needle of ['AMC 10 ≥ 100', 'AMC 12 ≥ 85', 'at least 13', '$85 + tax', 'Pearson', 'USAJMO', 'USAMO', 'Mar 20–21, 2027', 'Feb 5 or 6, 2027', 'citizenship or permanent residency', 'CMO', 'JMO']) assert.ok(path.includes(needle), `path mentions ${needle}`);

// UI strings
for (const locale of ['zh', 'ja']) assert.deepEqual(Object.keys(HUB_TEXT[locale]).sort(), Object.keys(HUB_TEXT.en).sort(), `HUB_TEXT.${locale} keys`);
for (const locale of locales) {
  assert.deepEqual(Object.keys(HUB_TEXT[locale].tabs), ['practice', 'learn', 'register']);
  assert.deepEqual(Object.keys(HUB_TEXT[locale].levels), ['8', '10', '12']);
}
assert.equal(HUB_TEXT.zh.tabs.register, '报名指南');
assert.equal(HUB_TEXT.en.tabs.register, 'Registration');
assert.equal(HUB_TEXT.ja.tabs.register, '申し込み');
console.log('AMC hub content OK: AMC 10/12 lessons (9 + 9, 3 stages, model citations), registration guide (4 regions, official links only, time zones, unverified flags, AIME path) and trilingual UI strings.');
