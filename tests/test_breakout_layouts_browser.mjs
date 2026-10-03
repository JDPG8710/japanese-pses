import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});await mkdir('.wrangler/breakout-layouts',{recursive:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/town.html?locale=zh');await page.locator('[data-action="begin"]').click();try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
  async function boot(level,infiniteRound=0){await page.evaluate(async({level,infiniteRound})=>{window.game?.destroy();window.shell?.destroy();const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs'),{createBreakoutGame}=await import('/src/arcade/BreakoutGame.mjs');window.shell=openArcadeShell({gameId:'breakout',locale:'zh',onExit(){game.destroy();},onRetry(){}});shell.setProgress({level,infiniteRound});window.game=createBreakoutGame({canvas:shell.canvas,locale:'zh',difficulty:{level,infiniteRound},seed:40,onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});},{level,infiniteRound});await page.waitForTimeout(70);}
  const signatures=new Set();
  for(let level=1;level<=20;level++){
   await boot(level);const s=await page.evaluate(()=>game.getState());assert.equal(s.gl,true);assert.ok(s.wallStates.length>0);assert.equal(await page.locator('.arcade-canvas').getAttribute('data-breakout-walls'),String(s.wallStates.length));assert.match(await page.locator('.arcade-hud').innerText(),new RegExp(s.layoutName));signatures.add(JSON.stringify([s.brickStates,s.wallStates]));
   await page.locator('.arcade-canvas').screenshot({path:`.wrangler/breakout-layouts/${width}-level-${level}.png`});
  }
  assert.equal(signatures.size,20);await boot(20,21);assert.match(await page.locator('.arcade-canvas').getAttribute('data-breakout-layout'),/pattern-1-cycle-1/);await page.locator('.arcade-canvas').screenshot({path:`.wrangler/breakout-layouts/${width}-endless-21.png`});
  // A real pointer launch aimed at the first bumper must bounce, without clearing it.
  await boot(1);const r=await page.locator('.arcade-canvas').boundingBox(),x=r.x+(.5-1.3/10)*r.width;
  await page.mouse.move(x,r.y+r.height*.8);await page.waitForTimeout(350);await page.mouse.click(x,r.y+r.height*.8);await page.waitForFunction(()=>game.getState().wallHits>0,{},{timeout:10000});
  const s=await page.evaluate(()=>game.getState());assert.equal(s.wallStates.length,1);assert.equal(s.score,0,'steel bumper impact does not award brick points');assert.ok(s.ballStates[0].vz>0,'ball rebounds toward the paddle');
  await page.locator('[data-shell="pause"]').click();await page.evaluate(()=>game.pause());const before=await page.evaluate(()=>game.getState().ballStates);await page.waitForTimeout(120);assert.deepEqual(await page.evaluate(()=>game.getState().ballStates),before);await page.evaluate(()=>{game.destroy();shell.destroy();});
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log(`Breakout layouts ${width}px: all twenty real 3D scenes, names, steel barriers, endless remix, pointer launch and actual wall rebound passed`);await context.close();
 }
}finally{await browser.close();await preview.close();}
