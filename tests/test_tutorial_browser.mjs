import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd(),channel=process.env.BROWSER_CHANNEL||'chrome';
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){res.writeHead(url.pathname.includes('/session')?401:200,{'content-type':'application/json'});res.end(JSON.stringify(url.pathname.includes('/session')?{authenticated:false}:{country:'US',entries:[]}));return;}
  if(url.pathname==='/__fixture'){res.writeHead(200,{'content-type':'text/html'});res.end('<html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>.hidden{display:none}#game-stage{width:100%;height:420px}#game-modal{max-width:750px;margin:auto}body{margin:12px}</style></head><body></body></html>');return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const type={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
  const content=await readFile(file);res.writeHead(200,{'content-type':type});res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel,headless:true});
const artifacts=path.join(root,'.wrangler','tutorial-tests');await mkdir(artifacts,{recursive:true});
let checks=0;
try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?3:1,reducedMotion:viewport.width===1280?'no-preference':'reduce'}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
  await page.clock.install();
  await page.goto(`${origin}/world.html?country=US&locale=en`);
  for(const game of (viewport.width===1280?['circuit','sudoku','code','robot','set','balance','order','water','network']:['robot'])){
   await page.locator(`[data-action="play:${game}"]`).click();
   await page.locator('dialog[open]').waitFor();
   assert.match(await page.locator('dialog').innerText(),/How to play/);checks++;
   assert.equal(await page.locator('#clock').count(),0,'clock does not start behind initial tutorial');checks++;
   if(viewport.width===1280){await page.clock.fastForward(3500);assert.equal(await page.locator('[data-step-button="1"]').getAttribute('aria-pressed'),'true','automatic demo advances');checks++;}
   await page.locator('[data-step-button="1"]').click();
   assert.equal(await page.locator('[data-step-button="1"]').getAttribute('aria-pressed'),'true');checks++;
   const fit=await page.locator('dialog').evaluate(el=>({width:el.scrollWidth,client:el.clientWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
   assert.ok(fit.width<=fit.client+1&&fit.left>=0&&fit.right<=viewport.width,JSON.stringify(fit));checks++;
   if(game==='robot')await page.screenshot({path:path.join(artifacts,`${channel}-${viewport.width}-tutorial.png`)});
   await page.locator('dialog .pt-start').click();await page.locator('#clock').waitFor();
   await page.clock.fastForward(5000);
   const before=await page.locator('#clock').innerText();
   await page.locator('[data-tutorial-help]').click();await page.locator('dialog[open]').waitFor();
   await page.clock.fastForward(240000);
   assert.equal(await page.locator('#clock').innerText(),before);checks++;
   await page.keyboard.press('Escape');await page.clock.fastForward(250);
   assert.equal(await page.locator('#clock').innerText(),before);checks++;
   await page.locator('[data-action="home"]').click();
   assert.equal(await page.locator('[data-tutorial-help]').count(),0);checks++;
  }
  await page.goto(`${origin}/learn.html?curriculum=CN63&year=Y1&lesson=add20&locale=zh&country=CN`);
  await page.locator('[data-action="start"]').click();await page.locator('dialog[open]').waitFor();
  assert.match(await page.locator('dialog').innerText(),/怎么玩/);checks++;
  await page.locator('dialog .pt-start').click();await page.locator('#quest-clock').waitFor();
  // 選択・入力した答えを説明の開閉で失わない。
  const choice=page.locator('[data-choice]').first();
  if(await choice.count())await choice.click();else await page.locator('[data-key="2"]').click();
  await page.locator('[data-tutorial-help]').click();await page.locator('dialog[open]').waitFor();
  await page.clock.fastForward(240000);await page.locator('dialog .pt-start').click();
  if(await choice.count())assert.equal(await choice.getAttribute('aria-pressed'),'true');else assert.equal(await page.locator('#quest-answer').innerText(),'2');checks++;
  assert.ok(await page.locator('#quest-clock').count());checks++;
  await page.goto(`${origin}/__fixture`);
  await page.evaluate(async()=>{
   const {MiniGameModal}=await import('/MiniGameSystem.js');
   window.modal=new MiniGameModal();
   window.modal.open({id:'tutorial-circuit',name:'回路のチャレンジ',grade:6,subject:'理科',gameType:'CIRCUIT_SANDBOX',gameData:{}});
  });
  await page.locator('dialog[open]').waitFor();
  await page.locator('[data-step-button="1"]').click();assert.match(await page.locator('dialog').innerText(),/下の答えを一つタップ/);checks++;
  assert.equal(await page.evaluate(()=>window.modal.currentGame.running),false);checks++;
  await page.locator('dialog .pt-start').click();
  await page.clock.fastForward(5000);const before=await page.locator('#game-timer').innerText();
  await page.locator('#game-tutorial-btn').click();
  assert.equal(await page.locator('dialog[open]').count(),1,JSON.stringify(await page.evaluate(()=>({deadline:modal.stageDeadline,now:Date.now(),settled:modal.stageSettled,paused:modal.tutorialPaused,running:modal.currentGame?.running}))));
  await page.locator('dialog[open]').waitFor();
  assert.equal(await page.evaluate(()=>window.modal.playActivityActive),false);checks++;
  await page.clock.fastForward(240000);await page.locator('dialog .pt-start').click();await page.clock.fastForward(250);
  assert.equal(await page.locator('#game-timer').innerText(),before);checks++;
  await page.evaluate(()=>window.modal.close());assert.equal(await page.locator('#game-tutorial-btn').isVisible(),false);checks++;
  // 未提供プロバイダーは個人情報を収集せず、通信を行わない。
  await page.goto(`${origin}/world.html?country=CN&locale=zh`);
  let writes=0;page.on('request',r=>{if(r.method()==='POST')writes++;});
  await page.evaluate(async()=>{const {LoginModal}=await import('/src/auth/LoginModal.js');window.loginFixture=new LoginModal({siteKey:''});await window.loginFixture.show();});
  await page.locator('[data-upcoming="email"]').click();assert.match(await page.locator('#auth-upcoming').innerText(),/邮箱.*尚未开通/);checks++;
  await page.locator('[data-upcoming="wechat"]').click();assert.match(await page.locator('#auth-upcoming').innerText(),/微信.*尚未开通/);checks++;
  assert.equal(writes,0);assert.equal(await page.locator('#auth-modal input').count(),0);checks+=2;
  await page.screenshot({path:path.join(artifacts,`${channel}-${viewport.width}-login.png`)});
  await page.locator('[data-action="close"]').click();
  assert.deepEqual(errors,[],errors.join('\n'));checks++;
  await context.close();
 }
 console.log(`${channel}: ${checks} tutorial, timer, locale, login placeholder and viewport checks passed.`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
