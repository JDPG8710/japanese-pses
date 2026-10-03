// AMC progress model + client store (no browser): allow-lists match the banks
// and lessons, merge rules, legacy-key migration, per-user cache scoping,
// debounced saving with retry, one-time import and logout privacy.
import assert from 'node:assert/strict';
import { AMC8_AREAS, AMC8_REAL_BANK } from '../src/competitions/AmcBank8.mjs';
import { AMC10_AREAS, AMC10_BANK } from '../src/competitions/AmcBank10.mjs';
import { AMC12_AREAS, AMC12_BANK } from '../src/competitions/AmcBank12.mjs';
import { LESSONS, LESSON_KEY } from '../src/competitions/AmcLessons.mjs';
import { UPPER } from '../src/competitions/AmcUpperLessons.mjs';
import { TOPICS, progressKey } from '../src/competitions/PracticeData.mjs';
import {
  REAL_SETS, LESSON_IDS, DRILL_TOPICS, LEGACY_KEYS, MOCK_MAX, emptyProgress, validateEvent, applyEvent, applySnapshot, validateSnapshot,
  snapshotOf, scoreValid, readLegacySnapshot
} from '../src/competitions/AmcProgressModel.mjs';
import { AmcProgressStore, GUEST_KEY, USER_PREFIX, MIGRATED_KEY, userCacheKey } from '../src/competitions/AmcProgressStore.mjs';

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };

// ---- allow-lists match the content ----
const expectedSets = {};
for (const [level, areas, bank] of [['8', AMC8_AREAS, AMC8_REAL_BANK], ['10', AMC10_AREAS, AMC10_BANK], ['12', AMC12_AREAS, AMC12_BANK]])
  for (const area of areas) expectedSets[`${level}:${area.id}`] = Math.min(10, bank.filter(p => p.area === area.id).length);
eq({ ...REAL_SETS }, expectedSets, 'REAL_SETS = every area and its set size (update AmcProgressModel.mjs when a bank changes)');
eq([...LESSON_IDS[8]], LESSONS.map(l => l.id), 'AMC 8 lesson ids');
eq([...LESSON_IDS[10]], UPPER[10].lessons.map(l => l.id), 'AMC 10 lesson ids');
eq([...LESSON_IDS[12]], UPPER[12].lessons.map(l => l.id), 'AMC 12 lesson ids');
eq([...DRILL_TOPICS], TOPICS.map(t => t.id), 'drill topics');
ok(LEGACY_KEYS.lessons[8] === LESSON_KEY && LEGACY_KEYS.lessons[10] === UPPER[10].key && LEGACY_KEYS.lessons[12] === UPPER[12].key, 'legacy lesson keys');
ok(LEGACY_KEYS.drill('number') === progressKey('amc8', 'number'), 'legacy drill key');
eq(MOCK_MAX, { 8: 25, 10: 150, 12: 150 }, 'mock maxima');

// ---- validation and merge rules ----
ok(scoreValid('mock', '10', 96) && scoreValid('mock', '12', 150) && scoreValid('mock', '12', 37.5) && !scoreValid('mock', '12', 147.5) && !scoreValid('mock', '12', 1), 'reachable AMC 10/12 scores');
ok(scoreValid('mock', '8', 25) && !scoreValid('mock', '8', 25.5) && !scoreValid('real', '12:cp', 9) && scoreValid('real', '12:cp', 8), 'bounds');
ok(validateEvent({ id: 'abcdefgh', type: 'mock', key: '12', score: 99, correct: 15, blank: 6, wrong: 4, at: 1 }, 10) !== null, 'consistent mock event');
ok(validateEvent({ id: 'abcdefgh', type: 'mock', key: '12', score: 100, correct: 15, blank: 6, wrong: 4, at: 1 }, 10) === null, 'inconsistent mock event');
const p = emptyProgress();
applyEvent(p, validateEvent({ id: 'evt00001', type: 'real', key: '10:nt', score: 9, at: 5 }, 100));
applyEvent(p, validateEvent({ id: 'evt00002', type: 'real', key: '10:nt', score: 3, at: 6 }, 100));
eq(p.real['10:nt'], { best: 9, max: 10, attempts: 2, last: 3, lastAt: 6 }, 'best monotonic, last follows time');
applyEvent(p, validateEvent({ id: 'evt00003', type: 'lesson', key: '10:a10-algebra', done: true, at: 10 }, 100));
applyEvent(p, validateEvent({ id: 'evt00004', type: 'lesson', key: '10:a10-algebra', done: false, at: 9 }, 100));
ok(p.lessons[10]['a10-algebra'].done, 'older lesson write loses');
applySnapshot(p, validateSnapshot({ real: { '10:nt': 4, '8:logic': 8 }, lessons: { 8: ['logic'] } }), 50);
ok(p.real['10:nt'].best === 9 && p.real['10:nt'].attempts === 2 && p.real['8:logic'].best === 8 && p.lessons[8].logic.done, 'snapshot: best wins, union of lessons');
eq(snapshotOf(p), { real: { '10:nt': 9, '8:logic': 8 }, mock: {}, drill: {}, lessons: { 8: ['logic'], 10: ['a10-algebra'] } }, 'snapshotOf');

// ---- fakes ----
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return { getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), key: i => [...map.keys()][i] ?? null, get length() { return map.size; }, map };
}
function fakeTimers() {
  let id = 0; const pending = new Map();
  return { setTimeout(fn, ms) { pending.set(++id, { fn, ms }); return id; }, clearTimeout(t) { pending.delete(t); }, pending,
    async run() { const items = [...pending.entries()]; pending.clear(); for (const [, t] of items) t.fn(); await new Promise(r => setTimeout(r, 0)); } };
}
// In-memory server that applies the shared model (the Worker SQL mirrors it; see test_amc_progress_api.mjs).
function fakeServer() {
  const users = new Map(), seen = new Map(), imports = new Set(), log = [];
  let user = null, failNext = 0;
  const data = id => { if (!users.has(id)) users.set(id, emptyProgress()); if (!seen.has(id)) seen.set(id, new Set()); return users.get(id); };
  const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(JSON.stringify(body)) });
  const fetch = async (url, init = {}) => {
    const method = init.method || 'GET', path = new URL(url, 'http://x').pathname, body = init.body ? JSON.parse(init.body) : null;
    log.push({ method, path, body, user: user?.id || null, keepalive: !!init.keepalive });
    if (failNext > 0) { failNext--; return reply(503, { error: 'DOWN' }); }
    if (path === '/api/amc/progress' && method === 'GET') return user ? reply(200, { authenticated: true, user, progress: data(user.id) }) : reply(200, { authenticated: false });
    if (!user) return reply(401, { error: 'LOGIN_REQUIRED' });
    const progress = data(user.id);
    if (path === '/api/amc/progress') {
      for (const raw of body.events) { const e = validateEvent(raw, Date.now()); if (e && !seen.get(user.id).has(e.id)) { seen.get(user.id).add(e.id); applyEvent(progress, e); } }
      return reply(200, { progress, accepted: [], rejected: [] });
    }
    if (path === '/api/amc/import') { const key = `${user.id}|${body.importId}`; if (!imports.has(key)) { imports.add(key); applySnapshot(progress, validateSnapshot(body.snapshot)); } return reply(200, { progress, imported: true }); }
    return reply(404, {});
  };
  return { fetch, users, log, signIn(id) { user = { id, displayName: id.split(':')[1] }; }, signOut() { user = null; }, fail(n) { failNext = n; } };
}

// ---- legacy keys -> guest store ----
const storage = memoryStorage({
  [LEGACY_KEYS.real('10', 'alg')]: '6', [LEGACY_KEYS.mock('12')]: '99', [LEGACY_KEYS.drill('number')]: '7',
  [LEGACY_KEYS.lessons[8]]: JSON.stringify(['geometry', 'bogus']), [LEGACY_KEYS.real('8', 'logic')]: '42'
});
eq(readLegacySnapshot(k => storage.getItem(k)), { real: { '10:alg': 6 }, mock: { 12: 99 }, drill: { number: 7 }, lessons: { 8: ['geometry'] } }, 'legacy snapshot keeps only valid values');
const server = fakeServer(), timers = fakeTimers();
let store = new AmcProgressStore({ storage, fetchImpl: server.fetch, timers, debounceMs: 800, retryDelays: [2000, 5000] });
ok(![...storage.map.keys()].some(k => k.startsWith('piko-amc-real') || k.startsWith('piko-amc8-') || k.startsWith('piko-independent')), 'legacy keys folded into the guest store and removed');
await store.init();
ok(store.mode === 'guest' && store.realBest('10', 'alg') === 6 && store.lessonsDone('8').has('geometry'), 'signed-out: local progress visible');
store.setLesson('8', 'logic', true);
ok(JSON.parse(storage.getItem(GUEST_KEY)).progress.lessons[8].logic.done && server.log.every(r => r.method === 'GET'), 'signed-out writes stay local');

// ---- first sign-in: one-time merge ----
server.users.set('google:alice', applySnapshot(emptyProgress(), validateSnapshot({ real: { '10:alg': 8 }, lessons: { 12: ['a12-logs'] } })));
server.signIn('google:alice');
store = new AmcProgressStore({ storage, fetchImpl: server.fetch, timers, debounceMs: 800, retryDelays: [2000, 5000] });
await store.init();
const alice = server.users.get('google:alice');
ok(store.mode === 'user' && store.status === 'synced' && store.merged, 'signed in, merged and synced');
ok(alice.real['10:alg'].best === 8 && alice.mock[12].best === 99 && alice.drill.number.best === 7, 'best of account and browser kept');
ok(alice.lessons[8].geometry.done && alice.lessons[8].logic.done && alice.lessons[12]['a12-logs'].done, 'completed lessons united');
ok(storage.getItem(GUEST_KEY) === null && JSON.parse(storage.getItem(MIGRATED_KEY)).importId, 'guest copy removed and migration marked');
ok(storage.getItem(userCacheKey('google:alice')) !== null && !storage.getItem(userCacheKey('google:alice')).includes('google:alice'), 'per-user cache keyed by a hash, not the raw id');

// ---- signed-in changes are debounced, retried and idempotent ----
const before = server.log.length;
store.setLesson('10', 'a10-algebra', true);
store.recordReal('10', 'nt', 9);
ok(store.status === 'saving' && store.realBest('10', 'nt') === 9 && server.log.length === before, 'optimistic view, nothing sent before the debounce');
ok([...timers.pending.values()].some(t => t.ms === 800), 'debounce scheduled');
server.fail(1);
await timers.run(); await store.inflight;
ok(store.status === 'retrying' && store.queue.length === 2, 'failure keeps the queue and retries');
ok([...timers.pending.values()].some(t => t.ms === 2000), 'backoff retry scheduled');
ok(JSON.parse(storage.getItem(userCacheKey('google:alice'))).queue.length === 2, 'unsent queue survives a reload');
await timers.run(); await store.inflight;
const posts = server.log.filter(r => r.method === 'POST' && r.path === '/api/amc/progress');
ok(store.status === 'synced' && store.queue.length === 0 && posts.at(-1).body.events.length === 2, 'retry sent both changes in one request');
ok(alice.real['10:nt'].best === 9 && alice.lessons[10]['a10-algebra'].done, 'server updated');
await server.fetch('/api/amc/progress', { method: 'POST', body: JSON.stringify(posts.at(-1).body) });
ok(alice.real['10:nt'].attempts === 1, 'replayed request does not double-count');
store.recordMock('12', { points: 6 * 20, correct: 20, blank: 0, wrong: 5 });
await store.sync({ keepalive: true });
ok(server.log.at(-1).keepalive && alice.mock[12].best === 120 && alice.mock[12].history.length === 1, 'keepalive flush on page hide');

// ---- sign-out: no leak to the next person ----
server.signOut();
store = new AmcProgressStore({ storage, fetchImpl: server.fetch, timers });
await store.init();
ok(store.mode === 'guest' && store.realBest('10', 'alg') === 0 && store.mockBest('12') === 0 && store.lessonsDone('8').size === 0, 'signed-out view shows none of the previous user');
ok(![...storage.map.entries()].some(([k, v]) => k.startsWith(USER_PREFIX) && v.includes('"best"')), 'cached progress of earlier users deleted');

// ---- a second account on the same browser: no re-merge ----
store.recordDrill('logic', 4);
server.signIn('google:bob');
store = new AmcProgressStore({ storage, fetchImpl: server.fetch, timers });
await store.init();
const bob = server.users.get('google:bob');
ok(bob.drill.logic.best === 4 && !bob.real['10:alg'] && !bob.lessons[8].geometry, 'Bob gets only what was played while signed out after Alice, never Alice\'s data');
ok(alice.drill.logic === undefined, 'Alice untouched');
const imports = server.log.filter(r => r.path === '/api/amc/import');
ok(imports.length === 2 && imports[0].body.importId !== imports[1].body.importId, 'each guest session imports once with its own id');

// ---- expired session keeps the queue for the next sign-in ----
store.recordDrill('logic', 6);
server.signOut();
await timers.run(); await store.inflight;
ok(store.status === 'expired' && JSON.parse(storage.getItem(userCacheKey('google:bob'))).queue.length === 1, 'expired: queue kept for Bob');
server.signIn('google:bob');
store = new AmcProgressStore({ storage, fetchImpl: server.fetch, timers });
await store.init();
ok(bob.drill.logic.best === 6 && store.queue.length === 0, 'queue delivered after signing in again');

// ---- storage unavailable ----
const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); }, key() { return null; }, length: 0 };
server.signOut();
store = new AmcProgressStore({ storage: broken, fetchImpl: server.fetch, timers });
await store.init();
store.recordDrill('number', 3);
ok(!store.storageOK && store.drillBest('number') === 3, 'works in memory when storage is blocked');

console.log(`AMC progress model + store: ${checks} checks passed.`);
