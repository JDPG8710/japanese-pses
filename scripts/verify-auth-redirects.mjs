import assert from 'node:assert/strict';

// Intentionally unescaped: Google callbacks contain literal URLs in scope.
// Synthetic values exercise routing without accessing a real login transaction.
const callback = '/api/auth/google?state=redirect-regression&iss=https://accounts.google.com'
  + '&code=redirect-regression&scope=email+profile+https://www.googleapis.com/auth/userinfo.profile'
  + '+https://www.googleapis.com/auth/userinfo.email+openid&authuser=0&prompt=none';
const cases = [
  ['https://piko-game.com' + callback, 302, 'https://piko-game.com/?auth=error&reason=invalid_state'],
  ['https://piko-game.com/api/auth/google?error=access_denied', 302, 'https://piko-game.com/?auth=error&reason=invalid_state'],
  ['https://www.piko-game.com' + callback, 301, 'https://piko-game.com' + callback],
  ['http://www.piko-game.com/zh/?source=redirect-regression', 301, 'https://piko-game.com/zh/?source=redirect-regression'],
  ['https://piko-game.com/zh/?source=https://www.googleapis.com/auth/userinfo.profile', 200, null]
];
for (const [url, status, location] of cases) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, status, `Unexpected status for ${url}`);
  assert.equal(response.headers.get('location'), location, `Unsafe or incorrect redirect for ${url}`);
  await response.body?.cancel();
}
console.log('Production auth redirects: 5 checks passed (raw Google scope, cancellation, www, HTTP, SEO entry).');
