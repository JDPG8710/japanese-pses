import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const artifacts='.wrangler/playroom-production';await mkdir(artifacts,{recursive:true});
let checks=0;
try {
  const a=await (await browser.newContext({viewport:{width:1280,height:900}})).newPage();
  const b=await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  for(const [p,name] of [[a,'Playroom QA A'],[b,'Playroom QA B']]) {
    await p.goto('https://piko-game.com/arena.html?lang=zh',{waitUntil:'networkidle'});
    await p.locator('[data-consent=necessary]').click();
    assert.equal(await p.locator('#title').innerText(),'Piko Playroom');checks++;
    await p.locator('#playroom-profile [name=nickname]').fill(name);
    // QA guests remain private. No invitation is sent to a real player.
    assert.equal(await p.locator('#playroom-profile [name=visible]').isChecked(),false);
    await p.locator('#playroom-profile button').click();await p.locator('#playroom-profile').waitFor({state:'hidden'});
    p.on('dialog',d=>d.accept());
  }
  await a.locator('[data-pr=family-create]').click();await a.locator('.family-panel').waitFor();
  const family=(await a.locator('.family-panel .room-code').innerText()).trim();
  await b.locator('#family-join [name=code]').fill(family);await b.locator('#family-join button').click();await b.locator('.family-panel').waitFor();
  await a.locator('.family-panel .member').nth(1).waitFor();checks++;
  await a.locator('[data-pr=family-ready]').click();await b.waitForFunction(()=>[...document.querySelectorAll('.family-panel .member')].some(e=>e.textContent.includes('QA A')&&e.textContent.includes('已准备')));
  await b.locator('[data-pr=family-ready]').click();await a.waitForFunction(()=>[...document.querySelectorAll('.family-panel .member')].every(e=>e.textContent.includes('已准备')));
  await a.locator('[data-pr=family-start]').click();await b.locator('[data-point="40"]').waitFor();
  await a.locator('[data-point="40"]').click();await b.locator('[data-point="40"] .stone.black').waitFor();checks++;
  await a.locator('[data-action=resign]').click();await b.locator('.result').waitFor();
  const first=a.url();await a.reload();await a.locator('[data-action=rematch]').click();await b.getByText('对方想再来一局。',{exact:true}).waitFor();
  await b.locator('[data-action=rematch]').click();await a.waitForURL(u=>u.href!==first);await b.waitForURL(u=>u.href!==first);
  assert.equal(new URL(a.url()).searchParams.get('room'),new URL(b.url()).searchParams.get('room'));checks++;
  await b.locator('[data-point="20"]').click();await a.locator('[data-point="20"] .stone.black').waitFor();checks++;
  await a.locator('[data-action=resign]').click();await b.locator('.result').waitFor();
  for(const p of [a,b]) {await p.locator('[data-action=home]').click();await p.locator('.family-panel').waitFor();}
  await a.screenshot({path:`${artifacts}/family-desktop.png`,fullPage:true});
  await b.locator('#locale').selectOption('ja');await b.locator('[data-pr=learn]').click();await b.locator('[data-learn-point="0"]').click();await b.locator('[data-learn=next]').click();
  assert.match(await b.locator('.learn-panel h2').innerText(),/いき/);checks++;
  await b.screenshot({path:`${artifacts}/tutorial-phone.png`,fullPage:true});
  await b.locator('[data-learn=close]').click();
  for(const p of [b,a]) {await p.locator('[data-pr=family-leave]').click();await p.locator('[data-pr=family-create]').waitFor();}
  assert.deepEqual(errors,[]);checks++;
  console.log(`Production Playroom: ${checks} checks passed. Private QA family, live move, rematch after reload, swapped colors, Japanese tutorial, clean browser console. Both QA guests left the family.`);
}finally{await browser.close();}
