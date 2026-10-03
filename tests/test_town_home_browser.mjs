import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startContentPreview} from '../scripts/preview-content.mjs';
const preview=process.env.BASE_URL?{origin:process.env.BASE_URL,close:async()=>{}}:await startContentPreview();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});await mkdir('.wrangler/town-home',{recursive:true});
try{
 for(const width of [320,390,1440])for(const locale of ['zh','en','ja']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/?locale='+locale);const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
  const entry=page.locator('#home-town-entry');await entry.waitFor();await page.waitForFunction(locale=>document.querySelector('#home-town-entry').getAttribute('href')==='/town?locale='+locale,locale);
  assert.equal(await page.locator('#country-select').count(),0);const rect=await entry.boundingBox();assert.ok(rect.y+rect.height<=900,'primary town entrance is on the first screen');assert.equal(await entry.evaluate(el=>el===document.querySelector('.about-play-actions').firstElementChild),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(locale==='zh')await page.screenshot({path:'.wrangler/town-home/root-'+width+'.png'});
  await entry.click();await page.locator('#town-canvas[data-renderer="webgl-3d"]').waitFor();assert.equal(await page.locator('#locale').inputValue(),locale);assert.equal(await page.locator('#world-link').getAttribute('href'),'/?locale='+locale);assert.equal(await page.locator('.town-header .brand').getAttribute('href'),'/');assert.deepEqual(errors,[]);await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
 for(const locale of ['en','zh','ja']){await page.goto(preview.origin+'/'+locale+'/');const entry=page.locator('#home-town-entry');assert.equal(await entry.getAttribute('href'),'/town?locale='+locale);assert.equal(await page.locator('.nav-play').getAttribute('href'),'/town?locale='+locale);assert.equal(await entry.evaluate(el=>el===document.querySelector('.hero .actions').firstElementChild),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await entry.click();assert.equal(new URL(page.url()).pathname,'/town');}
 await page.close();
 const picker=await browser.newPage();await picker.goto(preview.origin+'/?choose-country=1');await picker.locator('#country-select').selectOption('CN');assert.equal(await picker.locator('#country-town').getAttribute('href'),'/town?locale=zh&country=CN');assert.match(await picker.locator('#country-start').getAttribute('href'),/grades/);await picker.locator('#country-select').selectOption('JP');assert.match(await picker.locator('#country-town').getAttribute('href'),/locale=ja/);assert.equal(await picker.locator('#country-start').getAttribute('href'),'?course=jp');await picker.close();
 console.log('Town homepage: first-screen entry at 320/390/1440px in three languages, direct town loading, home return, no-JS localized entries and existing country paths passed.');
}finally{await browser.close();await preview.close();}
