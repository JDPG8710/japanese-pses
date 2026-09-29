import assert from 'node:assert/strict';
import {vehicleStep,carCanMove,flightFloor,safeParking,makeVehicle} from '../src/town/TownVehicles.mjs';
import {TOWN_BUILDINGS} from '../src/town/TownBuildings.mjs';
import {LANDMARK_HEIGHTS} from '../src/town/TownLandmarks.mjs';
import {restoreExpansion,newExpansion} from '../src/town/ArcadeRules.mjs';
import {disposeGroup} from '../src/town/Models3D.mjs';
for(const b of TOWN_BUILDINGS){
 assert.ok(flightFloor(b.x,b.z)>LANDMARK_HEIGHTS[b.id]);
 const side={x:b.x-9,y:0,z:b.z};assert.ok(carCanMove(side.x,side.z));assert.ok(vehicleStep(side,5,0,'car').x<=b.x-4);
 const low={...side,y:2};assert.ok(vehicleStep(low,5,0,'plane').x<=b.x-8);
 const high={...side,y:flightFloor(b.x,b.z)+1};assert.equal(vehicleStep(high,5,0,'plane').x,high.x+5);
 const safe=safeParking({x:b.x,y:30,z:b.z});assert.ok(carCanMove(safe.x,safe.z));assert.equal(safe.y,0);
}
for(const kind of ['car','plane']){const p={x:74,y:35,z:74};const edge=vehicleStep(p,5,5,kind);const limit=kind==='plane'?75:77;assert.ok(edge.x<=limit&&edge.z<=limit);const model=makeVehicle(kind);assert.ok(model.children.length>=10);disposeGroup(model);}
assert.equal(newExpansion().vehicle,'foot');assert.equal(restoreExpansion({version:2,vehicle:'plane'}).vehicle,'plane');assert.equal(restoreExpansion({version:2,vehicle:'bad'}).vehicle,'foot');assert.equal(restoreExpansion({version:2}).vehicle,'foot');
console.log('Vehicles: car collisions, aircraft clearance / bounds, safe dismount, models and legacy save migration passed.');
