import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, sign } from 'node:crypto';
import { build } from 'esbuild';
import * as miniflare from 'miniflare';

const origin = 'https://piko-game.com';
const clientId = 'oauth-regression-client';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
let nonce, tokenExchanges = 0;
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const compiled = await build({ entryPoints: ['worker/index.js'], bundle: true, write: false, format: 'esm', platform: 'browser' });
const options = {
  modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-08-24',
  d1Databases: ['DB'], port: 0,
  bindings: {
    APP_ORIGIN: origin, API_ORIGIN: origin, JWT_SECRET: 'oauth-regression-session-secret',
    GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: 'oauth-regression-provider-secret',
    TURNSTILE_SECRET_KEY: 'oauth-regression-turnstile-secret', TURNSTILE_HOSTNAMES: 'piko-game.com'
  },
  outboundService: async request => {
    if (request.url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      const form = await request.formData();
      return json({ success: form.get('response') === 'test-challenge', hostname: 'piko-game.com', action: 'access' });
    }
    if (request.url === 'https://oauth2.googleapis.com/token') {
      tokenExchanges++;
      const body = new URLSearchParams(await request.text());
      assert.equal(body.get('redirect_uri'), `${origin}/api/auth/google`);
      assert.equal(body.get('code'), 'test-code');
      assert.ok(body.get('code_verifier'));
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        iss: 'https://accounts.google.com', aud: clientId, sub: 'regression-user', nonce,
        exp: Math.floor(Date.now() / 1000) + 3600, email: 'regression@example.test', name: 'Regression User'
      })).toString('base64url');
      const data = `${header}.${payload}`;
      return json({ id_token: `${data}.${sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}` });
    }
    if (request.url === 'https://www.googleapis.com/oauth2/v3/certs') return json({ keys: [jwk] });
    throw new Error(`Unexpected outbound request: ${request.url}`);
  }
};
const mf = new miniflare.Miniflare(miniflare.convertV4MiniflareOptions ? miniflare.convertV4MiniflareOptions(options) : options);
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
try {
  const db = await mf.getD1Database('DB');
  for (const sql of (await readFile('migrations/0001_d1_data_platform.sql', 'utf8')).split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s => s.trim()).filter(Boolean)) {
    await db.prepare(sql).run();
  }
  async function start() {
    const response = await mf.dispatchFetch(`${origin}/api/auth/google`, {
      method: 'POST', body: JSON.stringify({ 'cf-turnstile-response': 'test-challenge' }),
      headers: { 'content-type': 'application/json' }, redirect: 'manual'
    });
    check(response.status === 200, 'OAuth starts after verified challenge');
    const authorize = new URL((await response.json()).authorizeUrl);
    check(authorize.origin === 'https://accounts.google.com', 'authorization stays on Google');
    check(authorize.searchParams.get('redirect_uri') === `${origin}/api/auth/google`, 'exact registered callback');
    check(authorize.searchParams.get('code_challenge_method') === 'S256', 'PKCE is required');
    nonce = authorize.searchParams.get('nonce');
    return { state: authorize.searchParams.get('state'), cookie: response.headers.get('set-cookie').split(';')[0] };
  }
  const login = await start();
  // Literal provider URLs reproduce the production edge-rule failure.
  const callback = `${origin}/api/auth/google?state=${login.state}&code=test-code`
    + '&scope=email+profile+https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email+openid';
  const completed = await mf.dispatchFetch(callback, { headers: { cookie: login.cookie }, redirect: 'manual' });
  check(completed.status === 302, 'valid callback redirects');
  check(completed.headers.get('location') === `${origin}/?auth=success`, 'login returns to our home');
  const sessionCookie = completed.headers.get('set-cookie');
  check(sessionCookie?.includes('HttpOnly') && sessionCookie.includes('Secure'), 'session cookie stays secure');
  const session = await mf.dispatchFetch(`${origin}/api/auth/session`, { headers: { cookie: sessionCookie.split(';')[0] } });
  check(session.status === 200 && (await session.json()).authenticated, 'completed Google login authenticates');
  check(tokenExchanges === 1, 'authorization code exchanged once');
  const replay = await mf.dispatchFetch(callback, { headers: { cookie: login.cookie }, redirect: 'manual' });
  check(replay.headers.get('location') === `${origin}/?auth=error&reason=invalid_state`, 'callback replay rejected');

  const cancelled = await start();
  const denied = await mf.dispatchFetch(`${origin}/api/auth/google?state=${cancelled.state}&error=access_denied`, {
    headers: { cookie: cancelled.cookie }, redirect: 'manual'
  });
  check(denied.status === 302, 'cancelled consent returns home instead of method error');
  check(denied.headers.get('location') === `${origin}/?auth=error&reason=access_denied`, 'cancelled consent reason preserved');
  const expired = await mf.dispatchFetch(`${origin}/api/auth/google?error=access_denied`, { redirect: 'manual' });
  check(expired.status === 302 && expired.headers.get('location') === `${origin}/?auth=error&reason=invalid_state`, 'missing state remains rejected');
  check(tokenExchanges === 1, 'cancelled and invalid callbacks do not exchange tokens');
  console.log(`OAuth: ${checks} checks passed (PKCE, signed identity, session cookie, raw scopes, replay and cancellation).`);
} finally {
  await mf.dispose();
}
