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
