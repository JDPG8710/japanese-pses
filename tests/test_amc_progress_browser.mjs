// Browser check of account-bound AMC progress on the built hub (dist/amc.html).
// /api/amc/* is served by an in-test fake that applies the same shared model
// the Worker mirrors (worker/amc-progress.mjs is covered by
// test_amc_progress_api.mjs against real D1). Scenarios:
//   1. signed out: old localStorage keys still show, trilingual sign-in prompt,
//      changes stay local, nothing is POSTed;
//   2. first sign-in: local progress merged into the account once, guest copy
//      cleared, banner says synced/merged;
//   3. signed in: a finished real-style set and lesson toggles are saved
//      (debounced into one request), a failing save retries and recovers;
//   4. sign-out on the same browser shows none of the previous user's results;
//   5. a second account sees only its own data (no re-merge);
//   6. after Google sign-in the home page sends the learner back to /amc.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { AMC12_BANK } from '../src/competitions/AmcBank12.mjs';
import { HUB_TEXT } from '../src/competitions/AmcHubText.mjs';
import { emptyProgress, validateEvent, applyEvent, validateSnapshot, applySnapshot, LEGACY_KEYS } from '../src/competitions/AmcProgressModel.mjs';

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

// ---- fake /api/amc ----
const accounts = new Map(), seen = new Map(), imports = new Set(), log = [];
let signedIn = null, failWrites = 0;
const account = id => { if (!accounts.has(id)) accounts.set(id, emptyProgress()); if (!seen.has(id)) seen.set(id, new Set()); return accounts.get(id); };
async function api(route) {
  const request = route.request(), url = new URL(request.url()), method = request.method();
  const body = request.postData() ? JSON.parse(request.postData()) : null;
  log.push({ method, path: url.pathname, body, user: signedIn });
  const reply = (status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  if (url.pathname === '/api/amc/progress' && method === 'GET') return signedIn ? reply(200, { authenticated: true, user: { id: signedIn, displayName: signedIn.split(':')[1] }, progress: account(signedIn) }) : reply(200, { authenticated: false });
  if (!signedIn) return reply(401, { error: 'LOGIN_REQUIRED' });
  if (failWrites > 0) { failWrites--; return reply(503, { error: 'DOWN' }); }
  const progress = account(signedIn);
  if (url.pathname === '/api/amc/progress') {
    for (const raw of body.events) { const event = validateEvent(raw); if (event && !seen.get(signedIn).has(event.id)) { seen.get(signedIn).add(event.id); applyEvent(progress, event); } }
    return reply(200, { progress, accepted: body.events.map(e => e.id), rejected: [] });
  }
  if (url.pathname === '/api/amc/import') {
    const key = `${signedIn}|${body.importId}`;
    if (!imports.has(key)) { imports.add(key); applySnapshot(progress, validateSnapshot(body.snapshot)); }
    return reply(200, { progress, imported: true });
  }
  return reply(404, { error: 'NOT_FOUND' });
}
const posts = (from = 0) => log.slice(from).filter(entry => entry.method === 'POST');

let browser, checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/api/amc/**', api);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && new URL(page.url()).pathname.startsWith('/amc')) errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
  const banner = () => page.locator('.hub-hero [data-amc-account]');
  const pill = async area => (await page.locator(`[data-real-card="${area}"] .pill`).textContent()).trim();
  const storageKeys = () => page.evaluate(() => Object.keys(localStorage));
  const waitSync = async (text = 'synced') => { try { await page.waitForFunction(state => document.querySelector('[data-amc-account]')?.dataset.sync === state, text, { timeout: 15000 }); } catch (error) { console.error('waitSync failed at', page.url(), await page.locator('[data-amc-account]').first().evaluate(el => el.outerHTML).catch(() => 'no banner'), JSON.stringify(log.slice(-4)), errors); throw error; } };

  // 1. Signed out, with progress saved by the previous (browser-only) version of the hub.
  await page.goto(`${origin}/amc?lang=en&level=10`);
  await page.evaluate(([real, mock, lessons, drill]) => {
    localStorage.clear();
    localStorage.setItem(real, '6'); localStorage.setItem(mock, '84'); localStorage.setItem(lessons, JSON.stringify(['geometry'])); localStorage.setItem(drill, '7');
  }, [LEGACY_KEYS.real('10', 'alg'), LEGACY_KEYS.mock('12'), LEGACY_KEYS.lessons[8], LEGACY_KEYS.drill('number')]);
  for (const locale of ['zh', 'en', 'ja']) {
    await page.goto(`${origin}/amc?lang=${locale}&level=10`);
    await page.locator('.hub-hero [data-amc-account="guest"]').waitFor();
    const text = await banner().textContent();
    ok(text.includes(HUB_TEXT[locale].account.guestTitle) && text.includes(HUB_TEXT[locale].account.guestBody), `signed-out prompt in ${locale}`);
    ok((await banner().locator('[data-login]').textContent()).trim() === HUB_TEXT[locale].account.login, `sign-in button in ${locale}`);
    ok((await page.locator('#practice-footer p').first().textContent()) === HUB_TEXT[locale].account.footerGuest, `footer explains browser-only saving in ${locale}`);
  }
  ok(/6\/10/.test(await pill('alg')), 'old browser progress still shown while signed out');
  let keys = await storageKeys();
  ok(keys.includes('piko-amc-guest:v1') && !keys.some(k => k.startsWith('piko-amc-real:') || k.startsWith('piko-amc8-lessons') || k.startsWith('piko-independent-practice')), 'old keys moved into the guest store');
  await page.goto(`${origin}/amc?lang=en&level=12&view=learn&lesson=a12-logs`);
  await page.locator('.mark-done').click();
  ok(posts().length === 0, 'signed-out changes are never sent');
  await page.locator('[data-login]').first().waitFor();
  await page.goto(`${origin}/amc?lang=en&level=12`);
  ok(/84\/150/.test(await page.locator('.mock-card .pill').textContent()), 'mock best shown');
  await page.locator('.hub-hero [data-login]').click();
  await page.locator('.hub-hero [data-login-note]:not([hidden])').waitFor();
  ok((await page.evaluate(() => sessionStorage.getItem('piko-auth-return'))) === '/amc?lang=en&level=12', 'sign-in remembers where to come back to');

  // 6. (early, needs the remembered path) OAuth returns to /?auth=success → back to the hub.
  await page.goto(`${origin}/?auth=success`);
  await page.waitForURL(/\/amc\?lang=en&level=12$/, { timeout: 15000 });
  ok(true, 'home page sent the learner back to /amc after sign-in');
  await page.evaluate(() => sessionStorage.setItem('piko-auth-return', 'https://evil.example/'));
  await page.goto(`${origin}/?auth=success`);
  await page.waitForTimeout(300);
  ok(new URL(page.url()).pathname !== '/amc' && !page.url().includes('evil'), 'return path is allow-listed');

  // 2. First sign-in on this browser: the account already has some progress.
  accounts.set('google:alice', applySnapshot(emptyProgress(), validateSnapshot({ real: { '10:alg': 8, '12:cp': 2 }, lessons: { 8: ['logic'] } })));
  signedIn = 'google:alice';
  let mark = log.length;
  await page.goto(`${origin}/amc?lang=zh&level=10`);
  await waitSync();
  const alice = accounts.get('google:alice');
  ok(posts(mark).filter(entry => entry.path === '/api/amc/import').length === 1, 'local progress imported once');
  ok(alice.real['10:alg'].best === 8 && alice.mock[12].best === 84 && alice.drill.number.best === 7, 'best of account and browser kept');
  ok(alice.lessons[8].geometry.done && alice.lessons[8].logic.done && alice.lessons[12]['a12-logs'].done, 'completed lessons united');
  ok(/8\/10/.test(await pill('alg')), 'hub shows the account best');
  const text = await banner().textContent();
  ok(text.includes(HUB_TEXT.zh.account.user('alice')) && text.includes(HUB_TEXT.zh.account.synced) && text.includes(HUB_TEXT.zh.account.merged), 'signed-in banner: name, synced, merged');
  keys = await storageKeys();
  ok(!keys.includes('piko-amc-guest:v1') && keys.includes('piko-amc-migrated:v1'), 'guest copy cleared and marked migrated');
  mark = log.length;
  await page.reload(); await waitSync();
  ok(posts(mark).length === 0, 'no second import on reload');

  // 3. Signed in: a finished real-style set is saved to the account.
  await page.goto(`${origin}/amc?lang=en&level=12`);
  await waitSync();
  await page.locator('[data-real="cp"]').click();
  const byId = new Map(AMC12_BANK.map(problem => [problem.id, problem]));
  for (let i = 0; i < 8; i++) {
    const problem = byId.get(await page.locator('[data-problem-id]').getAttribute('data-problem-id'));
    await page.locator(`[data-pick="${problem.answer}"]`).click();
    await page.locator('[data-real-next]').click();
  }
  await page.locator('#result-title').waitFor();
  ok(await page.locator('.save-note [data-amc-account="user"]').count() === 1, 'result screen shows the account save status');
  await page.waitForFunction(() => document.querySelector('.save-note [data-amc-account]')?.dataset.sync === 'synced', null, { timeout: 15000 });
  ok(alice.real['12:cp'].best === 8 && alice.real['12:cp'].attempts === 2, 'set result saved to the account');
  // Quick lesson toggles are debounced into one request; a failed save retries.
  await page.goto(`${origin}/amc?lang=en&level=10&view=learn&lesson=a10-algebra`);
  await waitSync();
  mark = log.length;
  failWrites = 1;
  await page.locator('.mark-done').click();
  await page.locator('.mark-done').click();
  await page.locator('.mark-done').click();
  await page.waitForFunction(() => document.querySelector('.mark-done') && JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('piko-amc-user:v1:'))) || '{}').queue?.length === 3);
  await page.goto(`${origin}/amc?lang=en&level=10`);
  await page.waitForFunction(() => ['retrying', 'synced'].includes(document.querySelector('.hub-hero [data-amc-account]')?.dataset.sync), null, { timeout: 15000 });
  await waitSync();
  const writes = posts(mark).filter(entry => entry.path === '/api/amc/progress');
  ok(writes.length >= 2 && writes.at(-1).body.events.length === 3, 'three toggles sent together, retried after a failure');
  ok(alice.lessons[10]['a10-algebra'].done === true, 'final lesson state saved (last write wins)');

  // 4. Sign out: the next person on this browser sees nothing of Alice.
  signedIn = null;
  await page.goto(`${origin}/amc?lang=en&level=10`);
  await page.locator('.hub-hero [data-amc-account="guest"]').waitFor();
  ok(/0\/10/.test(await pill('alg')), 'signed out: no previous-user score');
  await page.goto(`${origin}/amc?lang=en&level=8&view=learn`);
  ok(await page.locator('.lesson-card.is-done').count() === 0, 'signed out: no previous-user lessons');
  ok(!(await page.evaluate(() => Object.entries(localStorage).some(([k, v]) => k.startsWith('piko-amc-user:') && v.includes('"best"')))), 'cached account progress removed from the browser');

  // 5. Another account on the same browser: only its own data, no re-merge.
  signedIn = 'google:bob';
  mark = log.length;
  await page.goto(`${origin}/amc?lang=ja&level=10`);
  await waitSync();
  ok(/0\/10/.test(await pill('alg')) && posts(mark).length === 0, 'Bob sees only his own (empty) progress; nothing merged');
  ok(Object.keys(account('google:bob').real).length === 0, 'Bob\'s account untouched');
  ok((await banner().textContent()).includes(HUB_TEXT.ja.account.user('bob')), 'Bob banner in Japanese');

  // The one deliberate 503 (retry check) is the only console error allowed.
  assert.deepEqual(errors.filter(text => !/status of 503/.test(text)), [], 'no page errors on the AMC hub');
  console.log(`AMC account progress browser: ${checks} checks passed (signed-out prompt ×3 languages, legacy data, one-time merge, signed-in sync with debounce + retry, logout privacy, second account isolation, return after sign-in).`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
