import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

// Compare public release assets and use an isolated, signed-out browser.
// No authenticated games, database operations or AdSense actions are performed.
const origin=(process.env.BASE_URL||'https://piko-game.com').replace(/\/$/,''),sitemap=await readFile('dist/sitemap.xml','utf8');
const routes=[...sitemap.matchAll(/<loc>https:\/\/piko-game\.com([^<]*)<\/loc>/g)].map(m=>m[1]);
const assets=['/sitemap.xml','/src/world/WorldFeedback.mjs','/src/world/LearningObjectives.mjs','/src/world/FoundationMath.mjs','/src/world/WorldPlay.mjs','/src/world/GradeEntry.mjs','/src/town/TownApp.mjs','/css/learning-guide.css','/css/site-content.css'];
const hash=value=>createHash('sha256').update(value).digest('hex');
for(let i=0;i<routes.length;i+=6)await Promise.all(routes.slice(i,i+6).map(async route=>{
 const r=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,route);
 const html=await r.text();assert.ok(html.includes(`href="https://piko-game.com${route}"`),`${route} canonical`);
 if(route.includes('/guides/'))assert.ok(html.includes('id="main"')&&html.includes('Piko Game'),route);
}));
for(const asset of assets){
 const r=await fetch(origin+asset,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,asset);
 assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(`dist${asset}`)),`${asset} differs from tested release`);
}
for(const route of ['/release-check-missing-learning-content','/zh/guides/release-check-missing']){
 const r=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,404,route);assert.match(await r.text(),/noindex,follow/);
}
console.log(`Live HTTP: ${routes.length} sitemap pages, ${assets.length} matching release assets and real 404s passed.`);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const locale of ['zh','en','ja']){
  await page.goto(`${origin}/${locale}/guides/`);assert.equal(await page.locator('.guide-cards article').count(),7);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(`${origin}/${locale}/guides/make-ten`);await page.locator('details summary').click();assert.ok(await page.locator('details p').isVisible());
 }
 await page.goto(`${origin}/world?locale=zh`);
 const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
 await page.locator('#game-sudoku .learning-link').waitFor();
 assert.equal(await page.locator('#game-sudoku .learning-link').getAttribute('href'),'/zh/guides/sudoku');
 for(const game of ['robot','water']){
  await page.locator(`[data-action="play:${game}"]`).click();await page.locator('.pt-start').click();await page.locator(`.game-${game}`).waitFor();
  if(game==='robot'){await page.locator('[data-action="move:3"]').click();await page.getByText(/第1步会撞到障碍或走出棋盘/).waitFor();}
  else{await page.locator('[data-action="water:2"]').click();await page.locator('[data-action="check"]').click();await page.getByText(/操作后A有0升、B有0升/).waitFor();}
  await page.locator('[data-action="home"]').click();
 }
 await page.goto(`${origin}/grades?country=CN&curriculum=CN63&year=Y1&locale=zh`);
 await page.getByText('练习20以内的小数目加减法，用凑十或逆运算检查答案。').waitFor();
 await page.goto(`${origin}/town?locale=zh`);await page.waitForFunction(()=>document.querySelector('#town-guide-link')?.getAttribute('href')==='/zh/guides/town-shop');
 assert.deepEqual(errors,[]);console.log('Live browser: three languages, mobile library, expandable answers, game feedback, grade objectives and town guide passed.');
}finally{await browser.close();}
