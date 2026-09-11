import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { startGoPreview } from '../scripts/preview-go.mjs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');}catch{playwright=require('playwright-core');}
const {chromium}=playwright;
const preview=await startGoPreview(4176);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
const artifacts='.wrangler/go-tests';await mkdir(artifacts,{recursive:true});let checks=0;
try {
  const desktop=await browser.newContext({viewport:{width:1280,height:900}}),phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await desktop.newPage(),b=await phone.newPage(),errors=[];
  for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  for(const p of [a,b])await p.addInitScript(()=>localStorage.setItem('piko-parental-ack-v1',JSON.stringify({version:1,ackedAt:Date.now(),purposes:['browser-test']})));
  await a.goto(`${preview.origin}/arena.html?game=go&lang=zh`);
  await a.locator('[data-consent="necessary"]').click();
  await a.locator('[data-action=create]').click();await a.locator('[data-action=copy]').waitFor();
  const link=a.url();await a.screenshot({path:`${artifacts}/desktop-room.png`,fullPage:true});
  await b.goto(link);await b.locator('[data-consent="necessary"]').click();await b.locator('[data-action=join-link]').click();
  await a.locator('[data-action=ready]').click();await b.locator('[data-action=ready]').click();
  await a.locator('[data-point="40"]').click();assert.equal(await a.locator('[data-action=move], [data-action=clear]').count(),0);checks++;
  await b.locator('[data-point="40"] .stone.black').waitFor();checks++;
  await b.locator('[data-point="30"]').tap();await a.locator('[data-point="30"] .stone.white').waitFor();checks++;
  await b.reload();await b.locator('[data-point="40"] .stone.black').waitFor();assert.equal(await b.locator('[data-action=join-link]').count(),0);checks++;
  for(const viewport of [{width:390,height:844},{width:320,height:568},{width:820,height:1180},{width:1180,height:820}]) {
    await b.setViewportSize(viewport);
    assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no horizontal overflow at ${viewport.width}`);checks++;
    assert.equal(await b.locator('[data-point]').count(),81);checks++;
    await b.screenshot({path:`${artifacts}/board-${viewport.width}.png`,fullPage:true});
  }
  // Real disconnect + reconnect through the same Pages-like service binding.
  await phone.setOffline(true);await a.locator('[data-point="41"]').click();
  await phone.setOffline(false);await b.reload();await b.locator('[data-point="41"] .stone.black').waitFor();checks++;
  await b.locator('[data-action=pass]').click();await a.locator('[data-action=pass]').click();
  await b.locator('[data-action=accept]').waitFor();await a.locator('[data-action=accept]').click();await b.locator('[data-action=accept]').click();
  await a.locator('.result').waitFor();await b.locator('.result').waitFor();checks++;
  await b.locator('[data-action=review]').click();await b.locator('#review-step').fill('2');assert.equal(await b.locator('.stone').count(),2);checks++;
  await b.locator('[data-action=review-back]').click();await b.locator('[data-action=home]').click();
  await b.locator('#difficulty').selectOption('hard');await b.locator('[data-action=ai]').click();await b.locator('[data-action=ready]').click();
  await b.locator('[data-point="40"]').click();await b.locator('.stone.white').waitFor();checks++;
  await b.screenshot({path:`${artifacts}/tablet-ai.png`,fullPage:true});
  b.on('dialog',dialog=>dialog.accept());await b.locator('[data-action=resign]').click();await b.locator('.result').waitFor();await b.locator('[data-action=home]').click();
  await b.locator('#auto-ai').check();await b.locator('[data-action=match]').click();
  await b.locator('[data-action=ready]').waitFor({timeout:35000});assert.match(await b.locator('.player').nth(1).innerText(),/电脑/);checks++;
  await b.locator('#locale').selectOption('ja');assert.equal(await b.locator('h1').innerText(),'Piko Playroom');checks++;
  await b.evaluate(async()=>{
    const {LoginModal}=await import('/src/auth/LoginModal.js');
    const modal=new LoginModal({siteKey:'local-layout-test'});modal.ensureTurnstile=async()=>{};window.goTestModal=modal;
  });
  assert.equal(await b.locator('#auth-modal').isVisible(),false,'shared login modal hidden by default');checks++;
  await b.evaluate(()=>{ void window.goTestModal.show(); });await b.locator('#auth-modal [data-action=close]').click();
  assert.equal(await b.locator('#auth-modal').isVisible(),false,'standalone login modal opens and closes');checks++;
  await b.locator('[data-action=home]').click();
  await b.locator('#board-size').selectOption('19');await b.locator('#rules').selectOption('japanese');
  await b.locator('[data-action=create]').click();await b.locator('[data-action=copy]').waitFor();
  await a.goto(b.url());await a.locator('[data-action=join-link]').click();
  await b.locator('[data-action=ready]').click();await b.getByRole('button',{name:'準備完了',exact:true}).waitFor();await a.reload();await a.locator('[data-action=ready]').click();
  assert.equal(await b.locator('[data-point]').count(),361);assert.match(await a.locator('.game-config').innerText(),/6.5/);checks+=2;
  await b.setViewportSize({width:390,height:844});await b.locator('#board-zoom').selectOption('large');
  await b.locator('[data-point="360"]').tap();await a.locator('[data-point="360"] .stone.black').waitFor();checks++;
  await a.locator('[data-point="0"]').click();await b.locator('[data-point="0"] .stone.white').waitFor();
  await b.locator('#board-zoom').selectOption('fit');
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
  await b.screenshot({path:`${artifacts}/19-japanese-phone.png`,fullPage:true});
  await b.locator('[data-action=resign]').click();await b.locator('.result').waitFor();
  assert.deepEqual(errors,[],'no browser errors');checks++;
  console.log(`Go browser: ${checks} checks passed: guests, invitation, live moves, touch, reload, offline recovery, score, review, AI, auto fallback, 320/390/820/1180 layouts.`);
}finally{await browser.close();await preview.close();process.exit(0);}
