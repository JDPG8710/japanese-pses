import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { amcBank } from '../src/competitions/PracticeData.mjs';

const root = path.resolve('dist');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + path.sep)) throw new Error('Path outside dist');
    const body = await readFile(file);
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
  for (const locale of ['ja', 'zh', 'en']) {
    await page.goto(`${origin}/amc8.html?lang=${locale}`);
    assert.equal(await page.locator('.course-card').count(), 5);
    assert.equal(await page.locator('[data-other-course]').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  await page.goto(`${origin}/amc8.html?lang=ja`);
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
  assert.equal(await page.evaluate(() => localStorage.getItem('piko-independent-practice:v1:amc8:number')), '10');
  await page.goto(`${origin}/`);
  assert.equal(await page.locator('.about-play-actions a[href="/amc8?lang=en"]').count(), 1);
  await page.locator('#country-home-play-now').click();
  await page.locator('#country-amc8').waitFor();
  assert.match(await page.locator('#country-amc8').getAttribute('href'), /^\/amc8\?lang=/);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${origin}/amc8.html?lang=en`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  console.log('AMC 8 browser: three locales, mobile layout, 10-question completion, saved score and home entry passed.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
