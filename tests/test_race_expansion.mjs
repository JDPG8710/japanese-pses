import assert from 'node:assert/strict';
import {createRaceGame,RACE_CARS,RACE_POWERUPS} from '../src/arcade/RaceGame.mjs';
import {getRaceTrack,buildPathMetrics,pointAtProgress} from '../src/arcade/RaceTracks.mjs';
import {makeRaceItemMesh,disposeItem,itemIcon} from '../src/arcade/RaceItems.mjs';
import {segmentDistance,hitRival,advanceRivalStatus,surfaceAt,SURFACE_FACTOR} from '../src/arcade/RaceCombat.mjs';
import {raceExpansion} from '../src/arcade/RaceContent.mjs';
import {readFile} from 'node:fs/promises';
const long=getRaceTrack('grandtour');assert.ok(Math.abs(buildPathMetrics(long.path).total-5000)<.01);assert.equal(long.laps,1);
const dirt=getRaceTrack('offroad'),dm=buildPathMetrics(dirt.path);
assert.ok(dirt.obstacles.length>=6);assert.deepEqual(new Set(dirt.surfaces.map(s=>s.kind)),new Set(['grass','water','mud']));
for(const area of dirt.surfaces){const p=pointAtProgress(dirt.path,dm,area.s);assert.equal(surfaceAt(dirt,dm,{...p,s:area.s},p.x+p.nx*area.lateral,p.z+p.nz*area.lateral),area.kind);assert.ok(SURFACE_FACTOR[area.kind]<1);assert.ok(area.width<dirt.width,'a dry bypass remains');}
assert.equal(segmentDistance(0,0,0,100,0,50),0,'swept projectile catches a target between frames');
for(const kind of ['rocket','banana','splash','oil','pulse']){const rival={speed:40};assert.equal(hitRival(rival,kind),true);assert.ok(rival.speed<40&&rival.slowT>0);if(kind==='rocket'||kind==='pulse')assert.ok(rival.stunT>0&&rival.speed===0);else assert.ok(rival.slipT>0);advanceRivalStatus(rival,10);assert.equal(rival.slowT,0);const shielded={speed:40,shieldT:2};assert.equal(hitRival(shielded,kind),false);assert.equal(shielded.speed,40);assert.equal(shielded.shieldT,0);}
assert.equal(new Set(RACE_CARS.map(c=>c.skill)).size,RACE_CARS.length,'all seven specials are exclusive');
for(const car of RACE_CARS){const game=createRaceGame({carId:car.id,skipLobby:true});assert.equal(game.useSkill(),true);assert.equal(game.getState().skill,car.skill);assert.equal(game.useSkill(),false);game.pause();const paused=game.getState();assert.equal(game.useSkill(),false);game.tick(.2);assert.deepEqual(game.getState(),paused);game.start();assert.equal(game.getState().skillCooldown,0);game.destroy();}
const pulse=createRaceGame({carId:'bumper',skipLobby:true});pulse.useSkill();assert.ok(pulse.getState().rivals.some(ai=>ai.stunT>0),'real headless rival stops after bumper pulse');pulse.destroy();
for(const carId of ['supercar','openwheel']){const game=createRaceGame({carId,trackId:'grandtour',skipLobby:true});collect(game,'boost',{targetSpeed:30});game.useItem();game.useSkill();game.setControls({throttle:1});let max=0;for(let i=0;i<240;i++){game.tick(1/60);max=Math.max(max,game.getState().speed*3.6);}assert.ok(max<=280+.00001);assert.ok(max>250);game.destroy();}
for(const type of RACE_POWERUPS){const model=makeRaceItemMesh(type);assert.equal(model.userData.item,type);assert.ok(model.children.length>=2,'recognisable multi-part shape');disposeItem(model);assert.ok((await readFile('.'+itemIcon(type),'utf8')).includes('<svg'));for(const locale of ['en','zh','ja'])assert.ok(raceExpansion(locale).powerups[type]||['boost','shield','oil','magnet'].includes(type));}
/** Collect items through the normal driving controls, never by granting inventory. */
export function collect(game,type,{limit=10000,targetSpeed=25}={}){
 const state=game.getState(),track=getRaceTrack(state.trackId),metrics=buildPathMetrics(track.path),target=state.pickups.find(p=>p.type===type);
 for(let i=0;i<limit&&!game.getState().ended;i++){
  const s=game.getState();if(s.heldItem===type)return s;
  if(s.heldItem)game.useItem();
  const remain=((target.s-s.progress+1)%1)*metrics.total,p=pointAtProgress(track.path,metrics,s.progress+8/metrics.total),targetP=pointAtProgress(track.path,metrics,target.s);
  const lateral=remain<45?(target.x-targetP.x)*targetP.nx+(target.z-targetP.z)*targetP.nz:0;
  const desired=Math.atan2(p.x+p.nx*lateral-s.x,p.z+p.nz*lateral-s.z),error=Math.atan2(Math.sin(desired-s.heading),Math.cos(desired-s.heading));
  const speed=Math.abs(error)>.5?12:targetSpeed;
  game.setControls({throttle:s.speed<speed?1:0,brake:s.speed>speed+3?1:0,steer:Math.abs(error)>.035?-Math.sign(error):0});game.tick(1/60);
 }
 throw Error('Failed to collect '+type);
}
for(const type of RACE_POWERUPS){const game=createRaceGame({carId:'sports',trackId:'sunrise',skipLobby:true});collect(game,type);game.pause();assert.equal(game.useItem(),false);assert.equal(game.getState().heldItem,type);game.resume();assert.equal(game.useItem(),true);assert.equal(game.getState().heldItem,null);assert.ok(game.getState().usedItems>0);if(type==='boost')assert.ok(game.getState().effects.boost>0);if(type==='shield')assert.ok(game.getState().effects.shield>0);if(type==='magnet')assert.ok(game.getState().effects.magnet>0);if(type==='rocket'||type==='splash')assert.equal(game.getState().projectiles[0].kind,type);if(type==='oil'||type==='banana')assert.equal(game.getState().hazards.at(-1).kind,type);game.destroy();}
for(const [type,pace]of [['rocket',40],['banana',50],['splash',40]]){const game=createRaceGame({carId:'supercar',trackId:'sunrise',skipLobby:true});collect(game,type,{targetSpeed:pace});game.useItem();game.setControls({throttle:1});let hit=false;for(let i=0;i<500&&!game.getState().ended;i++){game.tick(1/60);if(game.getState().rivals.some(r=>r.lastHit===type&&(r.slowT>0||r.stunT>0))){hit=true;break;}}assert.ok(hit,type+' hits a real computer opponent after ordinary driving');game.destroy();}
console.log('Race expansion: 5 km, offroad bypass/terrain, swept hits and shield, seven exclusive specials, 280 km/h cap, seven actual item pickups/use and disposal passed.');
