import assert from 'node:assert/strict';
import * as THREE from '../src/town/vendor/three.module.js';
import {DESIGN_KITS,DESIGN_CATEGORIES} from '../src/arcade/DesignerCatalog.mjs';
import {createDesignModel,designPartDepth} from '../src/arcade/Designer3D.mjs';
assert.equal(DESIGN_CATEGORIES.length,8);assert.equal(Object.keys(DESIGN_KITS).length,16);
for(const [id,kit]of Object.entries(DESIGN_KITS)){
 const parts=kit.parts.map(p=>({...p,placed:true,scale:1})),model=createDesignModel(kit,parts),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
 for(const p of parts){assert.equal(designPartDepth(kit,p),designPartDepth(kit,{...p,z:99}),`${id}/${p.id}: drawing layer cannot change physical thickness`);assert.ok(designPartDepth(kit,p)>0);}
 assert.ok(size.x>1&&size.y>1&&size.z>.12,`${id}: volumetric model`);
 assert.equal(model.userData.partCount,parts.length);
 const ids=new Set();model.traverse(m=>{if(m.userData.partId)ids.add(m.userData.partId);if(m.isMesh){assert.ok(m.geometry.attributes.position.count>20);assert.ok(m.material.isMeshStandardMaterial);}});assert.equal(ids.size,parts.length);
 const edited=createDesignModel(kit,[{...parts[0],color:'#e65843',rotation:30,scale:1.3}]);const part=edited.children[0];assert.equal(part.userData.color,'#e65843');assert.equal(part.children[0].material.color.getHexString(),'e65843');assert.ok(Math.abs(part.rotation.z+Math.PI/6)<1e-6);assert.equal(part.scale.x,1.3);
 const partial=createDesignModel(kit,parts.map((p,i)=>({...p,placed:i===0})));assert.equal(partial.userData.partCount,1);
 const example=createDesignModel(kit,kit.parts,{demo:true});assert.equal(example.userData.partCount,parts.length);
}
for(const id of ['airliner','jet']){
 const k=DESIGN_KITS[id],m=createDesignModel(k,k.parts,{demo:true}),gears=m.children.filter(p=>p.userData.partId.startsWith('gear-'));
 if(!gears.length)continue;
 assert.equal(gears.filter(p=>p.userData.partId==='gear-b').length,1);
 const bottoms=gears.map(p=>new THREE.Box3().setFromObject(p).min.y);assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<.001,'all gear tires touch the same ground');
 for(const g of gears){assert.equal(g.children[0].visible,false);assert.equal(g.children.filter(p=>p.geometry.type==='TorusGeometry').length,2);assert.ok(g.children.filter(p=>p.visible).every(p=>p.geometry.type!=='ExtrudeGeometry'),'no rectangular landing gear bridge');}
}
for(const k of Object.values(DESIGN_KITS).filter(k=>k.category==='mechanical')){
 const m=createDesignModel(k,k.parts,{demo:true}),timing=m.children.find(p=>p.userData.partId.endsWith('-timing'));
 assert.equal(timing.children[0].geometry.parameters.height,.09,'sprocket uses its own thickness, not car tire thickness');
 assert.ok(m.children.filter(p=>/-rings-/.test(p.userData.partId)).every(p=>p.children[0].geometry.type==='TorusGeometry'),'piston rings retain an opening');
}
const suv=DESIGN_KITS.suv,rack=createDesignModel(suv,suv.parts,{demo:true}).children.find(p=>p.userData.partId==='roof-rack');
assert.equal(rack.children[0].visible,false);assert.ok(new THREE.Box3().setFromObject(rack).getSize(new THREE.Vector3()).z>1,'roof rack spans the roof with separate bars');
console.log('Designer 3D: eight categories, sixteen closed-volume assemblies, part identity, colors, rotation/size, incomplete builds and example previews passed');
