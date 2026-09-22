import {enterBuilding} from './town_manual_controls.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
import {newState} from '../src/town/TownRules.mjs';
import {reachSkyTarget} from './town_manual_controls.mjs';
import {questionFor} from '../src/town/ArcadeRules.mjs';
const preview=await startTownPreview(0,{built:process.env.TOWN_TEST_BUILT==='1'}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});let checks=0;
const mark=s=>console.log(`ok ${++checks} - ${s}`),read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('piko-town-v1')));
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}});const v1=newState();delete v1.expansion;v1.started=true;v1.coins=150;v1.mission=4;
 await context.addInitScript(s=>{if(!localStorage.getItem('piko-town-v1'))localStorage.setItem('piko-town-v1',JSON.stringify(s));},v1);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);await page.goto(`${preview.origin}/town?locale=zh`);await page.locator('#town-canvas[data-renderer]').waitFor();const consent=page.locator('[data-consent="necessary"]');try{await consent.waitFor({timeout:4000});await consent.click();}catch{}
 await page.locator('#character').click();for(const id of ['robot','cat','astro','frog','builder','explorer']){await page.locator(`[data-character-id="${id}"]`).click();assert.equal((await read(page)).expansion.character,id);assert.equal(await page.locator('#avatar-preview').count(),1);}await page.locator('.close-button').click();assert.equal((await read(page)).mission,4);mark('v1 story and balance migrate while every 3D avatar can be selected');
 await enterBuilding(page,'gear');for(const id of ['shoes','spring','shield','hint'])await page.locator(`[data-buy-item="${id}"]`).click();assert.equal((await read(page)).coins,94);assert.equal(await page.locator('[data-buy-item="shoes"]').isDisabled(),true);await page.locator('.close-button').click();mark('gear purchases deduct exact prices and cannot be purchased twice');
 await enterBuilding(page,'obby');let run=(await read(page)).expansion.runs.obby,q=questionFor(run);await reachSkyTarget(page,'obby',(q.answer+1)%3);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('piko-town-v1')).expansion.inventory.shield===0,{},{timeout:25000});assert.equal((await read(page)).expansion.runs.obby.hearts,3);assert.equal((await read(page)).coins,94);await page.locator('[data-arcade-hint]').click();assert.equal((await read(page)).expansion.inventory.hint,0);assert.ok(await page.locator('.arcade-panel .hint-box').isVisible());mark('wrong physical answer consumes exactly one shield; hint card reveals explanation');
 await page.locator('#town-canvas').focus();await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('piko-town-v1')).expansion.runs.obby.hearts===2,{},{timeout:20000});await page.keyboard.up('ArrowLeft');await page.waitForFunction(()=>Number(document.querySelector('#town-canvas').dataset.position.split(',')[1])===0);mark('walking off a floating platform falls, respawns, and spends one attempt');
 // Exercise every lateral landing route with both speed and jump equipment.
 for(const mode of ['obby','tower']){
  if(mode==='tower'){await page.locator('[data-exit-game]').last().click();await enterBuilding(page,'tower');}
  for(const target of [0,1,2]){
   let s=await read(page),r=s.expansion.runs[mode];if(r.solved){await page.locator('[data-next-stage]').click();r=(await read(page)).expansion.runs[mode];}if(r.hearts===0){await page.locator('[data-retry-stage]').click();r=(await read(page)).expansion.runs[mode];}
   const previous=r.hearts;await reachSkyTarget(page,mode,target);await page.waitForFunction(({mode,previous})=>{const r=JSON.parse(localStorage.getItem('piko-town-v1')).expansion.runs[mode];return r.solved||r.hearts<previous;},{mode,previous},{timeout:25000});
   s=await read(page);r=s.expansion.runs[mode];assert.equal(r.solved,questionFor(r).answer===target,`must reach the intended ${mode} target ${target}`);
  }
 }mark('all six manually jumped randomized answer routes work with speed shoes and spring boots');
 await page.locator('[data-exit-game]').last().click();await page.reload();await page.locator('#town-canvas[data-renderer]').waitFor();await enterBuilding(page,'memory');await page.locator('[data-memory-replay]:not([disabled])').waitFor({timeout:12000});const before=await read(page);await page.locator('[data-memory-replay]').click();assert.equal((await read(page)).coins,before.coins);assert.equal((await read(page)).expansion.runs.memory.memoryIndex,0);mark('memory replay is free, resets sequence position and grants no reward');
 assert.deepEqual(errors,[]);mark('no exceptions during migration, repeated previews, purchases and recovery');console.log(`Town 3D edges: ${checks} groups passed.`);
}finally{await browser.close();await preview.close();}
