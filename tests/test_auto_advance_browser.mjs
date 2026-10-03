import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin+'/town?locale=zh');await page.locator('[data-action="begin"]').click();const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
 for(const id of ['race','breakout','fruit','ninja','bubble','rhythm']){
  await page.evaluate(async id=>{const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs');window.transitions=0;window.testShell=openArcadeShell({gameId:id,locale:'zh',onRetry:()=>transitions++});testShell.showResult({cleared:true,score:100});},id);
  assert.equal(await page.locator('[data-shell="retry"]:visible').count(),0);assert.equal(await page.evaluate(()=>transitions),0);
  await page.waitForFunction(()=>transitions===1);assert.equal(await page.locator('[data-overlay]').isVisible(),false);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>transitions),1);await page.evaluate(()=>testShell.destroy());
 }
 await page.evaluate(async()=>{const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs');window.transitions=0;window.testShell=openArcadeShell({gameId:'fruit',locale:'zh',onRetry:()=>transitions++});testShell.showResult({cleared:false,score:0});});await page.waitForTimeout(2500);assert.equal(await page.evaluate(()=>transitions),0);await page.locator('[data-shell="retry"]').click();assert.equal(await page.evaluate(()=>transitions),1);
 await page.evaluate(()=>testShell.showResult({cleared:true,score:100}));await page.locator('.arcade-hud [data-shell="back"]').click();await page.waitForTimeout(2500);assert.equal(await page.evaluate(()=>transitions),1);assert.equal(await page.locator('.arcade-shell').count(),0);assert.deepEqual(errors,[]);console.log('All six arcade results automatically continue exactly once; failure retains retry and exit cancels pending transition.');
}finally{await browser.close();await preview.close();}
