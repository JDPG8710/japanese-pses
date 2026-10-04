import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startRacePreview} from '../scripts/preview-race.mjs';
const preview=await startRacePreview();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/race-polish',{recursive:true});
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  const context=await browser.newContext({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  // Deterministic simulation; browser events and WebGL rendering remain real.
  await context.addInitScript(()=>{let id=0,now=0;const frames=new Map();window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);window.advanceRaceFrames=steps=>{for(let i=0;i<steps;i++){const current=[...frames.values()];frames.clear();now+=100;for(const fn of current)fn(now);}};});
  const page=await context.newPage(),errors=[];
  // This static preview has no ranking backend; keep the real shell flow with an empty board.
  await page.route('**/api/arcade/leaderboard?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({entries:[]})}));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())});
  for(const track of ['sunrise','harbor','mountain','neon']) {
   await page.goto(preview.origin);await page.locator('[data-track="'+track+'"]').click();
   await page.locator('[data-race-play]').click();
   assert.equal(await page.evaluate(()=>game.getState().gl),true);
   await page.evaluate(()=>game.draw());
   await page.screenshot({path:`.wrangler/race-polish/${track}-${viewport.width}.png`});
   const initial=await page.evaluate(()=>game.getState());
   await page.keyboard.down('w');await page.keyboard.down('a');
   await page.evaluate(()=>{for(let i=0;i<24;i++)game.tick(1/60);game.draw();});
   const left=await page.evaluate(()=>game.getState());assert.ok(left.heading>initial.heading,'real A key turns left');
   await page.keyboard.up('a');await page.keyboard.up('w');
   await page.keyboard.down('d');await page.keyboard.down('w');
   await page.evaluate(()=>{for(let i=0;i<30;i++)game.tick(1/60);game.draw();});
   assert.ok(await page.evaluate(h=>game.getState().heading<h,left.heading),'real D key turns right');
   await page.keyboard.up('d');await page.keyboard.up('w');
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));game.draw()});
   assert.equal(await page.evaluate(()=>game.getState().steering),0);
   // Pointer capture releases a held pedal even after dragging outside its button.
   const pedal=await page.locator('[data-touch="throttle"]').boundingBox();
   await page.mouse.move(pedal.x+pedal.width/2,pedal.y+pedal.height/2);await page.mouse.down();
   await page.mouse.move(10,10);await page.mouse.up();
   assert.equal(await page.locator('.race-touch button.active').count(),0);
   if(viewport.width<500) {
    const cdp=await context.newCDPSession(page);
    const leftPad=await page.locator('[data-touch="left"]').boundingBox();
    const gasPad=await page.locator('[data-touch="throttle"]').boundingBox();
    const leftPoint={x:leftPad.x+leftPad.width/2,y:leftPad.y+leftPad.height/2,id:1};
    const gasPoint={x:gasPad.x+gasPad.width/2,y:gasPad.y+gasPad.height/2,id:2};
    const before=await page.evaluate(()=>game.getState().heading);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[leftPoint,gasPoint]});
    await page.evaluate(()=>{for(let i=0;i<18;i++)game.tick(1/60);});
    assert.ok(await page.evaluate(h=>game.getState().heading>h,before),'two-finger throttle + left');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[leftPoint]});
    await page.evaluate(()=>{for(let i=0;i<30;i++)game.tick(1/60);});
    assert.ok(await page.evaluate(()=>Math.abs(game.getState().steering)<.001),'releasing steering preserves independent pedal input');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('.race-touch button.active').count(),0);await cdp.detach();
   }
   const buttons=await page.locator('.race-touch button').all();
   for(const button of buttons){const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=44);assert.ok(b.x>=0&&b.x+b.width<=viewport.width);}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('[data-shell="pause"]').click();
   const paused=await page.evaluate(()=>game.getState());
   await page.evaluate(()=>game.tick(.2));assert.deepEqual(await page.evaluate(()=>game.getState()),paused);
   await page.locator('[data-shell="pause"]').click();
   if(track==='sunrise'||track==='neon') {
    await page.evaluate(()=>game.start());
    await page.locator('[data-track="'+track+'"]').click();await page.locator('[data-race-play]').click();
    const outcome=await page.evaluate(async id=>{
     const {getRaceTrack,buildPathMetrics,pointAtProgress}=await import('/src/arcade/RaceTracks.mjs');
     const t=getRaceTrack(id),m=buildPathMetrics(t.path);
     for(let i=0;i<30000&&!game.getState().ended;i++) {
      const s=game.getState(),p=pointAtProgress(t.path,m,s.progress+8/m.total);
      const desired=Math.atan2(p.x-s.x,p.z-s.z),e=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading));
      const target=Math.abs(e)>.6?12:27;
      game.setControls({throttle:s.speed<target?1:0,brake:s.speed>target+3?1:0,steer:Math.abs(e)>.045?-Math.sign(e):0});game.tick(1/60);
     }
     return game.getState();
    },track);
    assert.equal(outcome.ended,true);assert.equal(outcome.lap>3,true);
    assert.equal(await page.locator('[data-overlay]').isVisible(),true);
    assert.equal(await page.locator('[data-overlay]').getAttribute('data-outcome'),'success');
    await page.evaluate(()=>window.advanceRaceFrames(24));await page.locator('[data-race-play]').waitFor();assert.equal(await page.locator('[data-overlay]').isVisible(),false);await page.locator('[data-race-play]').click();
    assert.equal(await page.evaluate(()=>game.getState().lives),4);
   }
   // An ordinary steering mistake must visibly hit a solid barrier, with recoverable momentum.
   await page.evaluate(()=>game.start());await page.locator('[data-race-play]').click();
   const crash=await page.evaluate(()=>{game.setControls({throttle:1});for(let i=0;i<100;i++){game.tick(1/60);game.draw();}game.setControls({throttle:1,steer:1});for(let i=0;i<240&&!game.getState().collisionCount;i++){game.tick(1/60);game.draw();}game.draw();return game.getState();});
   assert.ok(crash.collisionCount>0&&crash.particleCount>0,'physical collision emits sparks');
   assert.equal(await page.locator('.race-impact').isVisible(),true);
   await page.screenshot({path:`.wrangler/race-polish/collision-${track}-${viewport.width}.png`});
   await page.evaluate(()=>game.destroy());
   assert.equal(await page.locator('.race-instruments').count(),0);
   assert.equal(await page.locator('.race-touch').count(),0);
  }
  for(const car of ['sports','gt','openwheel','kart']){
   await page.goto(preview.origin);await page.locator(`[data-car="${car}"]`).click();await page.locator('[data-race-play]').click();
   const state=await page.evaluate(()=>{game.draw();return game.getState();});assert.equal(state.carId,car);assert.equal(state.gl,true);
   await page.screenshot({path:`.wrangler/race-polish/car-${car}-${viewport.width}.png`});
   await page.evaluate(()=>game.destroy());
  }
  assert.deepEqual(errors,[],`no JavaScript or WebGL errors at ${viewport.width}px`);
  await context.close();
 }
 console.log('Race browser: four tracks at desktop/mobile, real WebGL, A/D, pointer capture, blur, pause/resume, disposal and screenshots passed');
}finally{await browser.close();await preview.close();}
