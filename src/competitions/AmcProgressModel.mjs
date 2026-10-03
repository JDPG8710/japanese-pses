// Shared AMC hub progress model, used by the browser (AmcProgressStore.mjs)
// and the Worker (worker/amc-progress.mjs). It is deliberately free of the
// large problem banks: the allow-lists below are checked against the banks and
// lesson modules by tests/test_amc_progress_model.mjs, so a new area or lesson
// fails the test until it is added here.
//
// Progress shape (identical on both sides):
// {
//   real:   { '10:alg': { best, max, attempts, last, lastAt } },
//   mock:   { '12': { best, max, attempts, last, lastAt, history:[{ id, score, correct, blank, wrong, at, imported }] } },
//   drill:  { number: { best, max, attempts, last, lastAt } },
//   lessons:{ '8': { geometry: { done, at } } }
// }
// Events are what the client records and sends; each has a unique id so a
// retry never double-counts. Snapshots are the compact "best + completed"
// form used to merge a browser's guest progress into an account once.

export const AMC_LEVELS = ['8', '10', '12'];
export const REAL_SETS = Object.freeze({
  '8:number': 8, '8:fraction': 8, '8:geometry': 8, '8:counting': 8, '8:logic': 8,
  '10:alg': 10, '10:cp': 10, '10:nt': 10, '10:geo': 10,
  '12:alg': 10, '12:tc': 10, '12:sn': 10, '12:cp': 8, '12:geo': 8
});
export const MOCK_MAX = Object.freeze({ 8: 25, 10: 150, 12: 150 });
export const DRILL_TOPICS = Object.freeze(['number', 'fraction', 'geometry', 'counting', 'logic']);
export const DRILL_MAX = 10;
export const LESSON_IDS = Object.freeze({
  8: Object.freeze(['arithmetic', 'fraction', 'logic', 'geometry', 'counting', 'numbertheory', 'algebra']),
  10: Object.freeze(['a10-algebra', 'a10-quadratics', 'a10-counting', 'a10-probability', 'a10-numbertheory', 'a10-geometry', 'a10-circles3d', 'a10-sequences', 'a10-strategy']),
  12: Object.freeze(['a12-polynomials', 'a12-logs', 'a12-trig', 'a12-complex', 'a12-sequences', 'a12-counting', 'a12-numbertheory', 'a12-geometry', 'a12-strategy'])
});
export const HISTORY_LIMIT = 10;
export const MOCK_QUESTIONS = 25;
export const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
export const MAX_FUTURE_MS = 5 * 60 * 1000;

// Keys the hub wrote to localStorage before progress was bound to accounts.
export const LEGACY_KEYS = Object.freeze({
  real: (level, area) => `piko-amc-real:v1:${level}:${area}`,
  mock: level => `piko-amc-real:v1:${level}:mock`,
  lessons: Object.freeze({ 8: 'piko-amc8-lessons:v1', 10: 'piko-amc10-lessons:v1', 12: 'piko-amc12-lessons:v1' }),
  drill: topic => `piko-independent-practice:v1:amc8:${topic}`
});

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isInt = value => Number.isInteger(value);

export function maxFor(type, key) {
  if (type === 'real') return own(REAL_SETS, key) ? REAL_SETS[key] : 0;
  if (type === 'mock') return own(MOCK_MAX, key) ? MOCK_MAX[key] : 0;
  if (type === 'drill') return DRILL_TOPICS.includes(key) ? DRILL_MAX : 0;
  return 0;
}

export function lessonKeyValid(key) {
  if (typeof key !== 'string') return null;
  const at = key.indexOf(':');
  const level = key.slice(0, at), lesson = key.slice(at + 1);
  return at > 0 && own(LESSON_IDS, level) && LESSON_IDS[level].includes(lesson) ? { level, lesson } : null;
}

/** AMC 8 scores one point per correct answer; AMC 10/12 score 6 per correct and 1.5 per blank. */
export function mockPoints(level, correct, blank) { return level === '8' ? correct : correct * 6 + blank * 1.5; }

/** A score that a learner could actually reach (used for snapshots, which carry no breakdown). */
export function scoreValid(type, key, score) {
  const max = maxFor(type, key);
  if (!max || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > max) return false;
  if (type === 'mock' && key !== '8') return reachableUpper(score);
  return isInt(score);
}
function reachableUpper(score) {
  for (let correct = 0; correct <= MOCK_QUESTIONS; correct++) {
    const rest = score - correct * 6;
    if (rest < 0) break;
    const blank = rest / 1.5;
    if (isInt(blank) && correct + blank <= MOCK_QUESTIONS) return true;
  }
  return false;
}

export function emptyProgress() { return { real: {}, mock: {}, drill: {}, lessons: { 8: {}, 10: {}, 12: {} } }; }

function clampTime(at, now) {
  return typeof at === 'number' && Number.isFinite(at) && at > 0 && at <= now + MAX_FUTURE_MS ? Math.min(Math.round(at), now) : now;
}

/** Validate and normalise one client event; returns null when it must be rejected. */
export function validateEvent(event, now = Date.now()) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const { id, type, key } = event;
  if (typeof id !== 'string' || !EVENT_ID.test(id) || typeof key !== 'string') return null;
  const at = clampTime(event.at, now);
  if (type === 'lesson') {
    if (!lessonKeyValid(key) || typeof event.done !== 'boolean') return null;
    return { id, type, key, done: event.done, at };
  }
  if (!['real', 'mock', 'drill'].includes(type)) return null;
  const max = maxFor(type, key), score = event.score;
  if (!max || typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (type === 'mock') {
    const { correct, blank, wrong } = event;
    if (![correct, blank, wrong].every(n => isInt(n) && n >= 0) || correct + blank + wrong !== MOCK_QUESTIONS) return null;
    if (mockPoints(key, correct, blank) !== score) return null;
    return { id, type, key, score, max, correct, blank, wrong, at };
  }
  if (!isInt(score) || score < 0 || score > max) return null;
  return { id, type, key, score, max, at };
}

function record(bucket, key, max) {
  if (!own(bucket, key)) bucket[key] = { best: 0, max, attempts: 0, last: null, lastAt: 0 };
  return bucket[key];
}

/** Apply a validated event to a progress object (mutates and returns it). Mirrors the Worker SQL. */
export function applyEvent(progress, event) {
  if (event.type === 'lesson') {
    const { level, lesson } = lessonKeyValid(event.key);
    const lessons = progress.lessons[level] || (progress.lessons[level] = {});
    const current = lessons[lesson];
    if (!current || event.at >= current.at) lessons[lesson] = { done: event.done, at: event.at };
    return progress;
  }
  const entry = record(progress[event.type], event.key, event.max);
  if (event.type === 'mock' && (entry.history || []).some(item => item.id === event.id)) return progress;
  entry.max = event.max;
  entry.best = Math.max(entry.best, event.score);
  entry.attempts += 1;
  if (event.at >= entry.lastAt) { entry.last = event.score; entry.lastAt = event.at; }
  if (event.type === 'mock') {
    entry.history = [{ id: event.id, score: event.score, correct: event.correct, blank: event.blank, wrong: event.wrong, at: event.at, imported: false }, ...(entry.history || [])]
      .sort((a, b) => b.at - a.at).slice(0, HISTORY_LIMIT);
  }
  return progress;
}

/** Compact "best scores + completed lessons" form of a progress object. */
export function snapshotOf(progress) {
  const snapshot = { real: {}, mock: {}, drill: {}, lessons: {} };
  for (const type of ['real', 'mock', 'drill'])
    for (const [key, entry] of Object.entries(progress[type] || {})) if (entry.best > 0 || entry.attempts > 0) snapshot[type][key] = entry.best;
  for (const level of AMC_LEVELS) {
    const done = Object.entries(progress.lessons?.[level] || {}).filter(([, value]) => value.done).map(([id]) => id);
    if (done.length) snapshot.lessons[level] = done;
  }
  return snapshot;
}

export function snapshotIsEmpty(snapshot) {
  return !snapshot || (['real', 'mock', 'drill'].every(type => !Object.keys(snapshot[type] || {}).length) && !Object.keys(snapshot.lessons || {}).length);
}

/** Keep only allowed keys and reachable scores. Unknown or invalid entries are dropped. */
export function validateSnapshot(input) {
  const snapshot = { real: {}, mock: {}, drill: {}, lessons: {} };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return snapshot;
  for (const type of ['real', 'mock', 'drill']) {
    const source = input[type];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const key of Object.keys(source).slice(0, 64)) if (scoreValid(type, key, source[key])) snapshot[type][key] = source[key];
  }
  const lessons = input.lessons;
  if (lessons && typeof lessons === 'object' && !Array.isArray(lessons))
    for (const level of AMC_LEVELS) {
      const list = Array.isArray(lessons[level]) ? lessons[level].slice(0, 64) : [];
      const ids = [...new Set(list.filter(id => typeof id === 'string' && LESSON_IDS[level].includes(id)))];
      if (ids.length) snapshot.lessons[level] = ids;
    }
  return snapshot;
}

/** One-time merge of a guest snapshot: best score wins, completed lessons are united. Mirrors the Worker import. */
export function applySnapshot(progress, snapshot, at = Date.now()) {
  for (const type of ['real', 'mock', 'drill'])
    for (const [key, best] of Object.entries(snapshot[type] || {})) {
      const known = own(progress[type], key);
      const entry = record(progress[type], key, maxFor(type, key));
      if (!known) { entry.attempts = 1; entry.last = best; }
      entry.best = Math.max(entry.best, best);
    }
  for (const [level, ids] of Object.entries(snapshot.lessons || {})) {
    const lessons = progress.lessons[level] || (progress.lessons[level] = {});
    for (const id of ids) if (!lessons[id]?.done) lessons[id] = { done: true, at: Math.max(at, lessons[id]?.at || 0) };
  }
  return progress;
}

/** Read the pre-account localStorage keys into a snapshot. */
export function readLegacySnapshot(getItem) {
  const raw = { real: {}, mock: {}, drill: {}, lessons: {} };
  const number = key => { const text = getItem(key); if (text === null || text === undefined || text === '') return undefined; const value = Number(text); return Number.isFinite(value) ? value : undefined; };
  for (const key of Object.keys(REAL_SETS)) { const [level, area] = key.split(':'); const value = number(LEGACY_KEYS.real(level, area)); if (value !== undefined) raw.real[key] = value; }
  for (const level of AMC_LEVELS) { const value = number(LEGACY_KEYS.mock(level)); if (value !== undefined) raw.mock[level] = value; }
  for (const topic of DRILL_TOPICS) { const value = number(LEGACY_KEYS.drill(topic)); if (value !== undefined) raw.drill[topic] = value; }
  for (const level of AMC_LEVELS) { try { const list = JSON.parse(getItem(LEGACY_KEYS.lessons[level]) || '[]'); if (Array.isArray(list)) raw.lessons[level] = list; } catch { /* ignore corrupt */ } }
  const snapshot = validateSnapshot(raw);
  for (const type of ['real', 'mock', 'drill']) for (const [key, value] of Object.entries(snapshot[type])) if (value === 0) delete snapshot[type][key];
  return snapshot;
}

export function legacyKeyList() {
  return [
    ...Object.keys(REAL_SETS).map(key => { const [level, area] = key.split(':'); return LEGACY_KEYS.real(level, area); }),
    ...AMC_LEVELS.map(level => LEGACY_KEYS.mock(level)),
    ...AMC_LEVELS.map(level => LEGACY_KEYS.lessons[level]),
    ...DRILL_TOPICS.map(topic => LEGACY_KEYS.drill(topic))
  ];
}

/** Normalise a progress object that came from storage or the network. */
export function normalizeProgress(input) {
  const progress = emptyProgress();
  if (!input || typeof input !== 'object') return progress;
  for (const type of ['real', 'mock', 'drill'])
    for (const [key, entry] of Object.entries(input[type] || {})) {
      const max = maxFor(type, key);
      if (!max || !entry || typeof entry !== 'object') continue;
      const best = Number(entry.best);
      if (!Number.isFinite(best) || best < 0 || best > max) continue;
      const item = { best, max, attempts: Math.max(0, Math.floor(Number(entry.attempts) || 0)), last: Number.isFinite(entry.last) ? entry.last : null, lastAt: Number(entry.lastAt) || 0 };
      if (type === 'mock') item.history = (Array.isArray(entry.history) ? entry.history : []).filter(h => h && Number.isFinite(h.score) && h.score >= 0 && h.score <= max).slice(0, HISTORY_LIMIT)
        .map(h => ({ id: String(h.id || ''), score: h.score, correct: isInt(h.correct) ? h.correct : null, blank: isInt(h.blank) ? h.blank : null, wrong: isInt(h.wrong) ? h.wrong : null, at: Number(h.at) || 0, imported: !!h.imported }));
      progress[type][key] = item;
    }
  for (const level of AMC_LEVELS)
    for (const [id, value] of Object.entries(input.lessons?.[level] || {}))
      if (LESSON_IDS[level].includes(id) && value && typeof value === 'object') progress.lessons[level][id] = { done: !!value.done, at: Number(value.at) || 0 };
  return progress;
}
