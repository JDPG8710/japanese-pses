import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:process.env.TOWN_TEST_BUILT==='1'});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();await page.goto(`${preview.origin}/town?locale=zh`);await page.locator('[data-action="begin"]').tap();try{await page.locator('[data-consent="necessary"]').waitFor({timeout:4000});await page.locator('[data-consent="necessary"]').tap();}catch{}
 await page.locator('[data-game="obby"]').tap();await page.locator('[data-camera="view"]').tap();await page.locator('#town-canvas[data-view="first"]').waitFor();assert.equal(await page.locator('[data-answer-platform]').count(),0);
 const start=await page.locator('#town-canvas').getAttribute('data-position');await page.locator('.world-controls').scrollIntoViewIfNeeded();const up=await page.locator('[data-direction="ArrowUp"]').boundingBox(),jump=await page.locator('[data-camera="jump"]').boundingBox();const session=await context.newCDPSession(page);
 const finger0={id:0,x:up.x+up.width/2,y:up.y+up.height/2},finger1={id:1,x:jump.x+jump.width/2,y:jump.y+jump.height/2};
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger0]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger0,finger1]});
 await page.waitForFunction(()=>Number(document.querySelector('#town-canvas').dataset.position.split(',')[1])>.4);
 assert.notEqual(await page.locator('#town-canvas').getAttribute('data-position'),start);assert.equal(await page.locator('#town-canvas').getAttribute('data-jumps'),'1');await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 console.log('ok - genuine two-finger input moves and jumps in first person; one press starts exactly one jump');
 await page.locator('[data-camera="view"]').tap();await page.locator('#town-canvas[data-view="third"]').waitFor();for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const control=await page.locator('[data-camera="jump"]').boundingBox();assert.ok(control.width>=30);}console.log('ok - touch view switching and 320 / 390 / 820 controls fit without overflow');
}finally{await browser.close();await preview.close();}
