import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd();let writes=0;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/site-visits'){if(req.method==='POST')writes++;res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({total:12005,countries:[{country:'CN',count:12000},{country:'JP',count:3},{country:'US',count:1},{country:'XX',count:1}]}));return;}
 if(url.pathname.startsWith('/api/')){res.writeHead(url.pathname.includes('session')?401:200,{'content-type':'application/json'});res.end(JSON.stringify({authenticated:false,country:'CN',counts:{}}));return;}
 if(url.pathname==='/home-fixture'){res.writeHead(200,{'content-type':'text/html'});res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/location/home.css"></head><body class="country-entry"><div id="country-home"></div><script type="module">import {showCountryHome} from "/src/location/CountryHome.mjs";void showCountryHome();</script></body></html>');return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();const data=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const channel=process.env.BROWSER_CHANNEL||'chrome',browser=await chromium.launch({channel,headless:true});
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/home-fixture','/world.html?country=CN&locale=zh']){
   const before=writes;await page.goto(origin+route);await page.waitForFunction(()=>document.querySelector('.visits-total')?.textContent==='12K');
   assert.equal(writes,before+1);assert.equal(await page.locator('.visits-preview .visits-chip').count(),3);
   await page.locator('.site-visits summary').click();
   const names=await page.locator('.visits-countries li').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));assert.match(names[0],/12,000/);assert.match(names[1],/3/);
   await page.waitForFunction(()=>[...document.querySelectorAll('.visits-flag img')].every(img=>img.complete&&img.naturalWidth>0));
   for(const locale of ['en','ja','zh']){
    await page.evaluate(lang=>document.documentElement.lang=lang,locale);
    await page.waitForFunction(label=>document.querySelector('.visits-title')?.textContent===label,{en:'Site visits',ja:'サイトアクセス',zh:'站点访问'}[locale]);
    assert.equal(writes,before+1,'language and popup changes never add visits');
    const fit=await page.locator('.visits-countries').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,scroll:el.scrollWidth,width:el.clientWidth};});assert.ok(fit.left>=0&&fit.right<=width+1&&fit.scroll<=fit.width+1);
   }
   await mkdir('.wrangler/visit-tests',{recursive:true});await page.screenshot({path:`.wrangler/visit-tests/${channel}-${width}-${route.includes('fixture')?'home':'world'}.png`});
   await page.reload();await page.waitForFunction(()=>document.querySelector('.visits-total')?.textContent==='12K');assert.equal(writes,before+2,'reload is a new page view');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(`${channel}: homepage/world top-right flags, sorting, translations, popup overflow, one count per load and reload passed at 320/390/1280px.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
