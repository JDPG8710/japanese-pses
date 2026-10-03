import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startTownOnlinePreview} from '../scripts/preview-town-online.mjs';
const preview=await startTownOnlinePreview(0,{built:process.env.TOWN_TEST_BUILT==='1'}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[];await mkdir('.wrangler/town-online',{recursive:true});
try{
 const hostContext=await browser.newContext({viewport:{width:1440,height:1000}}),guestContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await guestContext.addInitScript(()=>{const Native=window.WebSocket;window.testTransports=[];window.WebSocket=class extends Native{constructor(...args){super(...args);window.testTransports.push(this);}};});
 const host=await hostContext.newPage(),guest=await guestContext.newPage();
 async function open(p,url){p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('[data-action="begin"]').click();try{await p.locator('[data-consent="necessary"]').click({timeout:3000});}catch{}await p.locator('#town-canvas[data-renderer]').waitFor();await p.locator('.town-online summary').click();}
 await open(host,preview.origin+'/town.html?locale=zh');await host.locator('[data-online="create"]').click();await host.locator('.town-online[data-status="online"]').waitFor();const link=await host.locator('[data-invitation]').inputValue();
 await open(guest,preview.origin+'/town.html?locale=zh');await guest.locator('[data-room-code]').fill(link);await guest.locator('[data-online="join"]').click();await guest.locator('.town-online[data-status="online"][data-peers="1"]').waitFor();await host.locator('#town-canvas[data-online-players="1"]').waitFor();
 const received=[];guest.on('websocket',ws=>ws.on('framereceived',e=>{try{received.push(JSON.parse(e.payload));}catch{}}));
 // Also observe the existing websocket without adding a production test hook.
 const cdp=await guestContext.newCDPSession(guest);await cdp.send('Network.enable');cdp.on('Network.webSocketFrameReceived',e=>{try{received.push(JSON.parse(e.response.payloadData));}catch{}});
 await host.locator('#town-canvas').focus();await host.keyboard.down('s');await host.waitForTimeout(500);await host.keyboard.up('s');await guest.waitForTimeout(350);
 assert.ok(received.some(m=>m.type==='peer'&&m.peer.z<6),'remote browser sees actual keyboard motion');
 await host.locator('[data-emote="laugh"]').click();await guest.waitForTimeout(350);assert.ok(received.some(m=>m.type==='peer'&&m.peer.emote==='laugh'));
 await host.locator('[data-vehicle="select"]').selectOption('car');await guest.waitForTimeout(350);assert.ok(received.some(m=>m.type==='peer'&&m.peer.vehicle==='car'),'vehicle change is visible remotely');
 await host.screenshot({path:'.wrangler/town-online/two-players-desktop.png',fullPage:true});await guest.screenshot({path:'.wrangler/town-online/two-players-mobile.png',fullPage:true});
 await host.locator('[data-challenge-game]').selectOption('bubble');await host.locator('[data-online="invite"]').click();await guest.locator('[data-online="accept"]').waitFor();await guest.locator('[data-online="accept"]').click();
 await host.locator('.kids-message').waitFor();await guest.locator('.kids-message').waitFor();assert.equal(await host.locator('.kids-message').innerText(),await guest.locator('.kids-message').innerText(),'both clients receive the same seeded challenge');
 await host.locator('.arcade-hud [data-shell="back"]').click();await guest.locator('.arcade-hud [data-shell="back"]').click();
 // Chromium keeps established WebSockets alive when HTTP is marked offline.
 // Break the real transport explicitly, then deny HTTP while the client retries.
 await guest.evaluate(()=>testTransports.at(-1).close(4000,'Test transport interruption'));await guestContext.setOffline(true);await host.locator('#town-canvas[data-online-players="0"]').waitFor({timeout:20000});await guestContext.setOffline(false);await guest.locator('.town-online[data-status="online"]').waitFor({timeout:20000});await host.locator('#town-canvas[data-online-players="1"]').waitFor();
 await guest.locator('[data-online="leave"]').click();await host.locator('#town-canvas[data-online-players="0"]').waitFor();assert.deepEqual(errors,[]);assert.ok(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Town online browser: two isolated browsers, movement, vehicles, emotes, shared challenge, disconnect/reconnect and leave passed');
}finally{await browser.close();await preview.close();}
