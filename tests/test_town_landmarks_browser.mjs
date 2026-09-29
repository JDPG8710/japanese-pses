import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
import {newState} from '../src/town/TownRules.mjs';
import {TOWN_BUILDINGS} from '../src/town/TownBuildings.mjs';
const preview=await startTownPreview(0,{built:true}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-landmarks',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),errors=[];
 for(const b of TOWN_BUILDINGS){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const saved=newState();saved.started=true;saved.player={x:b.x*25+550,y:(b.z-12)*25+380};
  await page.addInitScript(save=>localStorage.setItem('piko-town-v1',JSON.stringify(save)),saved);
  await page.goto(`${preview.origin}/town?locale=zh`);const consent=page.locator('[data-consent="necessary"]');try{await consent.waitFor({timeout:3000});await consent.click();}catch{}await page.locator('#town-canvas[data-landmarks]').waitFor();await page.waitForTimeout(700);
  await page.locator('#town-canvas').screenshot({path:`.wrangler/town-landmarks/${b.id}.png`});
  const result=await page.evaluate(async b=>{const {buildLandmark}=await import('/src/town/TownLandmarks.mjs');const {THREE,disposeGroup}=await import('/src/town/Models3D.mjs');const root=new THREE.Group(),model=buildLandmark(root,b,b.id),bounds=new THREE.Box3().setFromObject(model);let count=0;model.traverse(o=>{if(o.isMesh)count++;});const value={count,height:bounds.max.y,theme:model.userData.theme};disposeGroup(root);return value;},b);
  assert.equal(result.theme,b.id);assert.ok(result.count>=20);assert.ok(result.height>6);console.log(`${b.id}: ${result.count} modeled parts, height ${result.height.toFixed(1)}`);await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await preview.close();}
