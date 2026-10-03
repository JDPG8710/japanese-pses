import {THREE,box,ball,makeAvatar} from './Models3D.mjs';

export const TOWN_WORKERS=Object.freeze([
 {job:'gardener',character:'explorer',color:0x5a986c,x:7,z:20,yaw:Math.PI,effect:'bloom'},
 {job:'baker',character:'builder',color:0xffefdc,x:-24,z:-3,yaw:1,effect:'bread'},
 {job:'mechanic',character:'robot',color:0xefa74b,x:-44,z:-21,yaw:-1,effect:'sparks'},
 {job:'artist',character:'cat',color:0x9780c1,x:23,z:-6,yaw:-.8,effect:'paint'},
 {job:'fisher',character:'explorer',color:0x5b9cb7,x:-13,z:14,yaw:Math.PI/2,effect:'fish'},
 {job:'musician',character:'frog',color:0xdd849b,x:6,z:10,yaw:-.5,effect:'notes'}
]);

/** Six distinct residents, with articulated hand tools and small work stations. */
export function makeWorkingResident(spec){
 const mesh=makeAvatar(spec.character,null,spec.color),station=new THREE.Group();
 mesh.position.set(spec.x,0,spec.z);mesh.rotation.y=spec.yaw;station.position.copy(mesh.position);station.rotation.y=spec.yaw;
 mesh.userData.job=spec.job;
 const {body,leftArm,rightArm}=mesh.userData;
 const tool=new THREE.Group();rightArm.add(tool);tool.position.set(0,-.5,.23);
 if(spec.job==='gardener'){
  box(body,0,1.2,.31,.65,.68,.04,0xe3d9a1);box(tool,0,0,.2,.36,.32,.48,0x70b6c6);box(tool,.24,0,.38,.4,.1,.1,0x70b6c6);
  for(let i=0;i<3;i++){box(station,-1+i*.8,.2,1.7,.55,.4,.55,0xba8265);box(station,-1+i*.8,.55,1.7,.08,.45,.08,0x599b61);ball(station,-1+i*.8,.82,1.7,.22,[0xffa8cd,0xffd86b,0x9ca1ed][i]);}
 }else if(spec.job==='baker'){
  box(body,0,1.2,.31,.7,.7,.04,0xfff8ee);box(body,0,2.73,0,1,.12,.9,0xffffff);for(const x of [-.3,0,.3])ball(body,x,2.9,0,.3,0xffffff);
  box(tool,0,0,.35,.14,.1,.7,0xbf875c);box(tool,0,0,.72,.9,.1,.55,0xc99566);
  box(station,0,.9,1.7,2.3,.2,1,0xc9976b);
  for(const x of [-.7,0,.7]){const loaf=ball(station,x,1.17,1.7,.23,0xeaba73);loaf.scale.set(1,.6,1.5);}
 }else if(spec.job==='mechanic'){
  box(body,0,1.28,.32,.65,.56,.05,0x577b94);box(tool,0,0,.3,.1,.1,.65,0xb7d4de);for(const x of [-.14,.14])box(tool,x,0,.68,.12,.12,.25,0xcde9ed);
  for(const x of [-.6,.6]){const tire=ball(station,x,.45,1.65,.4,0x364453);tire.scale.set(.3,1,1);}box(station,0,.8,1.65,1.4,.35,.9,0x68b7ca);
 }else if(spec.job==='artist'){
  box(body,0,2.72,0,.85,.13,.7,0xe98274);ball(body,.3,2.78,0,.13,0xe98274);box(tool,0,0,.32,.08,.08,.7,0xc9925b);ball(tool,0,0,.72,.12,0xe98ac6);
  box(leftArm,0,-.62,.22,.55,.08,.5,0xcdb593);for(let i=0;i<3;i++)ball(leftArm,-.18+i*.17,-.57,.28,.07,[0xe98782,0x77bcb0,0xf5c263][i]);
  box(station,0,1.5,1.8,1.3,1.4,.1,0xfff3d9);for(const x of [-.6,.6])box(station,x,.85,1.8,.1,1.7,.12,0xb48462);ball(station,-.2,1.55,1.87,.25,0xf5cf78);box(station,.24,1.15,1.87,.55,.35,.05,0x7dbbac);
 }else if(spec.job==='fisher'){
  for(const x of [-.2,.2])box(body,x,2.1,.43,.27,.2,.04,0x476780);box(tool,0,-.05,.65,.07,.07,1.5,0xae815b);box(tool,0,-.7,1.37,.02,1.35,.02,0xe6f3fa);
  const bucket=ball(station,-1,.35,.6,.35,0x83c6d9);bucket.scale.set(1,1.2,1);
 }else{
  box(body,0,2.69,0,.9,.13,.78,0xf2bc61);const guitar=ball(body,.24,1,.4,.35,0xb98252);guitar.scale.set(.8,1.3,.3);box(body,.4,1.6,.46,.12,.65,.12,0x936747);
  box(station,-1.5,.6,1.4,.7,1.2,.7,0x546480);ball(station,-1.5,.68,1.78,.23,0x263c52);
 }
 const effects=new THREE.Group();effects.visible=false;
 for(let i=0;i<9;i++){
  const p=new THREE.Group();p.userData.phase=i/9*Math.PI*2;
  const color=spec.job==='artist'?[0xf297ba,0x74ccbf,0xf4cf71][i%3]:spec.job==='mechanic'?0xffdb73:spec.job==='fisher'?0x79cadf:spec.job==='gardener'?0xf2a9cd:spec.job==='baker'?0xe9b46a:0xb49de1;
  if(spec.job==='gardener'){
   ball(p,0,0,0,.11,0xffde7c);for(let j=0;j<5;j++)ball(p,Math.cos(j*1.256)*.16,Math.sin(j*1.256)*.16,0,.12,color);
  }else if(spec.job==='fisher'){
   const fish=ball(p,0,0,0,.17,color);fish.scale.set(1.6,.65,.6);const tail=box(p,-.26,0,0,.16,.22,.1,color);tail.rotation.z=Math.PI/4;
  }else if(spec.job==='musician'){
   ball(p,0,0,0,.1,color);box(p,.08,.2,0,.035,.4,.04,color);box(p,.18,.38,0,.24,.06,.04,color);
  }else if(spec.job==='baker'){
   const loaf=ball(p,0,0,0,.17,color);loaf.scale.set(1,.65,1.5);
  }else if(spec.job==='artist')ball(p,0,0,0,.14,color);
  else{box(p,0,0,0,.38,.055,.06,color);box(p,0,0,0,.055,.38,.06,color);}
  effects.add(p);
 }
 mesh.userData.workStation=station;
 return {mesh,station,effects,spec,effectRemaining:0,effectCooldown:0,near:false,triggerCount:0};
}

export function animateWorkingResident(resident,time,reducedMotion=false){
 const a=resident.mesh.userData,wave=reducedMotion?0:Math.sin(time*3),job=resident.spec.job;
 a.rightArm.rotation.x=job==='mechanic'?-.8+wave*.55:job==='artist'?-.65+wave*.25:job==='fisher'?-.65+wave*.08:job==='gardener'?-.8+wave*.2:-.55+wave*.2;
 a.leftArm.rotation.x=job==='musician'?-.5-wave*.3:-.25;
 a.body.rotation.x=job==='gardener'&&!reducedMotion?.06+wave*.025:0;
}

/** Re-enter a resident's vicinity after a cooldown to discover its surprise again. */
export function updateResidentSurprise(r,dt,{player,contact=false,reducedMotion=false}={}){
 r.effectCooldown=Math.max(0,r.effectCooldown-dt);r.effectRemaining=Math.max(0,r.effectRemaining-dt);
 const near=!!player&&Math.abs((player.y||0)-r.mesh.position.y)<3.5&&Math.hypot(player.x-r.mesh.position.x,player.z-r.mesh.position.z)<3.2;
 if(r.effectCooldown===0&&(contact||(near&&!r.near))){r.effectRemaining=1.7;r.effectCooldown=6;r.triggerCount++;}
 r.near=near;r.effects.visible=r.effectRemaining>0;
 r.effects.position.set(r.mesh.position.x,r.mesh.position.y+2.2,r.mesh.position.z);
 if(r.effects.visible){const t=1-r.effectRemaining/1.7;r.effects.children.forEach((p,i)=>{const angle=p.userData.phase+t*1.4,radius=reducedMotion?.9:.3+t*1.7;p.position.set(Math.cos(angle)*radius,reducedMotion?.8:Math.sin(t*Math.PI)*1.8+i*.04,Math.sin(angle)*radius);p.rotation.z=reducedMotion?0:angle;p.scale.setScalar(Math.max(.02,Math.min(1,(1-t)*4)));});}
 return r.effects.visible;
}
