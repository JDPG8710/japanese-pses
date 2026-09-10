import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const source=await readFile(new URL('../src/privacy/ConsentManager.mjs',import.meta.url));
const server=createServer((req,res)=>{
 if(req.url==='/consent.mjs'){res.setHeader('content-type','text/javascript');res.end(source);return;}
 res.setHeader('content-type','text/html');
 res.end('<html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><button data-piko-privacy-settings>変更</button><script type="module" src="/consent.mjs"></script></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [390,1280])for(const choice of ['necessary','ads']){
  const page=await browser.newPage({viewport:{width,height:844}});
  // Hold the location lookup: choosing must dismiss immediately, even offline.
  await page.route('**/api/location',()=>{});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('.piko-consent:visible').waitFor();
  await page.locator(`[data-consent="${choice}"]`).click();
  assert.equal(await page.locator('.piko-consent').isVisible(),false);
  assert.equal(await page.locator('[data-consent-settings]').isVisible(),false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('piko-privacy-choice-v1')).optionalAds),choice==='ads');
  await page.reload();await page.locator('[data-piko-consent-root]').waitFor({state:'attached'});
  assert.equal(await page.locator('.piko-consent').isVisible(),false);
  assert.equal(await page.locator('[data-consent-settings]').isVisible(),false);
  await page.locator('[data-piko-privacy-settings]').click();
  assert.equal(await page.locator('.piko-consent').isVisible(),true);
  await page.locator('[data-consent="necessary"]').click();
  assert.equal(await page.locator('.piko-consent').isVisible(),false);
  await page.close();
 }
 console.log('Privacy browser checks passed: both choices dismiss immediately, saved visits hide both controls, privacy-page changes remain available (mobile/desktop).');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
