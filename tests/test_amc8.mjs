import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { TOPICS, FAMILIES, amcBank, createSession, gradeResponse, resultFor } from '../src/competitions/PracticeData.mjs';

assert.equal(TOPICS.length, 5);
assert.equal(FAMILIES.length, 30);
for (const topic of TOPICS) {
  const reference = amcBank(topic.id, 'en');
  assert.equal(reference.length, 120);
  for (const locale of ['ja', 'zh', 'en']) {
    const bank = amcBank(topic.id, locale);
    assert.equal(bank.length, 120);
    assert.deepEqual(bank.map(({ id, correct }) => [id, correct]), reference.map(({ id, correct }) => [id, correct]));
    assert.equal(new Set(bank.map(question => question.id)).size, 120);
    for (const question of bank) {
      const response = question.kind === 'multi' ? question.fields.map(field => field.answer) : question.correct;
      assert.equal(gradeResponse(question, response).correct, true, `${topic.id}/${locale}/${question.id}`);
    }
    const session = createSession(bank);
    assert.equal(session.length, 10);
    assert.equal(new Set(session.map(question => question.id)).size, 10);
    assert.equal(new Set(session.map(question => question.family)).size, 6);
  }
}
assert.equal(resultFor(7).passed, false);
assert.equal(resultFor(8).passed, true);
assert.match(await readFile('index.html', 'utf8'), /href="\/amc8\?lang=en"/);
assert.match(await readFile('amc8.html', 'utf8'), /src="\/src\/competitions\/PracticeApp\.mjs"/);
for (const file of ['PracticeApp.mjs', 'PracticeData.mjs', 'PracticeText.mjs', 'AmcCurriculum.mjs', 'EnglishQuestionBank.mjs', 'practice.css']) {
  await access(new URL(`../src/competitions/${file}`, import.meta.url));
}
console.log('AMC 8: 5 topics, 30 families, 600 variants, 3 locales, session integrity and entry assets passed.');
