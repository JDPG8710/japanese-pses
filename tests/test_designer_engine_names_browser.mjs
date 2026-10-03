import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {startRacePreview} from '../scripts/preview-race.mjs';
const preview=await startRacePreview(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/engine-names',{recursive:true});
try{for(const width of [390,1440])for(const locale of ['zh','en','ja']){
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin);await page.evaluate(()=>{game.destroy();shell.destroy();});
 for(const [count,code,vehicle]of [[3,'G16E-GTS','GR Yaris'],[4,'K20C1','Civic Type R'],[6,'VR38DETT','GT-R'],[8,'Coyote','Mustang GT'],[12,'L539','Aventador']]){
  await page.evaluate(async({count,locale})=>{const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs'),{createBubbleGame}=await import('/src/arcade/BubbleGame.mjs');window.ends=0;window.result=null;window.shell=openArcadeShell({gameId:'bubble',locale});window.game=createBubbleGame({canvas:shell.canvas,locale,onEnd:r=>{ends++;result=r;shell.showResult(r);}});game.selectProject('engine-'+count);},{count,locale});
  assert.ok((await page.locator('[data-kit-name]').textContent()).includes(code));assert.ok((await page.locator('[data-kit-subtitle]').textContent()).includes(vehicle));assert.ok((await page.locator('[data-engine-story]').textContent()).includes(vehicle));
  const source=page.locator('[data-engine-story] a');assert.ok((await source.getAttribute('href')).startsWith('https://'));assert.equal(await source.getAttribute('rel'),'noopener noreferrer');
  assert.ok((await page.locator(`[data-engine-count] option[value="${count}"]`).textContent()).includes(code));
  if(count===3){
   await page.locator('[data-close-panel]:visible').click();await page.locator('[data-panel=save]').click();await page.locator('[data-finish]').click();assert.ok((await page.locator('[data-finish-feedback]').textContent()).includes(String(await page.evaluate(()=>game.getState().parts.filter(p=>p.required).length))));assert.equal(await page.evaluate(()=>ends),0);
   await page.evaluate(()=>game.placePart(game.getState().parts.find(p=>p.id.includes("-piston-")).id));await page.locator('[data-preview-animation]').click();await page.locator('.designer-celebration-bar:visible').waitFor();assert.equal(await page.evaluate(()=>ends),0);assert.equal(await page.evaluate(()=>game.getState().ended),false);const first=await page.evaluate(()=>document.querySelector('.designer-3d-canvas').toDataURL());await page.waitForTimeout(350);assert.notEqual(await page.evaluate(()=>document.querySelector('.designer-3d-canvas').toDataURL()),first);await page.locator('[data-celebration-done]').click();await page.locator('.designer-celebration-bar').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>game.getState().paused),false);assert.equal(await page.evaluate(()=>ends),0);await page.locator('[data-panel=projects]').click();
  }
  const menu=page.locator('[data-floating-panel=projects]');await menu.locator('[data-assemble-all]').click();await menu.locator('[data-close-panel]').click();
  await page.locator('[data-panel=tools]').click();await page.locator('[data-color="#e65843"]').click();await page.locator('[data-close-panel]:visible').click();await page.locator('[data-panel=save]').click();await page.locator('[data-finish]').click();
  await page.locator('.designer-celebration-bar:visible').waitFor();assert.ok((await page.locator('.designer-celebration-bar strong').textContent()).includes(code));assert.equal(await page.evaluate(()=>ends),1);assert.ok((await page.evaluate(()=>result.detail)).includes(code));
  if(count===12)await page.screenshot({path:`.wrangler/engine-names/achievement-${locale}-${width}.png`});
  await page.locator('[data-celebration-done]').click();await page.locator('[data-overlay][data-outcome=success]').waitFor();assert.ok((await page.locator('[data-overlay]').textContent()).includes(code));await page.evaluate(()=>{game.destroy();shell.destroy();});
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`Engine identities ${locale}/${width}: five real vehicle names, specifications, source links, add-engine labels and named single-reward achievements passed`);
}}finally{await browser.close();await preview.close();}
