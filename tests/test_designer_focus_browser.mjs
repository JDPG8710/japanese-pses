import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startRacePreview} from '../scripts/preview-race.mjs';
const preview=await startRacePreview(),browser=await chromium.launch({channel:'chrome',headless:true});
try { for(const width of [320,390,820,1440]) {
 const page=await browser.newPage({viewport:{width,height:844}});
 await page.goto(preview.origin);await page.evaluate(()=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/src/world/world.css';link.onload=resolve;document.head.append(link);}));
 await page.evaluate(async()=>{game.destroy();shell.destroy();const {openArcadeShell}=await import('/src/arcade/ArcadeShell.mjs');const {createBubbleGame}=await import('/src/arcade/BubbleGame.mjs');window.shell=openArcadeShell({gameId:'bubble',locale:'zh'});window.game=createBubbleGame({canvas:shell.canvas,locale:'zh'});});
 const board=page.locator('.designer-board'),focus=page.locator('[data-focus]');
 const original=await board.boundingBox();
 for(let i=0;i<3;i++) {
  await focus.click();await page.waitForTimeout(100);
  const expanded=await board.boundingBox(),studio=await page.locator('.designer-studio').boundingBox();
  assert.ok(expanded.width>studio.width*.85,`focus canvas collapsed at ${width}: ${JSON.stringify(expanded)}`);
  assert.ok(expanded.height>=original.height&&expanded.x>=studio.x&&expanded.x+expanded.width<=studio.x+studio.width+1);
  assert.equal(await page.locator('.designer-library').isVisible(),false);
  await page.locator('[data-tool="brush"]').click();
  await page.mouse.move(expanded.x+expanded.width*.45,expanded.y+expanded.height*.5);await page.mouse.down();await page.mouse.move(expanded.x+expanded.width*.55,expanded.y+expanded.height*.5,{steps:5});await page.mouse.up();
  assert.equal(await page.evaluate(()=>game.getState().strokes),i+1);
  await focus.click();await page.waitForTimeout(100);
  const restored=await board.boundingBox();assert.ok(Math.abs(restored.width-original.width)<1&&Math.abs(restored.height-original.height)<1);
  assert.equal(await page.locator('.designer-library').isVisible(),true);
 }
 await page.close();console.log(`Designer focus ${width}: visible full-width canvas, drawing and repeated restore passed`);
}} finally {await browser.close();await preview.close();}
