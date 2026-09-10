/**
 * Production error monitor for https://piko-game.com
 *
 * Lightweight, read-only checks for Task Scheduler / cron / CI.
 * Does not mutate production data and does not require Playwright.
 *
 * Usage:
 *   node scripts/monitor-production.mjs
 *   BASE_URL=https://piko-game.com MONITOR_TIMEOUT_MS=15000 node scripts/monitor-production.mjs
 *
 * Windows Task Scheduler (every 5 minutes, from repo root):
 *   powershell -ExecutionPolicy Bypass -File .\scripts\register-monitor-task.ps1
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = (process.env.BASE_URL || 'https://piko-game.com').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.MONITOR_TIMEOUT_MS || 15000);
const OUT_DIR = join(ROOT, '.wrangler', 'monitor');

const CHECKS = [
  {
    id: 'home',
    path: '/',
    expectStatus: 200,
    assert: (text) => {
      if (!text.includes('ConsentManager') && !text.includes('consent') && !text.includes('まなび') && !text.includes('Piko')) {
        throw new Error('home HTML missing expected markers');
      }
    },
  },
  {
    id: 'health',
    path: '/api/health',
    expectStatus: 200,
    assert: (text) => {
      const data = JSON.parse(text);
      if (data.ok !== true) throw new Error(`health not ok: ${text.slice(0, 200)}`);
      if (data.service && data.service !== 'japanese-pses') {
        throw new Error(`unexpected service: ${data.service}`);
      }
    },
  },
  {
    id: 'location',
    path: '/api/location',
    expectStatus: 200,
    assert: (text) => {
      const data = JSON.parse(text);
      if (data == null || typeof data !== 'object') throw new Error('location body not an object');
    },
  },
  {
    id: 'game-data-manifest',
    path: '/api/game-data/manifest.json',
    expectStatus: 200,
    assert: (text) => {
      const data = JSON.parse(text);
      if (data == null || typeof data !== 'object') throw new Error('manifest not an object');
    },
  },
  {
    id: 'foundation-leaderboard',
    path: '/api/foundation/leaderboard?profile=CN63&year=Y1&lesson=add20&locale=zh',
    expectStatus: 200,
    assert: (text) => {
      const data = JSON.parse(text);
      if (!Array.isArray(data.entries)) throw new Error('leaderboard.entries missing');
    },
  },
  {
    id: 'world-leaderboard',
    path: '/api/world/leaderboard?game=circuit&level=1',
    expectStatus: 200,
    assert: (text) => {
      const data = JSON.parse(text);
      if (!Array.isArray(data.entries)) throw new Error('world leaderboard.entries missing');
    },
  },
  {
    id: 'auth-session-anonymous',
    path: '/api/auth/session',
    expectStatus: [200, 401],
    assert: (text, response) => {
      const data = JSON.parse(text);
      if (response.status === 401 && data.authenticated !== false) {
        throw new Error(`expected authenticated:false, got ${text.slice(0, 180)}`);
      }
    },
  },
  {
    id: 'foundation-start-rejects-anonymous',
    path: '/api/foundation/start',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: BASE_URL,
    },
    body: JSON.stringify({ profile: 'CN63', year: 'Y1', lesson: 'add20', locale: 'zh' }),
    expectStatus: 401,
    assert: () => {},
  },
];

async function runCheck(check) {
  const url = BASE_URL + check.path;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: check.method || 'GET',
      headers: {
        'cache-control': 'no-cache',
        ...(check.headers || {}),
      },
      body: check.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    const ms = Date.now() - started;
    const expected = Array.isArray(check.expectStatus) ? check.expectStatus : [check.expectStatus];
    if (!expected.includes(response.status)) {
      throw new Error(`expected ${expected.join('|')}, got ${response.status}; body=${text.slice(0, 180)}`);
    }
    if (check.assert) check.assert(text, response);
    return { id: check.id, ok: true, status: response.status, ms, url };
  } catch (error) {
    return {
      id: check.id,
      ok: false,
      status: null,
      ms: Date.now() - started,
      url,
      error: error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? `timeout after ${TIMEOUT_MS}ms`
        : String(error?.message || error),
    };
  }
}

const startedAt = new Date();
const results = [];
for (const check of CHECKS) {
  results.push(await runCheck(check));
}

const failed = results.filter((r) => !r.ok);
const summary = {
  ok: failed.length === 0,
  baseUrl: BASE_URL,
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  timeoutMs: TIMEOUT_MS,
  passed: results.filter((r) => r.ok).length,
  failed: failed.length,
  results,
};

await mkdir(OUT_DIR, { recursive: true });
const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
const jsonPath = join(OUT_DIR, `monitor-${stamp}.json`);
const latestPath = join(OUT_DIR, 'latest.json');
await writeFile(jsonPath, JSON.stringify(summary, null, 2));
await writeFile(latestPath, JSON.stringify(summary, null, 2));

for (const r of results) {
  const mark = r.ok ? 'OK' : 'FAIL';
  const detail = r.ok ? `${r.status} ${r.ms}ms` : `${r.error} (${r.ms}ms)`;
  console.log(`[${mark}] ${r.id}  ${detail}`);
}

if (summary.ok) {
  console.log(`Production monitor passed: ${summary.passed}/${results.length} checks. Report: ${latestPath}`);
  process.exit(0);
}

console.error(`Production monitor FAILED: ${summary.failed}/${results.length} checks. Report: ${latestPath}`);
for (const r of failed) {
  console.error(`  - ${r.id}: ${r.error}`);
}
process.exit(1);