// AMC hub progress API (/api/amc/*), bound to the signed-in account.
//   GET  /api/amc/progress  -> { authenticated:true, user:{ id, displayName }, progress } | { authenticated:false }
//   POST /api/amc/progress  { events:[...] }            -> { progress, accepted, rejected }
//   POST /api/amc/import    { importId, snapshot:{...} } -> { progress, imported }
// Every route needs a valid, unrevoked session (production authenticate()),
// reads and writes only rows WHERE user_id = session.sub, and accepts at most
// MAX_BODY bytes. Scores are monotonic (best only goes up), lessons are last
// write wins, and each event id is recorded so a retried request never
// double-counts. Import is idempotent per importId.
import {
  AMC_LEVELS, HISTORY_LIMIT, EVENT_ID, emptyProgress, validateEvent, validateSnapshot, lessonKeyValid, maxFor, snapshotIsEmpty
} from '../src/competitions/AmcProgressModel.mjs';

export const AMC_MAX_BODY = 16 * 1024;
export const AMC_MAX_EVENTS = 40;
export const AMC_ATTEMPTS_PER_MINUTE = 120;
export const AMC_ATTEMPTS_KEPT = 30;

export async function amcRoute(request, env, { authenticate, json, HttpError }) {
  const db = env.DB;
  if (!db) throw new HttpError(503, 'DATABASE_UNAVAILABLE');
  const url = new URL(request.url), reply = (body, status = 200) => json(body, status, request, env);
  const isRead = url.pathname === '/api/amc/progress' && request.method === 'GET';
  const isWrite = request.method === 'POST' && ['/api/amc/progress', '/api/amc/import'].includes(url.pathname);
  if (!isRead && !isWrite) {
    if (['/api/amc/progress', '/api/amc/import'].includes(url.pathname)) throw new HttpError(405, 'METHOD_NOT_ALLOWED');
    throw new HttpError(404, 'NOT_FOUND');
  }
  if (isWrite) {
    const origin = request.headers.get('Origin');
    if (origin && ![env.APP_ORIGIN, ...(env.DEV_ORIGINS || '').split(',').map(value => value.trim())].filter(Boolean).includes(origin)) throw new HttpError(403, 'INVALID_ORIGIN');
  }
  const session = await authenticate(request, env);
  // A signed-out read is a normal state for the hub (it then keeps progress in
  // the browser), so it answers 200 without any data instead of a console-noisy
  // 401. Every write still requires a session.
  if (!session) {
    if (isRead) return reply({ authenticated: false });
    throw new HttpError(401, 'LOGIN_REQUIRED');
  }
  const userId = session.sub;
  if (isRead) return reply({ authenticated: true, user: publicUser(session), progress: await readProgress(db, userId) });

  const body = await readBody(request, HttpError);
  const now = Date.now();
  if (url.pathname === '/api/amc/import') {
    if (typeof body.importId !== 'string' || !EVENT_ID.test(body.importId)) throw new HttpError(400, 'INVALID_IMPORT');
    const snapshot = validateSnapshot(body.snapshot);
    if (!snapshotIsEmpty(snapshot)) await db.batch(importStatements(db, userId, body.importId, snapshot, now));
    return reply({ progress: await readProgress(db, userId), imported: true });
  }

  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > AMC_MAX_EVENTS) throw new HttpError(400, 'INVALID_EVENTS');
  const accepted = [], rejected = [], seen = new Set(), events = [];
  for (const raw of body.events) {
    const event = validateEvent(raw, now);
    const id = typeof raw?.id === 'string' ? raw.id.slice(0, 64) : null;
    if (!event || seen.has(event.id)) { if (id) rejected.push(id); continue; }
    seen.add(event.id); events.push(event); accepted.push(event.id);
  }
  const scored = events.filter(event => event.type !== 'lesson');
  if (scored.length) {
    const recent = await db.prepare('SELECT COUNT(*) AS count FROM amc_attempts WHERE user_id = ?1 AND created_at > ?2 AND imported = 0')
      .bind(userId, now - 60000).first();
    if ((recent?.count || 0) + scored.length > AMC_ATTEMPTS_PER_MINUTE) throw new HttpError(429, 'TRY_LATER');
  }
  if (events.length) await db.batch(eventStatements(db, userId, events, now));
  return reply({ progress: await readProgress(db, userId), accepted, rejected });
}

function publicUser(session) {
  return { id: session.sub, displayName: String(session.user?.displayName || '').slice(0, 60) };
}

async function readBody(request, HttpError) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > AMC_MAX_BODY) throw new HttpError(413, 'BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_JSON');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > AMC_MAX_BODY) { await reader.cancel(); throw new HttpError(413, 'BODY_TOO_LARGE'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'INVALID_JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'INVALID_JSON');
  return body;
}

// Summary upsert guarded by "this attempt id is new", followed by the ledger
// insert, inside one D1 batch (a transaction): either both happen or neither.
const SUMMARY_SQL = `INSERT INTO amc_progress (user_id, kind, item_key, best_score, max_score, attempts, last_score, last_at, updated_at)
  SELECT ?1, ?2, ?3, ?4, ?5, 1, ?4, ?6, ?7
  WHERE NOT EXISTS (SELECT 1 FROM amc_attempts WHERE user_id = ?1 AND attempt_id = ?8)
  ON CONFLICT (user_id, kind, item_key) DO UPDATE SET
    best_score = MAX(amc_progress.best_score, excluded.best_score),
    max_score = excluded.max_score,
    attempts = amc_progress.attempts + ?9,
    last_score = CASE WHEN excluded.last_at >= amc_progress.last_at AND ?9 = 1 THEN excluded.last_score ELSE amc_progress.last_score END,
    last_at = CASE WHEN ?9 = 1 THEN MAX(amc_progress.last_at, excluded.last_at) ELSE amc_progress.last_at END,
    updated_at = excluded.updated_at`;
const ATTEMPT_SQL = `INSERT OR IGNORE INTO amc_attempts
  (user_id, attempt_id, kind, item_key, score, max_score, correct, blank, wrong, imported, attempted_at, created_at)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`;
const LESSON_SQL = `INSERT INTO amc_lessons (user_id, level, lesson_id, done, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
  ON CONFLICT (user_id, level, lesson_id) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at
  WHERE excluded.updated_at >= amc_lessons.updated_at`;
const LESSON_UNION_SQL = `INSERT INTO amc_lessons (user_id, level, lesson_id, done, updated_at) VALUES (?1, ?2, ?3, 1, ?4)
  ON CONFLICT (user_id, level, lesson_id) DO UPDATE SET done = 1, updated_at = MAX(amc_lessons.updated_at, excluded.updated_at)
  WHERE amc_lessons.done = 0`;
// Rows younger than a minute are kept so the per-minute rate limit can count them.
const PRUNE_SQL = `DELETE FROM amc_attempts WHERE user_id = ?1 AND kind = ?2 AND item_key = ?3 AND created_at < ?4 AND attempt_id NOT IN (
  SELECT attempt_id FROM amc_attempts WHERE user_id = ?1 AND kind = ?2 AND item_key = ?3 ORDER BY attempted_at DESC, created_at DESC LIMIT ${AMC_ATTEMPTS_KEPT})`;

function eventStatements(db, userId, events, now) {
  const statements = [], touched = new Set();
  for (const event of events) {
    if (event.type === 'lesson') {
      const { level, lesson } = lessonKeyValid(event.key);
      statements.push(db.prepare(LESSON_SQL).bind(userId, level, lesson, event.done ? 1 : 0, event.at));
      continue;
    }
    statements.push(db.prepare(SUMMARY_SQL).bind(userId, event.type, event.key, event.score, event.max, event.at, now, event.id, 1));
    statements.push(db.prepare(ATTEMPT_SQL).bind(userId, event.id, event.type, event.key, event.score, event.max,
      event.correct ?? null, event.blank ?? null, event.wrong ?? null, 0, event.at, now));
    touched.add(`${event.type}|${event.key}`);
  }
  for (const item of touched) { const [kind, key] = item.split('|'); statements.push(db.prepare(PRUNE_SQL).bind(userId, kind, key, now - 60000)); }
  return statements;
}

// Import: one synthetic "imported best" attempt per item (id derived from the
// importId, so a retried import is a no-op). On an existing row it only raises
// best_score; attempts and the latest score stay as they are.
function importStatements(db, userId, importId, snapshot, now) {
  const statements = [];
  for (const type of ['real', 'mock', 'drill'])
    for (const [key, best] of Object.entries(snapshot[type])) {
      const attemptId = `imp_${importId}_${type}_${key.replace(':', '-')}`.slice(0, 96);
      statements.push(db.prepare(SUMMARY_SQL).bind(userId, type, key, best, maxFor(type, key), 0, now, attemptId, 0));
      statements.push(db.prepare(ATTEMPT_SQL).bind(userId, attemptId, type, key, best, maxFor(type, key), null, null, null, 1, now, now));
    }
  for (const [level, ids] of Object.entries(snapshot.lessons))
    for (const id of ids) statements.push(db.prepare(LESSON_UNION_SQL).bind(userId, level, id, now));
  return statements;
}

export async function readProgress(db, userId) {
  const [summary, lessons, mocks] = await db.batch([
    db.prepare('SELECT kind, item_key, best_score, max_score, attempts, last_score, last_at FROM amc_progress WHERE user_id = ?1').bind(userId),
    db.prepare('SELECT level, lesson_id, done, updated_at FROM amc_lessons WHERE user_id = ?1').bind(userId),
    db.prepare(`SELECT attempt_id, item_key, score, correct, blank, wrong, imported, attempted_at FROM amc_attempts
      WHERE user_id = ?1 AND kind = 'mock' ORDER BY attempted_at DESC, created_at DESC LIMIT ${HISTORY_LIMIT * AMC_LEVELS.length * 3}`).bind(userId)
  ]);
  const progress = emptyProgress();
  for (const row of summary.results || []) {
    if (!maxFor(row.kind, row.item_key)) continue;
    progress[row.kind][row.item_key] = { best: row.best_score, max: row.max_score, attempts: row.attempts, last: row.last_score, lastAt: row.last_at };
    if (row.kind === 'mock') progress.mock[row.item_key].history = [];
  }
  for (const row of mocks.results || []) {
    const entry = progress.mock[row.item_key];
    if (!entry || entry.history.length >= HISTORY_LIMIT) continue;
    entry.history.push({ id: row.attempt_id, score: row.score, correct: row.correct, blank: row.blank, wrong: row.wrong, at: row.attempted_at, imported: row.imported === 1 });
  }
  for (const row of lessons.results || [])
    if (progress.lessons[row.level]) progress.lessons[row.level][row.lesson_id] = { done: row.done === 1, at: row.updated_at };
  return progress;
}

/** Statements that delete every AMC row of a user (used by DELETE /api/state). */
export function amcDeleteStatements(db, userId) {
  return ['amc_attempts', 'amc_progress', 'amc_lessons'].map(table => db.prepare(`DELETE FROM ${table} WHERE user_id = ?1`).bind(userId));
}
