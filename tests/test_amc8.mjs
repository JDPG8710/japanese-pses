import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { TOPICS, FAMILIES, amcBank, createSession, gradeResponse, resultFor } from '../src/competitions/PracticeData.mjs';
import { LESSONS, STAGES, FACTS, SOURCES, LEARN_TEXT, lessonForTopic } from '../src/competitions/AmcLessons.mjs';

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
assert.match(await readFile('index.html', 'utf8'), /href="\/amc\?lang=en"/);
assert.match(await readFile('amc.html', 'utf8'), /src="\/src\/competitions\/AmcHubApp\.mjs"/);
// The old AMC 8 URL forwards to the hub (level 8) and keeps lang/view/lesson.
const amc8Stub = await readFile('amc8.html', 'utf8');
assert.match(amc8Stub, /location\.replace\('\/amc\?'/);
assert.match(amc8Stub, /o\.set\('level','8'\)/);
assert.match(amc8Stub, /noindex,follow/);
assert.doesNotMatch(amc8Stub, /course=jp|data-school/);
// Learning guide: every text has natural zh/en/ja, every lesson links to real practice.
const locales = ['zh', 'en', 'ja'];
const checkText = (value, where) => {
  if (value && typeof value === 'object' && locales.some(locale => locale in value)) {
    for (const locale of locales) assert.ok(typeof value[locale] === 'string' && value[locale].trim(), `${where}.${locale}`);
    return;
  }
  if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) checkText(inner, `${where}.${key}`);
};
checkText(LESSONS, 'lessons'); checkText(STAGES, 'stages'); checkText(FACTS, 'facts'); checkText(SOURCES, 'sources');
assert.equal(LESSONS.length, 7);
assert.equal(new Set(LESSONS.map(lesson => lesson.id)).size, 7);
for (const lesson of LESSONS) {
  assert.ok(STAGES.some(stage => stage.id === lesson.stage), lesson.id);
  assert.ok(lesson.practice.length && lesson.practice.every(topic => TOPICS.some(t => t.id === topic)), lesson.id);
  assert.ok(lesson.families.every(id => FAMILIES.some(f => f.id === id)), lesson.id);
  assert.ok(lesson.ideas.length >= 3 && lesson.example.steps.length >= 3 && lesson.traps.length >= 2, lesson.id);
}
for (const stage of STAGES) for (const id of stage.lessons) assert.ok(LESSONS.some(lesson => lesson.id === id), id);
assert.deepEqual(STAGES.flatMap(stage => stage.lessons).sort(), LESSONS.map(lesson => lesson.id).sort());
for (const topic of TOPICS) assert.ok(LESSONS.some(lesson => lesson.id === lessonForTopic(topic.id)), topic.id);
for (const locale of ['zh', 'ja']) assert.deepEqual(Object.keys(LEARN_TEXT[locale]).sort(), Object.keys(LEARN_TEXT.en).sort());
assert.ok(SOURCES.every(source => source.url.startsWith('https://')));
for (const file of ['AmcLessons.mjs', 'AmcHubApp.mjs', 'AmcHubText.mjs', 'AmcRegistration.mjs', 'AmcUpperLessons.mjs', 'amc-hub.css', 'PracticeApp.mjs', 'PracticeData.mjs', 'PracticeText.mjs', 'AmcCurriculum.mjs', 'EnglishQuestionBank.mjs', 'practice.css']) {
  await access(new URL(`../src/competitions/${file}`, import.meta.url));
}
console.log('AMC 8: 5 topics, 30 families, 600 variants, 3 locales, session integrity, 7 trilingual lessons in 3 stages and entry assets passed.');
