import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});await mkdir('.wrangler/explorers-tests',{recursive:true});
for(const width of [390,1280])for(const lang of ['en','ja','zh']){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/explorers.html?lang=${lang}`);
await page.locator('.water').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),lang==='zh'?'zh-Hans':lang);
const languageClean=async()=>{if(lang==='en')assert.doesNotMatch(await page.locator('header,.water,.finance,footer').allInnerTexts().then(x=>x.join(' ')),/[\u3400-\u9fff\u3040-\u30ff]/);};await languageClean();
const pipe=n=>page.locator(`g[role=button]`).nth(n-1);
await pipe(1).click();await pipe(2).press('Enter');await pipe(3).press('Space');await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),{en:/3 moves.*3/,ja:/3手.*3手/,zh:/3 步.*3 步/}[lang]);await languageClean();
await page.getByRole('dialog').getByRole('button').click();await page.locator('.water>button').click();await pipe(4).click();assert.match(await page.locator('.water>p[aria-live]').innerText(),/A: 3\/4/);assert.equal(await page.getByRole('dialog').count(),0);
await page.screenshot({path:`.wrangler/explorers-tests/water-${lang}-${width}.png`,fullPage:true});
await page.locator('nav button').nth(1).click();await languageClean();
// All-cash control must retain nominal principal across all ten months.
for(let i=0;i<10;i++)await page.locator('.finance fieldset button').click();assert.match(await page.locator('.result').innerText(),/ROI 0.00%/);assert.ok(await page.locator('.finance fieldset button').isDisabled());await languageClean();
await page.locator('.finance .reset').click();await page.locator('#investment').fill('10000');await page.locator('.finance fieldset button').click();
const saved=await page.locator('.stats strong').allTextContents();await page.locator('#explorers-language').selectOption(lang==='en'?'zh':'en');assert.match(await page.locator('.stats strong').first().innerText(),/1 \/ 10/);await page.locator('#explorers-language').selectOption(lang);assert.deepEqual(await page.locator('.stats strong').allTextContents(),saved);await languageClean();
for(let i=1;i<10;i++)await page.locator('.finance fieldset button').click();assert.match(await page.locator('.result').innerText(),/ROI 4.15%/);
await page.locator('.finance details summary').click();await languageClean();await page.screenshot({path:`.wrangler/explorers-tests/finance-${lang}-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.close();
}console.log('PASS: three languages, desktop/mobile, pipe victory/reset, ten-month cash/compound controls, language switching preserves state, English has no untranslated Chinese, layout and runtime');
}finally{await browser?.close();server.close();}
