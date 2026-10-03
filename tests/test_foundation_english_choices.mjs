// World-mode English (CN/US/UK routes). Ported from the DING worktree and
// adapted to the shared validator and the 2x2 translation alternatives.
import assert from 'node:assert/strict';
import {englishPool, EN_ZH_TRANSLATIONS} from '../src/world/FoundationEnglish.mjs';
import {TRANSLATION_DISTRACTORS} from '../src/world/FoundationEnglishDistractors.mjs';
import {assertChoiceSet} from '../src/runtime/ChoiceQuality.mjs';
import {makeFoundationRounds, markFoundation, publicQuestion} from '../src/world/FoundationRules.mjs';

// Trace: Chinese grade 1–6 → english1–6 → learn.html → englishPool →
// ten-question foundation session. Existing stages and bilingual pairs remain.
const sizes = [46, 46, 46, 92, 92, 92, 137];
const tokens = value => new Set(value.toLowerCase().match(/[a-z']+/g) || []);
const shared = (a, b) => [...tokens(a)].filter(token => tokens(b).has(token)).length;
// Formulaic phrases swap the whole phrase within one family instead of 2x2.
const FAMILY = new Set(['T1', 'T2', 'T3', 'T4', 'T11', 'T12', 'T15', 'T16', 'T17', 'T24', 'T26']);
let inspected = 0;
assert.equal(EN_ZH_TRANSLATIONS.length, 54);
assert.equal(Object.keys(TRANSLATION_DISTRACTORS).length, 54);
for (const pair of EN_ZH_TRANSLATIONS) {
  const alternatives = TRANSLATION_DISTRACTORS[pair.id];
  assert.equal(alternatives.length, 3, pair.id);
  for (const alternative of alternatives) {
    assert.notEqual(alternative.en, pair.en, pair.id);
    assert.notEqual(alternative.zh, pair.zh, pair.id);
  }
  if (FAMILY.has(pair.id)) {
    if (Number(pair.id.slice(1)) > 4) for (const alternative of alternatives) assert.ok(shared(pair.en, alternative.en) >= 1, `${pair.id}: unrelated alternative ${alternative.en}`);
    continue;
  }
  // 2x2: the first two each change one detail of the answer; the third
  // changes both, so it is one detail away from each of the first two.
  const [first, second, both] = alternatives.map(item => item.en);
  const size = tokens(pair.en).size, near = Math.ceil(size / 2);
  assert.ok(shared(pair.en, first) >= near && shared(pair.en, second) >= near, `${pair.id}: one-detail alternatives`);
  assert.ok(shared(both, first) >= near && shared(both, second) >= near, `${pair.id}: both-details alternative pairs with each one-detail alternative`);
  assert.ok(shared(pair.en, both) < Math.max(shared(pair.en, first), shared(pair.en, second)), `${pair.id}: third alternative changes both details`);
}

for (const locale of ['zh', 'en', 'ja']) for (let stage = 0; stage <= 6; stage++) {
  const pool = englishPool(stage, locale);
  assert.equal(pool.length, sizes[stage], `${locale}/${stage} content capacity`);
  assert.equal(new Set(pool.map(q => q.id)).size, pool.length);
  for (const q of pool) {
    inspected++;
    assertChoiceSet(q, {key: 'choices'});
    const visible = publicQuestion(q);
    for (const field of ['correct', 'explanation', 'hint']) assert.ok(!(field in visible));
    for (const distractor of q.choices.filter(choice => choice !== q.correct)) {
      assert.equal(markFoundation(q, distractor, 0).correct, false);
      assert.equal(markFoundation(q, distractor, 0).points, 0);
    }
  }
}

const all = englishPool(6, 'zh');
const get = id => all.find(q => q.id === id);
// Independent examples: age, clock time, family member, comparison.
assert.deepEqual(new Set(get('T6-en-zh').choices), new Set(['我八岁。', '他八岁。', '我九岁。', '他九岁。']));
assert.deepEqual(new Set(get('T27-en-zh').choices), new Set(['现在三点半。', '现在三点一刻。', '现在四点半。', '现在四点一刻。']));
assert.ok(get('T31-zh-en').choices.includes('My younger sister is reading a book.'));
assert.ok(get('T39-zh-en').choices.includes('The red schoolbag is cheaper than the blue one.'));
for (const q of all.filter(q => q.format === 'dialogue-completion')) {
  assert.ok(!q.choices.some(choice => /I am a book|Eight pencils|A red bag|On Monday books|For three years old|Two kilometres/.test(choice)));
}
assert.deepEqual(new Set(get('D2-0').choices), new Set(['Good morning.', 'Good afternoon.', 'Good evening.', 'Good night.']));
assert.ok(get('D2-0').prompt.includes('breakfast'));
assert.ok(get('D2-6').choices.every(choice => /^Yes, I \w+\.$/.test(choice)));
assert.ok(get('D2-7').choices.every(choice => choice.startsWith('Because ')));
assert.ok(get('R2-2').choices.every(choice => /^At \w+\.$/.test(choice)));

for (let grade = 1; grade <= 6; grade++) {
  const positions = new Set();
  const firstIds = new Set();
  const route = {profile: 'CN63', year: `Y${grade}`, lesson: `english${grade}`, locale: 'zh', stage: '2'};
  for (const seed of [11, 42, 123, 999, 2026]) {
    const rounds = makeFoundationRounds(route, seed);
    assert.equal(rounds.length, 10);
    assert.equal(new Set(rounds.map(q => q.id)).size, 10);
    firstIds.add(rounds[0].id);
    for (const q of rounds) positions.add(q.choices.indexOf(q.correct));
  }
  assert.ok(firstIds.size > 1, `grade ${grade}: questions randomized`);
  assert.deepEqual(positions, new Set([0, 1, 2, 3]), `grade ${grade}: answer position randomized`);
}
console.log(`Foundation English choices: ${inspected} localized questions checked; 54 reviewed bilingual groups; original capacity and randomized ten-question sessions preserved.`);
