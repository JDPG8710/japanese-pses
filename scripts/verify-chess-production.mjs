import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

const require=createRequire(import.meta.url);let playwright;
try{playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');}catch{playwright=require('playwright-core');}
const browser=await playwright.chromium.launch({channel:'chrome',headless:true});
const artifacts='.wrangler/chess-production';await mkdir(artifacts,{recursive:true});let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
  const ac=await browser.newContext({viewport:{width:1280,height:900}}),bc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await ac.newPage(),b=await bc.newPage(),errors=[];for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
  async function setup(page,name){await page.goto('https://piko-game.com/arena.html?game=chess&lang=zh',{waitUntil:'networkidle'});await page.locator('[data-consent=necessary]').click();check(await page.locator('#title').innerText()==='Piko Playroom','production brand');await page.locator('#playroom-profile [name=nickname]').fill(name);check(!await page.locator('#playroom-profile [name=visible]').isChecked(),'QA guest remains private');await page.locator('#playroom-profile button').click();await page.locator('#playroom-profile').waitFor({state:'hidden'});page.on('dialog',dialog=>dialog.accept());}
  await setup(a,'Chess QA A');await setup(b,'Chess QA B');
  await a.locator('[data-chess=create]').click();await a.waitForURL(url=>!!new URL(url).searchParams.get('room'));const invitation=a.url();await b.goto(invitation);await b.locator('[data-chess=join-link]').click();
  await a.locator('[data-chess=ready]').click();await b.waitForTimeout(800);await b.locator('[data-chess=ready]').click();await b.waitForTimeout(800);if(await b.locator('[data-chess=ready]').isVisible())await b.locator('[data-chess=ready]').click();await a.getByText('轮到你',{exact:true}).waitFor();
  await a.locator('[data-square=e2]').click();await a.locator('[data-square=e4]').click();await b.locator('[data-square=e4] .white-piece').waitFor();checks++;
  await a.screenshot({path:`${artifacts}/desktop-game.png`,fullPage:true});
  await b.locator('[data-chess=resign]').click();await a.getByText('白方 获胜',{exact:true}).waitFor();const oldRoom=new URL(a.url()).searchParams.get('room');
  await a.locator('[data-chess=rematch]').click();await b.getByText('对方想再来一局。',{exact:true}).waitFor();await b.locator('[data-chess=rematch]').click();
  await a.waitForURL(url=>new URL(url).searchParams.get('room')!==oldRoom);await b.waitForURL(url=>new URL(url).searchParams.get('room')!==oldRoom);check(new URL(a.url()).searchParams.get('room')===new URL(b.url()).searchParams.get('room'),'production rematch');
  await a.locator('[data-chess=resign]').click();await a.locator('.result').waitFor();await a.locator('[data-chess=home]').click();await a.locator('[data-pr=learn-chess]').click();await a.locator('[data-learn-square=e2]').click();await a.locator('[data-learn-square=e4]').click();await a.getByText('做到了！',{exact:true}).waitFor();checks++;
  await b.screenshot({path:`${artifacts}/phone-game.png`,fullPage:true});check(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'production mobile layout');
  check(errors.length===0,errors.join('\n'));
  console.log(`Production chess: ${checks} checks passed. Two private QA guests completed a live move, result, color-swapped rematch, tutorial and mobile check.`);
}finally{await browser.close();}
