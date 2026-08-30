const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';
const MEMBERSHIP_PRICE_JPY = 500;
const MEMBERSHIP_OFFER_ID = 'PSES_AD_FREE_LIFETIME_JPY_500';
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_TTL_SECONDS = 10 * 60;
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

  if (url.pathname === '/api/health') return handleHealth(request, env);
  if (url.pathname === '/api/auth/turnstile-verify' && request.method === 'POST') return handleTurnstile(request, env);
  if (url.pathname === '/api/auth/google') return handleOAuth('google', request, env);
  if (url.pathname === '/api/auth/apple') return handleOAuth('apple', request, env);
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return handleSession(request, env);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
  if (url.pathname === '/api/membership' && request.method === 'GET') return handleMembership(request, env);
  if (url.pathname === '/api/membership/checkout' && request.method === 'POST') return handleMembershipCheckout(request, env);
  if (url.pathname === '/api/membership/webhook' && request.method === 'POST') return handleMembershipWebhook(request, env);
  if ((url.pathname === '/api/game-data' || url.pathname.startsWith('/api/game-data/')) && request.method === 'GET') return handleGameData(request, env);
  if (url.pathname === '/api/star-graph' && request.method === 'GET') return handleStarGraph(request, env);
  if (url.pathname === '/api/state' && request.method === 'GET') return handleStateRead(request, env);
  if (url.pathname === '/api/state' && request.method === 'PUT') return handleStateWrite(request, env);
  return json({ error: 'NOT_FOUND' }, 404, request, env);
}

async function handleHealth(request, env) {
  const database = requiredDatabase(env);
  const result = await database.prepare('SELECT 1 AS ready').first();
  return json({ ok: result?.ready === 1, service: 'japanese-pses', database: 'cloudflare-d1' }, 200, request, env);
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
  const now = Date.now();
  const database = requiredDatabase(env);
  await database.batch([
    database.prepare('DELETE FROM oauth_transactions WHERE expires_at <= ?1').bind(now),
    database.prepare(`INSERT INTO oauth_transactions
      (state, provider, nonce, verifier, redirect_uri, created_at, expires_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
      .bind(state, provider, nonce, verifier, redirectUri, now, now + OAUTH_TTL_SECONDS * 1000)
  ]);

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
  const database = requiredDatabase(env);
  const oauth = state
    ? await database.prepare(`SELECT provider, nonce, verifier, redirect_uri AS redirectUri
        FROM oauth_transactions WHERE state = ?1 AND expires_at > ?2 LIMIT 1`).bind(state, Date.now()).first()
    : null;
  if (!state || !constantTimeEqual(state, cookieState || '') || !oauth || oauth.provider !== provider) {
    return oauthFailureRedirect(env, 'invalid_state');
  }
  await database.prepare('DELETE FROM oauth_transactions WHERE state = ?1').bind(state).run();
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
  const session = await createSession({ id: userId, provider, providerSubject: claims.sub, displayName, email: claims.email || null }, env);
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
  const now = nowSeconds * 1000;
  const jti = randomToken(24);
  const payload = { sub: user.id, provider: user.provider, iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS, jti };
  const token = await signJwt(payload, requiredEnv(env, 'JWT_SECRET'));
  const database = requiredDatabase(env);
  await database.batch([
    database.prepare(`INSERT INTO users
      (user_id, display_name, email, primary_provider, status, created_at, updated_at, last_login_at)
      VALUES (?1, ?2, ?3, ?4, 'ACTIVE', ?5, ?5, ?5)
      ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, email=excluded.email,
        primary_provider=excluded.primary_provider, updated_at=excluded.updated_at,
        last_login_at=excluded.last_login_at, status='ACTIVE'`)
      .bind(user.id, user.displayName, user.email, user.provider, now),
    database.prepare(`INSERT INTO oauth_accounts
      (provider, provider_subject, user_id, provider_email, created_at, last_login_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?5)
      ON CONFLICT(provider, provider_subject) DO UPDATE SET user_id=excluded.user_id,
        provider_email=excluded.provider_email, last_login_at=excluded.last_login_at`)
      .bind(user.provider, user.providerSubject, user.id, user.email, now),
    database.prepare(`INSERT INTO auth_sessions (jti, user_id, provider, created_at, expires_at, revoked_at)
      VALUES (?1, ?2, ?3, ?4, ?5, NULL)`)
      .bind(jti, user.id, user.provider, now, payload.exp * 1000),
    database.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?1 OR revoked_at IS NOT NULL').bind(now)
  ]);
  return { token, payload };
}

async function authenticate(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const authHeader = request.headers.get('Authorization') || '';
  const token = cookies.pses_session || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, requiredEnv(env, 'JWT_SECRET'));
    const live = await requiredDatabase(env).prepare(`SELECT s.user_id AS userId, s.expires_at AS expires,
      u.primary_provider AS provider, u.display_name AS displayName, u.email
      FROM auth_sessions s JOIN users u ON u.user_id = s.user_id
      WHERE s.jti = ?1 AND s.revoked_at IS NULL AND s.expires_at > ?2 AND u.status = 'ACTIVE' LIMIT 1`)
      .bind(payload.jti, Date.now()).first();
    return live && live.userId === payload.sub
      ? { ...payload, user: { id: live.userId, provider: live.provider, displayName: live.displayName, email: live.email || null } }
      : null;
  } catch {
    return null;
  }
}

async function handleSession(request, env) {
  const session = await authenticate(request, env);
  return session
    ? json({ authenticated: true, user: session.user || { id: session.sub, provider: session.provider, displayName: 'まなびくん', email: null } }, 200, request, env)
    : json({ authenticated: false }, 401, request, env);
}

async function handleLogout(request, env) {
  const session = await authenticate(request, env);
  if (session) await requiredDatabase(env).prepare('UPDATE auth_sessions SET revoked_at = ?1 WHERE jti = ?2').bind(Date.now(), session.jti).run();
  return json({ success: true }, 200, request, env, { 'Set-Cookie': expiredSessionCookie(request, env) });
}

async function handleMembership(request, env) {
  const session = await authenticate(request, env);
  let membership = null;
  if (session) {
    membership = await requiredDatabase(env).prepare(`SELECT plan, ad_free, price_paid_jpy, purchased_at
      FROM memberships WHERE user_id = ?1 LIMIT 1`).bind(session.sub).first();
  }
  return json({
    authenticated: Boolean(session),
    plan: membership?.ad_free ? 'AD_FREE_LIFETIME' : 'FREE',
    adFree: Boolean(membership?.ad_free),
    priceJpy: MEMBERSHIP_PRICE_JPY,
    purchasedAt: membership?.purchased_at == null ? null : Number(membership.purchased_at),
    paymentAvailable: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    googleH5AdsPublisherId: publicGoogleAdsPublisherId(env.GOOGLE_H5_ADS_CLIENT)
  }, 200, request, env);
}

async function handleMembershipCheckout(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: 'UNAUTHORIZED' }, 401, request, env);
  const existing = await requiredDatabase(env).prepare('SELECT ad_free FROM memberships WHERE user_id = ?1 LIMIT 1').bind(session.sub).first();
  if (existing?.ad_free) return json({ error: 'ALREADY_AD_FREE' }, 409, request, env);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return json({ error: 'PAYMENT_NOT_CONFIGURED' }, 503, request, env);

  const appOrigin = env.APP_ORIGIN || new URL(request.url).origin;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('client_reference_id', session.sub);
  form.set('success_url', `${appOrigin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${appOrigin}/?payment=cancelled`);
  form.set('line_items[0][price_data][currency]', 'jpy');
  form.set('line_items[0][price_data][unit_amount]', String(MEMBERSHIP_PRICE_JPY));
  form.set('line_items[0][price_data][tax_behavior]', 'inclusive');
  form.set('line_items[0][price_data][product_data][name]', 'まなびぽっぷ！ 広告なしメンバー');
  form.set('line_items[0][price_data][product_data][description]', '一度のお支払いで、まなびぽっぷ！の広告をずっと非表示にします。');
  form.set('line_items[0][quantity]', '1');
  form.set('metadata[user_id]', session.sub);
  form.set('metadata[offer_id]', MEMBERSHIP_OFFER_ID);
  form.set('payment_intent_data[metadata][user_id]', session.sub);
  form.set('payment_intent_data[metadata][offer_id]', MEMBERSHIP_OFFER_ID);
  if (session.user?.email) form.set('customer_email', session.user.email);

  const stripeResponse = await fetch(STRIPE_CHECKOUT_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const checkout = await stripeResponse.json();
  if (!stripeResponse.ok || !checkout.url || !checkout.id) {
    console.warn('Stripe Checkout creation failed', stripeResponse.status, checkout?.error?.type || 'unknown');
    return json({ error: 'CHECKOUT_CREATE_FAILED' }, 502, request, env);
  }
  return json({ checkoutUrl: checkout.url, sessionId: checkout.id, priceJpy: MEMBERSHIP_PRICE_JPY }, 201, request, env);
}

async function handleMembershipWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'PAYMENT_NOT_CONFIGURED' }, 503, request, env);
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return json({ error: 'PAYLOAD_TOO_LARGE' }, 413, request, env);
  const signature = request.headers.get('Stripe-Signature') || '';
  if (!await verifyStripeWebhookSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: 'INVALID_WEBHOOK_SIGNATURE' }, 400, request, env);
  }
  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'INVALID_JSON' }, 400, request, env); }
  if (!event?.id || !event?.type) return json({ error: 'INVALID_STRIPE_EVENT' }, 400, request, env);

  if (event.type === 'checkout.session.completed') {
    const checkout = event.data?.object || {};
    const userId = checkout.metadata?.user_id;
    const validPurchase = checkout.payment_status === 'paid'
      && checkout.metadata?.offer_id === MEMBERSHIP_OFFER_ID
      && checkout.currency === 'jpy'
      && Number(checkout.amount_total) === MEMBERSHIP_PRICE_JPY
      && typeof userId === 'string' && userId.length > 0;
    if (!validPurchase) return json({ error: 'INVALID_MEMBERSHIP_PURCHASE' }, 400, request, env);
    const now = Date.now();
    const database = requiredDatabase(env);
    const user = await database.prepare('SELECT user_id FROM users WHERE user_id = ?1 LIMIT 1').bind(userId).first();
    if (!user) return json({ error: 'MEMBERSHIP_USER_NOT_FOUND' }, 404, request, env);
    await database.batch([
      database.prepare(`INSERT INTO payment_events
        (event_id, provider, event_type, user_id, amount_jpy, payload_json, received_at)
        VALUES (?1, 'stripe', ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(event_id) DO NOTHING`)
        .bind(event.id, event.type, userId, MEMBERSHIP_PRICE_JPY, rawBody, now),
      database.prepare(`INSERT INTO memberships
        (user_id, plan, ad_free, price_paid_jpy, payment_provider, provider_customer_id, provider_payment_id, purchased_at, updated_at)
        VALUES (?1, 'AD_FREE_LIFETIME', 1, ?2, 'stripe', ?3, ?4, ?5, ?5)
        ON CONFLICT(user_id) DO UPDATE SET plan='AD_FREE_LIFETIME', ad_free=1,
          price_paid_jpy=excluded.price_paid_jpy, payment_provider='stripe',
          provider_customer_id=COALESCE(excluded.provider_customer_id, memberships.provider_customer_id),
          provider_payment_id=excluded.provider_payment_id, updated_at=excluded.updated_at`)
        .bind(userId, MEMBERSHIP_PRICE_JPY, checkout.customer || null, checkout.payment_intent || checkout.id, now)
    ]);
  }
  return json({ received: true }, 200, request, env);
}

export async function verifyStripeWebhookSignature(rawBody, signatureHeader, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const entries = signatureHeader.split(',').map(part => part.trim().split('=', 2));
  const timestamp = Number(entries.find(([key]) => key === 't')?.[1]);
  const signatures = entries.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS || signatures.length === 0) return false;
  const expected = await hmacHex(`${timestamp}.${rawBody}`, secret);
  return signatures.some(candidate => constantTimeEqual(candidate, expected));
}

function publicGoogleAdsPublisherId(value) {
  const candidate = String(value || '').trim();
  return /^ca-pub-\d{10,}$/.test(candidate) ? candidate : null;
}

async function handleStarGraph(request, env) {
  const document = await readContentDocument(requiredDatabase(env), 'subjects_curriculum.json');
  if (!document) return json({ error: 'STAR_GRAPH_NOT_FOUND' }, 404, request, env);
  return d1DocumentResponse(document, request, env, 300);
}

async function handleGameData(request, env) {
  const url = new URL(request.url);
  const encodedName = url.pathname === '/api/game-data'
    ? 'manifest.json'
    : url.pathname.slice('/api/game-data/'.length);
  let fileName;
  try { fileName = decodeURIComponent(encodedName); } catch { throw new HttpError(400, 'INVALID_GAME_DATA_FILE'); }
  if (!GAME_DATA_FILES.includes(fileName)) return json({ error: 'GAME_DATA_NOT_FOUND' }, 404, request, env);
  const document = await readContentDocument(requiredDatabase(env), fileName);
  if (!document) return json({ error: 'GAME_DATA_NOT_FOUND' }, 404, request, env);
  return d1DocumentResponse(document, request, env, fileName === 'manifest.json' ? 60 : 300);
}

async function readContentDocument(database, documentKey) {
  const metadata = await database.prepare(`SELECT document_key, etag, content_type, byte_size, chunk_count
    FROM content_documents WHERE document_key = ?1 LIMIT 1`).bind(documentKey).first();
  if (!metadata) return null;
  const chunkResult = await database.prepare(`SELECT content_chunk FROM content_document_chunks
    WHERE document_key = ?1 ORDER BY chunk_index ASC`).bind(documentKey).all();
  const body = (chunkResult.results || []).map(row => row.content_chunk).join('');
  if (!body) throw new HttpError(503, 'CONTENT_NOT_READY');
  return { ...metadata, body };
}

function d1DocumentResponse(document, request, env, maxAge) {
  const headers = corsHeaders(request, env);
  headers.set('content-type', document.content_type || 'application/json; charset=utf-8');
  if (document.etag) headers.set('etag', document.etag);
  headers.set('cache-control', `public, max-age=${maxAge}, stale-while-revalidate=86400`);
  if (document.etag && request.headers.get('if-none-match') === document.etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(document.body, { headers });
}

async function handleStateRead(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: 'UNAUTHORIZED' }, 401, request, env);
  return json(await readUserState(requiredDatabase(env), session.sub), 200, request, env);
}

async function handleStateWrite(request, env) {
  const session = await authenticate(request, env);
  if (!session) return json({ error: 'UNAUTHORIZED' }, 401, request, env);
  const incoming = await readJson(request);
  validateGameState(incoming);
  const database = requiredDatabase(env);
  const existing = await readUserState(database, session.sub);
  const merged = mergeGameState(existing, incoming, session.sub);
  const statements = [];
  if (merged.profile) {
    const profile = merged.profile;
    statements.push(database.prepare(`INSERT INTO user_profiles
      (user_id, star_coins, cleared_nodes_json, cleared_stages_json, achievements_json, inventory_json, profile_json, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ON CONFLICT(user_id) DO UPDATE SET star_coins=excluded.star_coins,
        cleared_nodes_json=excluded.cleared_nodes_json, cleared_stages_json=excluded.cleared_stages_json,
        achievements_json=excluded.achievements_json, inventory_json=excluded.inventory_json,
        profile_json=excluded.profile_json, updated_at=excluded.updated_at`)
      .bind(session.sub, Math.max(0, Number(profile.star_coins || 0)), jsonText(profile.cleared_nodes, []),
        jsonText(profile.cleared_stages, {}), jsonText(profile.achievements, []), jsonText(profile.inventory, []),
        JSON.stringify(profile), Number(profile.updated_at || merged.updatedAt)));
    const graduation = (profile.achievements || []).find(item => item?.id === 'ELEMENTARY_GRADUATION_CERTIFICATE');
    if (graduation?.certificateNumber) {
      statements.push(database.prepare(`INSERT INTO graduation_awards
        (user_id, certificate_id, reward_coins, issued_at, payload_json)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(user_id) DO NOTHING`)
        .bind(session.sub, graduation.certificateNumber, Math.max(0, Number(graduation.rewardCoins || 1000)),
          Number(new Date(graduation.issuedAt).getTime()) || Date.now(), JSON.stringify(graduation)));
    }
  }
  for (const node of merged.nodeProgress || []) {
    statements.push(database.prepare(`INSERT INTO node_progress
      (user_id, node_id, mastery_score, unlocked_status, highest_score, completed_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(user_id, node_id) DO UPDATE SET mastery_score=excluded.mastery_score,
        unlocked_status=excluded.unlocked_status, highest_score=MAX(node_progress.highest_score, excluded.highest_score),
        completed_at=COALESCE(node_progress.completed_at, excluded.completed_at), updated_at=excluded.updated_at
      WHERE excluded.updated_at >= node_progress.updated_at`)
      .bind(session.sub, node.node_id, clamp(Number(node.mastery_score || 0), 0, 1), node.unlocked_status ? 1 : 0,
        Math.max(0, Number(node.highest_score || 0)), node.completed_at || null, Number(node.updated_at || merged.updatedAt)));
  }
  for (const attempt of incoming.attempts || []) {
    statements.push(database.prepare(`INSERT OR IGNORE INTO game_attempts
      (attempt_id, user_id, node_id, game_type, grade, score, accuracy, stars, completed, details_json, attempted_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
      .bind(attempt.attempt_id || randomToken(18), session.sub, attempt.node_id, attempt.game_type || null,
        attempt.grade || null, Math.max(0, Number(attempt.score || 0)), clamp(Number(attempt.accuracy || 0), 0, 1),
        clamp(Math.trunc(Number(attempt.stars || 0)), 0, 3), attempt.completed ? 1 : 0,
        JSON.stringify(attempt.details || {}), Number(attempt.attempted_at || Date.now())));
  }
  if (statements.length) await database.batch(statements);
  return json({ success: true, state: merged }, 200, request, env);
}

async function readUserState(database, userId) {
  const profileRow = await database.prepare('SELECT * FROM user_profiles WHERE user_id = ?1 LIMIT 1').bind(userId).first();
  const progressResult = await database.prepare(`SELECT node_id, mastery_score, unlocked_status,
    highest_score, completed_at, updated_at FROM node_progress WHERE user_id = ?1 ORDER BY updated_at ASC`).bind(userId).all();
  const profile = profileRow ? {
    ...parseJson(profileRow.profile_json, {}),
    user_id: userId,
    star_coins: Number(profileRow.star_coins),
    cleared_nodes: parseJson(profileRow.cleared_nodes_json, []),
    cleared_stages: parseJson(profileRow.cleared_stages_json, {}),
    achievements: parseJson(profileRow.achievements_json, []),
    inventory: parseJson(profileRow.inventory_json, []),
    updated_at: Number(profileRow.updated_at)
  } : null;
  const nodeProgress = (progressResult.results || []).map(row => ({
    user_id: userId,
    node_id: row.node_id,
    mastery_score: Number(row.mastery_score),
    unlocked_status: Boolean(row.unlocked_status),
    highest_score: Number(row.highest_score),
    completed_at: row.completed_at == null ? null : Number(row.completed_at),
    updated_at: Number(row.updated_at)
  }));
  return {
    version: 2,
    storage: 'cloudflare-d1',
    userId,
    updatedAt: Math.max(0, Number(profile?.updated_at || 0), ...nodeProgress.map(node => node.updated_at)),
    profile,
    nodeProgress
  };
}

function validateGameState(state) {
  if (!state || typeof state !== 'object' || (state.nodeProgress && !Array.isArray(state.nodeProgress))) throw new HttpError(400, 'INVALID_GAME_STATE');
  if (state.attempts && !Array.isArray(state.attempts)) throw new HttpError(400, 'INVALID_GAME_ATTEMPTS');
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
  return { version: 2, storage: 'cloudflare-d1', userId, updatedAt: Math.max(Date.now(), Number(existing?.updatedAt || 0), Number(incoming.updatedAt || 0)), profile: profile || null, nodeProgress: [...nodes.values()] };
}

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
function parseJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function jsonText(value, fallback) { return JSON.stringify(value == null ? fallback : value); }
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum)); }
function requiredDatabase(env) { if (!env.DB) throw new HttpError(503, 'DATABASE_UNAVAILABLE'); return env.DB; }
function requiredEnv(env, key) { if (!env[key]) throw new Error(`Missing Worker secret: ${key}`); return env[key]; }

class HttpError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
