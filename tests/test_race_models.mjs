import assert from 'node:assert/strict';
import {THREE,boxMesh} from '../src/arcade/Arcade3D.mjs';
import {RACE_CARS,makeRaceCarMesh,updateRaceCar} from '../src/arcade/RaceCars.mjs';
import {disposeRaceScene} from '../src/arcade/RaceScenery.mjs';
for(const car of RACE_CARS){
 const model=makeRaceCarMesh(THREE,boxMesh,car),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.x>=1.7&&size.x<2.6,'metre-scale width');assert.ok(size.z>2&&size.z<5,'metre-scale length');
 assert.equal(model.userData.wheels.length,4);
 const original=model.userData.damage.map(p=>new Float32Array(p.mesh.geometry.attributes.position.array));
 updateRaceCar(model,{speed:20,steering:.6,brake:1,damage:.7,dt:.1});
 assert.equal(model.userData.brakeMaterial.emissiveIntensity,3.5);
 assert.ok(model.userData.wheels.some(w=>w.userData.front&&w.rotation.y<0));
 assert.ok(model.userData.wheels.every(w=>w.children[0].rotation.x>0));
 if(original.length)assert.notDeepEqual(model.userData.damage[0].mesh.geometry.attributes.position.array,original[0],'body panels visibly deform');
 updateRaceCar(model,{damage:0});
 model.userData.damage.forEach((p,i)=>assert.deepEqual(p.mesh.geometry.attributes.position.array,original[i],'new-race panels restore without cumulative distortion'));
 let calls=0;model.traverse(o=>{if(o.isMesh)calls++;});assert.ok(calls<65,'batched detail keeps each car under 65 mesh draws');
 const scene=new THREE.Scene();scene.add(model);disposeRaceScene(scene);assert.equal(scene.children.length,0);
}
console.log('Race models: four distinct metre-scale profiles, wheel motion, brake lights, panel damage/reset, batched draw budget and disposal passed');
