import assert from 'node:assert/strict';
import {TownScene} from '../src/town/TownScene3D.mjs';
import {THREE} from '../src/town/Models3D.mjs';
import {TOWN_BUILDINGS,frameSeconds,buildingAt,CASUAL_ARCADE_IDS} from '../src/town/TownBuildings.mjs';
import {canWalk,findPath,newState} from '../src/town/TownRules.mjs';
import {advanceVertical} from '../src/town/PlatformCourse.mjs';
import {spawnTownLife} from '../src/town/TownLife.mjs';
const ground=[{x:0,z:6,w:48,d:48,y:0}];
const old={x:0,y:0,z:7,velocity:0};advanceVertical(old,ground,-.02);assert.ok(old.y<0);for(let i=0;i<180;i++)advanceVertical(old,ground,1/60);assert.ok(old.y< -50);
const body={x:0,y:0,z:7,velocity:0};for(const dt of [frameSeconds(980,1000),...Array(180).fill(1/60)])advanceVertical(body,ground,dt);assert.equal(body.y,0);assert.equal(body.grounded,true);assert.equal(frameSeconds(NaN,0),0);assert.equal(frameSeconds(9999,0),.04);
console.log('ok - reproduces pre-fix infinite fall and verifies negative / invalid frame protection');
for(const y of [-.002,-100,NaN]){const scene={position:new THREE.Vector3(.4,y,7),velocity:-35,state:newState(),mode:null};TownScene.prototype.recoverTown.call(scene);assert.equal(scene.position.y,0);assert.equal(scene.velocity,0);assert.equal(scene.grounded,true);}
const invalid={position:new THREE.Vector3(Infinity,-4,9),velocity:NaN,state:newState(),mode:null};TownScene.prototype.recoverTown.call(invalid);assert.deepEqual(invalid.position.toArray(),[.4,0,7]);
const game={position:new THREE.Vector3(0,-2,0),velocity:-5,mode:'obby'};TownScene.prototype.recoverTown.call(game);assert.equal(game.position.y,-2);
console.log('ok - underground town spawns recover without changing floating-course falls');
for(const b of TOWN_BUILDINGS){const to={x:b.x*25+550,y:(b.z-2)*25+380};assert.ok(canWalk(to.x,to.y),`walk ${b.id}`);assert.ok(findPath(newState().player,to).length,`path ${b.id}`);assert.equal(buildingAt(b.x,b.z-2).id,b.id);assert.equal(canWalk((b.x+2.7)*25+550,b.z*25+380),false);assert.equal(canWalk(b.x*25+550,(b.z+2.7)*25+380),false);}
console.log('ok - all building entrances are reachable and side / rear walls block movement');

assert.deepEqual([...CASUAL_ARCADE_IDS],['fruit','ninja','breakout','race']);
for(const id of CASUAL_ARCADE_IDS)assert.ok(TOWN_BUILDINGS.some(b=>b.id===id),id);
const casual=TOWN_BUILDINGS.filter(b=>CASUAL_ARCADE_IDS.includes(b.id));
assert.equal(casual.length,4);
const zs=new Set(casual.map(b=>Math.round(b.z/4)));
const xs=casual.map(b=>b.x);
assert.ok(zs.size>=3,'arcade venues must sit in different districts (z clusters)');
assert.ok(Math.max(...xs)-Math.min(...xs)>30,'arcade venues must be scattered on x');

const edu=TOWN_BUILDINGS.filter(b=>!CASUAL_ARCADE_IDS.includes(b.id));
assert.equal(edu.length,6);
const eduZs=new Set(edu.map(b=>b.z));
assert.ok(eduZs.size>=4,'edu buildings must NOT share one z-row');
assert.ok(!edu.every(b=>b.z===edu[0].z),'edu buildings must not be co-linear on z');

// Min pairwise spacing among all buildings
for(let i=0;i<TOWN_BUILDINGS.length;i++){
  for(let j=i+1;j<TOWN_BUILDINGS.length;j++){
    const a=TOWN_BUILDINGS[i],b=TOWN_BUILDINGS[j];
    const d=Math.hypot(a.x-b.x,a.z-b.z);
    assert.ok(d>=12,`spacing ${a.id}-${b.id} = ${d}`);
  }
}
for(const b of casual){assert.equal(buildingAt(b.x,b.z-1.5).id,b.id);assert.ok(canWalk(b.x*25+550,(b.z-2)*25+380));}
console.log('ok - sprawling districts: edu not co-linear, min spacing >=12, casual enterable');

// Town life counts
const env=new THREE.Group();
const life=spawnTownLife(env);
assert.ok(life.wandererCount>=4 && life.wandererCount<=8, life.wandererCount);
assert.ok(life.animalCount>=3 && life.animalCount<=8, life.animalCount);
life.update(0.05,{paused:false,active:true});
const moved=life.wanderers.some(w=>w.t>0 || w.i>0 || w.wait>0);
assert.ok(moved || life.wanderers[0].mesh.position.length()>0);
life.update(0.05,{paused:true,active:true}); // should no-op harmlessly
console.log(`ok - town life ${life.wandererCount} wanderers + ${life.animalCount} animals`);
