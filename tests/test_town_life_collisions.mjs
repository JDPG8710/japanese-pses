import assert from 'node:assert/strict';
import {THREE, makeAvatar} from '../src/town/Models3D.mjs';
import {TOWN_BODY, resolveTownMotion, spawnTownLife} from '../src/town/TownLife.mjs';

const npc = {id: 'guide', x: 0, y: 0, z: 0, radius: .73, height: 2.7};
const point = (x, y = 0, z = 0) => ({x, y, z});
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
let assertions = 0;
function check(condition, message) {assert.ok(condition,message);assertions++;}
for (const kind of ['foot','car','plane']) {
  const hit = resolveTownMotion(point(-40), point(40), [npc], kind);
  check(hit.position.x < 0, `${kind}: a full-map sweep must not tunnel through NPC`);
  check(distance(hit.position,npc) >= TOWN_BODY[kind].radius+npc.radius, `${kind}: final solids do not overlap`);
  check(hit.contacts.length === 1, `${kind}: one NPC produces one contact per update`);
  let previous = point(-8);
  for (let i=0;i<400;i++) {
    const result = resolveTownMotion(previous, {...previous,x:previous.x+.4},[npc],kind);
    check(result.position.x < 0 && distance(result.position,npc) >= TOWN_BODY[kind].radius+npc.radius, `${kind}: sustained input never disables collision`);
    previous = result.position;
  }
}
const airborne=resolveTownMotion(point(-30,4),point(30,4),[npc],'plane');
check(Math.abs(airborne.position.x - 30) < .00001 && !airborne.contacts.length,'airborne plane clears NPC height');
const landing=resolveTownMotion(point(0,5),point(0,0),[npc],'plane');
check(distance(landing.position,npc)>=TOWN_BODY.plane.radius+npc.radius,'descending plane separates from occupied ground');
const sideways=resolveTownMotion(point(-3,0,-2),point(3,0,2),[npc],'foot');
check(distance(sideways.position,npc)>=TOWN_BODY.foot.radius+npc.radius,'diagonal motion slides without overlap');
const initial=resolveTownMotion(point(0),point(0),[npc]);
check(Number.isFinite(initial.position.x)&&distance(initial.position,npc)>=TOWN_BODY.foot.radius+npc.radius,'coincident spawn separates deterministically');
check(resolveTownMotion(point(-4),point(NaN),[npc]).position.x===-4,'invalid desired position cannot corrupt player');
check(resolveTownMotion(point(-4),point(1000),[npc]).position.x===-4,'corrupt enormous displacement is rejected');
const constrained=resolveTownMotion(point(-4),point(4),[npc],'foot',(x,z)=>x<=-2);
check(constrained.position.x<=-2,'collision cannot push player through static world boundaries');

const environment=new THREE.Group(),guide=makeAvatar('frog');guide.position.set(70,0,70);environment.add(guide);
const life=spawnTownLife(environment,{npcs:[guide]});
check(life.wandererCount===6&&life.animalCount===6&&life.stationary.length===1,'task NPCs join existing townsfolk and animals');
const start=point(66,0,70), end=point(74,0,70);
const contact=life.update(1/60,{previous:start,player:end,vehicle:'foot'});
check(contact.position.x<70&&contact.collisionCount===1,'task NPC physically blocks walking');
const body=life.stationary[0];
check(body.stars.visible&&body.reaction>0,'collision displays a harmless star reaction');
const time=life.time, pose=guide.position.clone(),reaction=body.reaction;
life.update(1,{player:contact.position,paused:true});
check(life.time===time&&guide.position.equals(pose)&&body.reaction===reaction,'pause freezes physics and reaction animation');
life.update(1,{player:contact.position,active:false});
check(life.time===time,'inactive town does not animate');
life.update(NaN,{player:contact.position});
check(life.time===time,'nonfinite timestep is ignored');
life.update(30,{player:point(60,0,70)});
check(life.time-time<=.0400001,'late frame time is capped');
check(guide.position.x>70,'NPC bounces away from the arriving player');
let player=contact.position;
for(let i=0;i<20;i++) {
  const result=life.update(1/60,{previous:player,player:{...player,x:player.x+.4}});
  check(distance(result.position,guide.position)>=TOWN_BODY.foot.radius+.73-.001,'reaction cooldown never permits player penetration');
  player=result.position;
}
check(life.collisionCount===1,'continuous contact does not replay stars every frame');
for(let i=0;i<160;i++)life.update(1/60,{player:point(55,0,70)});
check(!body.stars.visible&&body.reaction===0,'reaction stars retire after completion');
check(Math.abs(guide.position.x-70)<.05,'task NPC returns to its interaction anchor');
life.update(1/60,{previous:start,player:end,reducedMotion:true});
check(guide.position.y===0&&guide.rotation.y===body.yaw&&guide.rotation.z===0,'reduced motion suppresses hop, spin and wobble');

const gridPath=Array.from({length:18},(_,i)=>({x:67.2+i*.4,z:70}));
const detour=life.navigationDetour(point(66,0,70),gridPath);
check(detour?.length>0,'click navigation finds a route around solid task NPC');
let last=point(66,0,70);
for(const next of detour){
  const n=Math.ceil(Math.hypot(next.x-last.x,next.z-last.z)/.06);
  for(let i=1;i<=n;i++)check(Math.hypot(last.x+(next.x-last.x)*i/n-guide.position.x,last.z+(next.z-last.z)*i/n-guide.position.z)>=TOWN_BODY.foot.radius+.73-.0001,'every detour segment clears the NPC body');
  last=next;
}
check(detour.at(-1).x===gridPath.at(-1).x&&detour.at(-1).z===gridPath.at(-1).z,'detour rejoins and preserves the requested destination');

let disposed=0;body.stars.children[0].children[0].geometry.addEventListener('dispose',()=>disposed++);
life.dispose();life.dispose();
check(disposed===1,'effect GPU resources are released exactly once');
check(environment.children.length===1&&environment.children[0]===guide,'cleanup leaves externally-owned task character for scene disposal');
check(life.update(1/60,{player:point(4)}).contacts.length===0,'disposed controller cannot create effects');
console.log(`Town life collisions: ${assertions} assertions passed.`);


if (process.argv.includes('--browser')) {
  const {chromium}=await import('playwright-core');
  const {mkdir}=await import('node:fs/promises');
  const {startTownPreview}=await import('../scripts/preview-town.mjs');
  const {newState,SAVE_KEY}=await import('../src/town/TownRules.mjs');
  const preview=await startTownPreview(0);
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  await mkdir('.wrangler/town-life-collisions',{recursive:true});
  try {
    for (const [vehicle,width] of [['foot',1440],['car',1440],['plane',1440],['foot',390]]) {
      const state=newState();state.started=true;state.player={x:550,y:405};state.expansion.vehicle=vehicle;
      const context=await browser.newContext({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390});
      await context.addInitScript(({state,key})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('world-locale','zh');},{state,key:SAVE_KEY});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(preview.origin+'/town.html?locale=zh');
      const consent=page.locator('[data-consent="necessary"]');try{await consent.waitFor({timeout:3000});await consent.click();}catch{}
      const canvas=page.locator('#town-canvas[data-renderer="webgl-3d"]');await canvas.waitFor();await canvas.focus();
      const before=Number(await canvas.getAttribute('data-bumps')||0);
      await page.keyboard.down('w');
      await page.waitForFunction(before=>Number(document.querySelector('#town-canvas').dataset.bumps)>before,before,{timeout:20000});
      await page.keyboard.up('w');
      const position=(await canvas.getAttribute('data-position')).split(',').map(Number);
      assert.ok(position[2]<8,`${vehicle} remains on the approach side of guide`);
      assert.equal(position[1],0,`${vehicle} contact remains on ground`);
      await canvas.screenshot({path:`.wrangler/town-life-collisions/${vehicle}-${width}.png`});
      assert.deepEqual(errors,[],`${vehicle}: browser runtime errors`);
      await context.close();console.log(`Town life browser: ${vehicle} ${width}px contact and star animation passed.`);
    }
  }finally{await browser.close();await preview.close();}
}
