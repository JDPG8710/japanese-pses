import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=await startTownPreview(0);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-progression',{recursive:true});
const symbols=['★','◆','●','▲','♥','☀'];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/town.html?locale=zh');
  await page.locator('[data-action="begin"]').click();
  const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
  await page.evaluate(async()=>{
   const {newState}=await import('/src/town/TownRules.mjs');
   const {startArcade}=await import('/src/arcade/ArcadeHub.mjs');
   window.testState=newState();testState.townProgress.level=19;
   window.openTestArcade=()=>startArcade('bubble',{locale:'zh',state:testState,seed:4242,persist:()=>localStorage.setItem('piko-town-v1',JSON.stringify(testState))});
   openTestArcade();
  });
  async function complete(){
   const ids=await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(n=>n.dataset.part));for(const id of ids)await page.locator('[data-part="'+id+'"]').click();await page.locator('[data-rotate="15"]').click();await page.locator('[data-finish]').click();await page.locator('[data-overlay][data-outcome="success"]').waitFor();
  }
  await complete();
  assert.equal(await page.evaluate(()=>testState.townProgress.level),20);
  assert.equal(await page.evaluate(()=>testState.townProgress.infiniteRound),0);
  assert.equal(await page.evaluate(()=>testState.townProgress.points),24);
  await page.keyboard.press('1');assert.equal(await page.evaluate(()=>testState.townProgress.points),24);
  await page.locator('[data-shell="retry"]').click();
  assert.match(await page.locator('.arcade-hard').innerText(),/20 \/ 20/);
  await complete();
  assert.equal(await page.evaluate(()=>testState.townProgress.infiniteRound),1);
  assert.equal(await page.evaluate(()=>testState.townProgress.points),49);
  assert.match(await page.locator('[data-overlay-body]').innerText(),/无限挑战/);
  await page.screenshot({path:`.wrangler/town-progression/clear20-${width}.png`,fullPage:true});
  await page.locator('[data-shell="retry"]').click();
  assert.match(await page.locator('.arcade-hard').innerText(),/无限挑战/);
  await page.locator('.arcade-hud [data-shell="back"]').click();
  assert.equal(await page.locator('.arcade-shell').count(),0);
  assert.equal(await page.evaluate(()=>Object.keys(testState.townProgress.sessions).length),0);
  assert.equal(await page.evaluate(()=>testState.townProgress.points),49);
  await page.evaluate(()=>openTestArcade());
  await page.locator('[data-finish]').click();
  assert.equal(await page.locator('[data-overlay][data-outcome="success"]').isVisible(),false);
  assert.equal(await page.evaluate(()=>testState.townProgress.points),49);
  await page.locator('.arcade-hud [data-shell="pause"]').click();
  assert.equal(await page.locator('.designer-studio:visible').count(),0);
  await page.locator('.arcade-hud [data-shell="pause"]').click();
  assert.equal(await page.locator('.designer-studio:visible').count(),1);
  await page.locator('.arcade-hud [data-shell="back"]').click();
  assert.equal(await page.evaluate(()=>testState.townProgress.points),49);
  assert.deepEqual(errors,[]);
  await context.close();console.log(`Town progression browser ${width}px: real product part inputs, levels 19/20/endless, rewards, no replay, failure, pause, retry and exit passed.`);
 }
}finally{await browser.close();await preview.close();}
