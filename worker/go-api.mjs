import { capacity } from './go-capacity.mjs';
import { profileFor, playroomRoute } from './playroom-api.mjs';
import { chessRoute } from './chess-api.mjs';
const ROOM = /^[a-f0-9-]{36}$/;
export async function goRoute(request, env, helpers) {
  const { authenticate, signJwt, verifyJwt, parseCookies, HttpError } = helpers;
  const url = new URL(request.url), path = url.pathname.slice('/api/arena/'.length);
  const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', ...extra } });
  if (!env.GO_ROOMS || !env.GO_LOBBY || !env.JWT_SECRET) throw new HttpError(503, 'ARENA_UNAVAILABLE');
  const origin = request.headers.get('Origin');
  const allowed = [env.APP_ORIGIN, ...(env.DEV_ORIGINS || '').split(',')];
  if ((request.method === 'POST' || path.endsWith('/socket')) && (!origin || !allowed.includes(origin))) throw new HttpError(403, 'INVALID_ORIGIN');
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (!await env.GO_LOBBY.getByName(`limit:${digest}`).limit()) throw new HttpError(429, 'TRY_LATER');
  const session = await authenticate(request, env);
  let actor;
  if (session) actor = { id: `u:${session.sub}`, userId: session.sub, name: `Player-${session.sub.replace(/[^a-z0-9]/gi, '').slice(-6)}`, expires: session.exp * 1000 };
  else {
    try {
      const payload = await verifyJwt(parseCookies(request.headers.get('Cookie') || '').go_guest || '', env.JWT_SECRET);
      if (payload.aud === 'go-guest' && typeof payload.sub === 'string' && payload.sub.startsWith('g:')) actor = { id: payload.sub, name: `Guest-${payload.sub.slice(-6)}`, expires: payload.exp * 1000 };
    } catch { /* No valid guest cookie. Only the identity endpoint may issue one. */ }
  }
  if (actor) Object.assign(actor, await profileFor(env, actor));
  if (path === 'identity' && request.method === 'POST') {
    if (actor) return reply({ name: actor.name, avatar: actor.avatar, publicId: actor.publicId, visible: actor.visible, tutorial: actor.tutorial, tutorials: actor.tutorials, configured: actor.configured, authenticated: !!session });
    const sub = `g:${crypto.randomUUID()}`, exp = Math.floor(Date.now() / 1000) + 7 * 86400;
    const token = await signJwt({ sub, aud: 'go-guest', exp }, env.JWT_SECRET);
    return reply({ name: `Guest-${sub.slice(-6)}`, authenticated: false }, 200, { 'Set-Cookie': `go_guest=${token}; Path=/api/arena; HttpOnly; SameSite=Strict; Max-Age=604800${url.protocol === 'https:' ? '; Secure' : ''}` });
  }
  if (!actor) throw new HttpError(401, 'LOGIN_REQUIRED');
  if (path.startsWith('chess/')) {
    let body = null;
    if (request.method === 'POST') body = await readJson(request, HttpError);
    return chessRoute(request, env, actor, path, body, reply, HttpError);
  }
  if (path === 'history' && request.method === 'GET') {
    if (!session) return reply({ entries: [] });
    const result = await env.DB.prepare('SELECT room_id,mode,result_json,game_json,finished_at FROM go_games WHERE black_user=?1 OR white_user=?1 ORDER BY finished_at DESC LIMIT 20').bind(session.sub).all();
    return reply({ entries: result.results });
  }
  const match = path.match(/^rooms\/([a-f0-9-]{36})(\/socket)?$/);
  if (match && request.method === 'GET') {
    const stub = env.GO_ROOMS.getByName(match[1]);
    if (match[2]) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') throw new HttpError(426, 'UPGRADE_REQUIRED');
      return stub.fetch(new Request(request.url, { headers: { Upgrade: 'websocket', 'x-go-actor': JSON.stringify(actor) } }));
    }
    const result = await stub.execute(actor, { type: 'get' }); return reply(result, result.error ? 403 : 200);
  }
  if (request.method !== 'POST') throw new HttpError(404, 'NOT_FOUND');
  const body = await readJson(request, HttpError);
  if (['profile','presence','invitation','families','tutorial','report','block'].includes(path) || path.startsWith('families/')) {
    const result = await playroomRoute(env, actor, path, body);
    return reply(result, result.error ? 409 : 200);
  }
  const boardSize = body.size ?? 9, rules = body.rules ?? 'chinese';
  if (['rooms', 'match', 'match/cancel'].includes(path) && (![9, 19].includes(boardSize) || !['chinese', 'japanese'].includes(rules) || body.komi !== undefined)) throw new HttpError(400, 'INVALID_SETTINGS');
  const pool = boardSize === 9 && rules === 'chinese' ? 'match:9' : `match:${boardSize}:${rules}`;
  if (path === 'match/cancel') { await env.GO_LOBBY.getByName(pool).cancel(actor.id); return reply({ ok: true }); }
  if (path === 'rooms' || path === 'match') {
    const mode = path === 'match' ? 'match' : body.mode === 'ai' ? 'ai' : 'invite';
    if (mode === 'match' && body.parentalGateAck !== true) return reply({ error: 'PARENTAL_GATE_REQUIRED' }, 403);
    const difficulty = ['beginner', 'easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'easy';
    let room = crypto.randomUUID();
    if (mode === 'match') room = (await env.GO_LOBBY.getByName(pool).match(actor.id)).room;
    if (mode === 'ai') {
      let admission;
      try { admission = await capacity(env).acquireAI(room, actor.id, difficulty, boardSize); }
      catch { return reply({ error: 'AI_BUSY' }, 503, { 'Retry-After': '60' }); }
      if (admission.error) return reply(admission, admission.error === 'AI_ALREADY_ACTIVE' ? 409 : 503, { 'Retry-After': '60' });
    }
    // An ambiguous creation failure keeps its short lease until expiry: releasing
    // here could undercount a room that was actually created before the RPC failed.
    const result = await env.GO_ROOMS.getByName(room).execute(actor, { type: 'create', room, mode, difficulty, size: boardSize, rules });
    return reply(result, result.error ? 409 : 200);
  }
  if (match && ROOM.test(match[1])) {
    if (body.type === 'rematch') {
      const result = await env.GO_ROOMS.getByName(match[1]).rematch(actor, body.accept !== false);
      return reply(result, result.error ? 409 : 200);
    }
    if (!['join', 'ready', 'move', 'dead', 'seki', 'accept', 'resume', 'resign', 'cancel'].includes(body.type)) throw new HttpError(400, 'INVALID_ACTION');
    const result = await env.GO_ROOMS.getByName(match[1]).execute(actor, body); return reply(result, result.error ? 409 : 200);
  }
  throw new HttpError(404, 'NOT_FOUND');
}

async function readJson(request, HttpError) {
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'INVALID_JSON');
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'INVALID_JSON');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'INVALID_JSON');return body;
}
