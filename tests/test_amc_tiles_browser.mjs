// Layout check for every card/tile grid on the AMC hub: tiles in the same row
// must have the same width and height (±2px), tiles in the same grid the same
// width, "uniform" grids the same height throughout, and the action buttons of
// cards in a row must line up at the bottom. Runs at 375 / 768 / 1024 / 1440 px
// for AMC 8 / 10 / 12, Practise / Learn / Registration and zh / en / ja.
// Optional screenshots: AMC_TILES_SHOTS=/dir AMC_TILES_TAG=before|after.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const WIDTHS = [375, 768, 1024, 1440], LEVELS = ['8', '10', '12'], VIEWS = ['practice', 'learn', 'register'], LOCALES = ['zh', 'en', 'ja'];
// selector of the grid, selector of its tiles, and whether every tile in the grid must share one height.
const GRIDS = [
  ['.level-switch', ':scope > button', true],
  ['#view-tabs .hub-tabs', ':scope > button', true],
  ['.course-grid', ':scope > .course-card', true],
  ['.fact-grid', ':scope > .fact', true],
  ['.lesson-grid', ':scope > .lesson-card', true],
  ['.archive-list', ':scope > li', true],
  ['.roadmap', ':scope > .stage', false],
  ['.reg-grid', ':scope > .reg-card', false],
  ['.path-steps', ':scope > li', false],
  ['.reg-jump', ':scope > a', false]
];
const TOLERANCE = 2;
const shots = process.env.AMC_TILES_SHOTS || '', tag = process.env.AMC_TILES_TAG || 'after';
if (shots) await mkdir(shots, { recursive: true });

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
const failures = [];
let measured = 0;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const level of LEVELS) for (const view of VIEWS) for (const locale of LOCALES) {
      await page.goto(`${origin}/amc?lang=${locale}&level=${level}&view=${view}`);
      await page.locator('#view-tabs [data-view]').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const report = await page.evaluate(([grids, tolerance]) => {
        const problems = [];let count = 0;
        const box = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, b: r.bottom + scrollY }; };
        for (const [gridSelector, tileSelector, uniform] of grids) {
          document.querySelectorAll(gridSelector).forEach((grid, gi) => {
            const tiles = [...grid.querySelectorAll(tileSelector)].filter(el => el.offsetParent !== null);
            if (tiles.length < 2) return;
            count++;
            const boxes = tiles.map(box), name = `${gridSelector}#${gi}`;
            const spread = values => Math.max(...values) - Math.min(...values);
            const rows = [];
            for (const [i, b] of boxes.entries()) { const row = rows.find(r => Math.abs(r.y - b.y) <= tolerance); if (row) row.items.push(i); else rows.push({ y: b.y, items: [i] }); }
            const flex = getComputedStyle(grid).display.includes('flex');
            for (const row of rows) {
              const items = row.items.map(i => boxes[i]);
              if (spread(items.map(b => b.h)) > tolerance) problems.push(`${name}: heights in a row differ (${items.map(b => b.h.toFixed(1)).join(', ')})`);
              if (!flex && spread(items.map(b => b.w)) > tolerance) problems.push(`${name}: widths in a row differ (${items.map(b => b.w.toFixed(1)).join(', ')})`);
              // Action buttons sit on one line at the bottom of the cards in a row.
              const actions = row.items.map(i => tiles[i].querySelector(':scope > .card-actions')).filter(Boolean).map(el => el.getBoundingClientRect().bottom);
              if (actions.length > 1 && spread(actions) > tolerance) problems.push(`${name}: card buttons do not line up (${actions.map(v => v.toFixed(1)).join(', ')})`);
            }
            if (!flex && spread(boxes.map(b => b.w)) > tolerance) problems.push(`${name}: tile widths in the grid differ (${boxes.map(b => b.w.toFixed(1)).join(', ')})`);
            if (uniform && spread(boxes.map(b => b.h)) > tolerance) problems.push(`${name}: tile heights in the grid differ (${boxes.map(b => b.h.toFixed(1)).join(', ')})`);
            // Gaps between neighbours in a row are even.
            for (const row of rows) {
              const xs = row.items.map(i => boxes[i]).sort((a, b) => a.x - b.x), gaps = xs.slice(1).map((b, i) => b.x - (xs[i].x + xs[i].w));
              if (gaps.length > 1 && spread(gaps) > tolerance) problems.push(`${name}: uneven gaps (${gaps.map(v => v.toFixed(1)).join(', ')})`);
            }
            // Nothing spills out of a tile.
            for (const [i, tile] of tiles.entries()) if (tile.scrollWidth > tile.clientWidth + 1) problems.push(`${name}: tile ${i} overflows horizontally`);
          });
        }
        return { problems, count, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      }, [GRIDS, TOLERANCE]);
      measured += report.count;
      const where = `${width}px AMC ${level} ${view} ${locale}`;
      if (report.overflow) failures.push(`${where}: page overflows horizontally`);
      for (const problem of report.problems) failures.push(`${where}: ${problem}`);
      if (shots && locale === 'zh' && (width === 375 || width === 1440) && !(view === 'register' && level !== '10')) {
        await page.screenshot({ path: path.join(shots, `${tag}-${width === 375 ? 'mobile' : 'desktop'}-amc${level}-${view}-zh.png`), fullPage: true });
      }
    }
  }
  // Opening a drill card's "Methods and examples" panel grows only its own row.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/amc?lang=zh&level=8`);
  const drills = page.locator('.course-grid').nth(1);
  const before = await drills.locator(':scope > .course-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height));
  await drills.locator('.topic-guide > summary').first().click();
  const after = await drills.locator(':scope > .course-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height));
  if (!(after[0] > before[0] + 50)) failures.push('drill guide did not open');
  if (Math.abs(after[3] - before[3]) > TOLERANCE) failures.push(`an open drill guide stretched the next row (${before[3]} -> ${after[3]})`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) {
  console.error(failures.slice(0, 60).join('\n'));
  const kinds = new Map();
  for (const failure of failures) { const kind = failure.replace(/^\d+px AMC \d+ (\w+) \w+: /, '$1 ').replace(/\s*\(.*$/, ''); kinds.set(kind, (kinds.get(kind) || 0) + 1); }
  console.error('Summary:\n' + [...kinds].sort((a, b) => b[1] - a[1]).map(([kind, n]) => `  ${n} × ${kind}`).join('\n'));
  assert.fail(`${failures.length} tile layout problem(s) on the AMC hub`);
}
console.log(`AMC tiles: ${measured} grids measured across ${WIDTHS.join('/')}px × AMC ${LEVELS.join('/')} × ${VIEWS.length} tabs × ${LOCALES.length} languages; equal tile widths/heights per row and grid, aligned buttons, even gaps, no overflow.`);
