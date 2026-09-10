import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';

const origin='https://piko-game.com';
const pages=[
  ['index.html','/'],
  ['en/index.html','/en/'],
  ['ja/index.html','/ja/'],
  ['zh/index.html','/zh/'],
  ['grades.html','/grades'],
  ['world.html','/world'],
  ['arena.html','/arena'],
  ['privacy.html','/privacy'],
  ['terms.html','/terms']
];

const sources=new Map(await Promise.all(pages.map(async ([file,path])=>[file,{path,html:await readFile(file,'utf8')}])));
const titles=new Set();
for(const [file,{path,html}] of sources){
  const title=match(html,/<title>([^<]+)<\/title>/i,`${file} title`);
  const description=match(html,/<meta\s+name="description"\s+content="([^"]+)"/i,`${file} description`);
  const canonical=match(html,/<link\s+rel="canonical"\s+href="([^"]+)"/i,`${file} canonical`);
  assert.ok(title.length>=20&&title.length<=70,`${file} title length should be 20–70 characters, got ${title.length}`);
  assert.ok(description.length>=60&&description.length<=230,`${file} description length should be 60–230 characters, got ${description.length}`);
  assert.equal(canonical,`${origin}${path}`,`${file} canonical must match its public URL`);
  assert.match(html,/<meta\s+name="robots"\s+content="[^"]*index[^"]*follow/i,`${file} must be indexable`);
  for(const property of ['og:type','og:site_name','og:title','og:description','og:url','og:image']){
    assert.ok(html.includes(`property="${property}"`),`${file} is missing ${property}`);
  }
  assert.ok(html.includes('name="twitter:card"'),`${file} is missing a Twitter card`);
  assert.ok(!titles.has(title),`${file} repeats another page title`);
  titles.add(title);
  for(const block of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)){
    assert.doesNotThrow(()=>JSON.parse(block[1]),`${file} contains invalid JSON-LD`);
  }
}

const localized=[['en/index.html','en','/en/'],['ja/index.html','ja','/ja/'],['zh/index.html','zh-Hans','/zh/']];
for(const [file,lang,self] of localized){
  const html=sources.get(file).html;
  assert.ok(html.includes(`<html lang="${lang}">`),`${file} has the wrong document language`);
  assert.match(html,/<h1>[\s\S]+?<\/h1>/i,`${file} needs a visible H1`);
  assert.ok(html.includes('OECD'),`${file} must explain the OECD-informed learning philosophy`);
  assert.ok(html.includes('Education equity')||html.includes('教育の公平性')||html.includes('教育平权'),`${file} must explain education equity`);
  for(const [hreflang,href] of [['en','/en/'],['ja','/ja/'],['zh-Hans','/zh/'],['x-default','/']]){
    const expected=`<link rel="alternate" hreflang="${hreflang}" href="${origin}${href}">`;
    assert.ok(html.includes(expected),`${file} is missing ${hreflang} hreflang`);
  }
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${self}">`),`${file} needs a self canonical`);
  assert.doesNotMatch(html,/OECD[- ](?:certified|approved|partnered|endorsed)/i,`${file} must not imply an OECD relationship`);
}

const robots=await readFile('robots.txt','utf8');
assert.match(robots,/User-agent:\s*\*/i);
assert.match(robots,/Allow:\s*\//i);
assert.doesNotMatch(robots,/^Disallow:\s*\S/m,'Public pages must remain crawlable');
assert.match(robots,/Sitemap: https:\/\/piko-game\.com\/sitemap\.xml/);
for(const [file,{html}] of sources){
 assert.doesNotMatch(html,/<link\s+rel="canonical"[^>]+\.html(?:"|\?)/i,`${file}: canonical must not point to a Pages redirect`);
 assert.doesNotMatch(html,/href="(?:https:\/\/piko-game\.com)?\/?(?:world|grades|privacy|terms|learn)\.html(?:[?"#])/i,`${file}: navigation must use final public URLs`);
}
const root=sources.get('index.html').html;
for(const [hreflang,href] of [['en','/en/'],['ja','/ja/'],['zh-Hans','/zh/'],['x-default','/']]){
  assert.ok(root.includes(`hreflang="${hreflang}" href="${origin}${href}"`),`root is missing ${hreflang} alternate`);
}

const learn=await readFile('learn.html','utf8');
assert.match(learn,/<meta\s+name="robots"\s+content="noindex,follow/i,'parameterized lesson shell should be noindex');
const sitemap=await readFile('sitemap.xml','utf8');
assert.doesNotMatch(sitemap,/<loc>[^<]*\.html[?<]/,'Sitemap must only list final URLs');
for(const [,path] of pages)assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`),`sitemap is missing ${path}`);
const arena=await readFile('arena.html','utf8');
assert.match(arena,/<script type="application\/ld\+json">[\s\S]*VideoGame/,'arena must describe the latest game as a VideoGame');
assert.match(arena,/19×19|19x19/,'arena SEO must mention the newly released 19x19 mode');
assert.ok(!sitemap.includes('<loc>https://piko-game.com/learn.html</loc>'),'noindex lesson shell must not be in sitemap');
for(const [hreflang,href] of [['en','/en/'],['ja','/ja/'],['zh-Hans','/zh/'],['x-default','/']]){
  assert.ok(sitemap.includes(`hreflang="${hreflang}" href="${origin}${href}"`),`sitemap is missing ${hreflang} alternates`);
}

for(const image of ['assets/seo/piko-game-en.png','assets/seo/piko-game-ja.png','assets/seo/piko-game-zh.png'])await access(image);
const build=await readFile('scripts/build.mjs','utf8');
for(const locale of ['en','ja','zh'])assert.ok(build.includes(`'${locale}'`),`build must publish /${locale}/`);

function match(source,pattern,label){
  const value=source.match(pattern)?.[1]?.trim();
  assert.ok(value,`Missing ${label}`);
  return value;
}

console.log(`SEO: ${pages.length} indexable pages, 3 localized entries, hreflang, canonicals, social cards, JSON-LD and sitemap passed.`);
