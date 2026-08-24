const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_TTL_SECONDS = 10 * 60;
const GUEST_TTL_SECONDS = 60 * 60 * 24 * 30;
const GUEST_DURATION_MS = 10 * 60 * 1000;
const GAME_DATA_FILES = [
  'eigo.json', 'kanji_1026.json', 'kokugo.json', 'metadata.json',
  'prefectures_47.json', 'rika.json', 'sansu.json', 'seikatsu.json',
  'shakai.json', 'subjects_curriculum.json', 'manifest.json'
];

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (!(error instanceof HttpError)) console.error('Worker request failed', error);
      return json({ error: error instanceof HttpError ? error.code : 'INTERNAL_ERROR', message: '処理中にエラーが発生しました。' }, status, request, env);
    }
  }
};

async function routeRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });

  if (url.pathname === '/api/health') return json({ ok: true, service: 'japanese-pses' }, 200, request, env);
  if (url.pathname === '/api/auth/turnstile-verify' && request.method === 'POST') return handleTurnstile(request, env);
  if (url.pathname === '/api/auth/google') return handleOAuth('google', request, env);
  if (url.pathname === '/api/auth/apple') return handleOAuth('apple', request, env);
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return handleSession(request, env);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
  if (url.pathname === '/api/guest/start' && request.method === 'POST') return handleGuestStart(request, env);
  if (url.pathname === '/api/guest/status' && request.method === 'POST') return handleGuestStatus(request, env);
  if ((url.pathname === '/api/game-data' || url.pathname.startsWith('/api/game-data/')) && request.method === 'GET') return handleGameData(request, env);
  if (url.pathname === '/api/star-graph' && request.method === 'GET') return handleStarGraph(request, env);
  if (url.pathname === '/api/state' && request.method === 'GET') return handleStateRead(request, env);
  if (url.pathname === '/api/state' && request.method === 'PUT') return handleStateWrite(request, env);
  return json({ error: 'NOT_FOUND' }, 404, request, env);
}

async function handleTurnstile(request, env) {
  const body = await readJson(request);
  const verification = await verifyTurnstile(body.turnstileToken || body['cf-turnstile-response'], request, env, body.action);
  return json({ success: verification.success, errorCodes: verification['error-codes'] || [] }, verification.success ? 200 : 400, request, env);
}

async function verifyTurnstile(token, request, env, expectedAction) {
  if (!token || typeof token !== 'string' || token.length > 2048) return { success: false, 'error-codes': ['missing-input-response'] };
  const form = new FormData();
  form.set('secret', requiredEnv(env, 'TURNSTILE_SECRET_KEY'));
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  form.set('idempotency_key', crypto.randomUUID());
  const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
  const result = await response.json();
  const hostAllowed = !env.TURNSTILE_HOSTNAME || result.hostname === env.TURNSTILE_HOSTNAME;
  const actionAllowed = !expectedAction || result.action === expectedAction;
  return { ...result, success: Boolean(result.success && hostAllowed && actionAllowed) };
}

async function handleOAuth(provider, request, env) {
  const url = new URL(request.url);
  if (provider === 'apple' && request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded')) {
    return finishOAuth(provider, request, env, Object.fromEntries(await request.formData()));
  }
  if (request.method === 'GET' && url.searchParams.get('code')) {
    return finishOAuth(provider, request, env, Object.fromEntries(url.searchParams));
  }
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, request, env);

  const body = await readJson(request);
  const turnstile = await verifyTurnstile(body['cf-turnstile-response'] || body.turnstileToken, request, env, 'access');
  if (!turnstile.success) return json({ error: 'TURNSTILE_FAILED', errorCodes: turnstile['error-codes'] || [] }, 400, request, env);

  const state = randomToken(32);
  const nonce = randomToken(32);
  const verifier = randomToken(48);
  const redirectUri = oauthRedirectUri(provider, request, env);
  await env.SESSION_KV.put(`oauth:${state}`, JSON.stringify({ provider, nonce, verifier, redirectUri, createdAt: Date.now() }), { expirationTtl: OAUTH_TTL_SECONDS });

  const params = provider === 'google'
    ? new URLSearchParams({
        client_id: requiredEnv(env, 'GOOGLE_CLIENT_ID'), redirect_uri: redirectUri, response_type: 'code',
        scope: 'openid email profile', state, nonce, code_challenge: await sha256Base64Url(verifier),
        code_challenge_method: 'S256', prompt: 'select_account'
      })
    : new URLSearchParams({
        client_id: requiredEnv(env, 'APPLE_CLIENT_ID'), redirect_uri: redirectUri, response_type: 'code id_token',
        response_mode: 'form_post', scope: 'name email', state, nonce
      });
  const authorizeUrl = `${provider === 'google' ? GOOGLE_AUTHORIZE_URL : APPLE_AUTHORIZE_URL}?${params}`;
  return json({ authorizeUrl }, 200, request, env, { 'Set-Cookie': oauthCookie(state, provider, request, env) });
}

async function finishOAuth(provider, request, env, callback) {
  const state = callback.state;
  const cookieState = parseCookies(request.headers.get('Cookie') || '').oauth_state;
  const oauth = state ? await env.SESSION_KV.get(`oauth:${state}`, 'json') : null;
  if (!state || !constantTimeEqual(state, cookieState || '') || !oauth || oauth.provider !== provider) {
    return oauthFailureRedirect(env, 'invalid_state');
  }
  await env.SESSION_KV.delete(`oauth:${state}`);
  if (callback.error || !callback.code) return oauthFailureRedirect(env, callback.error || 'missing_code');

  const tokenBody = new URLSearchParams({
    code: callback.code, grant_type: 'authorization_code', redirect_uri: oauth.redirectUri,
    client_id: provider === 'google' ? requiredEnv(env, 'GOOGLE_CLIENT_ID') : requiredEnv(env, 'APPLE_CLIENT_ID'),
    client_secret: provider === 'google' ? requiredEnv(env, 'GOOGLE_CLIENT_SECRET') : requiredEnv(env, 'APPLE_CLIENT_SECRET')
  });
  if (provider === 'google') tokenBody.set('code_verifier', oauth.verifier);
  let claims;
  try {
    const tokenResponse = await fetch(provider === 'google' ? GOOGLE_TOKEN_URL : APPLE_TOKEN_URL, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: tokenBody
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.id_token) return oauthFailureRedirect(env, 'token_exchange_failed');
    claims = await verifyProviderIdToken(tokens.id_token, provider, oauth.nonce, env);
  } catch (error) {
    console.warn('OAuth identity validation rejected', provider, error instanceof Error ? error.message : 'unknown');
    return oauthFailureRedirect(env, 'identity_validation_failed');
  }
  const userId = `${provider}:${claims.sub}`;
  const displayName = provider === 'apple'
    ? parseAppleName(callback.user) || claims.email?.split('@')[0] || 'Appleユーザー'
    : claims.name || claims.email?.split('@')[0] || 'Googleユーザー';
  const session = await createSession({ id: userId, provider, displayName, email: claims.email || null }, env);
  const target = new URL(env.APP_ORIGIN || new URL(request.url).origin);
  target.searchParams.set('auth', 'success');
  return new Response(null, { status: 302, headers: { location: target.toString(), 'Set-Cookie': sessionCookie(session.token, request, env), 'cache-control': 'no-store' } });
}

async function verifyProviderIdToken(idToken, provider, expectedNonce, env) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error('Malformed ID token');
  const header = JSON.parse(base64UrlDecodeText(encodedHeader));
  const claims = JSON.parse(base64UrlDecodeText(encodedPayload));
  const jwksResponse = await fetch(provider === 'google' ? GOOGLE_JWKS_URL : APPLE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk || header.alg !== 'RS256') throw new Error('Unsupported identity signature');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  const expectedAudience = provider === 'google' ? requiredEnv(env, 'GOOGLE_CLIENT_ID') : requiredEnv(env, 'APPLE_CLIENT_ID');
  const issuerValid = provider === 'google'
    ? ['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)
    : claims.iss === 'https://appleid.apple.com';
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!valid || !issuerValid || !audience.includes(expectedAudience) || Number(claims.exp) * 1000 <= Date.now() || claims.nonce !== expectedNonce) {
    throw new Error('Identity token claims rejected');
  }
  return claims;
}

async function createSession(user, env) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jti = randomToken(24);
  const payload = { sub: user.id, provider: user.provider, iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS, jti };
  const token = await signJwt(payload, requiredEnv(env, 'JWT_SECRET'));
  await env.SESSION_KV.put(`session:${jti}`, JSON.stringify({ userId: user.id, expires: payload.exp * 1000, user }), { expirationTtl: SESSION_TTL_SECONDS });
  return { token, payload };
}

async function authenticate(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const authHeader = request.headers.get('Authorization') || '';
  const token = cookies.pses_session || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, requiredEnv(env, 'JWT_SECRET'));
    const live = await env.SESSION_KV.get(`session:${payload.jti}`, 'json');
    return live && live.userId === payload.sub && live.expires > Date.now() ? { ...payload, user: live.user } : null;
  } catch {
    return null;
  }
}

async function handleSession(request, env) {
  const session = await authenticate(request, env);
  return session
    ? json({ authenticated: true, user: session.user || { id: session.sub, provider: session.provider, displayName: '学習者', email: null } }, 200, request, env)
    : json({ authenticated: false }, 401, request, env);
}

async function handleLogout(request, env) {
  const session = await authenticate(request, env);
  if (session) await env.SESSION_KV.delete(`session:${session.jti}`);
  return json({ success: true }, 200, request, env, { 'Set-Cookie': expiredSessionCookie(request, env) });
}

async function handleGuestStart(request, env) {
  const body = await readJson(request);
  const turnstile = await verifyTurnstile(body['cf-turnstile-response'] || body.turnstileToken, request, env, 'access');
  if (!turnstile.success) return json({ error: 'TURNSTILE_FAILED' }, 400, request, env);
  const key = await guestKey(body.fingerprintHash, request, env);
  const existing = await env.GUEST_KV.get(key, 'json');
  if (existing) return json({ allowed: false, status: guestStatus(existing), expiresAt: existing.expiresAt, blockExpiresAt: existing.blockExpiresAt || Number(existing.startTime) + GUEST_TTL_SECONDS * 1000 }, 403, request, env);
  const startTime = Date.now();
  const record = { status: 'ACTIVE', startTime, expiresAt: startTime + GUEST_DURATION_MS, blockExpiresAt: startTime + GUEST_TTL_SECONDS * 1000 };
  await env.GUEST_KV.put(key, JSON.stringify(record), { expirationTtl: GUEST_TTL_SECONDS });
  return json({ allowed: true, ...record }, 201, request, env);
}

async function handleGuestStatus(request, env) {
  const body = await readJson(request);
  const key = await guestKey(body.fingerprintHash, request, env);
  const record = await env.GUEST_KV.get(key, 'json');
  if (!record) return json({ allowed: true, status: 'AVAILABLE' }, 200, request, env);
  const status = guestStatus(record);
  if (status !== record.status) {
    const remainingTtl = Math.max(60, Math.floor((Number(record.startTime) + GUEST_TTL_SECONDS * 1000 - Date.now()) / 1000));
    await env.GUEST_KV.put(key, JSON.stringify({ ...record, status }), { expirationTtl: remainingTtl });
  }
  return json({ allowed: status === 'ACTIVE', status, startTime: record.startTime, expiresAt: record.expiresAt, blockExpiresAt: record.blockExpiresAt || Number(record.startTime) + GUEST_TTL_SECONDS * 1000 }, 200, request, env);
}

async function guestKey(clientHash, request, env) {
  if (!clientHash || !/^[a-f0-9]{64}$/i.test(clientHash)) throw new HttpError(400, 'INVALID_FINGERPRINT');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `guest:${await hmacHex(`${clientHash}|${ip}`, requiredEnv(env, 'FINGERPRINT_PEPPER'))}`;
}

function guestStatus(record) {
  return record.status === 'EXPIRED' || Number(record.expiresAt) <= Date.now() ? 'EXPIRED' : 'ACTIVE';
}

async function handleStarGraph(request, env) {
  const object = await env.GAME_DATA_R2.get('game-data/subjects_curriculum.json')
    || await env.GAME_DATA_R2.get('star_graph.json');
  if (!object) return json({ error: 'STAR_GRAPH_NOT_FOUND' }, 404, request, env);
  return r2JsonResponse(object, request, env, 300);
}

async function handleGameData(request, env) {
  const url = new URL(request.url);
  const encodedName = url.pathname === '/api/game-data'
    ? 'manifest.json'
    : url.pathname.slice('/api/game-data/'.length);
  let fileName;
  try { fileName = decodeURIComponent(encodedName); } catch { throw new HttpError(400, 'INVALID_GAME_DATA_FILE'); }
  if (!GAME_DATA_FILES.includes(fileName)) return json({ error: 'GAME_DATA_NOT_FOUND' }, 404, request, env);
  const object = await env.GAME_DATA_R2.get(`game-data/${fileName}`);
  if (!object) return json({ error: 'GAME_DATA_NOT_FOUND' }, 404, request, env);
  return r2JsonResponse(object, request, env, fileName === 'manifest.json' ? 60 : 300);
}

function r2JsonResponse(object, request, env, maxAge) {
  const headers = corsHeaders(request, env);
  headers.set('content-type', object.httpMetadata?.contentType || 'application/json; charset=utf-8');
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  headers.set('cache-control', `public, max-age=${maxAge}, stale-while-revalidate=86400`);
  if (object.httpEtag && request.headers.get('if-none-match') === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}

async function handleStateRead(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: 'UNAUTHORIZED' }, 401, request, env);
  const object = await env.GAME_DATA_R2.get(userStateKey(session.sub));
  if (!object) return json({ version: 1, userId: session.sub, updatedAt: 0, profile: null, nodeProgress: [] }, 200, request, env);
  return json(await object.json(), 200, request, env, object.httpEtag ? { etag: object.httpEtag } : {});
}

async function handleStateWrite(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: 'UNAUTHORIZED' }, 401, request, env);
  const incoming = await readJson(request);
  validateGameState(incoming);
  const key = userStateKey(session.sub);
  const existingObject = await env.GAME_DATA_R2.get(key);
  const existing = existingObject ? await existingObject.json() : null;
  const merged = mergeGameState(existing, incoming, session.sub);
  await env.GAME_DATA_R2.put(key, JSON.stringify(merged), { httpMetadata: { contentType: 'application/json' }, customMetadata: { userId: session.sub, updatedAt: String(merged.updatedAt) } });
  return json({ success: true, state: merged }, 200, request, env);
}

function validateGameState(state) {
  if (!state || typeof state !== 'object' || (state.nodeProgress && !Array.isArray(state.nodeProgress))) throw new HttpError(400, 'INVALID_GAME_STATE');
  if (JSON.stringify(state).length > 1_000_000) throw new HttpError(413, 'GAME_STATE_TOO_LARGE');
}

function mergeGameState(existing, incoming, userId) {
  const nodes = new Map();
  for (const node of [...(existing?.nodeProgress || []), ...(incoming.nodeProgress || [])]) {
    if (!node?.node_id) continue;
    const prior = nodes.get(node.node_id);
    if (!prior || Number(node.updated_at || 0) >= Number(prior.updated_at || 0)) nodes.set(node.node_id, node);
  }
  const profile = Number(incoming.profile?.updated_at || 0) >= Number(existing?.profile?.updated_at || 0) ? incoming.profile : existing?.profile;
  return { version: 1, userId, updatedAt: Math.max(Date.now(), Number(existing?.updatedAt || 0), Number(incoming.updatedAt || 0)), profile: profile || null, nodeProgress: [...nodes.values()] };
}

function userStateKey(userId) { return `users/${encodeURIComponent(userId)}/game_state.json`; }
function oauthRedirectUri(provider, request, env) { return `${env.API_ORIGIN || new URL(request.url).origin}/api/auth/${provider}`; }
function oauthFailureRedirect(env, reason) { const url = new URL(env.APP_ORIGIN); url.searchParams.set('auth', 'error'); url.searchParams.set('reason', reason); return new Response(null, { status: 302, headers: { location: url.toString(), 'cache-control': 'no-store' } }); }
function parseAppleName(value) { try { const user = typeof value === 'string' ? JSON.parse(value) : value; return [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(' ') || null; } catch { return null; } }

async function readJson(request) {
  try { return await request.json(); } catch { throw new HttpError(400, 'INVALID_JSON'); }
}

function json(body, status, request, env, extraHeaders = {}) {
  const headers = corsHeaders(request, env);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(JSON.stringify(body), { status, headers });
}

function corsHeaders(request, env) {
  const headers = new Headers({ 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  const origin = request.headers.get('Origin');
  const allowed = new Set([env.APP_ORIGIN, ...(env.DEV_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173').split(',')].filter(Boolean));
  if (origin && allowed.has(origin)) { headers.set('access-control-allow-origin', origin); headers.set('access-control-allow-credentials', 'true'); headers.set('vary', 'Origin'); }
  headers.set('access-control-allow-methods', 'GET,POST,PUT,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type,authorization,if-match,if-none-match');
  return headers;
}

function parseCookies(value) { return Object.fromEntries(value.split(';').map(part => part.trim().split('=')).filter(parts => parts.length >= 2).map(([key, ...rest]) => [decodeURIComponent(key), decodeURIComponent(rest.join('='))])); }
function cookieSecurity(request, env) { return (env.APP_ORIGIN || new URL(request.url).origin).startsWith('https:') ? '; Secure' : ''; }
function oauthCookie(state, provider, request, env) {
  const sameSite = provider === 'apple' ? 'None' : 'Lax';
  return `oauth_state=${encodeURIComponent(state)}; Path=/api/auth; HttpOnly; SameSite=${sameSite}; Max-Age=${OAUTH_TTL_SECONDS}${cookieSecurity(request, env)}`;
}
function sessionCookie(token, request, env) { return `pses_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${cookieSecurity(request, env)}`; }
function expiredSessionCookie(request, env) { return `pses_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecurity(request, env)}`; }

async function signJwt(payload, secret) {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacBytes(`${header}.${body}`, secret);
  return `${header}.${body}.${base64UrlEncode(signature)}`;
}

async function verifyJwt(token, secret) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Malformed JWT');
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlToBytes(signature), new TextEncoder().encode(`${header}.${body}`));
  const payload = JSON.parse(base64UrlDecodeText(body));
  if (!valid || Number(payload.exp) * 1000 <= Date.now()) throw new Error('Invalid JWT');
  return payload;
}

async function hmacKey(secret) { return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function hmacBytes(value, secret) { return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(value))); }
async function hmacHex(value, secret) { return [...await hmacBytes(value, secret)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
async function sha256Base64Url(value) { return base64UrlEncode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
function randomToken(bytes) { const data = crypto.getRandomValues(new Uint8Array(bytes)); return base64UrlEncode(data); }
function base64UrlEncode(bytes) { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function base64UrlToBytes(value) { const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='); return Uint8Array.from(atob(normalized), char => char.charCodeAt(0)); }
function base64UrlDecodeText(value) { return new TextDecoder().decode(base64UrlToBytes(value)); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let mismatch = 0; for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i); return mismatch === 0; }
function requiredEnv(env, key) { if (!env[key]) throw new Error(`Missing Worker secret: ${key}`); return env[key]; }

class HttpError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
