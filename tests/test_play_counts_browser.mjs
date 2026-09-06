import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd(),counts={'world:robot':1234,'world:circuit':1234567},events=new Set();let posts=0;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/play-counts'){
  let body;if(req.method==='POST'){let s='';for await(const chunk of req)s+=chunk;body=JSON.parse(s);posts++;if(!events.has(body.eventId)){events.add(body.eventId);counts[body.key]=(counts[body.key]||0)+1;}}
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(body?{key:body.key,count:counts[body.key]}:{counts:Object.fromEntries((url.searchParams.get('keys')||'').split(',').map(k=>[k,counts[k]||0]))}));return;
 }
 if(url.pathname.startsWith('/api/')){res.writeHead(url.pathname.includes('session')?401:200,{'content-type':'application/json'});res.end(JSON.stringify({authenticated:false,country:'US'}));return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();const data=await readFile(file);
 res.writeHead(200,{'content-type':{'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const channel=process.env.BROWSER_CHANNEL||'chrome',browser=await chromium.launch({channel,headless:true});
try{
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:width===390?3:1,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/world.html?country=US&locale=en`);
  await page.waitForFunction(()=>document.querySelector('[data-play-count="world:robot"]')?.textContent.includes('1.2K'));
  assert.match(await page.locator('[data-play-count="world:circuit"]').innerText(),/1.2M/);
  const before=counts['world:robot'],postBefore=posts;
  for(let n=1;n<=2;n++){
   await page.locator('[data-action="play:robot"]').click();await page.locator('dialog[open]').waitFor();await page.locator('dialog .pt-start').click();
   await page.locator('[data-tutorial-help]').click();await page.locator('dialog[open]').waitFor();await page.locator('dialog .pt-start').click();
   await page.locator('[data-action="home"]').click();
   await page.waitForFunction(expected=>document.querySelector('[data-play-count="world:robot"]')?.title===`${expected.toLocaleString('en-US')} plays`,before+n);
  }
  assert.equal(counts['world:robot'],before+2);assert.equal(posts,postBefore+2,'two plays in same session count twice; tutorials never count');
  await page.locator('[data-play-count="world:robot"]').scrollIntoViewIfNeeded();
  await mkdir('.wrangler/count-tests',{recursive:true});await page.screenshot({path:`.wrangler/count-tests/${channel}-${width}.png`});
  assert.ok(await page.locator('[data-play-count="world:robot"]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.reload();await page.waitForFunction(()=>document.querySelector('[data-play-count="world:robot"]')?.textContent.includes('1.2K'));assert.equal(posts,postBefore+2,'home reload does not count');
  await page.goto(`${origin}/grades.html?country=CN&curriculum=CN63&year=Y1&locale=zh`);
  await page.locator('[data-play-count="lesson:add20"]').first().waitFor();
  await page.goto(`${origin}/learn.html?country=CN&curriculum=CN63&year=Y1&lesson=add20&locale=zh`);
  await page.locator('[data-play-count="lesson:add20"]').waitFor();
  await page.locator('[data-action="start"]').click();await page.locator('dialog[open]').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-play-count="lesson:add20"]')?.textContent.includes('次游玩'));
  assert.ok(counts['lesson:add20']>0);assert.deepEqual(errors,[]);await page.close();
 }
 const initial=counts['world:robot'],pages=[];
 for(const [index,locale] of ['zh','ja','en'].entries()){
  const page=await browser.newPage();pages.push(page);
  await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined}));
  await page.goto(`${origin}/world.html?country=US&locale=${locale}`);
  await page.locator('[data-action="play:robot"]').waitFor();
  await page.locator('[data-action="play:robot"]').click();await page.locator('dialog[open]').waitFor();
  await page.locator('dialog .pt-start').click();await page.locator('[data-action="home"]').click();
  await page.waitForFunction(expected=>document.querySelector('[data-play-count="world:robot"]')?.title.startsWith(expected.toLocaleString('en-US')),initial+index+1);
 }
 assert.equal(counts['world:robot'],initial+3,'three independent language sessions share one total');
 await pages[0].evaluate(()=>window.dispatchEvent(new Event('focus')));
 await pages[0].waitForFunction(expected=>document.querySelector('[data-play-count="world:robot"]')?.title.startsWith(expected.toLocaleString('en-US')),initial+3);
 for(const page of pages)await page.close();
 console.log(`${channel}: shared totals across languages/sessions, UUID compatibility, focus refresh, same-session clicks and mobile count layout passed.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
