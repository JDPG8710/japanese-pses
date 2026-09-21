import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startContentPreview} from '../scripts/preview-content.mjs';
import {ARTICLES} from '../content/learning-articles.mjs';
const preview=await startContentPreview(),browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
const artifacts='.wrangler/learning-guide-tests';await mkdir(artifacts,{recursive:true});
try{
 const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage(),checked=new Set();
 for(const locale of ['en','zh','ja'])for(const slug of ['',...ARTICLES.map(a=>a.slug),'coverage']){
  const route=`/${locale}/guides/${slug}`;await page.goto(preview.origin+route);
  assert.equal(await page.locator('h1').count(),1,route);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),`https://piko-game.com${route}`);
  assert.equal(await page.locator('link[rel="alternate"]').count(),4);
  if(slug==='coverage'){
   assert.equal(await page.locator('.coverage-year').count(),68);
   await page.locator('details').evaluateAll(nodes=>nodes.forEach(el=>el.open=true));
  }else if(slug){
   const details=page.locator('details').last();await details.locator('summary').click();
   assert.ok(await details.locator('p').isVisible(),`${route} answer works without JS`);
  }
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflows at ${width}`);
  }
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>a.href));
  for(const href of links){
   const url=new URL(href);if(url.origin!==preview.origin||checked.has(href))continue;
   const response=await context.request.get(href);assert.equal(response.status(),200,`${route} → ${href}`);
   if(url.hash)assert.ok((await response.text()).includes(`id="${url.hash.slice(1)}"`),href);
   checked.add(href);
  }
  if(locale==='zh'&&['','sudoku','make-ten','town-shop'].includes(slug)){
   await page.screenshot({path:`${artifacts}/${slug||'library'}-desktop.png`,fullPage:true});
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:`${artifacts}/${slug||'library'}-mobile.png`,fullPage:true});
  }
 }
 console.log(`27 static learning pages: no-JS answers, all 68 curriculum paths, ${checked.size} internal links and three viewport widths passed.`);
 const live=await browser.newContext({viewport:{width:1280,height:900}}),play=await live.newPage(),errors=[];
 play.on('pageerror',e=>errors.push(e.message));
 await play.goto(`${preview.origin}/world?locale=zh#game-sudoku`);
 await play.locator('[data-consent="necessary"]').click();
 assert.equal(await play.locator('#game-sudoku .learning-link').getAttribute('href'),'/zh/guides/sudoku');
 for(const game of ['sudoku','robot','water']){
  await play.locator(`[data-action="play:${game}"]`).click();await play.locator('.pt-start').click();
  await play.locator(`.game-${game}`).waitFor();
  if(game==='sudoku'){
   const cells=await play.locator('[data-action^="sudoku:"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.action));
   for(const cell of cells)await play.locator(`[data-action="${cell}"]`).click();
   await play.locator('[data-action="check"]').click();
   await play.getByText(/第\d+行的\d+重复了/).waitFor();
  }else if(game==='robot'){
   await play.locator('[data-action="move:3"]').click();await play.getByText(/第1步会撞到障碍或走出棋盘/).waitFor();
  }else{
   await play.locator('[data-action="water:2"]').click();await play.locator('[data-action="check"]').click();
   await play.getByText(/操作后A有0升、B有0升/).waitFor();
  }
  await play.screenshot({path:`${artifacts}/${game}-feedback.png`,fullPage:true});
  await play.locator('[data-action="home"]').click();
 }
 await play.goto(`${preview.origin}/grades?country=CN&curriculum=CN63&year=Y1&locale=zh`);
 await play.getByText('练习20以内的小数目加减法，用凑十或逆运算检查答案。').waitFor();
 assert.ok(await play.locator('.journey-gate a[href="/zh/guides/make-ten"]').isVisible());
 await play.goto(`${preview.origin}/learn?country=CN&curriculum=CN63&year=Y1&lesson=add20&locale=zh`);
 await play.locator('.quest-intro').waitFor();assert.ok(await play.locator('.quest-intro a[href="/zh/guides/make-ten"]').isVisible());
 await play.screenshot({path:`${artifacts}/lesson-intro.png`,fullPage:true});
 for(const locale of ['zh','en','ja']){
  await play.goto(`${preview.origin}/town?locale=${locale}`);
  await play.waitForFunction(l=>document.querySelector('#town-guide-link').getAttribute('href')===`/${l}/guides/town-shop`,locale);
 }
 assert.deepEqual(errors,[]);
 console.log('Game diagnostics, lesson objectives, guide entry points and all three town guide languages passed.');
}finally{await browser.close();await preview.close();}
