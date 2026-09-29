import assert from 'node:assert/strict';
import {createRaceGame,RACE_TRACKS,RACE_CARS} from '../src/arcade/RaceGame.mjs';
import {buildPathMetrics,pointAtProgress,projectOnPath,trackMap} from '../src/arcade/RaceTracks.mjs';
import {barrierContact,carContact,support} from '../src/arcade/RacePhysics.mjs';
const car=RACE_CARS[0];
for(const t of RACE_TRACKS){
 const m=buildPathMetrics(t.path);assert.ok(Math.abs(m.total/t.legacyLength-10)<1e-8,'10x physical lap length');
 const start=pointAtProgress(t.path,m,.02),ahead=pointAtProgress(t.path,m,.02+75/m.total);
 assert.ok(Math.abs(start.heading-ahead.heading)<.01,'at least 75 m of straight after spawning');
 assert.ok(t.width>=12,'room for cars side by side');
 // Non-neighbouring centreline segments must not intersect.
 for(let i=0;i<t.path.length;i++)for(let j=i+2;j<t.path.length;j++){
  if(i===0&&j===t.path.length-1)continue;
  const a=t.path[i],b=t.path[(i+1)%t.path.length],c=t.path[j],d=t.path[(j+1)%t.path.length];
  const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
  assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),'no track self-intersection');
 }
}
assert.equal(new Set(RACE_TRACKS.map(t=>trackMap(t).points)).size,4,'four distinct route previews');
const projection={x:0,z:0,nx:1,nz:0};
const scrape=barrierContact({x:8,z:0,heading:0,car,vx:12,vz:40},projection,14);
assert.ok(scrape&&scrape.vx<0,'rail reflects outward momentum');assert.equal(scrape.vz,40,'side scrape preserves tangent speed');
assert.ok(scrape.x+support(car,0,1,0)<=14/2+1.7+.001,'whole car stays inside guardrail');
const body=(x,z,vz,heading=0)=>({x,z,heading,car,vx:0,vz});
assert.equal(carContact(body(0,0,40),body(5,0,0)),null);
const rear=carContact(body(0,0,40),body(0,4,10));assert.ok(rear,'bumper contact before centres overlap');
assert.ok(rear.avz<40&&rear.bvz>10,'both cars exchange momentum');assert.ok(Math.abs(rear.avz+rear.bvz-50)<1e-10,'equal-mass momentum conserved');
assert.ok(carContact(body(0,0,30),body(1,1,0,Math.PI/2)),'crosswise contact resolved');
for(const fps of [30,60,120]){
 let result,lastHud,calls=0,hits=0;
 const game=createRaceGame({skipLobby:true,audio:{raceHit:()=>hits++},onHud:h=>lastHud=h,onEnd:r=>{result=r;calls++;}});
 game.setControls({throttle:1,steer:1});
 for(let i=0;i<fps*45&&!game.getState().ended;i++)game.tick(1/fps);
 assert.equal(result?.cleared,false,'repeated hard impacts produce DNF');assert.equal(game.getState().lives,0);assert.equal(lastHud.lives,0);assert.equal(calls,1);assert.ok(hits>=4);
 game.tick(1);assert.equal(calls,1);game.start();const fresh=game.getState();assert.equal(fresh.damage,0);assert.equal(fresh.collisionCount,0);assert.equal(fresh.lives,4);game.destroy();
}
// Catch a moving rival by following its lane through ordinary steering inputs.
const traffic=createRaceGame({trackId:'sunrise',carId:'gt',skipLobby:true}),tt=RACE_TRACKS[0],tm=buildPathMetrics(tt.path);
for(let i=0;i<5000&&traffic.getState().lastCollision?.kind!=='car';i++){
 const s=traffic.getState(),p=pointAtProgress(tt.path,tm,s.progress+12/tm.total),angle=Math.atan2(p.x-p.nx*1.4-s.x,p.z-p.nz*1.4-s.z),e=Math.atan2(Math.sin(angle-s.heading),Math.cos(angle-s.heading));
 traffic.setControls({throttle:s.speed<48?1:0,steer:Math.abs(e)>.035?-Math.sign(e):0});traffic.tick(1/60);
}
assert.equal(traffic.getState().lastCollision?.kind,'car','live car-to-car impact uses OBB contact');traffic.destroy();
// Collect the actual shield pickup through public controls, then hit the barrier.
const shield=createRaceGame({trackId:'sunrise',skipLobby:true}),track=RACE_TRACKS[0],metrics=buildPathMetrics(track.path);
for(let i=0;i<3000&&!shield.getState().heldItem;i++){
 const s=shield.getState(),p=pointAtProgress(track.path,metrics,s.progress+8/metrics.total);
 const lateral=s.progress>.08?track.width*.28:0;
 const angle=Math.atan2(p.x+p.nx*lateral-s.x,p.z+p.nz*lateral-s.z),e=Math.atan2(Math.sin(angle-s.heading),Math.cos(angle-s.heading));
 shield.setControls({throttle:s.speed<24?1:0,steer:Math.abs(e)>.045?-Math.sign(e):0});shield.tick(1/60);
}
assert.equal(shield.getState().heldItem,'shield');shield.useItem();const before=shield.getState().lives;
shield.setControls({throttle:1,steer:1});for(let i=0;i<180&&!shield.getState().collisionCount;i++)shield.tick(1/60);
assert.equal(shield.getState().lastCollision?.shielded,true);assert.equal(shield.getState().lives,before);assert.equal(shield.getState().damage,0);shield.destroy();
console.log('Race contacts: 10x distinct non-crossing routes, long start straights, rail containment, SAT/impulses, 30/60/120fps DNF, retry, natural rival impact and shield passed');
