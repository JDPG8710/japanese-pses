import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-controls',{recursive:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/town?locale=zh');await page.locator('[data-action="begin"]').click();const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
  await page.locator('#town-canvas[data-workers="6"]').waitFor();assert.equal(await page.locator('select.town-ride').count(),0);
  for(const lang of ['en','ja','zh']){
   await page.locator('#locale').selectOption(lang);
   for(const kind of ['car','plane','foot']){
    const button=page.locator('button[data-vehicle="'+kind+'"]');await button.click();await page.locator('#town-canvas[data-vehicle="'+kind+'"]').waitFor();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await button.evaluate(b=>document.activeElement===b),false);
    assert.equal(await page.locator('.town-ride [aria-pressed="true"]').count(),1);assert.ok((await button.getAttribute('aria-label')).length>0);
   }
  }
  const hint=await page.locator('#walk-tip').boundingBox();assert.ok(hint&&hint.height>0);assert.equal(await page.locator('#walk-tip').evaluate(el=>getComputedStyle(el).visibility),'visible');for(const b of await page.locator('.town-ride button').all()){const r=await b.boundingBox();assert.ok(hint.y+hint.height<=r.y||r.y+r.height<=hint.y,'hint and vehicle buttons do not overlap');}
  const rects=await page.locator('.town-ride button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,w:r.width,h:r.height};}));assert.ok(rects.every(r=>r.w>=56&&r.h>=56&&r.x>=0&&r.right<=width));
  const blocked=await page.evaluate(()=>{const root=document.querySelector('.world-card'),canvas=document.querySelector('#town-canvas');const context=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});root.dispatchEvent(context);const selection=new Event('selectstart',{bubbles:true,cancelable:true});root.dispatchEvent(selection);const all=new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true,cancelable:true});canvas.dispatchEvent(all);return {context:context.defaultPrevented,selection:selection.defaultPrevented,all:all.defaultPrevented,css:getComputedStyle(root).userSelect};});assert.deepEqual(blocked,{context:true,selection:true,all:true,css:'none'});
  await page.locator('button[data-vehicle="car"]').click();const before=await page.locator('#town-canvas').getAttribute('data-position');await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');assert.notEqual(await page.locator('#town-canvas').getAttribute('data-position'),before,'movement works immediately after vehicle click');await page.locator('button[data-vehicle="foot"]').click();
  const input=await page.evaluate(()=>{const input=document.createElement('input');input.value='room-code';document.body.append(input);input.focus();const all=new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true,cancelable:true});input.dispatchEvent(all);const select=new Event('selectstart',{bubbles:true,cancelable:true});input.dispatchEvent(select);const result={all:all.defaultPrevented,select:select.defaultPrevented,css:getComputedStyle(input).userSelect};input.remove();return result;});assert.deepEqual(input,{all:false,select:false,css:'text'});
  await page.locator('.world-card').scrollIntoViewIfNeeded();await page.screenshot({path:'.wrangler/town-controls/'+width+'.png'});assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();console.log('Town controls '+width+'px: three locales, vehicle focus/movement, selected buttons, no context/selection/Ctrl+A and editable inputs passed.');
 }
}finally{await browser.close();await preview.close();}
