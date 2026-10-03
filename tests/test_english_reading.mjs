// Reading bank (SHORT_READING / LONG_READING). Ported from the DING worktree
// and adapted: distractors stay within one visit topic AND one of them is
// mentioned in the passage as what a friend did, so neither topic spotting
// nor text matching finds the answer.
import assert from 'node:assert/strict';
import { makeEnglishReadingBank } from '../src/competitions/EnglishReadingBank.mjs';
import { getEnglishQuestionBank } from '../src/competitions/EnglishQuestionBank.mjs';
import { assertChoiceSet } from '../src/runtime/ChoiceQuality.mjs';

const activityTopics = [
  /^borrow a book about /, /^practice a short /, /^water the .+ plants$/, /^join a .+ workshop$/,
  /^collect .+ litter$/, /^make a .+ map$/, /^practice (swimming|diving|rowing|sailing)$/, /^interview a /,
  /^sketch an? .+ painting$/, /^learn how .+ is made$/, /^prepare .+ (bowls|beds|toys)$/, /^cook .+ (soup|curry|rice)$/,
  /^count different (shells|crabs|fish|birds)$/, /^rehearse a .+ piece$/, /^examine an old .+ tool$/, /^ask about rescue /,
  /^(sort|wash|repair|weigh) used containers$/, /^check .+ records$/, /^read a .+ book aloud$/, /^survey reusable .+ use$/
];
const core = option => option.replace(/^To /, '').replace(/\.$/, '').replace(/^[A-Z][a-z]+ /, '').toLowerCase();

const short = makeEnglishReadingBank();
const long = makeEnglishReadingBank(true);
for (const [prefix, bank] of [['SHORT', short], ['LONG', long]]) {
  assert.equal(bank.length, 200);
  assert.equal(new Set(bank.map(question => question.id)).size, 200);
  assert.equal(new Set(bank.map(question => question.prompt)).size, 200);
  for (let index = 0; index < bank.length; index++) {
    const question = bank[index];
    assert.equal(question.id, `${prefix}_${index}`);
    assertChoiceSet(question);
    assert.ok(question.prompt.startsWith(`${question.passage}\n\n`));
    assert.ok(!question.prompt.includes('undefined'));
    if (index % 4 === 1) {
      assert.ok(question.options.every(option => activityTopics[Math.floor(index / 10)].test(option)), `${question.id}: off-topic activity distractor`);
    }
    // Exactly the answer and one decoy are mentioned in the passage.
    const passage = question.passage.toLowerCase();
    const mentioned = question.options.filter(option => passage.includes(core(option)));
    assert.equal(mentioned.length, 2, `${question.id}: ${mentioned.join(' / ')}`);
    assert.ok(mentioned.includes(question.correct), question.id);
    if (index % 4 === 3) {
      assert.match(question.prompt.split('\n\n')[1], /^What was the result of \w+'s visit\?$/);
      // The answer is the named pupil's result; the decoy result is the friend's.
      const name = question.correct.split(' ')[0];
      assert.ok(question.passage.includes(question.correct.slice(0, -1)), question.id);
      const decoy = mentioned.find(option => option !== question.correct);
      assert.ok(!question.passage.includes(decoy.slice(0, -1)), `${question.id}: decoy must belong to someone else`);
      assert.ok(question.passage.includes(decoy.slice(name.length + 1, -1)), question.id);
    }
  }
}

// Established IDs and correct answers are unchanged (saved progress).
assert.deepEqual(short.map(question => question.correct), long.map(question => question.correct));
assert.equal(short[1].correct, 'borrow a book about space');
assert.equal(short[22].correct, 'To help the plants grow.');
assert.equal(short[67].correct, 'Leo completed ten laps.');
assert.equal(short[199].correct, 'Riku collected forty responses.');
for (let index = 0; index < short.length; index++) assert.ok(short[index].passage.length < long[index].passage.length);
assert.ok(long[3].passage.includes('Emma found a useful photograph'));
assert.ok(long[3].options.includes('Ken found a useful photograph.'));
assert.equal(long[3].correct, 'Ken found a useful diagram.');

// The practice API serves exactly this bank, and sessions cannot damage it.
assert.deepEqual(getEnglishQuestionBank('SHORT_READING'), short);
const served = getEnglishQuestionBank('SHORT_READING');
served[0].options[1] = 'modified by a session';
assert.ok(!getEnglishQuestionBank('SHORT_READING')[0].options.includes('modified by a session'));
short[0].options[1] = 'modified by a session';
assert.ok(!makeEnglishReadingBank()[0].options.includes('modified by a session'));
console.log('English reading: 400 questions keep IDs and answers, same-topic distractors, one in-passage decoy each, and clear attribution.');
