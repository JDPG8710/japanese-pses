import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
import {newState,SAVE_KEY} from '../src/town/TownRules.mjs';
import {TOWN_BUILDINGS} from '../src/town/TownBuildings.mjs';
import {KID_SYMBOLS} from '../src/arcade/KidsArcade.mjs';
const preview=await startTownPreview(0,{built:process.env.TOWN_TEST_BUILT==='1'}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[];await mkdir('.wrangler/town-kids',{recursive:true});
try{
 for(const [game,width]of [['bubble',1440],['bubble',390],['rhythm',390]]){
  const context=await browser.newContext({viewport:{width,height:width===390?568:960},isMobile:width===390,hasTouch:width===390});
  const state=newState(),b=TOWN_BUILDINGS.find(b=>b.id===game);state.started=true;state.player={x:b.x*25+550,y:(b.z-6)*25+380};state.townProgress.level=20;
  await context.addInitScript(({state,key})=>localStorage.setItem(key,JSON.stringify(state)),{state,key:SAVE_KEY});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin+'/town.html?locale=zh');
  try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
  await page.locator('#town-canvas[data-renderer]').waitFor();assert.equal(await page.locator('.graphics-error').count(),0);
  await page.locator('#town-canvas').focus();await page.keyboard.down('w');try{await page.locator(`#town-dialog [data-casual-game="${game}"]`).waitFor();}catch(error){console.log({game,errors,position:await page.locator('#town-canvas').getAttribute('data-position'),saved:await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)});await page.screenshot({path:'.wrangler/town-kids/failure.png',fullPage:true});throw error;}finally{await page.keyboard.up('w');}await page.locator(`[data-casual-game="${game}"]`).click();
  await page.locator('.kids-controls').waitFor();await page.screenshot({path:`.wrangler/town-kids/${game}-${width}.png`,fullPage:true});
  assert.ok(await page.locator('[data-kids-pad]').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=56)));
  await page.locator('[data-shell="pause"]').click();assert.equal(await page.locator('.kids-controls').isVisible(),false);await page.locator('[data-shell="pause"]').click();assert.equal(await page.locator('.kids-controls').isVisible(),true);
  if(game==='bubble'){
   while(!await page.locator('[data-overlay][data-outcome="success"]').count()){
    const prompt=await page.locator('.kids-message').innerText(),index=KID_SYMBOLS.findIndex(s=>prompt.includes(s));assert.ok(index>=0);await page.locator(`[data-kids-pad="${index}"]`).click();
   }
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);assert.equal(saved.townProgress.level,20);assert.equal(saved.townProgress.infiniteRound,1);assert.ok(saved.townProgress.points>0);
  }else{
   for(let i=0;i<4;i++)await page.locator('[data-kids-pad="0"]').click();
   await page.locator('[data-overlay][data-outcome="retry"]').waitFor();assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)).townProgress.points,0);
  }
  assert.equal(await page.locator('.kids-controls').isVisible(),false);
  const retry=page.locator('[data-shell="retry"]');assert.ok(await retry.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'result action is not blocked by pad controls');
  await page.screenshot({path:`.wrangler/town-kids/${game}-${width}-result.png`,fullPage:true});await retry.click();await page.locator('.kids-controls').waitFor();await page.locator('.arcade-hud [data-shell="back"]').click();await page.locator('.arcade-shell').waitFor({state:'detached'});assert.equal(await page.locator('.kids-controls').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();console.log(`Town kids browser: ${game} ${width}px, pause, result, retry and exit passed`);
 }
 // Exercise rhythm's full success path through real pad clicks on the real renderer.
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin+'/town.html?locale=zh');await page.locator('[data-action="begin"]').click();try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
 await page.evaluate(async()=>{const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs');const {createRhythmGame}=await import('/src/arcade/RhythmGame.mjs');const shell=openArcadeShell({gameId:'rhythm',locale:'zh',onExit(){},onRetry(){}});window.rhythmTest=createRhythmGame({canvas:shell.canvas,locale:'zh',seed:952,onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});});
 for(let i=0;i<3000;i++){const s=await page.evaluate(()=>rhythmTest.getState());if(s.ended)break;const n=s.notes.find(n=>!n.done&&n.at-s.clock<=.18&&n.at-s.clock>=-.1);if(n)await page.locator(`[data-kids-pad="${n.lane}"]`).click();else await page.waitForTimeout(25);}
 await page.locator('[data-overlay][data-outcome="success"]').waitFor();await page.screenshot({path:'.wrangler/town-kids/rhythm-390-clear.png',fullPage:true});assert.ok(await page.evaluate(()=>rhythmTest.getState().score>0));await page.evaluate(()=>rhythmTest.destroy());await context.close();console.log('Town rhythm browser: full mobile rhythm clear through real pad inputs passed');
 assert.deepEqual(errors,[]);
}finally{await browser.close();await preview.close();}
