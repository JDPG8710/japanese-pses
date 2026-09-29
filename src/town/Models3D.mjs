import * as THREE from './vendor/three.module.js';
import {AVATARS} from './ArcadeRules.mjs?v=2';
export {THREE};
export function box(parent,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function ball(parent,x,y,z,r,color){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),new THREE.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
export function label(parent,text,x,y,z,{width=4,color='#294d5e',background='#fff9e9',size=42}={}){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.beginPath();ctx.roundRect(3,3,506,122,22);ctx.fill();ctx.fillStyle=color;ctx.font=`bold ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67,470);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));m.position.set(x,y,z);m.scale.set(width,width/4,1);parent.add(m);return m;
}
export function makeAvatar(character='explorer',accessory=null,colorOverride,gear=[]){
 const a=AVATARS.find(a=>a.id===character)||AVATARS[0],g=new THREE.Group(),body=new THREE.Group();g.add(body);const color=colorOverride??a.color,skin=a.skin;
 const leftLeg=box(body,-.24,.48,0,.38,.8,.47,0x466685),rightLeg=box(body,.24,.48,0,.38,.8,.47,0x466685);
 const shoeColor=gear.includes('spring')?0xbe9de1:gear.includes('shoes')?0x67baa1:0xf8f4e8;box(leftLeg,0,-.36,.08,.42,.2,.64,shoeColor);box(rightLeg,0,-.36,.08,.42,.2,.64,shoeColor);
 box(body,0,1.2,0,.94,.75,.55,color);box(body,0,1.37,.285,.32,.18,.03,0xffeb9f);
 const leftArm=new THREE.Group(),rightArm=new THREE.Group();leftArm.position.set(-.66,1.52,0);rightArm.position.set(.66,1.52,0);body.add(leftArm,rightArm);
 for(const arm of [leftArm,rightArm]){box(arm,0,-.22,0,.33,.53,.43,color);box(arm,0,-.57,0,.34,.3,.43,skin);}
 box(body,0,2.02,0,.85,.8,.75,skin);
 if(character==='robot'){box(body,0,2.04,.39,.71,.41,.06,0x264656);for(const x of [-.19,.19])box(body,x,2.09,.43,.13,.13,.03,0x75f5ce);box(body,0,2.55,0,.08,.25,.08,0x647c94);ball(body,0,2.7,0,.13,0xffd15f);}
 else{
  for(const x of [-.18,.18])box(body,x,2.08,.39,.075,.1,.035,0x28343f);box(body,0,1.87,.391,.18,.045,.035,0xa86456);
  if(character!=='astro')box(body,0,2.43,-.025,.91,.18,.82,character==='cat'?0x725695:0x684b3c);
 }
 if(character==='cat'){for(const x of [-.32,.32]){const ear=box(body,x,2.65,0,.28,.36,.28,color);ear.rotation.z=x>0?-.2:.2;box(body,x,2.64,.15,.12,.18,.03,0xf5b1c0);}box(body,0,1.05,-.58,.18,.18,.7,color);}
 if(character==='astro'){box(body,0,2.47,0,1,.15,.96,0xeef4fa);box(body,0,1.63,0,1,.12,.96,0xeef4fa);for(const x of [-.47,.47])box(body,x,2.05,0,.12,.88,.96,0xeef4fa);box(body,0,2.16,.4,.75,.08,.04,0x6ac9ea);box(body,0,1.23,-.44,.65,.68,.3,0xc6d4e2);}
 if(character==='frog'){box(body,0,2.43,0,.99,.22,.9,0x67a45c);for(const x of [-.3,.3]){ball(body,x,2.64,.1,.22,0x89cf7c);box(body,x,2.67,.29,.08,.09,.05,0x273a37);}}
 if(character==='builder'){box(body,0,2.51,0,.93,.23,.84,0xf9c846);box(body,0,2.4,.09,1.14,.08,1.03,0xf5c33c);box(body,0,1.2,.3,.16,.65,.04,0xffed8e);}
 if(character==='explorer'){box(body,0,2.47,0,1.09,.1,.95,0xb9854e);box(body,0,2.62,-.04,.73,.24,.66,0xcdab70);}
 if(accessory==='backpack'){box(body,0,1.25,-.5,.75,.8,.4,0xef9560);box(body,0,1.12,-.73,.5,.32,.08,0xffca8c);}
 if(accessory==='crown'){box(body,0,2.72,0,1,.14,.8,0xffd15b);for(const x of [-.4,0,.4])box(body,x,2.88,.33,.16,.27,.13,0xffd15b);}
 g.userData={body,leftLeg,rightLeg,leftArm,rightArm};return g;
}
export function animateAvatar(g,time,moving){const a=g.userData,walk=moving?Math.sin(time*11)*.55:0;a.leftArm.rotation.x=walk;a.rightArm.rotation.x=-walk;a.leftLeg.rotation.x=-walk*.65;a.rightLeg.rotation.x=walk*.65;a.body.position.y=moving?Math.abs(Math.sin(time*11))*.06:0;}
export function disposeGroup(g){g.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m?.map?.dispose();m?.dispose();}});g.clear();}
export function previewAvatar(canvas,character,accessory,colorOverride,gear=[]){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(Math.max(240,canvas.clientWidth),220,false);renderer.setClearColor(0xeff3e8,1);
 const world=new THREE.Scene();world.add(new THREE.HemisphereLight(0xffffff,0x566b61,2.7));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(4,6,5);world.add(sun);const person=makeAvatar(character,accessory,colorOverride,gear);world.add(person);const camera=new THREE.PerspectiveCamera(34,renderer.domElement.width/renderer.domElement.height,.1,30);camera.position.set(0,2.5,6);camera.lookAt(0,1.45,0);let angle=.3,id,drag;
 const down=e=>{drag=e.clientX;canvas.setPointerCapture(e.pointerId);},move=e=>{if(drag!==undefined){angle+=(e.clientX-drag)*.015;drag=e.clientX;}},up=()=>{drag=undefined;};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 function frame(){person.rotation.y=angle;renderer.render(world,camera);id=requestAnimationFrame(frame);}frame();
 return ()=>{cancelAnimationFrame(id);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);disposeGroup(world);renderer.dispose();renderer.forceContextLoss();};
}
