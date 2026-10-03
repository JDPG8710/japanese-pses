import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
await mkdir('.wrangler/arcade-repairs',{recursive:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(preview.origin+'/town.html?locale=zh');await page.locator('[data-action="begin"]').click();try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
  await page.evaluate(async()=>{
   const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs'),{createBreakoutGame}=await import('/src/arcade/BreakoutGame.mjs');
   window.shell=openArcadeShell({gameId:'breakout',locale:'zh',onExit(){window.game.destroy();},onRetry(){}});
   window.game=createBreakoutGame({canvas:shell.canvas,difficulty:{level:20},seed:18,onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});
  });
  await page.locator('.arcade-canvas').waitFor();assert.equal(await page.evaluate(()=>game.getState().gl),true);await page.keyboard.press('Enter');
  for(let i=0;i<100;i++){const x=await page.evaluate(()=>game.getState().ballStates[0]?.x||0),r=await page.locator('.arcade-canvas').boundingBox();await page.mouse.move(r.x+(x/10+.5)*r.width,r.y+r.height*.8);await page.waitForTimeout(40);}
  assert.ok(await page.evaluate(()=>game.getState().score>0),'real launched ball must break bricks');
  await page.screenshot({path:`.wrangler/arcade-repairs/bricks-${width}.png`,fullPage:true});await page.evaluate(()=>{game.destroy();shell.destroy();});
  await page.evaluate(async()=>{
   const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs'),{createFruitSlashGame}=await import('/src/arcade/FruitSlashGame.mjs');
   window.shell=openArcadeShell({gameId:'fruit',locale:'zh',onExit(){game.destroy();},onRetry(){}});window.game=createFruitSlashGame({canvas:shell.canvas,seed:34,difficulty:{level:20},onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});
  });
  let cuts=0;const until=Date.now()+9000;
  while(Date.now()<until&&cuts<5){
   const target=await page.evaluate(()=>{const s=game.getState(),i=s.items.find(a=>!a.bomb&&a.y>-.6&&a.y<2&&!s.items.some(b=>b.bomb&&Math.hypot(b.x-a.x,b.y-a.y)<a.radius+b.radius+.5));return i?{point:game.projectToScreen(i),score:s.score}:null;});
   if(!target){await page.waitForTimeout(40);continue;}
   await page.mouse.move(target.point.x-10,target.point.y);await page.mouse.down();await page.mouse.move(target.point.x+10,target.point.y,{steps:2});await page.mouse.up();if(await page.evaluate(()=>game.getState().score)>target.score)cuts++;
  }
  assert.ok(cuts>=3,'real screen swipes must cut textured fruit');await page.screenshot({path:`.wrangler/arcade-repairs/fruit-${width}.png`,fullPage:true});
  await page.evaluate(()=>game.tick(game.getState().remainingTime));await page.locator('[data-overlay][data-outcome="retry"]').waitFor();assert.match(await page.locator('[data-overlay]').innerText(),/0s/);await page.evaluate(()=>{game.destroy();shell.destroy();});
  // Inspect every production model together in the actual WebGL renderer.
  const assets=await page.evaluate(async()=>{
   const {createArcadeRenderer,THREE,disposeArcade3D}=await import('/src/arcade/Arcade3D.mjs'),{createFruitVisuals,FRUIT_TYPES,FRUIT_BOMBS}=await import('/src/arcade/FruitVisuals.mjs');
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=600;canvas.style='width:100%;max-width:1000px;height:auto;background:#f7edd9';document.querySelector('.town-main').prepend(canvas);window.gallery=createArcadeRenderer(canvas,{clear:0xfff0d7});const v=createFruitVisuals();
   const objects=[...FRUIT_TYPES.map(f=>v.fruit(f.id,.65)),...FRUIT_BOMBS.map(b=>v.bomb(b.id,.6))];objects.forEach((o,i)=>{o.position.set((i%5-2)*1.65,i<5?1.2:-1.2,0);gallery.scene.add(o);});gallery.camera.position.set(0,0,10);gallery.camera.lookAt(0,0,0);gallery.camera.aspect=2;gallery.camera.updateProjectionMatrix();gallery.renderer.setSize(1200,600,false);gallery.renderer.render(gallery.scene,gallery.camera);
   const maps=new Set();gallery.scene.traverse(o=>{if(o.material?.map)maps.add(o.material.map);});return{models:objects.length,maps:maps.size,sizes:[...maps].map(m=>[m.image.width,m.image.height])};
  });
  assert.equal(assets.models,10);assert.ok(assets.maps>=6);assert.ok(assets.sizes.every(([w,h])=>w>=512&&h>=256));await page.screenshot({path:`.wrangler/arcade-repairs/models-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(`Arcade repairs ${width}px: real brick hits, fruit swipes, timed result and six textured fruit / four bomb models passed`);await context.close();
 }
}finally{await browser.close();await preview.close();}
