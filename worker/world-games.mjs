import { VERSION, validGame, makeRounds, evaluate, solution } from '../src/world/WorldRules.mjs';

export async function worldRoute(request, env, { authenticate, json, HttpError }) {
  const url = new URL(request.url), db = env.DB;
  if (!db) throw new HttpError(503, 'DATABASE_UNAVAILABLE');
  const reply = (body, status = 200) => json(body, status, request, env);
  if (url.pathname === '/api/world/leaderboard' && request.method === 'GET') {
    const game = url.searchParams.get('game'), level = Number(url.searchParams.get('level'));
    if (!validGame(game, level)) throw new HttpError(400, 'INVALID_GAME');
    const result = await db.prepare(`SELECT p.public_name AS name, MAX(r.score) AS score
      FROM world_runs r JOIN world_players p ON p.user_id=r.user_id
      WHERE r.game=?1 AND r.level=?2 AND r.version=?3 AND r.completed_at IS NOT NULL AND r.score>=800
      GROUP BY r.user_id,p.public_name ORDER BY score DESC,p.public_name ASC LIMIT 50`).bind(game, level, VERSION).all();
    let rank = 0, prior = -1;
    return reply({ entries: result.results.map((row, i) => { if (row.score !== prior) rank = i + 1; prior = row.score; return { rank, name: row.name, score: row.score }; }) });
  }
  if (request.method !== 'POST' || !['/api/world/start', '/api/world/answer'].includes(url.pathname)) throw new HttpError(404, 'NOT_FOUND');
  const origin = request.headers.get('Origin');
  if (origin && ![env.APP_ORIGIN, ...(env.DEV_ORIGINS || '').split(',')].includes(origin)) throw new HttpError(403, 'INVALID_ORIGIN');
  const session = await authenticate(request, env);
  if (!session) throw new HttpError(401, 'LOGIN_REQUIRED');
  // Bound streamed body size, including chunked requests.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_JSON');
  let length = 0, chunks = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 4096) { await reader.cancel(); throw new HttpError(413, 'BODY_TOO_LARGE'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'INVALID_JSON'); }
  if (!body || typeof body !== 'object') throw new HttpError(400, 'INVALID_JSON');
  const now = Date.now();
  if (url.pathname === '/api/world/start') {
    if (!validGame(body.game, body.level)) throw new HttpError(400, 'INVALID_GAME');
    const recent = await db.prepare('SELECT COUNT(*) AS count FROM world_runs WHERE user_id=?1 AND started_at>?2').bind(session.sub, now - 60000).first();
    if (recent.count >= 6) throw new HttpError(429, 'TRY_LATER');
    const id = crypto.randomUUID(), seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const rounds = makeRounds(body.game, body.level, seed), expiresAt = now + 180000;
    await db.batch([
      db.prepare('INSERT INTO world_players(user_id,public_name) VALUES(?1,?2) ON CONFLICT(user_id) DO NOTHING').bind(session.sub, `Explorer-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`),
      db.prepare('INSERT INTO world_runs(run_id,user_id,game,level,version,rounds_json,started_at,expires_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)').bind(id, session.sub, body.game, body.level, VERSION, JSON.stringify(rounds), now, expiresAt)
    ]);
    return reply({ id, question: rounds[0], index: 0, revision: 0, score: 0, expiresAt });
  }
  if (typeof body.id !== 'string' || body.id.length > 50 || !Number.isInteger(body.revision) || !Array.isArray(body.answer) || body.answer.length > 64 || body.answer.some(x => !Number.isInteger(x))) throw new HttpError(400, 'INVALID_ANSWER');
  const run = await db.prepare('SELECT * FROM world_runs WHERE run_id=?1 AND user_id=?2').bind(body.id, session.sub).first();
  if (!run) throw new HttpError(404, 'RUN_NOT_FOUND');
  if (run.expires_at <= now) throw new HttpError(410, 'RUN_EXPIRED');
  if (run.completed_at || run.revision !== body.revision) throw new HttpError(409, 'STALE_ROUND');
  const rounds = JSON.parse(run.rounds_json), q = rounds[run.round_index];
  const verdict = evaluate(run.game, q, body.answer, run.tries);
  const index = run.round_index + (verdict.done ? 1 : 0), score = run.score + verdict.points;
  const updated = await db.prepare(`UPDATE world_runs SET round_index=?1,tries=?2,score=?3,revision=revision+1,completed_at=?4
    WHERE run_id=?5 AND user_id=?6 AND revision=?7 AND completed_at IS NULL AND expires_at>?8`).bind(index, verdict.tries, score, index === 10 ? now : null, run.run_id, session.sub, body.revision, now).run();
  if (updated.meta.changes !== 1) throw new HttpError(409, 'STALE_ROUND');
  return reply({ ...verdict, index, score, revision: run.revision + 1, complete: index === 10, question: rounds[index] || null,
    explanation: verdict.done && !verdict.correct ? solution(run.game, q) : null });
}
