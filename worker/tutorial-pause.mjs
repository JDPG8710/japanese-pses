// テーブル名は呼び出し元の固定値のみ。問題への回答と同じrevisionで競合を防ぐ。
export async function tutorialPause(db, table, body, userId, now, HttpError) {
  if (!['world_runs', 'foundation_runs'].includes(table)) throw new Error('INVALID_RUN_TABLE');
  if (typeof body.id !== 'string' || body.id.length > 50 || !Number.isInteger(body.revision) || !['pause', 'resume'].includes(body.action)) throw new HttpError(400, 'INVALID_TUTORIAL_ACTION');
  const run = await db.prepare(`SELECT * FROM ${table} WHERE run_id=?1 AND user_id=?2`).bind(body.id, userId).first();
  if (!run) throw new HttpError(404, 'RUN_NOT_FOUND');
  if (run.completed_at || run.revision !== body.revision) throw new HttpError(409, 'STALE_ROUND');
  if (run.tutorial_paused_at == null && run.expires_at <= now) throw new HttpError(410, 'RUN_EXPIRED');
  if (body.action === 'pause') {
    await db.prepare(`UPDATE ${table} SET tutorial_paused_at=?1 WHERE run_id=?2 AND user_id=?3 AND revision=?4 AND completed_at IS NULL AND tutorial_paused_at IS NULL AND expires_at>?1`).bind(now, body.id, userId, body.revision).run();
  } else {
    await db.prepare(`UPDATE ${table} SET expires_at=expires_at+MAX(0,?1-tutorial_paused_at),tutorial_paused_at=NULL WHERE run_id=?2 AND user_id=?3 AND revision=?4 AND completed_at IS NULL AND tutorial_paused_at IS NOT NULL`).bind(now, body.id, userId, body.revision).run();
  }
  const current = await db.prepare(`SELECT expires_at,tutorial_paused_at,revision,completed_at FROM ${table} WHERE run_id=?1 AND user_id=?2`).bind(body.id, userId).first();
  if (current.revision !== body.revision || current.completed_at) throw new HttpError(409, 'STALE_ROUND');
  return { expiresAt: current.expires_at, paused: current.tutorial_paused_at != null };
}
