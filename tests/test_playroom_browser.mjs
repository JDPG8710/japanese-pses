import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {startGoPreview} from '../scripts/preview-go.mjs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');}catch{playwright=require('playwright-core');}
const {chromium}=playwright;
const preview=await startGoPreview(4178), browser=await chromium.launch({channel:'chrome',headless:true});
const artifacts='.wrangler/playroom-tests';await mkdir(artifacts,{recursive:true});let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
try {
  const ac=await browser.newContext({viewport:{width:1280,height:960}}),bc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await ac.newPage(),b=await bc.newPage(),errors=[];
  for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  async function setup(p,name){await p.addInitScript(()=>localStorage.setItem('piko-parental-ack-v1',JSON.stringify({version:1,ackedAt:Date.now(),purposes:['browser-test']})));await p.goto(`${preview.origin}/arena.html?lang=zh`);await p.locator('[data-consent=necessary]').click();await p.locator('#playroom-profile [name=nickname]').fill(name);await p.locator('#playroom-profile [name=visible]').check();await p.locator('#playroom-profile button').click();await p.locator('#playroom-profile').waitFor({state:'hidden'});}
  await setup(a,'爸爸');await setup(b,'小朋友');
  await a.evaluate(()=>localStorage.setItem('piko-family','00000000-0000-4000-8000-000000000000'));
  await a.reload();await a.locator('[data-pr=refresh]').waitFor();
  check(await a.evaluate(()=>localStorage.getItem('piko-family')===null),'expired saved family is cleared without showing an internal error');
  await a.locator('[data-pr=refresh]').click();await a.getByText('小朋友',{exact:true}).waitFor();checks++;
  await a.screenshot({path:`${artifacts}/desktop-lobby.png`,fullPage:true});
  const family=await a.evaluate(async()=>{const r=await fetch('/api/arena/families',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tab:crypto.randomUUID()})});return(await r.json()).id;});
  await a.goto(`${preview.origin}/arena.html?family=${family}&lang=zh`);await a.locator('.family-panel').waitFor();
  await b.goto(`${preview.origin}/arena.html?family=${family}&lang=zh`);await b.locator('.family-panel').waitFor();
  await a.locator('.family-panel .member').nth(1).waitFor();checks++;
  const third=await browser.newContext(),c=await third.newPage();await setup(c,'外面的朋友');
  const denied=await c.evaluate(async id=>{const r=await fetch(`/api/arena/families/${id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'get'})});return r.json();},family);
  check(denied.error==='NOT_MEMBER','family member list private');await third.close();
  await a.locator('[data-pr=family-ready]').click();await b.locator('.family-panel').getByText(/爸爸/).waitFor();
  await b.waitForFunction(()=>[...document.querySelectorAll('.family-panel .member')].some(el=>el.textContent.includes('爸爸')&&el.textContent.includes('已准备')));
  await b.locator('[data-pr=family-ready]').click();
  await a.waitForFunction(()=>[...document.querySelectorAll('.family-panel .member')].every(el=>el.textContent.includes('已准备')));
  await a.screenshot({path:`${artifacts}/family-ready.png`,fullPage:true});
  await a.locator('[data-pr=family-start]').click();await a.locator('[data-point="40"]').waitFor();await b.locator('[data-point="40"]').waitFor();
  await a.locator('[data-point="40"]').click();await b.locator('[data-point="40"] .stone.black').waitFor();checks++;
  a.on('dialog',d=>d.accept());b.on('dialog',d=>d.accept());
  const old=a.url();await a.locator('[data-action=resign]').click();await b.locator('.result').waitFor();
  await a.reload();await a.locator('[data-action=rematch]').waitFor();
  await a.locator('[data-action=rematch]').click();await b.getByText('对方想再来一局。',{exact:true}).waitFor();
  await b.locator('[data-action=rematch]').click();await a.waitForURL(url=>url.href!==old);await b.waitForURL(url=>url.href!==old);
  check(new URL(a.url()).searchParams.get('room')===new URL(b.url()).searchParams.get('room'),'both automatically enter same rematch');
  await b.locator('[data-point="20"]').click();await a.locator('[data-point="20"] .stone.black').waitFor();checks++;
  await a.locator('[data-action=resign]').click();await a.goto(`${preview.origin}/arena.html?game=go&lang=zh`);
  await a.locator('[data-action=learn]').click();await a.locator('[data-learn-point="0"]').click();await a.locator('[data-learn=next]').click();
  await a.locator('[data-learn-point="0"]').click();check((await a.locator('.learn-feedback').innerText()).includes('再观察'),'wrong answer guidance');
  for(const p of [11,19,21,29])await a.locator(`[data-learn-point="${p}"]`).click();await a.locator('[data-learn=next]').click();
  await a.locator('[data-learn-point="29"]').click();check(await a.locator('[data-learn-point="20"] .stone').count()===0,'interactive capture');await a.locator('[data-learn=next]').click();
  await a.locator('[data-learn-point="20"]').click();await a.locator('[data-learn=next]').click();
  await a.locator('[data-learn=pass]').click();await a.locator('[data-learn=pass]').click();await a.locator('[data-learn=confirm]').click();await a.locator('[data-learn=next]').click();
  await a.getByText('已完成 5 / 5',{exact:true}).waitFor();await a.reload();await a.getByText('已完成 5 / 5',{exact:true}).waitFor();checks++;
  for(const lang of ['en','ja','zh']) {await a.locator('#locale').selectOption(lang);check(await a.locator('h1').innerText()==='Piko Playroom','brand unchanged');}
  await a.locator('[data-action=ai]').click();await a.locator('[data-action=ready]').click();await a.locator('[data-action=resign]').click();await a.locator('.result').waitFor();
  const aiOld=a.url();await a.locator('[data-action=rematch]').click();await a.waitForURL(url=>url.href!==aiOld);await a.locator('[data-action=resign]').waitFor();
  check(await a.locator('[data-action=ready]').count()===0,'AI rematch starts immediately');
  await a.locator('[data-action=resign]').click();
  await b.locator('[data-action=home]').click();
  for(const width of [320,390,820]) {await b.setViewportSize({width,height:900});check(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow ${width}`);await b.screenshot({path:`${artifacts}/lobby-${width}.png`,fullPage:true});}
  await b.setViewportSize({width:390,height:844});await b.goto(`${preview.origin}/arena.html?game=go&lang=ja`);await b.locator('[data-action=learn]').click();
  await b.screenshot({path:`${artifacts}/tutorial-ja-phone.png`,fullPage:true});
  check(await b.locator('[data-learn-point="0"]').evaluate(el=>el.getBoundingClientRect().width)>=56,'tutorial touch target');
  check(errors.length===0,errors.join('\n'));
  console.log(`Playroom browser: ${checks} checks passed.`);
}finally{await browser.close();await preview.close();}
