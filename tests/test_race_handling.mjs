import assert from 'node:assert/strict';
import {createRaceGame, RACE_CARS, RACE_TRACKS} from '../src/arcade/RaceGame.mjs';
import {buildPathMetrics, getRaceTrack, pointAtProgress} from '../src/arcade/RaceTracks.mjs';
import {roadRibbon} from '../src/arcade/RaceScenery.mjs';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
const step=(game,n=24,dt=1/60)=>{for(let i=0;i<n;i++)game.tick(dt);};
function drive(carId,trackId,steer,brake=0) {
  const game=createRaceGame({canvas:createStubCanvas(),carId,trackId,skipLobby:true});
  const before=game.getState();
  game.setControls({throttle:brake?0:1,brake,steer});step(game);
  const after=game.getState();game.destroy();return {before,after};
}
for(const car of RACE_CARS)for(const track of RACE_TRACKS) {
  const left=drive(car.id,track.id,-1),right=drive(car.id,track.id,1),straight=drive(car.id,track.id,0);
  assert.ok(left.after.heading>left.before.heading,`${car.id}/${track.id}: A must turn left (+yaw)`);
  assert.ok(right.after.heading<right.before.heading,`${car.id}/${track.id}: D must turn right (-yaw)`);
  const leftward=s=>(s.x-straight.after.x)*Math.cos(s.heading)+(s.z-straight.after.z)*-Math.sin(s.heading);
  assert.ok(leftward(left.after)>0,'A moves to camera-left of the straight trajectory');
  assert.ok(leftward(right.after)<0,'D moves to camera-right of the straight trajectory');
  const reverse=drive(car.id,track.id,-1,1);
  assert.ok(reverse.after.speed<0&&reverse.after.heading<reverse.before.heading,'reverse steering follows wheel direction');
  const geo=roadRibbon(track.path,track.width,0,0,buildPathMetrics(track.path));
  const normals=geo.attributes.normal;
  for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>0.99,'road surface faces the light/camera');
  const p=geo.attributes.position;
  for(let j=0;j<6;j++)assert.equal(p.array[j],p.array[p.array.length-6+j],'closed road has no seam');
  geo.dispose();
}
const game=createRaceGame({canvas:createStubCanvas(),skipLobby:true});
const h=game.getState().heading;
game.setControls({steer:-1});step(game);assert.equal(game.getState().heading,h,'stationary car does not spin');
game.setControls({throttle:1,steer:-1});step(game);
game.setControls({throttle:1});step(game,30);assert.ok(Math.abs(game.getState().steering)<0.001,'steering returns to neutral');
game.pause();const paused=game.getState();step(game);assert.deepEqual(game.getState(),paused);
game.resume();step(game);assert.ok(game.getState().speed<paused.speed,'pause clears accelerator');
game.start();assert.equal(game.getState().lap,1);assert.equal(game.getState().speed,0);game.destroy();
// Real keyboard mappings and focus-loss cleanup, including a non-Latin key value.
globalThis.window=new EventTarget();
const keyboardGame=createRaceGame({canvas:createStubCanvas(),skipLobby:true});
const emit=(type,key,code)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{key,code});window.dispatchEvent(e);};
const initial=keyboardGame.getState().heading;
emit('keydown','w','KeyW');emit('keydown','ф','KeyA');step(keyboardGame);
assert.ok(keyboardGame.getState().heading>initial);
window.dispatchEvent(new Event('blur'));const speed=keyboardGame.getState().speed;step(keyboardGame);
assert.ok(keyboardGame.getState().speed<speed,'focus loss releases held input');
keyboardGame.destroy();delete globalThis.window;
console.log('Race handling: all car/track pairs, camera-relative A/D, reverse, neutral, pause, keyboard/blur, road normals and seams passed');

// Drive complete races through the public controls; verify both clear and DNF contracts.
for(const id of RACE_TRACKS.map(t=>t.id)) {
 const track=getRaceTrack(id),metrics=buildPathMetrics(track.path);let result=null,calls=0;
 const run=createRaceGame({trackId:id,carId:'sports',skipLobby:true,onEnd:r=>{result=r;calls++;}});
 for(let i=0;i<30000&&!run.getState().ended;i++) {
  const state=run.getState(),p=pointAtProgress(track.path,metrics,state.progress+8/metrics.total);
  const desired=Math.atan2(p.x-state.x,p.z-state.z),error=Math.atan2(Math.sin(desired-state.heading),Math.cos(desired-state.heading));
  const target=Math.abs(error)>.6?12:27;
  run.setControls({throttle:state.speed<target?1:0,brake:state.speed>target+3?1:0,steer:Math.abs(error)>.045?-Math.sign(error):0});run.tick(1/60);
 }
 assert.ok(result,'race reaches an outcome through ordinary driving');
 assert.equal(result.cleared,true,'every longer route is completable without collisions');
 assert.equal(calls,1);run.tick(1);assert.equal(calls,1,'result emitted once');
 run.start();assert.equal(run.getState().ended,false);assert.equal(run.getState().lives,4);assert.equal(run.getState().score,0);run.destroy();
}
console.log('Race outcomes: six circuit clears, single settlement and retry passed');
