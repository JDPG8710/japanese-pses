import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startContentPreview} from '../scripts/preview-content.mjs';
const preview=await startContentPreview();
try{
  const sitemap=await readFile('dist/sitemap.xml','utf8');
  const routes=[...sitemap.matchAll(/<loc>https:\/\/piko-game\.com([^<]*)<\/loc>/g)].map(m=>m[1]);
  assert.ok(routes.includes('/about'));
  assert.ok(!routes.includes('/404'));
  for(const route of routes){
    const response=await fetch(preview.origin+route,{redirect:'manual'});
    assert.equal(response.status,200,route);
    const html=await response.text();
    assert.ok(!/<meta\s+name="robots"\s+content="noindex/.test(html),route);
    assert.ok(html.includes(`href="https://piko-game.com${route}"`),`canonical ${route}`);
  }
  for(const route of ['/missing-content-qa','/en/missing-content-qa','/missing-content-qa/deep','/assets/missing-content-qa.js']){
    const response=await fetch(preview.origin+route,{redirect:'manual'});
    assert.equal(response.status,404,route);
    const html=await response.text();
    assert.match(html,/noindex,follow/);
    assert.ok(!html.includes('adsbygoogle'));
    assert.ok(html.includes('href="/about#contact"'));
  }
  for(const route of ['/about.html','/en/learning-guide.html','/world.html']){
    const response=await fetch(preview.origin+route,{redirect:'manual'});
    assert.ok([301,308].includes(response.status),route);
    assert.equal(new URL(response.headers.get('location'),preview.origin).pathname,route.replace('.html',''));
  }
  for(const route of ['/world','/grades','/learn']){
    const html=await(await fetch(preview.origin+route)).text();
    const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.ok(main?.includes('<h1'),`${route} must explain its purpose before JS loads`);
    assert.ok(main?.includes('/en/learning-guide')&&main?.includes('/ja/learning-guide')&&main?.includes('/zh/learning-guide'),route);
  }
  console.log(`Public content: ${routes.length} sitemap URLs, real Pages 404s, clean redirects and readable game fallbacks passed.`);
}finally{await preview.close();}
