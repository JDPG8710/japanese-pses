import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-exploration',{recursive:true});
const position=p=>p.locator('#town-canvas').getAttribute('data-position').then(s=>s.split(',').map(Number));
try{
 for(const fullscreen of ['missing','rejected','native']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  if(fullscreen!=='native')await context.addInitScript(mode=>{Object.defineProperty(Element.prototype,'requestFullscreen',{configurable:true,value:mode==='missing'?undefined:()=>Promise.reject(new Error('fullscreen denied'))});Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{configurable:true,value:undefined});},fullscreen);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(`${preview.origin}/town?locale=zh`);await page.locator('[data-action="begin"]').click();const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
  await page.locator('#town-canvas[data-renderer="webgl-3d"][data-landmarks="themed-v1"]').waitFor();
  assert.equal(await page.locator('[data-direction],[data-camera="left"],[data-camera="right"]').count(),0);
  await page.locator('[data-town-fs]').tap();await page.locator('html.town-immersive').waitFor({state:'attached'});
  await page.waitForTimeout(250);const area=await page.locator('.scene-viewport').boundingBox();assert.ok(area.height>=820&&area.y<2,fullscreen+' must fill viewport');
  assert.equal(await page.locator('#town-progression').isVisible(),false);assert.equal(await page.locator('#town-online').isVisible(),false);
  await page.locator('.town-help-control').tap();await page.locator('#town-dialog[open]').waitFor();await page.locator('.close-button').tap();
  const cdp=await context.newCDPSession(page),stick=await page.locator('.town-joystick').boundingBox(),jump=await page.locator('[data-camera="jump"]').boundingBox();
  const finger={id:0,x:stick.x+stick.width/2+28,y:stick.y+stick.height/2-32},finger2={id:1,x:jump.x+jump.width/2,y:jump.y+jump.height/2};
  const start=await position(page),yaw=await page.locator('#town-canvas').getAttribute('data-camera-yaw');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});await page.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,finger2]});
  await page.waitForFunction(()=>Number(document.querySelector('#town-canvas').dataset.position.split(',')[1])>.3);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await page.locator('#town-canvas').getAttribute('data-camera-yaw'),yaw);const moved=await position(page);assert.ok(Math.hypot(moved[0]-start[0],moved[2]-start[2])>.1);
  await page.waitForTimeout(200);const stopped=await position(page);await page.waitForTimeout(200);const still=await position(page);assert.ok(Math.hypot(still[0]-stopped[0],still[2]-stopped[2])<.1);
  await page.screenshot({path:`.wrangler/town-exploration/fullscreen-${fullscreen}.png`});
  await page.locator('[data-town-fs]').tap();await page.locator('html:not(.town-immersive)').waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  assert.equal(await page.locator('#town-progression').isVisible(),true);assert.equal(await page.locator('#town-online').isVisible(),true);
  console.log(`ok - ${fullscreen} fullscreen, help, analog movement/steering + simultaneous jump and release`);
  if(fullscreen==='missing'){
   await page.locator('.town-ride').selectOption('car');await page.locator('#town-canvas[data-vehicle="car"]').waitFor();assert.equal(await page.locator('[data-camera="jump"]').isVisible(),false);
   const before=await position(page);await page.locator('#town-canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');const after=await position(page);assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>2);await page.waitForTimeout(100);await page.reload();await page.locator('#town-canvas[data-vehicle="car"]').waitFor();
   await page.locator('.town-ride').selectOption('plane');await page.locator('#town-canvas[data-vehicle="plane"]').waitFor();await page.locator('.scene-viewport').scrollIntoViewIfNeeded();
   const ps=await page.locator('.town-joystick').boundingBox(),pu=await page.locator('[data-camera="jump"]').boundingBox();
   const flightFinger={id:0,x:ps.x+ps.width/2,y:ps.y+ps.height/2-32},climbFinger={id:1,x:pu.x+pu.width/2,y:pu.y+pu.height/2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[flightFinger,climbFinger]});await page.waitForFunction(()=>Number(document.querySelector('#town-canvas').dataset.position.split(',')[1])>12);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#town-canvas').focus();
   const airborne=await position(page);await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');const flown=await position(page);assert.ok(Math.hypot(flown[0]-airborne[0],flown[2]-airborne[2])>2);assert.ok(flown[1]>10);await page.screenshot({path:'.wrangler/town-exploration/plane.png',fullPage:true});
   const pd=await page.locator('.town-descend').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:pd.x+pd.width/2,y:pd.y+pd.height/2}]});await page.waitForFunction(()=>Number(document.querySelector('#town-canvas').dataset.position.split(',')[1])===0);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.locator('.town-ride').selectOption('foot');await page.locator('#town-canvas[data-vehicle="foot"]').waitFor();assert.equal((await position(page))[1],0);
   for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`.wrangler/town-exploration/town-${width}.png`,fullPage:true});}
   console.log('ok - cars drive and persist, aircraft climb / fly / descend, safe dismount and responsive layouts');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();await preview.close();}
