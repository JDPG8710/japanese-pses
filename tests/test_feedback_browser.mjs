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
const artifacts=path.join(root,'.wrangler','feedback-tests');await mkdir(artifacts,{recursive:true});
let checks=0;
try {
 for (const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:568}]) {
  const page=await browser.newPage({viewport});
  await page.goto(`${origin}/__fixture`);
  await page.addStyleTag({url:`${origin}/css/style.css`});
  await page.addStyleTag({content:'.hidden{display:none!important}#map{position:relative;height:400px}'});
  const result=await page.evaluate(async()=>{
   const games=await import('/MiniGameSystem.js');
   const {EconomyManager}=await import('/EconomySystem.js');
   const {GalaxyEngine}=await import('/GalaxyEngine.js');
   const {ErrorInterceptor}=await import('/ErrorInterceptor.js');
   const map=document.createElement('div');map.id='map';document.body.append(map);
   window.eco=new EconomyManager('Feedback');eco.starCoins=5000;
   window.engine=new GalaxyEngine(map);
   const interceptor=new ErrorInterceptor({userId:'browser-regression'});
   let deadlocks=0;window.addEventListener('AGENT_BUG_CAPTURED',event=>{if(event.detail?.category==='UI_DEADLOCK_HANG')deadlocks++;});
   engine.setStageLaunchHandler(()=>{});
   const stage=engine.createStageButton({id:'KOKUGO_G2_RADICAL_160',subject:'国語',name:'2年 漢字（160字）・部首と主述'},1);
   document.body.append(stage);stage.click();
   const themes=[];
   for(const id of ['skin_nebula_aurora','skin_cyber_neon']){
    const buy=eco.purchaseItem(id);if(!buy.success)throw Error(buy.message);
    engine.setBackgroundTheme(eco.getEquippedItem('SKIN').id);
    themes.push(getComputedStyle(engine.root).backgroundImage);
   }
   const restored=new EconomyManager('Feedback');
   if(restored.getEquippedItem('SKIN').id!=='skin_cyber_neon')throw Error('Theme not saved');
   eco.equipItem('skin_nebula_aurora');engine.setBackgroundTheme(eco.getEquippedItem('SKIN').id);
   window.modal=new games.MiniGameModal();
   modal.setShopItemAdapter({getQuantity:id=>eco.getItemQuantity(id),consume:id=>eco.consumeItem(id)});
   const master=await fetch('/data/subjects_curriculum.json').then(r=>r.json());
   window.lifeNode=master.nodes.find(n=>n.id==='SEIKATSU_G2_TOWN_TOMATO');
   modal.open(master.nodes.find(n=>n.id==='KOKUGO_G2_RADICAL_160'));
   await new Promise(resolve=>setTimeout(resolve,2100));
   interceptor.destroy();
   return {themes,type:modal.currentGame.constructor.name,count:modal.currentGame.puzzles?.length,deadlocks};
  });
  assert.match(result.themes[0],/garden-decoration/);assert.match(result.themes[1],/festival-decoration/);
  assert.equal(result.type,'RadicalBuilderGame');assert.equal(result.count,10);checks+=4;
  assert.equal(result.deadlocks,0,'a completed stage click must not report a UI deadlock');checks++;
  await page.locator('dialog .pt-start').click();
  const effects=await page.evaluate(()=>{
   eco.purchaseItem('item_challenge_ticket');eco.purchaseItem('item_hint_radar');
   const g=modal.currentGame;g.qIndex=g.puzzles.findIndex(p=>p.options.length===6);g.setupPuzzle();
   const before=modal.stageDeadline;const extended=modal.useTimeExtensionItem();
   const hinted=modal.useHintRadarItem();
   const canvas=modal.currentGame.canvas;const w=canvas.clientWidth;
   return {extended,delta:modal.stageDeadline-before,tickets:eco.getItemQuantity('item_challenge_ticket'),hinted,hints:eco.getItemQuantity('item_hint_radar'),highlight:modal.currentGame.palette.some(p=>p.highlight),cards:modal.currentGame.palette.map(p=>({x:p.x,size:p.size})),w};
  });
  assert.equal(effects.extended,true);assert.equal(effects.delta,30000);assert.equal(effects.tickets,2);
  assert.equal(effects.hinted,true);assert.equal(effects.hints,0);assert.equal(effects.highlight,true);checks+=6;
  await page.evaluate(()=>document.querySelector('#map').style.visibility='hidden');
  await page.locator('#game-canvas').screenshot({path:path.join(artifacts,`${viewport.width}-radical.png`)});
  await page.evaluate(()=>document.querySelector('#map').style.visibility='visible');
  await page.evaluate(()=>modal.close());
  await page.evaluate(async()=>{
   const master=await fetch('/data/subjects_curriculum.json').then(r=>r.json());
   const node=master.nodes.find(n=>n.id==='KOKUGO_G2_RADICAL_160');
   window.kanjiNode={...node,gameData:{...node.gameData,selectedMode:'KANJI_READING'}};
   modal.open(window.kanjiNode,1);
  });
  await page.locator('dialog .pt-start').click();
  await page.waitForFunction(()=>modal.currentGame.currentKanji);
  const reading=await page.evaluate(async()=>{
   const db=await fetch('/data/kanji_1026.json').then(r=>r.json());
   const allowed=new Map(db.grades['2'].kanjiList.map(k=>[k.k,k.r]));
   const game=modal.currentGame,titles=[];
   const original=game.ctx.fillText.bind(game.ctx);
   game.ctx.fillText=(text,...args)=>{if(String(text).startsWith('【'))titles.push(text);original(text,...args);};
   for(let i=0;i<game.questions.length;i++){
    game.qIndex=i;game.spawnQuestion();cancelAnimationFrame(game.frameId);game.loop();
   }
   return {count:game.questions.length,unique:new Set(game.questions.map(q=>q.kanji)).size,
    valid:game.questions.every(q=>allowed.get(q.kanji)===q.correct&&new Set(q.options).size===4&&q.options.includes(q.correct)),titles};
  });
  assert.equal(reading.count,10);assert.equal(reading.unique,10);assert.equal(reading.valid,true);
  assert.equal(reading.titles.length,10);assert.ok(reading.titles.every(t=>/^【\s*\S+\s*】/.test(t)));checks+=5;
  await page.locator('#game-canvas').screenshot({path:path.join(artifacts,`${viewport.width}-kanji-reading.png`)});
  await page.evaluate(()=>modal.close());
  await page.evaluate(()=>modal.open(window.lifeNode));
  await page.locator('dialog .pt-start').click();
  const lifeLayout=await page.evaluate(()=>{
   const game=modal.currentGame,layout=game.getOptionLayout();
   const canvas=game.canvas,stage=document.getElementById('game-stage');
   return {columns:layout.columns,rects:game.questions[0].options.map((_,index)=>game.getOptionRect(layout,index)),canvas:{w:canvas.clientWidth,h:canvas.clientHeight,logicalW:Number(canvas.dataset.logicalWidth),logicalH:Number(canvas.dataset.logicalHeight),stageH:stage.clientHeight}};
  });
  if(viewport.width<=390){
    assert.equal(lifeLayout.columns,2);
   assert.ok(lifeLayout.canvas.h>=300&&lifeLayout.canvas.logicalH>=300,'mobile life stage must retain room for both answer rows');
   for(let i=0;i<lifeLayout.rects.length;i++)for(let j=i+1;j<lifeLayout.rects.length;j++){
    const a=lifeLayout.rects[i],b=lifeLayout.rects[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
   }
   checks+=7;
  }
  await page.locator('#game-canvas').screenshot({path:path.join(artifacts,`${viewport.width}-life.png`)});
  await page.evaluate(()=>modal.close());
  await page.locator('#map').screenshot({path:path.join(artifacts,`${viewport.width}-garden.png`)});
  await page.evaluate(()=>{eco.equipItem('skin_cyber_neon');engine.setBackgroundTheme(eco.getEquippedItem('SKIN').id)});
  await page.locator('#map').screenshot({path:path.join(artifacts,`${viewport.width}-festival.png`)});
  for(const locale of ['zh','ja','en']){
   await page.goto(`${origin}/world.html?country=CN&locale=${locale}`);
   if(await page.locator('[data-consent="necessary"]').isVisible())await page.locator('[data-consent="necessary"]').click();
   await page.locator('[data-action="play:order"]').click();
   await page.locator('dialog .pt-start').click();
   await page.locator('.order-row').waitFor();
   assert.deepEqual(await page.locator('.order-end').allTextContents(),locale==='zh'?['前','后']:locale==='ja'?['まえ','うしろ']:['Front','Back']);
   if(locale==='zh')assert.match(await page.locator('.logic-clues').innerText(),/在 .* 前面/);
   if(locale==='ja')assert.match(await page.locator('.logic-clues').innerText(),/は .* より まえ/);
   checks++;
   await page.locator('.order-direction').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(artifacts,`${viewport.width}-order-${locale}.png`)});
  }
  await page.close();
 }
 const landing=await browser.newPage({viewport:{width:390,height:844}}),landingErrors=[];landing.on('pageerror',error=>landingErrors.push(error.message));
 await landing.goto(`${origin}/`);await landing.locator('#country-home-play-now').waitFor();
 assert.equal(await landing.locator('#country-canvas').count(),0,'the public route starts on the About page');
 await landing.locator('#country-home-play-now').click();await landing.locator('#country-canvas').waitFor();
 assert.deepEqual(landingErrors,[]);checks+=3;await landing.close();
 const shopPage=await browser.newPage({viewport:{width:1280,height:800}});
 await shopPage.goto(`${origin}/__fixture`);
 await shopPage.evaluate(async()=>{const {EconomyManager}=await import('/EconomySystem.js');const e=new EconomyManager();e.starCoins=5000;e.saveState();});
 await shopPage.goto(`${origin}/?course=jp`);
 await shopPage.waitForFunction(()=>typeof window.buyItem==='function');
 await shopPage.evaluate(()=>document.querySelector('[data-shop-item="skin_nebula_aurora"]').click());
 assert.equal(await shopPage.locator('.cartoon-map-world').getAttribute('data-theme'),'skin_nebula_aurora');
 assert.match(await shopPage.locator('#shop-action-notice').innerText(),/すぐに使った/);checks+=2;
 await shopPage.reload();await shopPage.waitForFunction(()=>typeof window.buyItem==='function');
 assert.equal(await shopPage.locator('.cartoon-map-world').getAttribute('data-theme'),'skin_nebula_aurora');checks++;
 await shopPage.evaluate(()=>document.querySelector('[data-shop-item="skin_cyber_neon"]').click());
 assert.equal(await shopPage.locator('.cartoon-map-world').getAttribute('data-theme'),'skin_cyber_neon');checks++;
 await shopPage.evaluate(()=>document.querySelector('[data-shop-item="skin_nebula_aurora"]').click());
 assert.equal(await shopPage.locator('.cartoon-map-world').getAttribute('data-theme'),'skin_nebula_aurora');checks++;
 await shopPage.close();
 console.log(`${checks} browser feedback checks passed.`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
