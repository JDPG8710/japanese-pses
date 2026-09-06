import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=process.cwd();
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(url.pathname.includes('session')?401:200,{'content-type':'application/json'});res.end(JSON.stringify({authenticated:false,country:'JP',counts:{}}));return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();
 const data=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const channel=process.env.BROWSER_CHANNEL||'chrome',browser=await chromium.launch({channel,headless:true});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/world.html?country=JP&locale=ja`);
  await page.locator('#grade-entry-link').waitFor();
  assert.match(await page.locator('#grade-entry-link').getAttribute('href'),/course=jp/);
  await page.evaluate(()=>localStorage.setItem('manabi-country-v1',JSON.stringify({country:'JP'})));
  await page.locator('#locale').selectOption('zh');
  await page.reload();assert.equal(await page.locator('#locale').inputValue(),'zh');
  await page.locator('#grade-entry-link').click();
  await page.locator('#school-system').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'zh');assert.equal(await page.locator('#school-system').inputValue(),'CN63');
  await page.locator('#school-system').selectOption('CN54');await page.locator('[data-year="Y2"]').click();
  await page.locator('#free-play').click();await page.locator('[data-action="play:robot"]').waitFor();assert.equal(await page.locator('#locale').inputValue(),'zh');
  assert.equal(await page.locator('.status').count(),0,'free play return context must not be treated as an invalid game route');
  await page.locator('#grade-entry-link').click();await page.locator('#school-system').waitFor();assert.equal(await page.locator('#school-system').inputValue(),'CN54');assert.equal(await page.locator('[data-year="Y2"]').getAttribute('aria-pressed'),'true');
  // 関連する基礎レッスンの戻りリンクでも学制・学年・言語を維持する。
  const lesson=page.locator('a.gate-stage[href*="learn.html"]').first();await lesson.click();await page.locator('[data-action="start"]').waitFor();await page.locator('#grade-back').click();await page.locator('#school-system').waitFor();assert.equal(await page.locator('#school-system').inputValue(),'CN54');assert.equal(await page.locator('html').getAttribute('lang'),'zh');
  // 中文UIでも明示的な米国課程は保持する。
  await page.goto(`${origin}/grades.html?country=US&curriculum=US&year=G2&locale=zh`);await page.locator('#school-system').waitFor();await page.locator('#free-play').click();await page.locator('[data-action="play:robot"]').waitFor();await page.locator('#grade-entry-link').click();await page.locator('#school-system').waitFor();assert.equal(await page.locator('#school-system').inputValue(),'US');assert.equal(await page.locator('html').getAttribute('lang'),'zh');
  // 日本の保存地域・IP情報で英語や明示的な中文を上書きしない。
  await page.goto(`${origin}/world.html?country=JP&locale=en`);await page.locator('[data-action="play:robot"]').waitFor();assert.equal(new URL(await page.locator('#grade-entry-link').getAttribute('href'),origin).pathname,'/grades.html');
  await page.evaluate(()=>localStorage.clear());await page.goto(`${origin}/world.html?locale=zh`);await page.waitForLoadState('networkidle');assert.equal(await page.locator('#locale').inputValue(),'zh');await page.locator('#grade-entry-link').click();await page.locator('#school-system').waitFor();assert.equal(await page.locator('#school-system').inputValue(),'CN63');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(`${channel}: mobile/desktop language switching, JP region mismatch, CN54/US round-trips, lesson return and geolocation precedence passed.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
