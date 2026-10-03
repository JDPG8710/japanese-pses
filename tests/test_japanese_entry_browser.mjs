import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd(),dist=path.join(root,'dist');
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});res.end('{"authenticated":false}');return;}
 const base=url.pathname.startsWith('/data/')?root:dist;
 const file=path.resolve(base,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(base+path.sep))throw Error('Invalid path');
 const data=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}`;
await mkdir('.wrangler/japanese-entry',{recursive:true});
try{
 // Cover each HUD layout and its edges: 4x2 grid (≤1023px, incl. tablets),
 // one row without title (1024–1279px) and one row with title (≥1280px).
 for(const width of [320,390,600,641,768,820,1023,1024,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?course=jp');
  const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
  await page.locator('#grade-first-mode-btn').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'ja');
  await page.locator('#grade-first-mode-btn').click();
  await page.locator('.grade-tab-btn[data-grade="1"]').click();
  await page.locator('.map-stage-stop').first().waitFor();
  const boxes=await page.locator('#japanese-hud button,#japanese-hud a').evaluateAll(nodes=>nodes.filter(x=>x.getBoundingClientRect().width).map(x=>{const r=x.getBoundingClientRect();return {id:x.id||x.textContent.trim(),x:r.x,right:r.right,bottom:r.bottom,height:r.height};}));
  assert.ok(boxes.every(r=>r.x>=0&&r.right<=width+1&&r.height>=44),JSON.stringify({width,boxes}));
  const grade=await page.locator('#grade-menu-toggle').boundingBox();
  assert.ok(boxes.every(r=>r.bottom<=grade.y),`HUD overlaps grade menu: ${JSON.stringify({width,grade,boxes})}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  await page.locator('#audio-mute-btn').click();
  await page.screenshot({path:`.wrangler/japanese-entry/${width}-map.png`,fullPage:true});
  await page.locator('#learning-mode-open-btn').click();
  await page.locator('#game-first-mode-btn').click();
  assert.ok(await page.locator('#independent-game-list button').count()>0);
  await page.screenshot({path:`.wrangler/japanese-entry/${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Japanese course: direct language, grade/game entry, reachable HUD, no overlap/overflow at 320–1280px (9 widths) passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
