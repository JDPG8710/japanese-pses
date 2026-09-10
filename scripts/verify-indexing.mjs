import assert from 'node:assert/strict';

const origin = 'https://piko-game.com';
const agents = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
];
async function get(url, agent = agents[0]) {
  return fetch(url, {redirect:'manual', headers:{'user-agent':agent,'cache-control':'no-cache'}, signal:AbortSignal.timeout(20000)});
}
const sitemapResponse = await get(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(urls.length, 8);
assert.equal(new Set(urls).size, urls.length);
assert.ok(urls.every(url => url.startsWith(`${origin}/`) && !url.includes('.html')));
for (const agent of agents) {
  const robotsResponse = await get(`${origin}/robots.txt`, agent);
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.doesNotMatch(robots, /^Disallow:\s*\S/m);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  const results = await Promise.allSettled(urls.map(async url => {
    const response = await get(url, agent);
    assert.equal(response.status, 200, `${url} must not redirect`);
    assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex|none/i, url);
    const html = await response.text();
    assert.equal(html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1], url, `${url}: self canonical`);
    assert.match(html, /<meta\s+name="robots"\s+content="index,\s*follow/i, url);
    assert.doesNotMatch(html, /<meta[^>]+http-equiv=["']refresh/i, url);
    return `${new URL(url).pathname}: 200, crawlable, self-canonical`;
  }));
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    console.log(result.value);
  }
}
for (const name of ['world','grades','privacy','terms','learn']) {
  const query = '?locale=ja&country=JP';
  const response = await get(`${origin}/${name}.html${query}`);
  assert.ok([301,308].includes(response.status), `${name}: preserve old links with permanent redirect`);
  assert.equal(new URL(response.headers.get('location'), origin).href, `${origin}/${name}${query}`);
}
const www = await get('https://www.piko-game.com/robots.txt');
assert.ok([301,308].includes(www.status));
assert.equal(www.headers.get('location'), `${origin}/robots.txt`);
const lesson = await get(`${origin}/learn`);
assert.equal(lesson.status, 200);
assert.match(await lesson.text(), /name="robots" content="noindex,follow/i, 'Lesson shell remains intentionally excluded');
console.log('Desktop/mobile Googlebot user-agent checks passed. This verifies public responses, not Search Console indexing state.');

