import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';

// Always test the deployable build, not an unrelated source checkout.
const preview=process.env.TOWN_TEST_ORIGIN
  ? {origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}
  : await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/town-release',{recursive:true});
try {
  for(const width of [320,390,820,1440]) {
    const context=await browser.newContext({viewport:{width,height:1000}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${preview.origin}/town?locale=zh`);
    await page.locator('[data-action="begin"]').click();
    const consent=page.locator('[data-consent="necessary"]');
    if(await consent.isVisible())await consent.click();
    const canvas=page.locator('#town-canvas[data-renderer="webgl-3d"]');
    await canvas.waitFor();
    assert.equal(await page.locator('.graphics-error').count(),0);
    assert.match(await canvas.evaluate(c=>{
      const gl=c.getContext('webgl2');return gl?.getParameter(gl.VERSION)||'';
    }),/WebGL 2/,'Town must create a real WebGL 2 context; 2D is not a valid release');
    assert.deepEqual((await canvas.getAttribute('data-buildings')).split(',').sort(),
      ['obby','tower','runner','memory','garden','gear','fruit','ninja','breakout','race'].sort());
    await canvas.focus();
    const initial=await canvas.getAttribute('data-position');
    await page.keyboard.down('ArrowRight');
    try {await page.waitForFunction(p=>document.querySelector('#town-canvas').dataset.position!==p,initial);}
    finally {await page.keyboard.up('ArrowRight');}
    await page.locator('[data-camera="view"]').click();
    await page.locator('#town-canvas[data-view="first"]').waitFor();
    await page.reload();
    await page.locator('#town-canvas[data-renderer="webgl-3d"][data-view="first"]').waitFor();
    await page.locator('[data-camera="view"]').click();
    await page.locator('#town-canvas[data-view="third"]').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const bounds=await canvas.boundingBox();
    const buttons=await page.locator('.world-controls button:visible,.town-fs-fab:visible,.town-joystick:visible,.town-ride:visible').all();
    const boxes=[];
    for(const button of buttons){
      const b=await button.boundingBox();
      assert.ok(b.width>=56&&b.height>=56,'touch targets must be at least 56px');
      assert.ok(b.x>=bounds.x&&b.y>=bounds.y&&b.x+b.width<=bounds.x+bounds.width+1&&b.y+b.height<=bounds.y+bounds.height+1,'all controls must stay inside the 3D view');
      for(const a of boxes)assert.ok(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<=1||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<=1,'controls must not overlap');
      boxes.push(b);
    }
    assert.equal(await page.locator('#town-guide-link').getAttribute('href'),'/zh/guides/town-shop');
    await page.screenshot({path:`.wrangler/town-release/${width}.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`Town release ${width}px: real WebGL 2, all 10 venues, movement, saved camera, layout and guide passed.`);
  }
} finally {await browser.close();await preview.close();}
