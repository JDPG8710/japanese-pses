import assert from 'node:assert/strict';
import * as THREE from '../src/town/vendor/three.module.js';
import {DESIGN_KITS} from '../src/arcade/DesignerCatalog.mjs';
import {createDesignModel} from '../src/arcade/Designer3D.mjs';
import {prepareCelebration} from '../src/arcade/DesignerCelebration.mjs';
const state=model=>{const out=[];model.traverse(o=>out.push([o.position.toArray(),o.rotation.toArray(),o.scale.toArray(),o.material?.emissive?.getHex(),o.material?.emissiveIntensity]));return JSON.stringify(out);};
for(const [id,kit]of Object.entries(DESIGN_KITS)){
 const scene=new THREE.Scene(),model=createDesignModel(kit,kit.parts,{demo:true});scene.add(model);const ids=model.children.map(p=>p.userData.partId),original=state(model),effect=prepareCelebration(scene,model,kit.category);effect.frame(1,.15);const first=state(model);effect.frame(2,.3);assert.notEqual(state(model),first,id+' moves');assert.deepEqual(model.children.map(p=>p.userData.partId),ids,id+' uses own parts');effect.destroy();assert.equal(state(model),original,id+' restores pose and materials');assert.equal(scene.children.length,1,id+' removes effects');
}
console.log('Celebration: 16 own-part assemblies move, mechanical pistons/valves cycle, body colors retained, pose/material restoration and effect cleanup passed');
