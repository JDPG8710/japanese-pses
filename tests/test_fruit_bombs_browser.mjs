import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/fruit-bombs',{recursive:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin+'/town.html?locale=zh');await page.locator('[data-action="begin"]').click();try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/TownAudio.mjs')).name;window.audio=(await import(url)).getTownAudio();audio.setMuted(false);audio.pauseBgm();window.synth=(await import('/AudioSynthesizer.js')).getAudioSynthesizer();window.analyser=synth.ctx.createAnalyser();synth.sfxGain.connect(analyser);window.bombCalls=[];window.buffers=0;const original=synth.ctx.createBufferSource.bind(synth.ctx);synth.ctx.createBufferSource=()=>{buffers++;return original();};});
  async function boot(seed){await page.evaluate(async seed=>{window.game?.destroy();window.shell?.destroy();const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs'),{createFruitSlashGame}=await import('/src/arcade/FruitSlashGame.mjs');window.shell=openArcadeShell({gameId:'fruit',locale:'zh',onExit(){game.destroy();},onRetry(){}});window.game=createFruitSlashGame({canvas:shell.canvas,locale:'zh',seed,difficulty:{level:20},audio:{slash:()=>audio.slash(),bomb:kind=>{bombCalls.push(kind);audio.bomb(kind);}},onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});},seed);}
  async function cut(kind){await page.waitForFunction(kind=>game.getState().items.some(b=>b.bomb&&(!kind||b.kind===kind)&&b.y>-.8&&b.y<2),kind);const p=await page.evaluate(kind=>game.projectToScreen(game.getState().items.find(b=>b.bomb&&(!kind||b.kind===kind)&&b.y>-.8&&b.y<2)),kind);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.up();}
  for(const [kind,seed]of Object.entries({classic:7,clock:8,ice:9,spike:19})){
   await boot(seed);await cut(kind);await page.waitForFunction(kind=>game.getState().explosions.some(e=>e.kind===kind),kind);
   assert.equal(await page.evaluate(()=>bombCalls.at(-1)),kind);await page.waitForTimeout(60);
   const rms=await page.evaluate(()=>{const a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);});assert.ok(rms>.002,`${kind}: actual explosion sound reaches SFX gain`);
   await page.screenshot({path:`.wrangler/fruit-bombs/${kind}-${width}.png`,fullPage:true});await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>game.getState().explosions.length),0,'burst, smoke, ring and label expire');
  }
  // A muted bomb still animates but allocates no noise source or audible signal.
  await page.evaluate(()=>audio.setMuted(true));await boot(7);const count=await page.evaluate(()=>buffers);await cut('classic');assert.equal(await page.evaluate(()=>buffers),count);assert.ok(await page.evaluate(()=>game.getState().explosions.length)>0);
  await page.evaluate(()=>audio.setMuted(false));await boot(19);
  let fatal=false;
  for(let i=0;i<12;i++){await cut();const s=await page.evaluate(()=>game.getState());if(s.ended){fatal=true;assert.equal(s.pendingResult,true);assert.ok(s.explosions.length>0);assert.equal(await page.locator('[data-overlay][data-outcome="retry"]').count(),0,'fatal bomb is visible before result');await page.screenshot({path:`.wrangler/fruit-bombs/fatal-${width}.png`,fullPage:true});break;}await page.waitForTimeout(850);}
  assert.equal(fatal,true);await page.locator('[data-overlay][data-outcome="retry"]').waitFor();assert.equal(await page.evaluate(()=>game.getState().pendingResult),false);assert.equal(await page.evaluate(()=>game.getState().explosions.length),0);
  await page.evaluate(()=>{game.destroy();shell.destroy();});assert.deepEqual(errors,[]);await context.close();console.log(`Fruit bombs ${width}px: four real blast animations/sounds, mute, cleanup and fatal-bomb-before-result passed`);
 }
}finally{await browser.close();await preview.close();}
