import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';

const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:process.env.TOWN_TEST_BUILT==='1'});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
const artifacts='.wrangler/town-tests';await mkdir(artifacts,{recursive:true});let checks=0;const errors=[];
const mark=message=>{checks++;console.log(`ok ${checks} - ${message}`);};
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('piko-town-v1')));
async function consent(page){const button=page.locator('[data-consent="necessary"]');try{await button.waitFor({state:'visible',timeout:4500});await button.click();}catch{}}
async function open(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(`${preview.origin}/town.html?locale=zh`);await page.locator('[data-action="begin"]').click();await consent(page);}
async function go(page,id){await page.locator(`[data-travel="${id}"]`).click();await page.locator('#town-dialog[open]').waitFor({timeout:14000});}
const fixtures=[null,[1,2,0,0],[0,0,1,1],[2,1,0,0],[2,1,0,0],[1,0,1,0],[0,2,0,1],[2,0,1,1]];
try{
  const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(12000);
  await open(page);await page.screenshot({path:`${artifacts}/desktop-town.png`,fullPage:true});mark('first visit, privacy choice and welcome');
  await page.locator('#town-canvas').focus();const before=(await state(page)).player;
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');await page.waitForTimeout(100);
  assert.ok(Math.abs((await state(page)).player.x-before.x)>25);mark('keyboard walks the actual character');
  await go(page,'guide');await page.locator('[data-action="accept"]').click();assert.equal((await state(page)).mission,1);await page.locator('[data-action="reward-next"]').click();await page.locator('[data-product="0"]').waitFor();mark('walk to Piko, accept work, and walk to Mia');
  for(let mission=1;mission<=7;mission++){
    const items=fixtures[mission],total=items.reduce((sum,n,i)=>sum+n*[3,2,4,5][i],0),paid=Math.ceil((total+1)/10)*10;
    assert.equal((await state(page)).mission,mission);
    if(mission===1){
      await page.locator('[data-action="submit"]').click();assert.match(await page.locator('#order-feedback').innerText(),/购物袋/);assert.equal((await state(page)).coins,5);
      await page.locator('[data-action="hint"]').click();await page.locator('[data-action="hint"]').click();assert.equal((await state(page)).stats.hints,1);
      await page.locator('[data-action="translate"]').click();assert.ok(await page.locator('#translation').isVisible());
      await page.locator('[data-product="3"]').click();await page.locator('[data-remove="3"]').click();assert.equal((await state(page)).active.bag[3],0);mark('wrong answer feedback, one hint credit and removable extra items');
    }
    if(mission<=2||mission>=5){
      for(let i=0;i<4;i++)for(let n=0;n<items[i];n++)await page.locator(`[data-product="${i}"]`).click();
      if(mission===1){await page.reload();await go(page,'shop');assert.deepEqual((await state(page)).active.bag,items);mark('reload resumes an unfinished shopping bag');}
      if(mission===2)await page.screenshot({path:`${artifacts}/desktop-order.png`,fullPage:true});
      await page.locator('[data-action="submit"]').click();
    }
    if(mission===3||mission>=5){
      await page.locator('#coin-answer').fill('999');await page.locator('[data-action="submit"]').click();assert.equal((await state(page)).mission,mission);
      await page.locator('#coin-answer').fill(String(total));
      if(mission===5){await page.reload();await go(page,'shop');assert.equal(await page.locator('#coin-answer').inputValue(),String(total));mark('checkout phase and numeric draft survive reload');}
      await page.locator('[data-action="submit"]').click();
    }
    if(mission===4||mission>=5){
      await page.locator('#coin-answer').fill('');await page.locator('[data-action="submit"]').click();assert.equal((await state(page)).mission,mission);
      if(mission===4){await page.locator('[data-action="coin:2"]').click();assert.equal(await page.locator('#coin-answer').inputValue(),'2');}
      else await page.locator('#coin-answer').fill(String(paid-total));
      await page.locator('[data-action="submit"]').click();
    }
    await page.locator('[data-action="reward-next"]').waitFor();assert.equal((await state(page)).mission,mission+1);await page.locator('[data-action="reward-next"]').click();
    if(mission<7)await page.locator('.order-dialog').waitFor();
  }
  mark('all seven shop missions: English items, total, change and three full sales');
  await go(page,'home');assert.ok((await state(page)).owned.includes('plant'));await page.locator('[data-furniture="plant"]').click();await page.locator('[data-slot="4"]').click();assert.equal((await state(page)).mission,9);
  await page.locator('[data-furniture="books"]').click();assert.equal((await state(page)).coins,37);await page.locator('[data-slot="0"]').click();await page.locator('[data-furniture="plant"]').click();await page.locator('[data-slot="8"]').click();assert.equal((await state(page)).room[4],null);assert.equal((await state(page)).room[8],'plant');
  await page.screenshot({path:`${artifacts}/desktop-home.png`,fullPage:true});await page.locator('.close-button').click();mark('earn, buy and move furniture without duplicate rewards');
  await go(page,'guide');await page.locator('[data-action="celebrate"]').click();assert.equal((await state(page)).mission,10);assert.equal((await state(page)).xp,100);assert.equal((await state(page)).coins,42);await page.screenshot({path:`${artifacts}/certificate.png`,fullPage:true});
  await page.locator('.close-button').click();await page.reload();assert.equal((await state(page)).mission,10);await go(page,'guide');assert.equal(await page.locator('[data-action="celebrate"]').count(),0);assert.equal((await state(page)).coins,42);await page.locator('.close-button').click();mark('full chapter completion, persistent certificate, no repeated reward');
  for(const lang of ['en','ja','zh']){await page.locator('#locale').selectOption(lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);await page.locator('#help').click();assert.ok((await page.locator('#dialog-title').innerText()).length>0);await page.keyboard.press('Escape');assert.equal(await page.locator('#town-dialog').evaluate(d=>d.open),false);}
  mark('three languages and keyboard dialog dismissal');
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),mobile=await phone.newPage();await open(mobile);
  const start=(await state(mobile)).player;const dp=await mobile.locator('[data-direction="ArrowLeft"]').boundingBox();await mobile.mouse.move(dp.x+dp.width/2,dp.y+dp.height/2);await mobile.mouse.down();await mobile.waitForTimeout(350);await mobile.mouse.up();await mobile.waitForTimeout(100);assert.ok(Math.abs((await state(mobile)).player.x-start.x)>25);mark('held mobile direction controls move the character');
  await mobile.locator('#character').tap();await mobile.locator('[data-avatar="2"]').tap();await mobile.locator('#math-level').selectOption('3');await mobile.locator('#english-level').selectOption('3');await mobile.locator('.close-button').tap();await go(mobile,'guide');await mobile.locator('[data-action="accept"]').tap();await mobile.locator('[data-action="reward-next"]').tap();await mobile.locator('.order-dialog').waitFor();assert.equal((await state(mobile)).active.math,3);assert.match(await mobile.locator('#english-order').innerText(),/picnic/);
  await mobile.locator('[data-product="0"]').tap();await mobile.locator('.close-button').tap();await mobile.locator('#character').tap();await mobile.locator('#math-level').selectOption('1');await mobile.locator('.close-button').tap();await go(mobile,'shop');assert.equal((await state(mobile)).active.math,3);mark('independent difficulty levels, outfit and frozen active order');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:820,height:1180},{width:1180,height:820}]){
    await mobile.setViewportSize(viewport);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await mobile.locator('#town-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));await mobile.screenshot({path:`${artifacts}/order-${viewport.width}.png`,fullPage:true});
  }mark('320 / 390 / 820 / 1180 layouts without horizontal overflow');
  await mobile.locator('.close-button').tap();await mobile.setViewportSize({width:390,height:844});await mobile.screenshot({path:`${artifacts}/phone-town.png`,fullPage:true});await go(mobile,'home');await mobile.screenshot({path:`${artifacts}/phone-home.png`,fullPage:true});await mobile.locator('.close-button').tap();
  await phone.setOffline(true);await go(mobile,'shop');await mobile.locator('[data-product="1"]').tap();assert.equal((await state(mobile)).active.bag[1],1);await phone.setOffline(false);mark('loaded game remains playable while offline');
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='piko-town-v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};});const blockedPage=await blocked.newPage();await open(blockedPage);assert.match(await blockedPage.locator('#save-status').innerText(),/无法保存/);await go(blockedPage,'guide');await blockedPage.locator('[data-action="accept"]').click();assert.match(await blockedPage.locator('#save-status').innerText(),/无法保存/);mark('storage failure is visible and does not crash gameplay');
  const corrupt=await browser.newContext();await corrupt.addInitScript(()=>localStorage.setItem('piko-town-v1','{broken'));const cp=await corrupt.newPage();await open(cp);assert.equal((await state(cp)).mission,0);mark('corrupt save recovers to a playable new town');
  // Public entry points retain the selected learning locale.
  await page.goto(`${preview.origin}/world.html?locale=zh`);await page.locator('.town-entry').waitFor();assert.match(await page.locator('.town-entry').getAttribute('href'),/locale=zh/);await page.locator('#locale').selectOption('ja');assert.match(await page.locator('.town-entry').innerText(),/まなびタウン/);
  await page.goto(`${preview.origin}/grades.html?country=CN&locale=zh`);await page.locator('.town-entry').waitFor();await page.locator('.town-entry').click();await page.locator('#town-canvas').waitFor();mark('world and grade entry links work');
  assert.deepEqual(errors,[],'no uncaught browser exceptions');mark('no uncaught browser exceptions');
  console.log(`Town browser: ${checks} groups passed. Screenshots: ${artifacts}`);
}finally{await browser.close();await preview.close();}
