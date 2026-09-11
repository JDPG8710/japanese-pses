import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {startGoPreview} from '../scripts/preview-go.mjs';

const require=createRequire(import.meta.url);
let playwright;try{playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');}catch{playwright=require('playwright-core');}
const {chromium}=playwright;
const preview=await startGoPreview(4181),browser=await chromium.launch({channel:'chrome',headless:true});
const artifacts='.wrangler/chess-tests';await mkdir(artifacts,{recursive:true});let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
  const ac=await browser.newContext({viewport:{width:1280,height:960}}),bc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await ac.newPage(),b=await bc.newPage(),errors=[];
  for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
  async function setup(page,name){await page.addInitScript(()=>localStorage.setItem('piko-parental-ack-v1',JSON.stringify({version:1,ackedAt:Date.now(),purposes:['browser-test']})));await page.goto(`${preview.origin}/arena.html?lang=zh`);await page.locator('[data-consent=necessary]').click();await page.locator('#playroom-profile [name=nickname]').fill(name);await page.locator('#playroom-profile button').click();await page.locator('#playroom-profile').waitFor({state:'hidden'});await page.goto(`${preview.origin}/arena.html?game=chess&lang=zh`);}
  await setup(a,'爸爸');await setup(b,'小朋友');
  await a.locator('[data-chess=create]').click();await a.waitForURL(url=>!!new URL(url).searchParams.get('room'));await a.getByText('等待对手加入',{exact:true}).waitFor();
  const invitation=a.url();await b.goto(invitation);await b.locator('[data-chess=join-link]').click();
  await a.locator('[data-chess=ready]').click();await b.waitForTimeout(300);await b.locator('[data-chess=ready]').click();await b.waitForTimeout(300);if(await b.locator('[data-chess=ready]').isVisible())await b.locator('[data-chess=ready]').click();
  await a.getByText('轮到你',{exact:true}).waitFor();
  await a.locator('[data-square=e2]').click();await a.locator('[data-square=e4]').click();
  await b.getByText('轮到你',{exact:true}).waitFor();await b.locator('[data-square=e7]').click();await b.locator('[data-square=e5]').click();
  await a.locator('[data-square=e5] .black-piece').waitFor();check(true,'moves synchronize between players');
  await a.screenshot({path:`${artifacts}/desktop-game.png`,fullPage:true});
  b.on('dialog',dialog=>dialog.accept());await b.locator('[data-chess=resign]').click();await a.getByText('白方 获胜',{exact:true}).waitFor();
  const oldRoom=new URL(a.url()).searchParams.get('room');await a.locator('[data-chess=rematch]').click();await b.locator('[data-chess=rematch]').waitFor();
  await b.locator('[data-chess=rematch]').click();await a.waitForURL(url=>new URL(url).searchParams.get('room')!==oldRoom);await b.waitForURL(url=>new URL(url).searchParams.get('room')!==oldRoom);
  check(new URL(a.url()).searchParams.get('room')===new URL(b.url()).searchParams.get('room'),'both players enter the same rematch');
  check((await a.locator('.player').nth(1).innerText()).includes('你'),'rematch swaps colors');
  a.on('dialog',dialog=>dialog.accept());await a.locator('[data-chess=resign]').click();await a.locator('.result').waitFor();await a.locator('[data-chess=home]').click();
  await a.locator('[data-pr=learn-chess]').click();await a.locator('[data-learn-square=e2]').click();await a.locator('[data-learn-square=e4]').click();
  await a.getByText('做到了！',{exact:true}).waitFor();await a.locator('[data-chess-learn=next]').click();
  await a.locator('[data-chess-learn=close]').click();await a.getByText('已完成 1 / 8',{exact:true}).waitFor();await a.reload();await a.getByText('已完成 1 / 8',{exact:true}).waitFor();
  check(await a.locator('[data-pr=learn-chess]').count()===1,'chess tutorial progress persists');
  for(const width of [320,390,820]){await b.setViewportSize({width,height:900});check(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no page overflow at ${width}px`);}
  await b.screenshot({path:`${artifacts}/phone-game.png`,fullPage:true});
  await b.locator('[data-chess=home]').click();await b.locator('[data-pr=learn-chess]').click();
  check(await b.locator('[data-learn-square=e2]').evaluate(el=>el.getBoundingClientRect().width)>=56,'tutorial touch target is at least 56px');
  for(const language of ['en','ja','zh']){await a.locator('#locale').selectOption(language);check(await a.locator('h1').innerText()==='Piko Playroom','brand stays multilingual');}
  check(errors.length===0,errors.join('\n'));
  console.log(`Chess browser: ${checks} checks passed.`);
}finally{await browser.close();await preview.close();}
