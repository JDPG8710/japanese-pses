import assert from 'node:assert/strict';
import {THREE,disposeGroup} from '../src/town/Models3D.mjs';
import {spawnTownLife} from '../src/town/TownLife.mjs';
import {TOWN_WORKERS,makeWorkingResident,animateWorkingResident,updateResidentSurprise} from '../src/town/TownResidents.mjs';
import {canWalk} from '../src/town/TownRules.mjs';
assert.equal(new Set(TOWN_WORKERS.map(r=>r.job)).size,6);
const signatures=new Set();
for(const spec of TOWN_WORKERS){
 assert.ok(canWalk(spec.x*25+550,spec.z*25+380),spec.job+' must be on walkable ground');
 const r=makeWorkingResident(spec);let geometry=0;r.mesh.traverse(o=>{if(o.geometry)geometry++;});signatures.add(spec.character+':'+spec.color+':'+geometry);
 const arm=r.mesh.userData.rightArm;animateWorkingResident(r,0);const before=arm.rotation.x;animateWorkingResident(r,.5);assert.notEqual(arm.rotation.x,before);
 const player={x:spec.x+2,y:0,z:spec.z};updateResidentSurprise(r,.02,{player});assert.equal(r.triggerCount,1);assert.equal(r.effects.visible,true);
 for(let i=0;i<120;i++)updateResidentSurprise(r,.02,{player});assert.equal(r.effects.visible,false);assert.equal(r.triggerCount,1);
 updateResidentSurprise(r,7,{player:{x:70,y:0,z:70}});updateResidentSurprise(r,.02,{player});assert.equal(r.triggerCount,2);
 updateResidentSurprise(r,7,{player:{x:spec.x,y:20,z:spec.z}});assert.equal(r.triggerCount,2,'high aircraft cannot trigger ground surprise');
 updateResidentSurprise(r,7,{player:{x:70,y:0,z:70}});updateResidentSurprise(r,0,{contact:true,reducedMotion:true});assert.equal(r.triggerCount,3);
 assert.ok(r.effects.children.every(p=>p.rotation.z===0));
 disposeGroup(r.mesh);disposeGroup(r.station);disposeGroup(r.effects);
}
assert.equal(signatures.size,6,'all worker appearances differ');
const environment=new THREE.Group(),life=spawnTownLife(environment);assert.equal(life.workerCount,6);
const gardener=life.workers[0];life.update(.02,{player:{x:gardener.spec.x+2,y:0,z:gardener.spec.z}});assert.equal(life.surpriseCount,1);
const remaining=gardener.effectRemaining,time=life.time;life.update(.02,{paused:true,player:{x:0,y:0,z:0}});assert.equal(life.time,time);assert.equal(gardener.effectRemaining,remaining);
let freed=0;gardener.effects.children[0].children[0].geometry.addEventListener('dispose',()=>freed++);life.dispose();life.dispose();assert.equal(freed,1);assert.equal(environment.children.length,0);
console.log('Residents: six unique work stations, walkable placement, animations, proximity/contact effects, cooldown, flight height, pause, reduced motion and exact-once disposal passed.');
