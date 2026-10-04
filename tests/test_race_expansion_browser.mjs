import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startRacePreview} from '../scripts/preview-race.mjs';
const preview=await startRacePreview(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/race-expansion',{recursive:true});
const collectInPage=async({type,pace=25})=>{
 const {getRaceTrack,buildPathMetrics,pointAtProgress}=await import('/src/arcade/RaceTracks.mjs');
 const track=getRaceTrack(game.getState().trackId),metrics=buildPathMetrics(track.path),target=game.getState().pickups.find(p=>p.type===type),tp=pointAtProgress(track.path,metrics,target.s);
 for(let i=0;i<10000&&!game.getState().ended;i++){
  const s=game.getState();if(s.heldItem===type){game.draw(1);return s;}
  if(s.heldItem)game.useItem();
  const remain=((target.s-s.progress+1)%1)*metrics.total,p=pointAtProgress(track.path,metrics,s.progress+8/metrics.total),lateral=remain<45?(target.x-tp.x)*tp.nx+(target.z-tp.z)*tp.nz:0;
  const desired=Math.atan2(p.x+p.nx*lateral-s.x,p.z+p.nz*lateral-s.z),e=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading)),speed=Math.abs(e)>.5?12:pace;
  game.setControls({throttle:s.speed<speed?1:0,brake:s.speed>speed+3?1:0,steer:Math.abs(e)>.035?-Math.sign(e):0});game.tick(1/60);
 }
 throw Error('No actual pickup '+type);
};
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const type of ['boost','shield','oil','magnet','rocket','banana','splash']){
   await page.goto(preview.origin);await page.locator('[data-car=supercar]').click();await page.locator('[data-race-play]').click();
   const state=await page.evaluate(collectInPage,{type,pace:type==='banana'?50:['rocket','splash'].includes(type)?40:25});
   assert.equal(state.heldItem,type);const button=page.locator('[data-touch=item]');assert.equal(await button.isEnabled(),true);assert.match(await button.locator('img').getAttribute('src'),new RegExp(type+'\\.svg'));
   await page.waitForFunction(()=>document.querySelector('[data-touch=item] img')?.naturalWidth>0);
   const used=state.usedItems;if(width===390)await button.click();else await page.keyboard.press(['boost','magnet','splash'].includes(type)?'Space':'e');
   const after=await page.evaluate(()=>{game.draw();return game.getState();});assert.equal(after.usedItems,used+1);assert.equal(after.heldItem,null);assert.equal(await button.isEnabled(),false);assert.ok(await page.locator('.race-effect-status').textContent());
   if(['rocket','banana','splash'].includes(type)){
    const hit=await page.evaluate(type=>{game.setControls({throttle:1});for(let i=0;i<500&&!game.getState().ended;i++){game.tick(1/60);if(game.getState().rivals.some(r=>r.lastHit===type&&(r.slowT>0||r.stunT>0))){game.draw();return game.getState();}}return game.getState();},type);assert.ok(hit.rivals.some(r=>r.lastHit===type),'actual computer hit by '+type);
   }
   await page.screenshot({path:`.wrangler/race-expansion/${type}-${width}.png`});await page.evaluate(()=>game.destroy());
  }
  for(const car of ['sports','gt','openwheel','kart','supercar','bumper','rally']){
   await page.goto(preview.origin);await page.locator(`[data-car=${car}]`).click();await page.locator('[data-race-play]').click();const button=page.locator('[data-touch=skill]');
   if(width===390)await button.click();else await page.keyboard.press('f');const state=await page.evaluate(()=>{game.draw();return game.getState();});assert.ok(state.skillT>0&&state.skillCooldown>0);assert.equal(await button.getAttribute('data-skill'),state.skill);assert.equal(await button.isEnabled(),false);
   if(car==='bumper')assert.ok(state.rivals.some(r=>r.stunT>0));await page.screenshot({path:`.wrangler/race-expansion/skill-${car}-${width}.png`});await page.evaluate(()=>game.destroy());
  }
  for(const track of ['grandtour','offroad']){await page.goto(preview.origin);await page.locator(`[data-track=${track}]`).click();await page.locator('[data-car=rally]').click();await page.locator('[data-race-play]').click();const state=await page.evaluate(()=>{game.draw();return game.getState();});assert.equal(state.gl,true);assert.equal(state.trackId,track);if(track==='grandtour')assert.ok(Math.abs(state.trackLength-5000)<.01);if(track==='offroad'){
    const wet=await page.evaluate(async()=>{const {getRaceTrack,buildPathMetrics,pointAtProgress}=await import('/src/arcade/RaceTracks.mjs');const t=getRaceTrack('offroad'),m=buildPathMetrics(t.path);for(let i=0;i<8000&&!game.getState().ended;i++){const s=game.getState();if(s.surface==='water'){game.draw(1);return s;}const p=pointAtProgress(t.path,m,s.progress+8/m.total),h=Math.atan2(p.x-s.x,p.z-s.z),e=Math.atan2(Math.sin(h-s.heading),Math.cos(h-s.heading)),target=Math.abs(e)>.5?12:25;game.setControls({throttle:s.speed<target?1:0,brake:s.speed>target+3?1:0,steer:Math.abs(e)>.035?-Math.sign(e):0});game.tick(1/60);}throw Error('water not reached');});
    assert.ok(wet.speed<=48*.32+.01,'water physically reduces speed');await page.screenshot({path:`.wrangler/race-expansion/water-${width}.png`});
    await page.locator('[data-touch=skill]').click();const grip=await page.evaluate(()=>{game.setControls({throttle:1});for(let i=0;i<20;i++)game.tick(1/60);game.draw(1);return game.getState();});assert.ok(grip.speed>wet.speed+1&&grip.skillT>0,'rally special overcomes the water drag');
   }await page.screenshot({path:`.wrangler/race-expansion/${track}-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const btn of await page.locator('.race-touch button').all()){const r=await btn.boundingBox();assert.ok(r.width>=44&&r.height>=44&&r.x>=0&&r.x+r.width<=width);}await page.evaluate(()=>game.destroy());assert.equal(await page.locator('.race-touch').count(),0);}
  assert.deepEqual(errors,[]);await context.close();console.log(`Race expansion browser ${width}: seven real pickups + keyboard/touch use, rocket/banana/splash opponent hits, seven exclusive specials, 5 km/offroad, icons, WebGL and cleanup passed`);
 }
 for(const locale of ['en','ja']){const page=await browser.newPage();await page.goto(preview.origin+'/?locale='+locale);await page.locator('[data-car=bumper]').click();await page.locator('[data-race-play]').click();assert.ok(!(await page.locator('[data-touch=skill]').textContent()).includes('undefined'));await page.evaluate(()=>game.destroy());await page.close();}
}finally{await browser.close();await preview.close();}
