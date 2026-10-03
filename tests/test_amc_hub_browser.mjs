// Browser check of the AMC hub (amc.html): AMC 8 / 10 / 12 × Practise / Learn /
// Registration × zh / en / ja on mobile and desktop, a real-style set, the
// 25-question mock, state kept across language switches and back/forward, the
// /amc8 redirect and the home-page entries. Screenshots go to
// $AMC_SHOTS (default /workspace/amc-hub-shots, skipped if it cannot be created).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AMC8_AREAS, AMC8_REAL_BANK } from '../src/competitions/AmcBank8.mjs';
import { AMC10_AREAS, AMC10_BANK } from '../src/competitions/AmcBank10.mjs';
import { AMC12_AREAS, AMC12_BANK } from '../src/competitions/AmcBank12.mjs';
import { LESSONS } from '../src/competitions/AmcLessons.mjs';
import { UPPER } from '../src/competitions/AmcUpperLessons.mjs';
import { HUB_TEXT } from '../src/competitions/AmcHubText.mjs';
import { REGISTRATION } from '../src/competitions/AmcRegistration.mjs';
import { ARCHIVE } from '../src/competitions/PracticeData.mjs';

const LEVELS = { 8: { areas: AMC8_AREAS, bank: AMC8_REAL_BANK, lessons: LESSONS }, 10: { areas: AMC10_AREAS, bank: AMC10_BANK, lessons: UPPER[10].lessons }, 12: { areas: AMC12_AREAS, bank: AMC12_BANK, lessons: UPPER[12].lessons } };
const byId = new Map(Object.values(LEVELS).flatMap(l => l.bank).map(p => [p.id, p]));
const locales = ['zh', 'en', 'ja'], views = ['practice', 'learn', 'register'];
let shots = process.env.AMC_SHOTS ?? '/workspace/amc-hub-shots';
try { if (shots) await mkdir(shots, { recursive: true }); } catch { shots = ''; }

const root = path.resolve('dist');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const candidates = pathname.endsWith('/') ? [`${pathname}index.html`] : path.extname(pathname) ? [pathname] : [`${pathname}.html`, `${pathname}/index.html`];
    let file, body;
    for (const candidate of candidates) {
      file = path.resolve(root, `.${candidate}`);
      if (!file.startsWith(root + path.sep)) throw new Error('Path outside dist');
      try { body = await readFile(file); break; } catch {}
    }
    if (!body) throw new Error('Not found');
    response.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  // Signed-out visitor: the Worker answers GET /api/amc/progress with {authenticated:false}.
  await page.route('**/api/amc/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"authenticated":false}' }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  const missing = [];
  page.on('response', response => { if (response.status() === 404) missing.push(`${new URL(page.url()).pathname} -> ${response.url()}`); });
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const shot = async (name, fullPage = true) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage }); };
  const params = () => new URL(page.url()).searchParams;

  // 1. Every level × view × language, on mobile and desktop.
  for (const [device, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
    await page.setViewportSize(viewport);
    for (const level of ['8', '10', '12']) for (const view of views) for (const locale of locales) {
      const where = `${device} AMC ${level} ${view} ${locale}`;
      await page.goto(`${origin}/amc?lang=${locale}&level=${level}&view=${view}`);
      await page.locator('#view-tabs [data-view]').first().waitFor();
      const h = HUB_TEXT[locale];
      assert.equal(await page.locator('#locale').inputValue(), locale, where);
      assert.equal(await page.evaluate(() => document.documentElement.lang), locale === 'zh' ? 'zh-Hans' : locale, where);
      assert.equal(await page.locator('.hero h1').textContent(), h.title, where);
      assert.deepEqual(await page.locator('#view-tabs [data-view]').allTextContents().then(list => list.map(s => s.replace(/^\S+\s/, '').trim())), views.map(v => h.tabs[v]), where);
      assert.equal(await page.locator(`#view-tabs [data-view="${view}"]`).getAttribute('aria-current'), 'page', where);
      assert.equal(await page.locator('[data-level][aria-pressed="true"]').getAttribute('data-level'), level, where);
      assert.equal(await page.locator('[data-school], a[href*="course=jp"]').count(), 0, `${where}: no Japanese school link`);
      const data = LEVELS[level];
      if (view === 'practice') {
        assert.equal(await page.locator('[data-real-card]').count(), data.areas.length, where);
        assert.equal(await page.locator('[data-mock]').count(), 1, where);
        assert.equal(await page.locator('.course-card:has([data-start])').count(), level === '8' ? 5 : 0, where);
        assert.equal(await page.locator('.archive-list a').count(), level === '8' ? ARCHIVE.length : 14, where);
        if (level !== '8') assert.equal(await page.locator(`.archive-list a[href="https://artofproblemsolving.com/wiki/index.php/2025_AMC_${level}A_Problems"]`).count(), 1, where);
      } else if (view === 'learn') {
        assert.equal(await page.locator('.lesson-card').count(), data.lessons.length, where);
        assert.equal(await page.locator('.fact').count(), 6, where);
        assert.equal(await page.locator('.roadmap > .stage').count(), 3, where);
        assert.match(await page.locator('.learn-section').first().textContent(), level === '8' ? /40/ : /75/, where);
      } else {
        assert.equal(await page.locator('.reg-card').count(), 4, where);
        const text = await page.locator('main').textContent();
        assert.ok(text.includes('2026-10-03'), `${where}: last verified date`);
        assert.ok(text.includes(REGISTRATION.path.title[locale].split('：')[0].split(':')[0]), where);
        for (const href of ['https://msa.com.hk/', 'https://www.seedasdan.asia/amc10/', 'https://maa.org/amc-international/', 'https://maa.org/amcreg/']) assert.ok(await page.locator(`.reg-card a[href="${href}"]`).count() >= 1, `${where}: ${href}`);
        assert.ok(await page.locator('.flag-unverified').count() >= 2, `${where}: unverified rows are flagged`);
        assert.ok(await page.locator('.reg-unverified li').count() >= 6, where);
        assert.ok(await page.locator('.reg-table tr.is-current').count() >= 2, `${where}: rows for AMC ${level} are highlighted`);
        assert.equal(await page.locator('a[href*="amcclub"], a[href*="amc12.org.cn"], a[href*="amc10.org.cn"], a[href*="x-new.cn"]').count(), 0, where);
        assert.equal(await page.locator('.path-steps li').count(), 5, where);
        assert.ok((await page.locator('.reg-table td').allTextContents()).some(cell => /JST/.test(cell)), `${where}: Japan time column`);
      }
      assert.equal(await noOverflow(), true, `${where}: no horizontal overflow`);
      if (locale === 'zh' || (level === '10' && view !== 'learn')) await shot(`${device}-amc${level}-${view}-${locale}`);
    }
  }

  // 2. Lesson pages for AMC 10 / 12: every lesson in every language.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const level of ['10', '12']) for (const lesson of UPPER[level].lessons) for (const locale of locales) {
    await page.goto(`${origin}/amc?lang=${locale}&level=${level}&view=learn&lesson=${lesson.id}`);
    await page.locator('.lesson').waitFor();
    assert.equal(await page.locator('#lesson-title').textContent(), lesson.title[locale]);
    assert.equal(await page.locator('.worked-example ol li').count(), lesson.example.steps.length);
    assert.equal(await page.locator('.traps li').count(), lesson.traps.length);
    assert.equal(await page.locator('.lesson-practice [data-real], .lesson-practice [data-mock]').count(), lesson.practice.length, lesson.id);
    assert.equal(await page.locator('.model-list a[href^="https://artofproblemsolving.com/wiki/index.php/"]').count(), lesson.models.length, lesson.id);
    assert.equal(await noOverflow(), true, `${lesson.id} ${locale}`);
    if (locale === 'zh' && lesson === UPPER[level].lessons[0]) await shot(`mobile-amc${level}-lesson-zh`);
  }

  // 3. Language switch keeps level, view and open lesson; back/forward restore the level.
  await page.goto(`${origin}/amc?lang=zh&level=12&view=learn&lesson=a12-trig`);
  await page.locator('.lesson').waitFor();
  await page.selectOption('#locale', 'ja');
  assert.equal(await page.locator('#lesson-title').textContent(), UPPER[12].lessons.find(l => l.id === 'a12-trig').title.ja);
  assert.deepEqual(Object.fromEntries(params()), { lang: 'ja', level: '12', view: 'learn', lesson: 'a12-trig' });
  await page.locator('[data-lesson-list]').click();
  await page.locator('[data-level="10"]').click();
  assert.deepEqual(Object.fromEntries(params()), { lang: 'ja', level: '10', view: 'learn' });
  assert.equal(await page.locator('.lesson-card').count(), 9);
  await page.locator('#view-tabs [data-view="register"]').click();
  assert.equal(params().get('view'), 'register');
  await page.selectOption('#locale', 'en');
  assert.deepEqual(Object.fromEntries(params()), { lang: 'en', level: '10', view: 'register' });
  assert.equal(await page.locator('.reg-card').count(), 4);
  await page.goBack();
  await page.waitForFunction(() => new URLSearchParams(location.search).get('view') === null || new URLSearchParams(location.search).get('view') === 'learn');
  await page.waitForFunction(() => new URLSearchParams(location.search).get('lang') === 'en');
  assert.equal(params().get('view'), 'learn');
  assert.equal(params().get('lang'), 'en', 'the current language wins over older history entries');
  assert.equal(await page.locator('.lesson-card').count(), 9);
  await page.goBack();
  await page.waitForFunction(() => new URLSearchParams(location.search).get('level') === '12' && new URLSearchParams(location.search).get('lang') === 'en');
  assert.equal(params().get('level'), '12');
  assert.equal(await page.locator('[data-level="12"]').getAttribute('aria-pressed'), 'true');

  // 4. Old /amc8 URLs forward to the hub with their state.
  await page.goto(`${origin}/amc8?lang=zh&view=learn&lesson=geometry`);
  await page.waitForURL(`${origin}/amc?lang=zh&level=8&view=learn&lesson=geometry`);
  assert.equal(await page.locator('#lesson-title').textContent(), LESSONS.find(l => l.id === 'geometry').title.zh);
  await page.goto(`${origin}/amc8.html`);
  await page.waitForURL(/\/amc\?(lang=ja&)?level=8$/);
  await page.locator('[data-real-card]').first().waitFor();
  assert.equal(params().get('level'), '8');

  // 5. A real-style set: answer correctly, see the citation and the solution.
  for (const [level, area] of [['10', 'alg'], ['12', 'tc'], ['8', 'geometry']]) {
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${origin}/amc?lang=zh&level=${level}`);
    await page.locator(`[data-real="${area}"]`).click();
    const size = Math.min(10, LEVELS[level].bank.filter(p => p.area === area).length);
    let lastBand = 0;
    for (let i = 0; i < size; i++) {
      const id = await page.locator('[data-problem-id]').getAttribute('data-problem-id');
      const problem = byId.get(id);
      assert.ok(problem && problem.area === area && String(problem.level) === level, id);
      assert.ok(problem.band >= lastBand, 'sets go from easier to harder'); lastBand = problem.band;
      assert.equal(await page.locator('#prompt').textContent(), problem.prompt.zh);
      assert.equal(await page.locator('[data-pick]').count(), 5);
      assert.equal(await page.locator('.citation a').getAttribute('href'), problem.model.url);
      assert.match(await page.locator('.citation').textContent(), new RegExp(`仿照 ${problem.model.contest} 第${problem.model.number}题`));
      if (i === 0 && level === '10') await shot('mobile-amc10-question-zh', false);
      await page.locator(`[data-pick="${problem.answer}"]`).click();
      assert.equal(await page.locator('.options button.right').count(), 1);
      assert.equal(await page.locator('.explanation ol li').count(), problem.steps.length);
      if (i === 0 && level === '10') {
        await shot('mobile-amc10-solution-zh');
        await page.selectOption('#locale', 'ja');
        assert.equal(await page.locator('#prompt').textContent(), problem.prompt.ja, 'an open problem follows the language');
        assert.match(await page.locator('.citation').textContent(), /を参考にしたオリジナル問題/);
        assert.equal(params().get('level'), '10');
        await page.selectOption('#locale', 'zh');
      }
      await page.locator('[data-real-next]').click();
    }
    await page.locator('#result-title').waitFor();
    assert.match(await page.locator('.score-value').textContent(), new RegExp(`${size} / ${size}`));
    assert.equal(await page.locator('.review-item').count(), size);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem('piko-amc-guest:v1') || '{}').progress.real[key].best, `${level}:${area}`), size);
    if (level === '10') await shot('mobile-amc10-set-result-zh');
  }
  // Wrong answer and blank answer paths.
  await page.goto(`${origin}/amc?lang=en&level=12`);
  await page.locator('[data-real="geo"]').click();
  let problem = byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id'));
  await page.locator(`[data-pick="${(problem.answer + 1) % 5}"]`).click();
  assert.equal(await page.locator('.options button.wrong').count(), 1);
  assert.equal(await page.locator('.options button.right').count(), 1);
  assert.equal(await page.locator('#feedback').getAttribute('data-state'), 'wrong');
  await page.locator('[data-real-next]').click();
  problem = byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id'));
  await page.locator('[data-blank]').click();
  assert.equal(await page.locator('#feedback').textContent(), HUB_TEXT.en.blanked);
  assert.equal(await page.locator('.options button.right').count(), 1);
  await page.locator('[data-hub]').click();
  assert.equal(await page.locator('[data-real-card]').count(), AMC12_AREAS.length);

  // 6. The 25-question mock: AMC 10/12 scoring 6 / 1.5 / 0 and the AIME line.
  for (const [device, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}/amc?lang=zh&level=12`);
    await page.locator('[data-mock]').click();
    assert.equal(await page.locator('.palette button').count(), 25);
    assert.match(await page.locator('#mock-timer').textContent(), /^7[45]:\d\d$/);
    const ids = new Set();
    let lastBand = 0;
    for (let i = 0; i < 25; i++) {
      const id = await page.locator('[data-problem-id]').getAttribute('data-problem-id');
      const p = byId.get(id); ids.add(id);
      assert.equal(String(p.level), '12');
      assert.ok(p.band >= lastBand, 'mock goes from easier to harder'); lastBand = p.band;
      if (i < 20) await page.locator(`[data-pick="${p.answer}"]`).click();
      if (i === 3 && device === 'mobile') await shot('mobile-amc12-mock-zh', false);
      if (i === 3 && device === 'desktop') await shot('desktop-amc12-mock-zh', false);
      if (i < 24) await page.locator('.mock-nav [data-mock-go]').last().click();
    }
    assert.equal(ids.size, 25, 'no repeated problems in a mock');
    assert.equal(await page.locator('.palette button.answered').count(), 20);
    // Answers can be changed: revisit question 1, untick, re-tick.
    await page.locator('.palette [data-mock-go="0"]').click();
    const first = byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id'));
    await page.locator(`[data-pick="${first.answer}"]`).click();
    assert.equal(await page.locator('.palette button.answered').count(), 19);
    await page.locator(`[data-pick="${first.answer}"]`).click();
    await page.locator('.mock-q, .question').locator('[data-finish]').last().click();
    await page.locator('#result-title').waitFor();
    assert.match(await page.locator('.score-value').textContent(), /127\.5 \/ 150/);
    assert.equal(await page.locator('.aime-line').textContent(), HUB_TEXT.zh.aimeYes[12]);
    assert.equal(await page.locator('.review-item').count(), 25);
    await page.locator('.review-item').first().locator('summary').click();
    await shot(`${device}-amc12-mock-result-zh`);
    assert.equal(await noOverflow(), true, `${device} mock result`);
  }
  // AMC 8 mock: 40 minutes, 1 point each, no penalty.
  await page.goto(`${origin}/amc?lang=en&level=8`);
  await page.locator('[data-mock]').click();
  assert.match(await page.locator('#mock-timer').textContent(), /^(40:00|39:5\d)$/);
  for (let i = 0; i < 25; i++) {
    const p = byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id'));
    await page.locator(`[data-pick="${p.answer}"]`).click();
    if (i < 24) await page.locator('.mock-nav [data-mock-go]').last().click();
  }
  await page.locator('.mock-nav [data-finish]').click();
  assert.match(await page.locator('.score-value').textContent(), /25 \/ 25/);

  // 7. Lesson buttons start the matching practice.
  await page.goto(`${origin}/amc?lang=zh&level=10&view=learn&lesson=a10-counting`);
  await page.locator('.lesson-practice [data-real="cp"]').click();
  assert.equal(byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id')).area, 'cp');
  assert.equal(params().get('view'), null);
  assert.equal(params().get('level'), '10');
  await page.goto(`${origin}/amc?lang=zh&level=10&view=learn&lesson=a10-strategy`);
  await page.locator('.lesson-practice [data-mock]').click();
  assert.equal(await page.locator('.palette button').count(), 25);

  assert.deepEqual(errors, [], 'no page errors on the AMC hub');
  assert.deepEqual(missing, [], 'no missing files on the AMC hub');

  // 8. Entries from the home pages say AMC and open the hub (home pages may call /api, which this static server does not serve).
  await page.goto(`${origin}/`);
  assert.equal(await page.locator('a[href^="/amc8"]').count(), 0, 'no links to the old /amc8 URL');
  for (const locale of locales) {
    await page.goto(`${origin}/${locale}/`);
    const entry = page.locator(`main a[href="/amc?lang=${locale}"]`);
    assert.equal(await entry.count(), 1);
    assert.match(await entry.textContent(), /AMC/);
    assert.doesNotMatch(await entry.textContent(), /^AMC 8\b(?! ·)/);
  }
  console.log(`AMC hub browser: 3 levels × 3 views × 3 languages on mobile and desktop, 18 AMC 10/12 lessons × 3 languages, state across language switches and history, /amc8 redirect, real-style sets with citations, wrong/blank paths, 25-question mocks (AMC 12 scoring + AIME line, AMC 8 scoring) and home entries passed.${shots ? ` Screenshots: ${shots}` : ''}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
