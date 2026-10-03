// Worker unit tests for the AMC progress API (/api/amc/*), using local D1
// through Miniflare and the production authenticate() (signed JWT + live
// auth_sessions row). Covers auth, user isolation, validation, size limits,
// idempotent retries, monotonic merge, one-time import and revoked sessions.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {build} from 'esbuild';
import * as miniflare from 'miniflare';

const compiled = await build({entryPoints: ['worker/index.js'], bundle: true, write: false, format: 'esm', platform: 'browser'});
const secret = 'amc-progress-test-only-secret';
const options = {modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-08-24', d1Databases: ['DB'], bindings: {JWT_SECRET: secret, APP_ORIGIN: 'http://localhost:4173', DEV_ORIGINS: 'http://127.0.0.1:4173'}, port: 0};
const mf = new miniflare.Miniflare(miniflare.convertV4MiniflareOptions ? miniflare.convertV4MiniflareOptions(options) : options);
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

try {
  const db = await mf.getD1Database('DB');
  for (const file of ['0001_d1_data_platform.sql', '0017_amc_progress.sql'])
    for (const sql of (await readFile(`migrations/${file}`, 'utf8')).split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) await db.prepare(sql).run();
  const tokens = {};
  for (const user of ['google:alice', 'google:bob', 'google:carol']) {
    const now = Date.now();
    await db.prepare('INSERT INTO users(user_id,display_name,email,primary_provider,created_at,updated_at,last_login_at) VALUES(?1,?2,?3,?4,?5,?5,?5)').bind(user, 'NAME', `${user}@example.test`, 'google', now).run();
    await db.prepare('INSERT INTO auth_sessions(jti,user_id,provider,created_at,expires_at) VALUES(?1,?2,?3,?4,?5)').bind(`jti-${user}`, user, 'google', now, now + 3600000).run();
    const head = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
    const body = Buffer.from(JSON.stringify({sub: user, jti: `jti-${user}`, exp: Math.floor(now / 1000) + 3600})).toString('base64url');
    tokens[user] = `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
  }
  const A = 'google:alice', B = 'google:bob', C = 'google:carol';
  async function call(path, {method = 'GET', body, user, headers = {}, raw} = {}) {
    const response = await mf.dispatchFetch(`http://localhost:4173/api/amc/${path}`, {
      method, headers: {...(body !== undefined || raw ? {'content-type': 'application/json'} : {}), ...(user ? {authorization: `Bearer ${tokens[user]}`} : {}), ...headers},
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined)
    });
    return {status: response.status, cache: response.headers.get('cache-control'), ...(await response.json().catch(() => ({})))};
  }
  const get = user => call('progress', {user});
  const send = (user, events, extra = {}) => call('progress', {method: 'POST', body: {events}, user, ...extra});
  let n = 0;
  const id = () => `evt-${String(++n).padStart(6, '0')}`;
  const now = Date.now();
  let r0;

  // --- authentication ---
  r0 = await call('progress');
  check(r0.status === 200 && r0.authenticated === false && !('progress' in r0), 'signed-out read returns no data');
  check((await send(undefined, [{id: id(), type: 'drill', key: 'number', score: 5, at: now}])).status === 401, 'POST requires a session');
  check((await call('import', {method: 'POST', body: {importId: 'import-0001', snapshot: {drill: {number: 5}}}})).status === 401, 'import requires a session');
  check((await call('progress', {headers: {authorization: `Bearer ${tokens[A].slice(0, -3)}xyz`}})).authenticated === false, 'forged signature is treated as signed out');
  check((await call('progress', {method: 'POST', body: {events: [{id: id(), type: 'drill', key: 'number', score: 5, at: now}]}, headers: {authorization: `Bearer ${tokens[A].slice(0, -3)}xyz`}})).status === 401, 'forged signature cannot write');
  check((await send(A, [{id: id(), type: 'drill', key: 'number', score: 5, at: now}], {headers: {origin: 'https://evil.example'}})).status === 403, 'foreign Origin rejected');
  check((await send(A, [{id: id(), type: 'drill', key: 'number', score: 1, at: now}], {headers: {origin: 'http://127.0.0.1:4173'}})).status === 200, 'dev origin allowed');
  check((await call('progress', {method: 'DELETE', user: A})).status === 405, 'unsupported method');
  check((await call('other', {user: A})).status === 404, 'unknown AMC route');

  // --- empty state + caching ---
  let r = await get(B);
  check(r.status === 200 && r.cache?.includes('no-store'), 'progress is never cached');
  check(r.authenticated === true && r.user.id === B && !JSON.stringify(r).includes('@example.test'), 'own user id returned, never the email');
  equal(r.progress, {real: {}, mock: {}, drill: {}, lessons: {8: {}, 10: {}, 12: {}}}, 'new account starts empty');

  // --- writes and monotonic best ---
  const mockEvent = {id: id(), type: 'mock', key: '10', score: 6 * 15 + 1.5 * 4, correct: 15, blank: 4, wrong: 6, at: now - 5000};
  r = await send(A, [
    {id: id(), type: 'real', key: '10:alg', score: 7, at: now - 9000},
    {id: id(), type: 'real', key: '10:alg', score: 4, at: now - 8000},
    mockEvent,
    {id: id(), type: 'drill', key: 'number', score: 9, at: now - 4000},
    {id: id(), type: 'lesson', key: '12:a12-logs', done: true, at: now - 3000}
  ]);
  check(r.status === 200 && r.accepted.length === 5 && r.rejected.length === 0, 'valid events accepted');
  equal(r.progress.real['10:alg'], {best: 7, max: 10, attempts: 2, last: 4, lastAt: now - 8000}, 'best stays at max, last follows newest');
  check(r.progress.mock['10'].best === 96 && r.progress.mock['10'].history[0].correct === 15, 'mock score and history stored');
  check(r.progress.drill.number.best === 9 && r.progress.drill.number.attempts === 2, 'drill best (dev-origin attempt counted too)');
  check(r.progress.lessons['12']['a12-logs'].done === true, 'lesson completion stored');

  // --- idempotent retry ---
  r = await send(A, [mockEvent]);
  check(r.progress.mock['10'].attempts === 1 && r.progress.mock['10'].history.length === 1, 'retried event is not double-counted');
  r = await send(A, [{...mockEvent, id: id(), score: 30, correct: 5, blank: 0, wrong: 20}]);
  check(r.progress.mock['10'].best === 96 && r.progress.mock['10'].last === 30 && r.progress.mock['10'].history[0].score === 30, 'lower score keeps best, updates last + history');

  // --- lessons: last write wins (can be unmarked), stale write ignored ---
  r = await send(A, [{id: id(), type: 'lesson', key: '12:a12-logs', done: false, at: now - 1000}]);
  check(r.progress.lessons['12']['a12-logs'].done === false, 'lesson can be unmarked');
  r = await send(A, [{id: id(), type: 'lesson', key: '12:a12-logs', done: true, at: now - 2000}]);
  check(r.progress.lessons['12']['a12-logs'].done === false, 'stale lesson write ignored');

  // --- isolation between users ---
  r = await get(B);
  equal(r.progress, {real: {}, mock: {}, drill: {}, lessons: {8: {}, 10: {}, 12: {}}}, 'user B sees none of user A progress');
  r = await send(B, [{...mockEvent}]);
  check(r.progress.mock['10'].attempts === 1, 'same event id is independent per user');
  check((await get(A)).progress.mock['10'].attempts === 2, 'user B write did not touch user A');
  r = await send(B, [{id: id(), type: 'drill', key: 'number', score: 10, at: now, user_id: A, userId: A}]);
  check(r.progress.drill.number.best === 10 && (await get(A)).progress.drill.number.best === 9, 'user id in the payload is ignored');

  // --- validation ---
  r = await send(A, [
    {id: id(), type: 'real', key: '10:alg', score: 11, at: now},
    {id: id(), type: 'real', key: '10:alg', score: 2.5, at: now},
    {id: id(), type: 'real', key: '99:alg', score: 1, at: now},
    {id: id(), type: 'drill', key: 'number', score: -1, at: now},
    {id: id(), type: 'mock', key: '10', score: 150, correct: 20, blank: 0, wrong: 5, at: now},
    {id: id(), type: 'mock', key: '8', score: 20, correct: 20, blank: 0, wrong: 0, at: now},
    {id: id(), type: 'lesson', key: '8:not-a-lesson', done: true, at: now},
    {id: id(), type: 'lesson', key: '8:geometry', done: 'yes', at: now},
    {id: 'bad id!', type: 'drill', key: 'number', score: 1, at: now},
    {id: id(), type: 'hack', key: 'number', score: 1, at: now},
    {id: id(), type: 'drill', key: 'fraction', score: 6, at: now}
  ]);
  check(r.status === 200 && r.accepted.length === 1 && r.rejected.length === 10, 'invalid events rejected individually');
  check(r.progress.drill.fraction.best === 6 && r.progress.real['10:alg'].best === 7 && !r.progress.mock['8'], 'only the valid event applied');
  r = await send(A, [{id: id(), type: 'drill', key: 'logic', score: 3, at: now + 365 * 864e5}]);
  check(r.progress.drill.logic.lastAt <= Date.now(), 'future timestamps clamped to server time');
  check((await send(A, [])).status === 400, 'empty event list rejected');
  check((await send(A, Array.from({length: 41}, () => ({id: id(), type: 'drill', key: 'number', score: 1, at: now})))).status === 400, 'more than 40 events rejected');
  check((await call('progress', {method: 'POST', user: A, raw: '{not json'})).status === 400, 'malformed JSON rejected');
  check((await call('progress', {method: 'POST', user: A, raw: '[1,2]'})).status === 400, 'array body rejected');
  check((await call('progress', {method: 'POST', user: A, raw: JSON.stringify({events: [{id: id(), type: 'drill', key: 'number', score: 1, pad: 'x'.repeat(17000)}]})})).status === 413, 'body over 16 KB rejected');
  check((await call('import', {method: 'POST', user: A, body: {importId: 'x', snapshot: {}}})).status === 400, 'invalid import id rejected');

  // --- one-time import (merge of guest data): best wins, lessons united, idempotent ---
  await send(C, [
    {id: id(), type: 'real', key: '8:geometry', score: 6, at: now - 7000},
    {id: id(), type: 'lesson', key: '8:geometry', done: false, at: now - 7000},
    {id: id(), type: 'lesson', key: '8:logic', done: true, at: now - 7000}
  ]);
  const snapshot = {real: {'8:geometry': 4, '8:logic': 8, '8:number': 99, 'zz:top': 3}, mock: {8: 21, 12: 147.5}, drill: {counting: 7}, lessons: {8: ['geometry', 'arithmetic', 'evil'], 10: ['a10-algebra']}};
  r = await call('import', {method: 'POST', user: C, body: {importId: 'import-c-0001', snapshot}});
  check(r.status === 200 && r.imported === true, 'import accepted');
  equal(r.progress.real['8:geometry'], {best: 6, max: 8, attempts: 1, last: 6, lastAt: now - 7000}, 'server best kept when local is lower; attempts not inflated');
  check(r.progress.real['8:logic'].best === 8 && r.progress.real['8:logic'].attempts === 1, 'new local item imported');
  check(!r.progress.real['8:number'] && !r.progress.real['zz:top'], 'out-of-range / unknown snapshot entries dropped');
  check(r.progress.mock['8'].best === 21 && r.progress.mock['8'].history[0].imported === true, 'imported mock best marked as imported');
  check(!r.progress.mock['12'], 'unreachable AMC 12 score (147.5) dropped');
  check(r.progress.drill.counting.best === 7, 'drill imported');
  check(r.progress.lessons['8'].geometry.done && r.progress.lessons['8'].arithmetic.done && r.progress.lessons['8'].logic.done && r.progress.lessons['10']['a10-algebra'].done, 'completed lessons united');
  check(!('evil' in r.progress.lessons['8']), 'unknown lesson dropped');
  const again = await call('import', {method: 'POST', user: C, body: {importId: 'import-c-0001', snapshot}});
  equal(again.progress, r.progress, 'retrying the same import changes nothing');
  r = await call('import', {method: 'POST', user: C, body: {importId: 'import-c-0002', snapshot: {real: {'8:geometry': 8}}}});
  check(r.progress.real['8:geometry'].best === 8 && r.progress.real['8:geometry'].attempts === 1, 'higher local best raises the account best');
  check((await get(A)).progress.real['8:logic'] === undefined, 'import stayed in its own account');

  // --- history and attempts ledger are bounded ---
  const burst = [];
  for (let i = 0; i < 36; i++) burst.push({id: id(), type: 'mock', key: '8', score: i % 26, correct: i % 26, blank: 0, wrong: 25 - (i % 26), at: now + i - 100});
  await send(B, burst.slice(0, 18)); r = await send(B, burst.slice(18));
  check(r.progress.mock['8'].history.length === 10 && r.progress.mock['8'].attempts === 36, 'mock history capped at 10, attempts counted');
  await db.prepare("UPDATE amc_attempts SET created_at=created_at-120000 WHERE user_id=?1").bind(B).run();
  await send(B, [{id: id(), type: 'mock', key: '8', score: 3, correct: 3, blank: 0, wrong: 22, at: now}]);
  const kept = await db.prepare("SELECT COUNT(*) AS c FROM amc_attempts WHERE user_id=?1 AND kind='mock' AND item_key='8'").bind(B).first();
  check(kept.c <= 31, 'attempt ledger pruned to the newest 30 per item (plus the last minute)');

  // --- rate limit ---
  let limited = false;
  for (let round = 0; round < 4 && !limited; round++) {
    const res = await send(B, Array.from({length: 40}, () => ({id: id(), type: 'drill', key: 'geometry', score: 5, at: now})));
    limited = res.status === 429;
  }
  check(limited, 'more than 120 scored attempts per minute is throttled');

  // --- account deletion removes AMC rows; revoked sessions are rejected ---
  const del = await mf.dispatchFetch('http://localhost:4173/api/state', {method: 'DELETE', headers: {authorization: `Bearer ${tokens[C]}`}});
  check(del.status === 200, 'state delete ok');
  equal((await get(C)).progress, {real: {}, mock: {}, drill: {}, lessons: {8: {}, 10: {}, 12: {}}}, 'DELETE /api/state also clears AMC progress');
  check(Object.keys((await get(A)).progress.real).length > 0, 'other users untouched by delete');
  await db.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE jti=?1').bind(`jti-${A}`).run();
  check((await get(A)).authenticated === false && !('progress' in (await get(A))), 'revoked session reads nothing');
  check((await send(A, [{id: id(), type: 'drill', key: 'number', score: 10, at: now}])).status === 401, 'revoked session rejected (write)');
  console.log(`AMC progress API: ${checks} checks passed using local D1 and production authentication.`);
} finally {
  await mf.dispose();
}
