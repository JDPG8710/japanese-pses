import {THREE,box,ball} from './Models3D.mjs';
import {canWalk} from './TownRules.mjs';
import {TOWN_BUILDINGS} from './TownBuildings.mjs';
import {LANDMARK_HEIGHTS} from './TownLandmarks.mjs';
export const VEHICLE_SPEED={foot:7.2,car:17,plane:24};
export function carCanMove(x,z){
 if(!canWalk(x*25+550,z*25+380)||Math.abs(x)>77||Math.abs(z)>77)return false;
 if([[-18,-8],[16,-6]].some(([hx,hz])=>Math.abs(x-hx)<5&&Math.abs(z-hz)<4))return false;
 return !TOWN_BUILDINGS.some(b=>{const px=x-b.x,pz=z-b.z;return [[-3,-2.3,-3,3],[2.3,3,-3,3],[-3,3,2.3,3]].some(([x0,x1,z0,z1])=>px+1>x0&&px-1<x1&&pz+1.5>z0&&pz-1.5<z1);});
}
export function flightFloor(x,z){let height=0;for(const b of TOWN_BUILDINGS)if(Math.abs(x-b.x)<8&&Math.abs(z-b.z)<7)height=Math.max(height,LANDMARK_HEIGHTS[b.id]+3);for(const [hx,hz]of [[-18,-8],[16,-6]])if(Math.abs(x-hx)<9&&Math.abs(z-hz)<6)height=Math.max(height,9);return height;}
export function vehicleStep(p,dx,dz,kind){
 const next={x:p.x,y:p.y,z:p.z},steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.25)),sx=dx/steps,sz=dz/steps;
 const limit=kind==='plane'?75:77;const allowed=(x,z)=>Math.abs(x)<=limit&&Math.abs(z)<=limit&&(kind==='plane'?p.y>=flightFloor(x,z):carCanMove(x,z));
 for(let i=0;i<steps;i++){if(allowed(next.x+sx,next.z))next.x+=sx;if(allowed(next.x,next.z+sz))next.z+=sz;}return next;
}
export function safeParking(p,plane=false){for(let r=0;r<=30;r+=2)for(let i=0;i<(r?16:1);i++){const a=i*Math.PI/8,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;if(carCanMove(x,z)&&(!plane||(Math.abs(x)<=75&&Math.abs(z)<=75&&flightFloor(x,z)===0))&&!TOWN_BUILDINGS.some(b=>Math.abs(x-b.x)<4&&Math.abs(z-b.z)<5))return {x,y:0,z};}return {x:.4,y:0,z:7};}
export function makeVehicle(kind){
 const g=new THREE.Group();g.name=`vehicle-${kind}`;g.userData.wheels=[];
 if(kind==='car'){
  box(g,0,.65,0,2.3,.65,3.7,0xff785e);box(g,0,1.25,-.2,1.9,.65,1.9,0xffc45d);box(g,0,1.4,.78,1.6,.6,.07,0x8ddde6);box(g,0,1.65,-.2,2,.15,1.9,0xf7f2d5);box(g,0,.65,1.94,2.2,.15,.1,0x435978);
  for(const x of [-1.2,1.2])for(const z of [-1.2,1.2]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.35,12),new THREE.MeshStandardMaterial({color:0x28394e}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.45,z);wheel.castShadow=true;g.add(wheel);g.userData.wheels.push(wheel);ball(g,x*1.13,.45,z,.17,0xcde0e8);}
  for(const x of [-.72,.72]){box(g,x,.9,1.88,.4,.25,.1,0xfffac2);box(g,x,.8,-1.9,.4,.25,.1,0xff393f);}box(g,0,1,-1.9,2.5,.16,.45,0x344967);
 }else{
  const body=ball(g,0,1.2,0,1,0xffca57);body.scale.set(.8,.7,2.6);box(g,0,1.3,.2,7.8,.16,1.6,0xef795f);box(g,0,1.65,-1.9,3.1,.15,.8,0x66c8d3);box(g,0,2.1,-2,.15,1.4,1.1,0x66c8d3);
  const glass=ball(g,0,1.8,.3,.65,0x93dde6);glass.scale.set(.85,.75,1.15);
  const prop=new THREE.Group();prop.position.set(0,1.2,2.6);g.add(prop);box(prop,0,0,0,.15,2.4,.12,0x304d63);box(prop,0,0,0,2.4,.15,.12,0x304d63);ball(prop,0,0,.15,.24,0xef765c);g.userData.propeller=prop;
  for(const x of [-.65,.65]){box(g,x,.35,.7,.12,.5,.12,0x425876);ball(g,x,.18,.7,.22,0x304558);}box(g,0,1.32,.2,.4,.18,1.5,0xffe8ad);
 }
 return g;
}
