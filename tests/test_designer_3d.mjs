import assert from 'node:assert/strict';
import * as THREE from '../src/town/vendor/three.module.js';
import {DESIGN_KITS,DESIGN_CATEGORIES} from '../src/arcade/DesignerCatalog.mjs';
import {createDesignModel} from '../src/arcade/Designer3D.mjs';
assert.equal(DESIGN_CATEGORIES.length,7);assert.equal(Object.keys(DESIGN_KITS).length,11);
for(const [id,kit]of Object.entries(DESIGN_KITS)){
 const parts=kit.parts.map(p=>({...p,placed:true,scale:1})),model=createDesignModel(kit,parts),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
 assert.ok(size.x>1&&size.y>1&&size.z>.12,`${id}: volumetric model`);
 assert.equal(model.userData.partCount,parts.length);
 const ids=new Set();model.traverse(m=>{if(m.userData.partId)ids.add(m.userData.partId);if(m.isMesh){assert.ok(m.geometry.attributes.position.count>20);assert.ok(m.material.isMeshStandardMaterial);}});assert.equal(ids.size,parts.length);
 const edited=createDesignModel(kit,[{...parts[0],color:'#e65843',rotation:30,scale:1.3}]);const part=edited.children[0];assert.equal(part.userData.color,'#e65843');assert.equal(part.children[0].material.color.getHexString(),'e65843');assert.ok(Math.abs(part.rotation.z+Math.PI/6)<1e-6);assert.equal(part.scale.x,1.3);
 const partial=createDesignModel(kit,parts.map((p,i)=>({...p,placed:i===0})));assert.equal(partial.userData.partCount,1);
 const example=createDesignModel(kit,kit.parts,{demo:true});assert.equal(example.userData.partCount,parts.length);
}
console.log('Designer 3D: seven categories, eleven closed-volume assemblies, part identity, colors, rotation/size, incomplete builds and example previews passed');
