import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startTownPreview} from '../scripts/preview-town.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startTownPreview(0,{built:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('piko-town-strings.mp3'))requests.push(r.url());});
 await page.addInitScript(()=>{
  window.musicSources=[];const native=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const s=native.call(this);const entry={source:s,stopped:false,offset:0};window.musicSources.push(entry);const start=s.start.bind(s),stop=s.stop.bind(s);s.start=(when,offset=0)=>{entry.offset=offset;start(when,offset);};s.stop=(...args)=>{entry.stopped=true;stop(...args);};return s;};
 });
 await page.goto(preview.origin+'/town.html?locale=zh');await page.locator('[data-action="begin"]').click();
 try{await page.locator('[data-consent="necessary"]').click({timeout:2000});}catch{}
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/TownAudio.mjs')).name;window.townMusic=(await import(url)).getTownAudio();townMusic.setMuted(false);window.synth=(await import('/AudioSynthesizer.js')).getAudioSynthesizer();window.analyser=synth.ctx.createAnalyser();synth.bgmGain.connect(analyser);});
 await page.waitForFunction(()=>musicSources.some(e=>e.source.buffer?.duration>70));
 const initial=await page.evaluate(()=>{const e=musicSources.find(e=>e.source.buffer?.duration>70),b=e.source.buffer,a=b.getChannelData(0);let peak=0;for(const x of a)peak=Math.max(peak,Math.abs(x));return{duration:b.duration,channels:b.numberOfChannels,loop:e.source.loop,peak,boundary:Math.abs(a[0]-a.at(-1))};});
 assert.ok(Math.abs(initial.duration-71.111)<.03,'decoded MP3 retains exact musical loop duration');assert.equal(initial.channels,2);assert.equal(initial.loop,true);assert.ok(initial.peak<1&&initial.peak>.1);assert.ok(initial.boundary<.04,'loop boundary must not click');
 await page.waitForTimeout(900);
 async function rms(){return page.evaluate(()=>{const a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((n,v)=>n+v*v,0)/a.length);});}
 assert.ok(await rms()>.002,'real BGM signal must reach the existing BGM gain');
 await page.locator('.town-mute-fab').click();assert.equal(await page.evaluate(()=>townMusic.isMuted()),true);await page.waitForTimeout(160);assert.ok(await rms()<.0001,'mute stops the background signal');
 await page.locator('.town-mute-fab').click();await page.waitForTimeout(450);assert.ok(await rms()>.002,'unmute restores music');
 await page.evaluate(()=>townMusic.pauseBgm());await page.waitForTimeout(180);assert.ok(await rms()<.0001,'pause silences the loop');
 await page.evaluate(()=>townMusic.resumeBgm());await page.waitForTimeout(450);assert.ok(await rms()>.002);assert.ok(await page.evaluate(()=>musicSources.filter(e=>e.source.buffer?.duration>70).at(-1).offset>0),'resume keeps its musical position');
 await page.evaluate(()=>townMusic.enterArcade('race'));await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>musicSources.filter(e=>e.source.buffer?.duration>70).at(-1).source.playbackRate.value),Math.fround(1.12));
 await page.evaluate(()=>townMusic.exitToTown());await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>musicSources.filter(e=>e.source.buffer?.duration>70).at(-1).source.playbackRate.value),1);
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/ArcadeHub.mjs')).name;const {startArcade}=await import(url);startArcade('bubble',{locale:'zh'});});
 await page.locator('.kids-controls').waitFor();await page.waitForTimeout(450);assert.ok(await rms()>.002);
 await page.locator('[data-shell="pause"]').click();await page.waitForTimeout(180);assert.ok(await rms()<.0001,'the actual game pause control pauses the score');
 await page.locator('[data-shell="pause"]').click();await page.waitForTimeout(450);assert.ok(await rms()>.002,'the actual game resume control restores the score');
 await page.locator('.arcade-hud [data-shell="back"]').click();await page.waitForTimeout(450);assert.ok(await rms()>.002,'returning to town restores the town arrangement');
 assert.equal(requests.length,1,'scene changes and mute reuse the decoded asset');
 await page.evaluate(()=>townMusic.destroy());await page.waitForTimeout(180);assert.ok(await rms()<.0001);assert.deepEqual(errors,[]);
 console.log('Town strings: real stereo decode, continuous loop boundary, audible output, mute/unmute, pause/resume position, scene tempo and cleanup passed.');
}finally{await browser.close();await preview.close();}
