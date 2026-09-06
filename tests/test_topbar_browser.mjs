import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd();
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(url.pathname.includes('session')?401:200,{'content-type':'application/json'});res.end(JSON.stringify({authenticated:false,country:'US',counts:{}}));return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();
 const data=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const channel=process.env.BROWSER_CHANNEL||'chrome',browser=await chromium.launch({channel,headless:true});let checks=0;
try{
 for(const width of [320,390,430,768,1024,1440])for(const locale of ['zh','ja','en']){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:width<500?3:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['world.html?country=US', 'learn.html?country=CN&curriculum=CN63&year=Y1&lesson=add20']){
   await page.goto(`http://127.0.0.1:${server.address().port}/${route}&locale=${locale}`);
   await page.waitForFunction(()=>document.querySelector('#sound-toggle')?.textContent!=='🔊 Sound');
   const verify=async()=>{
    const data=await page.locator('.top-actions').evaluate(el=>[...el.querySelectorAll(':scope>a,:scope>button,select')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,line:s.lineHeight,align:s.textAlign,overflow:e.scrollWidth>e.clientWidth+1};}));
    assert.equal(new Set(data.map(x=>x.font)).size,1);assert.equal(new Set(data.map(x=>x.line)).size,1);
    for(const d of data){assert.ok(d.h>=56);assert.equal(d.align,'center');assert.ok(!d.overflow);assert.ok(d.x>=0&&d.x+d.w<=width+1);}
    for(const a of data)for(const b of data)if(Math.abs(a.y-b.y)<1)assert.ok(Math.abs(a.h-b.h)<1,'same row height');
    if(width<=600){assert.ok(Math.abs(data[0].w-data[1].w)<1);assert.ok(Math.abs(data[0].y-data[1].y)<1);}
    checks++;
   };
   await verify();await page.locator('#sound-toggle').click();await verify();
   if(width===390){await mkdir('.wrangler/topbar-tests',{recursive:true});await page.screenshot({path:`.wrangler/topbar-tests/${channel}-${locale}-${route.startsWith('world')?'world':'learn'}.png`});}
   if(route.startsWith('world')){await page.locator('#locale').selectOption(locale==='en'?'zh':'en');await verify();}
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(`${channel}: ${checks} multilingual topbar layout checks passed (320–1440px, sound states and language switching).`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
