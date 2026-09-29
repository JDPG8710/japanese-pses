import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
import {newState,SAVE_KEY} from '../src/town/TownRules.mjs';
import {MODES,startRun,questionFor} from '../src/town/ArcadeRules.mjs';
import {TOWN_BUILDINGS} from '../src/town/TownBuildings.mjs';
import {moveTo,solve,readSave} from './town_manual_controls.mjs';
const preview=await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-feedback',{recursive:true});
try{
 for(const [mode,width] of [...MODES.map(m=>[m,1440]),['runner',390],['memory',320]]){
  const reduced=width===390,context=await browser.newContext({viewport:{width,height:width<500?844:1000},hasTouch:width<500,isMobile:width<500,reducedMotion:reduced?'reduce':'no-preference'});
  const state=newState(),building=TOWN_BUILDINGS.find(b=>b.id===mode);state.started=true;startRun(state,mode,42);
  // Seed a saved visit at the entrance; all answers below use real movement/jump controls.
  state.player={x:building.x*25+550,y:(building.z-6)*25+380};
  await context.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('world-locale','zh');},{key:SAVE_KEY,state});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/town.html?locale=zh');
  const consent=page.locator('[data-consent="necessary"]');try{await consent.waitFor({timeout:3000});await consent.click();}catch{}
  await page.locator('#town-canvas[data-renderer="webgl-3d"]').waitFor();
  await moveTo(page,{x:building.x,z:building.z-1.8},{finishWhenDialog:true,tolerance:.3});
  await page.locator(`[data-game="${mode}"]`).click();
  await page.locator(`#town-canvas[data-mode="${mode}"]`).waitFor();
  await page.evaluate(()=>{window.feedbackEvents=[];const el=document.querySelector('.game-feedback');new MutationObserver(()=>{if(!el.hidden)window.feedbackEvents.push({kind:el.dataset.kind,coins:JSON.parse(localStorage.getItem('piko-town-v1')).coins});}).observe(el,{attributes:true,childList:true,subtree:true});});
  if(mode==='runner'&&width===1440){
   const q=questionFor((await readSave(page)).expansion.runs.runner),wrong=(q.answer+1)%3;
   await moveTo(page,{x:8.4,z:8});await moveTo(page,{x:8.4,z:-11});await moveTo(page,{x:(wrong-1)*6,z:-11});await moveTo(page,{x:(wrong-1)*6,z:-8},{finishWhenResult:true});
   await page.locator('.game-feedback[data-kind="retry"]').waitFor();
   assert.equal((await readSave(page)).coins,0);assert.equal(await page.locator('.game-feedback-spark').count(),0);assert.equal(await page.locator('[data-next-stage]').count(),0);
  }
  // Exercise first-person feedback too; the overlay is visible even when the avatar is hidden.
  if(mode==='runner')await page.locator('[data-camera="view"]').click();
  await solve(page,mode);
  const feedback=page.locator('.scene-viewport > .game-feedback[data-kind="success"]');await feedback.waitFor();
  assert.equal(await page.locator('.arcade-panel .arcade-feedback').count(),0);
  const bounds=await feedback.boundingBox(),canvas=await page.locator('#town-canvas').boundingBox();
  assert.ok(bounds.x>=canvas.x&&bounds.y>=canvas.y&&bounds.x+bounds.width<=canvas.x+canvas.width+1&&bounds.y+bounds.height<=canvas.y+canvas.height+1,'result stays inside playable viewport');
  for(const control of await page.locator('.course-controls button,.world-controls button,.town-fs-fab').all()) {
   const b=await control.boundingBox();if(!b)continue;
   assert.ok(Math.min(bounds.x+bounds.width,b.x+b.width)-Math.max(bounds.x,b.x)<=1||Math.min(bounds.y+bounds.height,b.y+b.height)-Math.max(bounds.y,b.y)<=1,'feedback does not cover game buttons');
  }
  assert.match(await feedback.innerText(),/挑战成功/);assert.equal(await page.locator('.scene-answer.answer-correct').count(),1);
  if(reduced)assert.equal(await page.locator('.game-feedback-icon').evaluate(el=>getComputedStyle(el).animationName),'none');
  else assert.notEqual(await page.locator('.game-feedback-icon').evaluate(el=>getComputedStyle(el).animationName),'none');
  if(mode==='memory')assert.ok(await page.evaluate(()=>feedbackEvents.some(e=>e.kind==='partial'&&e.coins===0)),'intermediate memory steps celebrate without coins');
  const coins=(await readSave(page)).coins;await page.keyboard.press('w');assert.equal((await readSave(page)).coins,coins);
  if(mode==='runner'&&width===1440){
   await page.locator('[data-town-fs]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
   const inside=await feedback.evaluate(el=>{const r=el.getBoundingClientRect(),c=document.querySelector('#town-canvas').getBoundingClientRect();return r.left>=c.left&&r.right<=c.right&&r.top>=c.top&&r.bottom<=c.bottom;});assert.equal(inside,true,'fullscreen contains feedback');
  }
  await page.screenshot({path:`.wrangler/town-feedback/${mode}-${width}.png`,fullPage:true});
  await page.locator('[data-next-stage]').click();assert.equal(await feedback.count(),0);assert.equal(await page.locator('.game-feedback').isVisible(),false);assert.equal((await readSave(page)).coins,coins);
  await page.locator('[data-exit-game]').click();assert.equal(await page.locator('.game-feedback').isVisible(),false);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${mode} ${width}px: in-game animation, reward and next/exit cleanup`);
 }
}finally{await browser.close();await preview.close();}
