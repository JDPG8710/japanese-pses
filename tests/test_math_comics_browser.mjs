import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd();
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({authenticated:false,country:'CN',entries:[],counts:{}}));return;}
 if(url.pathname==='/fixture'){res.writeHead(200,{'content-type':'text/html'});res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><button id="open">Open</button>');return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error();
 const content=await readFile(file);res.writeHead(200,{'content-type':({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.png':'image/png','.css':'text/css'})[path.extname(file)]||'text/plain'});res.end(content);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
await mkdir('.wrangler/comic-qa',{recursive:true});
try{
 for(const width of [1280,375,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/fixture');
  for(const id of ['fractions','measure','area','volume','percent','ratio']){
   await page.locator('#open').focus();
   await page.evaluate(async id=>{window.comics=await import('/src/comics/MathComic.mjs');window.comics.openMathComic(id,'zh');},id);
   const d=page.locator('dialog');await d.waitFor({state:'visible'});
   for(const lang of ['en','ja','zh']){await d.locator('select').selectOption(lang);assert.equal(await d.getAttribute('lang'),lang);}
   assert.ok(await page.evaluate(()=>{const d=[...document.querySelectorAll('div')].map(x=>x.shadowRoot?.querySelector('dialog')).find(Boolean);return d.scrollWidth<=d.clientWidth+1&&d.getBoundingClientRect().width<=innerWidth;}));
   if(id==='area')await page.screenshot({path:`.wrangler/comic-qa/area-${width}.png`,fullPage:true});
   for(let i=0;i<3;i++)await d.locator('[data-action=next]').click();
   const answer=await page.evaluate(id=>window.comics.COMICS[id].answer,id);
   await d.locator(`[data-choice="${(answer+1)%3}"]`).click();assert.match(await d.locator('[role=status]').textContent(),/再看/);
   await d.locator(`[data-choice="${answer}"]`).click();assert.match(await d.locator('[role=status]').textContent(),/对了/);
   await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'open');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 const page=await browser.newPage();await page.goto(origin+'/fixture');
 const link=await page.evaluate(async()=>{
  const {journeyFor,journeyProgressKey,gateUrl}=await import('/src/world/GradeJourney.mjs');
  const gates=journeyFor('CN63','Y4');
  for(const g of gates)localStorage.setItem(journeyProgressKey('CN63','Y4',g.id),'800');
  const g=gates.find(x=>x.kind==='lesson'&&x.lesson==='area');
  return g?gateUrl(g,{profile:'CN63',year:'Y4',country:'CN',locale:'zh'}):null;
 });
 assert.ok(link,'area gate exists');await page.goto(new URL(link,origin).href);
 await page.locator('[data-action=comic]').click();await page.locator('dialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#quest-clock').count(),0);
 await page.locator('dialog [data-action=close]').click();assert.ok(await page.locator('[data-action=start]').isVisible());
 await page.goto(origin+'/fixture');
 await page.evaluate(async()=>{
  const {GalaxyEngine}=await import('/GalaxyEngine.js');const map=document.createElement('div');document.body.append(map);
  const engine=new GalaxyEngine(map);window.comicEngine=engine;
  document.body.append(engine.createUnitRoute({id:'MATH_G5_RATIO',subject:'算数',grade:5,name:'5年 割合',prerequisites:[],gameData:{stages:2}}));
 });
 assert.equal(await page.locator('.math-comic-entry').count(),2);
 await page.locator('.math-comic-entry').first().click();assert.equal(await page.locator('dialog').getAttribute('lang'),'ja');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>Object.keys(window.comicEngine.playerMastery).length),0);
 await page.close();console.log('PASS: 18 mobile/desktop comic flows, three languages, retries, focus, and Chinese/Japanese lesson entries');
}finally{await browser.close();await new Promise(r=>server.close(r));}
