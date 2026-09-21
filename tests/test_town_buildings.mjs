import assert from 'node:assert/strict';
import {TownScene} from '../src/town/TownScene3D.mjs';
import {THREE} from '../src/town/Models3D.mjs';
import {TOWN_BUILDINGS,frameSeconds,buildingAt} from '../src/town/TownBuildings.mjs';
import {canWalk,findPath,newState} from '../src/town/TownRules.mjs';
import {advanceVertical} from '../src/town/PlatformCourse.mjs';
const ground=[{x:0,z:6,w:48,d:48,y:0}];
// rAF timestamps can precede performance.now() during initialization.
const old={x:0,y:0,z:7,velocity:0};advanceVertical(old,ground,-.02);assert.ok(old.y<0);for(let i=0;i<180;i++)advanceVertical(old,ground,1/60);assert.ok(old.y< -50);
const body={x:0,y:0,z:7,velocity:0};for(const dt of [frameSeconds(980,1000),...Array(180).fill(1/60)])advanceVertical(body,ground,dt);assert.equal(body.y,0);assert.equal(body.grounded,true);assert.equal(frameSeconds(NaN,0),0);assert.equal(frameSeconds(9999,0),.04);
console.log('ok - reproduces pre-fix infinite fall and verifies negative / invalid frame protection');
for(const y of [-.002,-100,NaN]){const scene={position:new THREE.Vector3(.4,y,7),velocity:-35,state:newState(),mode:null};TownScene.prototype.recoverTown.call(scene);assert.equal(scene.position.y,0);assert.equal(scene.velocity,0);assert.equal(scene.grounded,true);}
const invalid={position:new THREE.Vector3(Infinity,-4,9),velocity:NaN,state:newState(),mode:null};TownScene.prototype.recoverTown.call(invalid);assert.deepEqual(invalid.position.toArray(),[.4,0,7]);
const game={position:new THREE.Vector3(0,-2,0),velocity:-5,mode:'obby'};TownScene.prototype.recoverTown.call(game);assert.equal(game.position.y,-2);
console.log('ok - underground town spawns recover without changing floating-course falls');
for(const b of TOWN_BUILDINGS){const to={x:b.x*25+550,y:(b.z-2)*25+380};assert.ok(canWalk(to.x,to.y));assert.ok(findPath(newState().player,to).length);assert.equal(buildingAt(b.x,b.z-2).id,b.id);assert.equal(canWalk((b.x+2.7)*25+550,b.z*25+380),false);assert.equal(canWalk(b.x*25+550,(b.z+2.7)*25+380),false);}
console.log('ok - all six building entrances are reachable and side / rear walls block movement');

import {CASUAL_ARCADE_IDS} from '../src/town/TownBuildings.mjs';
assert.deepEqual([...CASUAL_ARCADE_IDS],['fruit','ninja','breakout','race']);
for(const id of CASUAL_ARCADE_IDS)assert.ok(TOWN_BUILDINGS.some(b=>b.id===id),id);
const casual=TOWN_BUILDINGS.filter(b=>CASUAL_ARCADE_IDS.includes(b.id));
assert.equal(casual.length,4);
// Not co-linear: at least three distinct z bands and x spread beyond plaza row.
const zs=new Set(casual.map(b=>Math.round(b.z/4)));
const xs=casual.map(b=>b.x);
assert.ok(zs.size>=3,'arcade venues must sit in different districts (z clusters)');
assert.ok(Math.max(...xs)-Math.min(...xs)>30,'arcade venues must be scattered on x');
// Educational row stays intact on z=22.
const edu=TOWN_BUILDINGS.filter(b=>!CASUAL_ARCADE_IDS.includes(b.id));
assert.ok(edu.every(b=>b.z===22));
assert.equal(edu.length,6);
for(const b of casual){assert.equal(buildingAt(b.x,b.z-1.5).id,b.id);assert.ok(canWalk(b.x*25+550,(b.z-2)*25+380));}
console.log('ok - four hard arcade venues are scattered and enterable');
