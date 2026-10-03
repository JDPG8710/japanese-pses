import {THREE} from './Arcade3D.mjs';
const COLORS={classic:0xffae46,spike:0xff647a,clock:0xc397ff,ice:0x83e7ff};
const LABELS={zh:{classic:'砰！−1 ♥',spike:'尖刺爆炸！−2 ♥',clock:'时间爆炸！−5秒',ice:'冰爆！刀刃冻结'},en:{classic:'BOOM! −1 ♥',spike:'SPIKE BOOM! −2 ♥',clock:'TIME BLAST! −5s',ice:'ICE BURST! Frozen blade'},ja:{classic:'ドーン！−1 ♥',spike:'とげ爆発！−2 ♥',clock:'時計爆発！−5秒',ice:'氷の爆発！刃がこおる'}};
export function createFruitExplosion(parent,locale='en'){
 const sphere=new THREE.SphereGeometry(1,16,12),ring=new THREE.RingGeometry(.78,1,48),active=[];
 function remove(e){parent.remove(e.group);e.group.traverse(o=>{o.material?.map?.dispose();o.material?.dispose();});}
 function add(point,kind){
  if(active.length>=8)remove(active.shift());
  const group=new THREE.Group();group.position.set(point.x,point.y,point.z+.1);parent.add(group);
  const color=COLORS[kind]||COLORS.classic;
  function mesh(geo,c){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c,transparent:true,depthWrite:false,side:THREE.DoubleSide}));group.add(m);return m;}
  const core=mesh(sphere,kind==='ice'?0xe8ffff:0xfff4ca),shock=mesh(ring,color);shock.position.z=.3;
  const clouds=Array.from({length:7},(_,i)=>{const m=mesh(sphere,kind==='ice'?0xb0f4ff:kind==='clock'?0xd8bbff:0x72657f);m.position.set(Math.cos(i*.897)*.25,Math.sin(i*.897)*.25,-.08);return m;});
  let label=null;
  if(typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=128;const c=canvas.getContext('2d');c.font='bold 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=9;c.strokeStyle='#16243b';c.fillStyle='#ffffff';const text=(LABELS[locale]||LABELS.en)[kind];c.strokeText(text,320,64);c.fillText(text,320,64);
   const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;label=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false}));label.position.set(0,.8,.5);label.scale.set(3.6,.72,1);group.add(label);
  }
  active.push({group,core,shock,clouds,label,age:0,kind});update(0);
 }
 function update(dt){for(let i=active.length-1;i>=0;i--){const e=active[i];e.age+=dt;const t=e.age/.72;if(t>=1){remove(e);active.splice(i,1);continue;}
  e.core.scale.setScalar(.18+Math.min(1,t*4)*.55);e.core.material.opacity=Math.max(0,1-t*2.3);
  e.shock.scale.setScalar(.28+2.3*t);e.shock.material.opacity=(1-t)*.95;
  e.clouds.forEach((m,n)=>{const angle=n*.897;m.position.set(Math.cos(angle)*(.2+t*1.05),Math.sin(angle)*(.2+t*.8)+t*.3,-.08);m.scale.setScalar(.1+t*.31);m.material.opacity=.65*(1-t);});
  if(e.label){e.label.position.y=.8+t*.55;e.label.material.opacity=Math.min(1,(1-t)*3);}
 }}
 function clear(){active.forEach(remove);active.length=0;}
 return {add,update,clear,dispose(){clear();sphere.dispose();ring.dispose();},get active(){return active.map(e=>({kind:e.kind,age:e.age}));}};
}
