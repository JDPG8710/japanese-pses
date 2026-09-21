import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
import {enterBuilding,position,moveTo} from './town_manual_controls.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:process.env.TOWN_TEST_BUILT==='1'});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Deliberately reproduce an out-of-order first frame on every navigation.
 await ctx.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);let first=true;window.requestAnimationFrame=cb=>raf(t=>{const timestamp=first?t-100:t;first=false;cb(timestamp);});});
 await page.goto(preview.origin+'/town?locale=zh');await page.locator('#town-canvas[data-position]').waitFor();await page.waitForTimeout(900);assert.equal((await position(page))[1],0);await page.locator('[data-action="begin"]').click();try{await page.locator('[data-consent="necessary"]').click({timeout:4000});}catch{}
 for(let i=0;i<3;i++){await page.reload();await page.locator('#town-canvas[data-position]').waitFor();await page.waitForTimeout(400);assert.equal((await position(page))[1],0);}
 assert.equal(await page.locator('#learning-islands').count(),0);assert.equal(await page.locator('[data-game]:visible').count(),0);
 await page.screenshot({path:'.wrangler/town-3d-tests/building-district.png',fullPage:true});
 console.log('ok - first load, stale frame, and repeated reloads remain grounded; no separate game menu');
 await enterBuilding(page,'obby');
 for(const view of ['third','first']){
  if(await page.locator('#town-canvas').getAttribute('data-view')!==view)await page.locator('[data-camera="view"]').click();
  for(const width of [320,390,820,1440]){
   await page.setViewportSize({width,height:1050});await page.waitForTimeout(200);
   const metrics=await page.evaluate(()=>{const c=document.querySelector('#town-canvas').getBoundingClientRect(),q=document.querySelector('.world-task').getBoundingClientRect();return {questionBottom:q.bottom,canvasTop:c.top,overflow:document.documentElement.scrollWidth>innerWidth,labels:[...document.querySelectorAll('.scene-answer:not([hidden])')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,font:parseFloat(getComputedStyle(el).fontSize)};})};});
   assert.ok(metrics.questionBottom<=metrics.canvasTop);assert.equal(metrics.overflow,false);assert.equal(metrics.labels.length,3,`${view} ${width} answers visible`);
   for(let i=0;i<metrics.labels.length;i++){const a=metrics.labels[i];assert.ok(a.font>=22);for(const b of metrics.labels.slice(i+1))assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`${view} ${width} label overlap`);}
   await page.screenshot({path:`.wrangler/town-3d-tests/answers-${view}-${width}.png`,fullPage:true});
  }
 }
 console.log('ok - both views at 320 / 390 / 820 / 1440: readable answers do not overlap each other or the question');
 await page.locator('[data-exit-game]').last().click();assert.equal((await position(page))[1],0);await page.waitForTimeout(500);assert.equal(await page.locator('#town-dialog').evaluate(d=>d.open),false);
 for(const lang of ['en','ja','zh']){await page.locator('#locale').selectOption(lang);assert.equal((await position(page))[1],0);}
 // Cancel an entry and move away: no immediate modal loop or unwanted game start.
 await moveTo(page,{x:-17,z:20.1},{finishWhenDialog:true});await page.locator('#town-dialog[open]').waitFor();assert.equal(await page.locator('[data-game]:visible').count(),1);await page.locator('.close-button').click();await page.waitForTimeout(600);assert.equal(await page.locator('#town-dialog').evaluate(d=>d.open),false);assert.equal(await page.locator('#town-canvas').getAttribute('data-mode'),null);
 assert.deepEqual(errors,[]);console.log('ok - exits, locale rebuilds and cancelled building entry stay grounded without reopening');
}finally{await browser.close();await preview.close();}
