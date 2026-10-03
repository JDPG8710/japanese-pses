import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { amcBank, TOPICS } from '../src/competitions/PracticeData.mjs';
import { LESSONS, LEARN_TEXT, LESSON_KEY } from '../src/competitions/AmcLessons.mjs';
import { HUB_TEXT } from '../src/competitions/AmcHubText.mjs';

const root = path.resolve('dist');
const server = createServer(async (request, response) => {
  try {
    // Mirror Cloudflare Pages: /amc serves amc.html and /zh/ serves zh/index.html.
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const candidates = pathname.endsWith('/') ? [`${pathname}index.html`] : path.extname(pathname) ? [pathname] : [`${pathname}.html`, `${pathname}/index.html`];
    let file, body;
    for (const candidate of candidates) {
      file = path.resolve(root, `.${candidate}`);
      if (!file.startsWith(root + path.sep)) throw new Error('Path outside dist');
      try { body = await readFile(file); break; } catch {}
    }
    if (!body) throw new Error('Not found');
    response.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = process.env.AMC8_TEST_ORIGIN || `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // Signed-out visitor: the Worker answers GET /api/amc/progress with {authenticated:false}.
  await page.route('**/api/amc/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"authenticated":false}' }));
  const drillCards = '.course-card:has([data-start])';
  for (const locale of ['ja', 'zh', 'en']) {
    // The old AMC 8 address forwards to the AMC hub at level 8.
    await page.goto(`${origin}/amc8.html?lang=${locale}`);
    await page.waitForURL(`${origin}/amc?lang=${locale}&level=8`);
    assert.equal(await page.locator(drillCards).count(), 5);
    assert.equal(await page.locator('[data-level="8"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-other-course]').isVisible(), false);
    assert.equal(await page.locator('[data-school], a[href*="course=jp"]').count(), 0, 'AMC has no link to the Japanese school course');
    assert.equal(await page.locator('.topbar a.brand[href="/index.html"]').count(), 1, 'the brand still links home');
    assert.equal(await page.locator('#locale').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  await page.goto(`${origin}/amc?lang=ja&level=8`);
  await page.locator('[data-start="number"]').click();
  const bank = new Map(amcBank('number', 'en').map(question => [question.id, question]));
  for (let index = 0; index < 10; index++) {
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
    const question = bank.get(id);
    assert.ok(question, id);
    if (question.kind === 'choice') {
      await page.locator('[data-answer]').filter({ hasText: question.correct }).click();
    } else if (question.kind === 'order') {
      for (let target = 0; target < question.correct.length; target++) {
        let values = await page.locator('.order-value').allTextContents();
        let from = values.indexOf(question.correct[target]);
        while (from > target) {
          await page.locator(`[data-move="${from}"][data-direction="-1"]`).click();
          from--;
        }
      }
      await page.locator('[data-submit]').click();
    } else {
      const answers = question.kind === 'multi' ? question.fields.map(field => field.answer) : [question.correct];
      for (let field = 0; field < answers.length; field++) await page.locator(`[data-field="${field}"]`).fill(String(answers[field]));
      await page.locator('#answer-form button[type="submit"]').click();
    }
    await page.locator('[data-next]').click();
  }
  assert.match(await page.locator('.result strong').first().textContent(), /10/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('piko-amc-guest:v1') || '{}').progress?.drill?.number?.best), 10, 'signed-out drill best kept in the browser guest store');
  await page.goto(`${origin}/`);
  assert.equal(await page.locator('.about-play-actions a[href="/amc?lang=en"]').count(), 1);
  await page.locator('#country-home-play-now').click();
  await page.locator('#country-amc').waitFor();
  assert.match(await page.locator('#country-amc').getAttribute('href'), /^\/amc\?lang=/);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${origin}/amc?lang=en&level=8`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

  // Regression: switching the home page language (/ → /en/, /zh/, /ja/) used to
  // drop the AMC entry. Every localized home page must lead to working practice
  // in its own language, and switching language inside AMC must keep /amc and the level.
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const numberPrompts = Object.fromEntries(['ja', 'zh', 'en'].map(locale => [locale, new Map(amcBank('number', locale).map(q => [q.id, q.prompt]))]));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ['en', 'zh', 'ja']) {
    await page.goto(`${origin}/`);
    await page.locator(`.about-nav a[href="/${locale}/"]`).click();
    await page.waitForURL(`${origin}/${locale}/`);
    const entry = page.locator(`main a[href="/amc?lang=${locale}"]`);
    assert.equal(await entry.count(), 1, `/${locale}/ must link to AMC`);
    await entry.click();
    await page.waitForURL(`${origin}/amc?lang=${locale}&level=8`);
    await page.locator(drillCards).first().waitFor();
    assert.equal(await page.locator(drillCards).count(), 5, `/${locale}/ → AMC 8 shows practice`);
    assert.equal(await page.locator('#locale').inputValue(), locale);
    assert.equal(await page.locator('.hero h1').textContent(), HUB_TEXT[locale].title);
    await page.locator('[data-start="number"]').click();
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
    assert.equal(await page.locator('#prompt').textContent(), numberPrompts[locale].get(id));
    for (const next of ['ja', 'zh', 'en'].filter(value => value !== locale)) {
      await page.selectOption('#locale', next);
      assert.equal(await page.locator('#prompt').textContent(), numberPrompts[next].get(id), 'the open question follows the language');
      assert.equal(new URL(page.url()).pathname, '/amc');
      assert.equal(new URL(page.url()).searchParams.get('level'), '8');
      assert.equal(new URL(page.url()).searchParams.get('lang'), next);
    }
    await page.locator('[data-hub]').first().click();
    assert.equal(await page.locator(drillCards).count(), 5);
    await page.reload();
    assert.equal(await page.locator(drillCards).count(), 5, 'reload after a language switch keeps practice');
    assert.equal(await noOverflow(), true);
  }
  await page.goto(`${origin}/?choose-country=1`);
  await page.locator('#country-amc').click();
  await page.waitForURL(/\/amc\?lang=(en|zh|ja)&level=8$/);
  assert.equal(await page.locator(drillCards).count(), 5, 'country picker → AMC shows practice');

  // Learn view: same level as practice, deep-linkable, translated, with local progress.
  await page.evaluate(() => localStorage.removeItem('piko-amc-guest:v1'));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ['zh', 'en', 'ja']) {
      const words = LEARN_TEXT[locale];
      await page.goto(`${origin}/amc?lang=${locale}&level=8`);
      await page.locator(`#view-tabs [data-view="learn"]`).click();
      assert.equal(new URL(page.url()).searchParams.get('view'), 'learn');
      assert.equal(await page.locator('#view-tabs [data-view="learn"]').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('.topbar #view-tabs [data-view]').count(), 3, 'Practise / Learn / Registration tabs sit in the sticky top bar');
      assert.equal(await page.locator('.lesson-card').count(), LESSONS.length);
      assert.equal(await page.locator('.fact').count(), 6);
      assert.equal(await page.locator('.roadmap > .stage').count(), 3);
      assert.match(await page.locator('.learn-section').first().textContent(), /25/);
      assert.match(await page.locator('.learn-section').first().textContent(), /40/);
      assert.equal(await page.locator('.sources a[href^="https://maa.org/"]').count(), 2);
      assert.equal(await noOverflow(), true, `learn ${locale} ${width}`);
      for (const lesson of LESSONS) {
        await page.goto(`${origin}/amc?lang=${locale}&level=8&view=learn&lesson=${lesson.id}`);
        await page.locator('.lesson').waitFor();
        assert.equal(await page.locator('#lesson-title').textContent(), lesson.title[locale]);
        assert.equal(await page.locator('.worked-example ol li').count(), lesson.example.steps.length);
        assert.equal(await page.locator('.traps li').count(), lesson.traps.length);
        assert.equal(await page.locator('.lesson-practice [data-start]').count(), lesson.practice.length);
        for (const topic of lesson.practice) assert.ok(TOPICS.some(t => t.id === topic));
        assert.equal(await noOverflow(), true, `lesson ${lesson.id} ${locale} ${width}`);
      }
      assert.equal(await page.locator('.mark-done').textContent(), words.markDone);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/amc?lang=zh&level=8&view=learn`);
  await page.locator('[data-lesson="geometry"]').last().click();
  assert.equal(new URL(page.url()).searchParams.get('lesson'), 'geometry');
  await page.locator('.mark-done').click();
  assert.deepEqual(await page.evaluate(() => Object.entries(JSON.parse(localStorage.getItem('piko-amc-guest:v1') || '{}').progress.lessons['8']).filter(([, v]) => v.done).map(([id]) => id)), ['geometry']);
  assert.equal(await page.locator('.mark-done').textContent(), LEARN_TEXT.zh.markUndo);
  await page.selectOption('#locale', 'ja');
  assert.equal(await page.locator('#lesson-title').textContent(), LESSONS.find(l => l.id === 'geometry').title.ja, 'language switch keeps the open lesson');
  assert.equal(new URL(page.url()).searchParams.get('lesson'), 'geometry');
  await page.goBack();
  assert.equal(await page.locator('.lesson-card').count(), LESSONS.length, 'back returns to the lesson list');
  assert.match(await page.locator('[data-lesson-card="geometry"]').textContent(), /✓/);
  await page.reload();
  assert.match(await page.locator('[data-lesson-card="geometry"]').textContent(), /✓/, 'lesson progress survives a reload');
  await page.locator('[data-lesson="counting"]').last().click();
  await page.locator('.lesson-practice [data-start="counting"]').click();
  assert.ok(await page.locator('[data-question-id^="amc-v2-"]').count(), 'lesson practice link opens the question bank');
  assert.equal(new URL(page.url()).searchParams.get('level'), '8');
  assert.equal(await page.locator('#view-tabs').isHidden(), true, 'tabs are hidden during a question set');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).position), 'sticky');
  assert.equal(new URL(page.url()).searchParams.get('view'), null);
  await page.locator('[data-hub]').first().click();
  assert.equal(await page.locator(drillCards).count(), 5);
  await page.locator('[data-start="geometry"] ~ [data-lesson="geometry"]').click();
  assert.equal(await page.locator('#lesson-title').textContent(), LESSONS.find(l => l.id === 'geometry').title.ja, 'practice card links to its lesson');
  console.log('AMC 8 (in the AMC hub) browser: /amc8 redirect, three locales, mobile layout, 10-question completion, saved score, home entry from /, /en/, /zh/, /ja/ and the country picker, language switching, and the learn view (facts, roadmap, 7 lessons × 3 languages, progress, deep links) passed.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
