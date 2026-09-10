import { validateNickname } from '../src/privacy/NicknameFilter.mjs';

export const avatars = ['🌱','🐼','🐱','🦊','🐧','🐻','🐰','⭐'];
const UUID = /^[a-f0-9-]{36}$/;
export async function profileFor(env, actor) {
  const [row, progress] = await Promise.all([
    env.DB.prepare('SELECT * FROM playroom_profiles WHERE actor_id=?').bind(actor.id).first(),
    env.DB.prepare('SELECT game,step FROM playroom_tutorial_progress WHERE actor_id=?').bind(actor.id).all()
  ]);
  const tutorials=Object.fromEntries((progress.results || []).map(p=>[p.game,p.step]));
  if (row) return { publicId: row.public_id, name: row.nickname, avatar: row.avatar, visible: !!row.visible, tutorial: row.tutorial, tutorials:{go:Math.max(row.tutorial||0,tutorials.go||0),chess:tutorials.chess||0}, configured: true };
  return { name: actor.name, avatar: '🌱', visible: false, tutorial: 0, tutorials:{go:0,chess:0}, configured: false };
}
export async function playroomRoute(env, actor, path, body) {
  const fail = error => ({ error });
  if (!env.PLAYROOMS) return fail('ARENA_UNAVAILABLE');
  if (path === 'profile') {
    if (typeof body.name !== 'string') return fail('INVALID_NAME');
    const nick = validateNickname(body.name);
    if (!nick.valid || !avatars.includes(body.avatar) || typeof body.visible !== 'boolean') return fail('INVALID_NAME');
    // Public presence requires an explicit parental-gate acknowledgement from the client.
    const visible = body.visible === true && body.parentalGateAck === true;
    await env.DB.prepare(`INSERT INTO playroom_profiles(actor_id,public_id,nickname,avatar,visible) VALUES(?,?,?,?,?)
      ON CONFLICT(actor_id) DO UPDATE SET nickname=excluded.nickname,avatar=excluded.avatar,visible=excluded.visible`).bind(actor.id, crypto.randomUUID(), nick.name, body.avatar, +visible).run();
    return profileFor(env, actor);
  }
  if (!actor.publicId) return fail('PROFILE_REQUIRED');
  if (path === 'report') {
    const reason = String(body.reason || '').trim().slice(0, 40);
    const detail = String(body.detail || '').trim().slice(0, 200);
    const target = String(body.targetPublicId || '').trim().slice(0, 64);
    if (!reason || !['harassment','inappropriate_name','cheating','other'].includes(reason)) return fail('INVALID_ACTION');
    await env.DB.prepare(`INSERT INTO arena_reports(report_id,reporter_id,target_public_id,reason,detail,created_at)
      VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(), actor.id, target || null, reason, detail || null, Date.now()).run();
    return { ok: true };
  }
  if (path === 'block') {
    const target = String(body.targetPublicId || '').trim().slice(0, 64);
    if (!target || target === actor.publicId) return fail('INVALID_ACTION');
    await env.DB.prepare(`INSERT INTO arena_blocks(actor_id,blocked_public_id,created_at) VALUES(?,?,?)
      ON CONFLICT(actor_id,blocked_public_id) DO NOTHING`).bind(actor.id, target, Date.now()).run();
    return { ok: true };
  }
  if (path === 'tutorial') {
    const game=body.game||'go', max=game==='chess'?8:5;
    if (!['go','chess'].includes(game) || !Number.isInteger(body.step) || body.step < 0 || body.step > max) return fail('INVALID_ACTION');
    await env.DB.prepare(`INSERT INTO playroom_tutorial_progress(actor_id,game,step) VALUES(?,?,?)
      ON CONFLICT(actor_id,game) DO UPDATE SET step=MAX(step,excluded.step)`).bind(actor.id,game,body.step).run();
    if(game==='go')await env.DB.prepare('UPDATE playroom_profiles SET tutorial=MAX(tutorial,?) WHERE actor_id=?').bind(body.step, actor.id).run();
    return { ok: true };
  }
  if (path === 'presence' || path === 'invitation') {
    if (path === 'presence') {
      if (!UUID.test(body.tab || '') || !['idle','waiting','playing'].includes(body.status) || !['go','chess'].includes(body.game||'go')) return fail('INVALID_ACTION');
      // Without parental gate, never publish into the public directory.
      const allowPublic = actor.visible === true && body.parentalGateAck === true;
      body = { ...body, type: 'beat', private: !!body.private || !allowPublic };
    } else if (!['invite','accept','decline'].includes(body.type)) return fail('INVALID_ACTION');
    return env.PLAYROOMS.getByName('public:v1').directory(actor, body);
  }
  if (path === 'families') {
    const id = crypto.randomUUID();
    return env.PLAYROOMS.getByName(`family:${id}`).family(actor, { type: 'create', id, tab: UUID.test(body.tab || '') ? body.tab : undefined });
  }
  const match = path.match(/^families\/([a-f0-9-]{36})$/);
  if (match) {
    if (!['get','join','beat','ready','settings','leave','start'].includes(body.type)) return fail('INVALID_ACTION');
    if (body.tab !== undefined && !UUID.test(body.tab)) return fail('INVALID_ACTION');
    const stub = env.PLAYROOMS.getByName(`family:${match[1]}`);
    if(body.type==='start')return stub.start(actor,body.revision);
    if(body.type==='settings')return stub.configure(actor,body);
    return stub.family(actor, body);
  }
  return fail('NOT_FOUND');
}
