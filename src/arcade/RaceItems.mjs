import {THREE} from './Arcade3D.mjs';
export const RACE_POWERUPS=Object.freeze(['boost','shield','oil','magnet','rocket','banana','splash']);
export const POWER_COLORS={boost:0xffbe40,shield:0x57dfff,oil:0xab762d,magnet:0xf14c69,rocket:0xff7048,banana:0xffdf43,splash:0x4dc8f4};
export const itemIcon=id=>`/assets/race/${id}.svg`;
export function disposeItem(mesh){if(!mesh)return;mesh.removeFromParent();const geos=new Set(),mats=new Set();mesh.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
/** Actual silhouettes rather than differently coloured collectible spheres. */
export function makeRaceItemMesh(id){
 const group=new THREE.Group();group.userData.item=id;
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.25});
 const primary=mat(POWER_COLORS[id]),white=mat(0xe6f3ff),dark=mat(0x374353);
 const mesh=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);group.add(o);return o;};
 const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const tube=(points,r,m)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,8,false),m);
 if(id==='magnet'){
  tube([[-.38,.4,0],[-.38,-.25,0],[0,-.5,0],[.38,-.25,0],[.38,.4,0]],.14,primary);
  for(const side of [-1,1])box(.28,.24,.3,white,side*.38,.4,0);
 }else if(id==='rocket'){
  mesh(new THREE.CylinderGeometry(.18,.22,.8,16),white);mesh(new THREE.ConeGeometry(.2,.38,16),primary,0,.59,0);
  for(const side of [-1,1]){const fin=box(.28,.4,.08,primary,side*.24,-.28,0);fin.rotation.z=-side*.4;}
  mesh(new THREE.ConeGeometry(.14,.35,12),mat(0xffd246),0,-.53,0).rotation.z=Math.PI;
 }else if(id==='banana'){
  tube([[0,.5,0],[.1,.2,0],[.05,-.15,0],[.45,-.35,0],[.6,-.3,0]],.13,primary);
  tube([[.05,.1,0],[-.15,-.23,0],[-.55,-.32,0]],.12,primary);
  tube([[.05,.1,0],[.1,-.23,.22],[.22,-.32,.55]],.12,primary);box(.13,.15,.13,dark,0,.55,0);
 }else if(id==='shield'){
  const s=new THREE.Shape();s.moveTo(-.48,.4);s.lineTo(0,.62);s.lineTo(.48,.4);s.lineTo(.35,-.3);s.lineTo(0,-.6);s.lineTo(-.35,-.3);s.closePath();
  mesh(new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSize:.04,bevelThickness:.03,bevelSegments:2,steps:1}),primary);
  box(.1,.62,.05,white,0,.04,.2);box(.45,.1,.05,white,0,.1,.2);
 }else if(id==='boost'){
  mesh(new THREE.CylinderGeometry(.3,.3,.85,16),mat(0x427bdd));mesh(new THREE.CylinderGeometry(.2,.2,.18,16),white,0,.51,0);
  const a=box(.18,.36,.1,primary,.03,.13,.29);a.rotation.z=-.4;const b=box(.18,.36,.1,primary,-.03,-.15,.29);b.rotation.z=-.4;
 }else if(id==='oil'){
  box(.75,.68,.28,primary,0,0,0);box(.13,.22,.3,white,-.22,.43,0);box(.36,.08,.26,white,-.1,.53,0);
  box(.28,.15,.22,primary,.4,.31,0).rotation.z=-.65;mesh(new THREE.SphereGeometry(.15,12,8),dark,0,0,.17);
 }else{
  mesh(new THREE.SphereGeometry(.36,16,12),primary,0,-.1,0).scale.set(.9,1.25,.7);
  mesh(new THREE.ConeGeometry(.29,.5,16),primary,0,.3,0);
  for(const side of [-1,1])mesh(new THREE.SphereGeometry(.12,10,8),primary,side*.52,side*.25,0);
 }
 group.traverse(o=>{if(o.isMesh)o.castShadow=true;});return group;
}
