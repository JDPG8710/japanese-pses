import {THREE} from './Arcade3D.mjs';
export const FRUIT_TYPES=Object.freeze([
 {id:'apple',color:0xe94643,flesh:0xffedb2},{id:'orange',color:0xffa325,flesh:0xffc34d},
 {id:'pear',color:0xb8d34b,flesh:0xfff2bc},{id:'watermelon',color:0x52aa53,flesh:0xf65475},
 {id:'strawberry',color:0xee4963,flesh:0xff99a5},{id:'pineapple',color:0xe8b842,flesh:0xffe77a}
]);
export const FRUIT_SIZES=Object.freeze([{id:'small',radius:.3,points:30},{id:'medium',radius:.44,points:20},{id:'large',radius:.6,points:10}]);
export const FRUIT_BOMBS=Object.freeze([{id:'classic',lives:1,color:0xffb44a},{id:'spike',lives:2,color:0xff676b},{id:'clock',seconds:5,color:0xc594ff},{id:'ice',freeze:1.2,color:0x77dbff}]);
export function createFruitVisuals(){
 const resources=new Set(),materials=new Map(),geometries=new Map();
 const own=r=>(resources.add(r),r),geometry=(id,fn)=>{if(!geometries.has(id))geometries.set(id,own(fn()));return geometries.get(id);};
 function texture(kind,flesh=false){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
  const spec=FRUIT_TYPES.find(f=>f.id===kind);c.fillStyle='#'+(flesh?spec.flesh:spec.color).toString(16).padStart(6,'0');c.fillRect(0,0,512,256);
  let seed=kind.length*871;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(!flesh&&kind==='watermelon'){for(let i=0;i<10;i++){c.beginPath();for(let y=0;y<=256;y+=4){const x=i*54+Math.sin(y*.025+i)*8;y?c.lineTo(x,y):c.moveTo(x,y);}c.lineWidth=18;c.strokeStyle='#21603b';c.stroke();}}
  if(!flesh&&kind==='pineapple'){for(let y=-32;y<288;y+=32)for(let x=-32;x<544;x+=32){const at=x+(Math.floor(y/32)%2)*16;c.strokeStyle='#aa822f';c.lineWidth=2;c.beginPath();c.moveTo(at,y-18);c.lineTo(at+16,y);c.lineTo(at,y+18);c.lineTo(at-16,y);c.closePath();c.stroke();c.fillStyle='#f8d26a';c.fillRect(at-2,y-2,4,4);}}
  const seeds=kind==='strawberry'?150:kind==='watermelon'&&flesh?50:900;
  for(let i=0;i<seeds;i++){const x=rnd()*512,y=rnd()*256;c.fillStyle=kind==='strawberry'?'#ffde92':kind==='watermelon'&&flesh?'#542a35':i%2?'#ffffff19':'#52221b18';c.beginPath();c.ellipse(x,y,kind==='strawberry'?2.2:kind==='watermelon'&&flesh?2.5:.9,kind==='strawberry'?3.5:kind==='watermelon'&&flesh?4:1.4,rnd(),0,Math.PI*2);c.fill();}
  const shade=c.createLinearGradient(0,0,0,256);shade.addColorStop(0,'#ffffff25');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(1,'#00000018');c.fillStyle=shade;c.fillRect(0,0,512,256);
  const t=own(new THREE.CanvasTexture(canvas));t.colorSpace=THREE.SRGBColorSpace;return t;
 }
 function material(id,color,map){if(!materials.has(id))materials.set(id,own(new THREE.MeshStandardMaterial({color:map?0xffffff:color,map,roughness:.52,metalness:0})));return materials.get(id);}
 const sphere=()=>geometry('sphere',()=>new THREE.SphereGeometry(1,40,28));
 function leaf(group,x,y,z,angle,size=.5){const m=new THREE.Mesh(sphere(),material('leaf',0x3f934c));m.scale.set(size*.25,size*.65,.07);m.position.set(x,y,z);m.rotation.z=angle;group.add(m);}
 function fruit(kind,radius){
  const spec=FRUIT_TYPES.find(f=>f.id===kind),group=new THREE.Group();group.userData={fruit:kind,textured:true};
  let geo=sphere();
  if(kind==='pear'||kind==='strawberry')geo=geometry(kind,()=>{const profile=kind==='pear'?[[0,-1],[.5,-.9],[.85,-.55],[.9,-.1],[.67,.35],[.35,.7],[.25,1],[0,1.1]]:[[0,-1],[.22,-.8],[.58,-.3],[.84,.25],[.87,.65],[.7,.88],[0,1]];const curve=new THREE.CatmullRomCurve3(profile.map(([x,y])=>new THREE.Vector3(x,y,0)));return new THREE.LatheGeometry(curve.getPoints(64).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),40);});
  const skin=materials.get(kind)||material(kind,spec.color,texture(kind));const body=new THREE.Mesh(geo,skin);group.add(body);
  if(kind==='apple'){body.scale.set(1,.87,1);leaf(group,.2,.96,0,-.7,.62);}
  if(kind==='watermelon')body.scale.set(1.12,.86,.94);
  if(kind==='orange')leaf(group,.16,1,0,-.9,.42);
  if(kind==='pear')leaf(group,.24,1.1,0,-.7,.6);
  if(kind==='strawberry')for(let i=0;i<5;i++)leaf(group,Math.sin(i*1.256)*.34,.91,Math.cos(i*1.256)*.34,i*1.256,.55);
  if(kind==='pineapple'){body.scale.set(.83,1.1,.83);for(let i=0;i<7;i++)leaf(group,Math.sin(i*.9)*.3,1.3+((i%2)*.2),Math.cos(i*.9)*.3,Math.sin(i*.9)*.7,.9);}
  if(!['strawberry','pineapple','watermelon'].includes(kind)){const stem=new THREE.Mesh(geometry('stem',()=>new THREE.CylinderGeometry(.05,.08,.28,12)),material('stem',0x765338));stem.position.y=kind==='pear'?1.16:1;group.add(stem);}
  group.scale.setScalar(radius);return group;
 }
 function bomb(kind,radius){
  const spec=FRUIT_BOMBS.find(b=>b.id===kind),g=new THREE.Group();g.userData={bomb:kind};
  const body=new THREE.Mesh(kind==='ice'?geometry('ice',()=>new THREE.IcosahedronGeometry(1,1)):sphere(),material('bomb-'+kind,kind==='ice'?0x85dfff:0x293243));g.add(body);
  const band=new THREE.Mesh(geometry('band',()=>new THREE.TorusGeometry(.94,.055,10,48)),material('warning-'+kind,spec.color));band.rotation.x=Math.PI/2;g.add(band);
  if(kind==='spike')for(let i=0;i<8;i++){const cone=new THREE.Mesh(geometry('spike',()=>new THREE.ConeGeometry(.18,.42,12)),material('spikes',0xf17c85));cone.position.set(Math.sin(i*Math.PI/4)*1.03,Math.cos(i*Math.PI/4)*1.03,0);cone.rotation.z=-i*Math.PI/4;g.add(cone);}
  if(kind==='clock'){const dial=new THREE.Mesh(geometry('dial',()=>new THREE.CircleGeometry(.7,40)),material('clock-face',0xffefda));dial.position.z=1.01;g.add(dial);const hand=new THREE.Mesh(geometry('hand',()=>new THREE.BoxGeometry(.07,.55,.03)),material('clock-hand',0x795bc9));hand.position.set(0,.2,1.04);g.add(hand);const hour=hand.clone();hour.position.set(.16,0,1.04);hour.rotation.z=Math.PI/2;hour.scale.y=.6;g.add(hour);for(let i=0;i<12;i++){const dot=new THREE.Mesh(sphere(),material('clock-hand',0x795bc9));dot.scale.setScalar(.035);dot.position.set(Math.sin(i*Math.PI/6)*.58,Math.cos(i*Math.PI/6)*.58,1.04);g.add(dot);}}
  else if(kind==='classic'){const fuse=new THREE.Mesh(geometry('fuse',()=>new THREE.CylinderGeometry(.07,.07,.5,12)),material('fuse',0xd9bf8b));fuse.position.y=1.1;fuse.rotation.z=-.3;g.add(fuse);const spark=new THREE.Mesh(sphere(),material('spark',0xffc55b));spark.scale.setScalar(.15);spark.position.set(.09,1.36,0);g.add(spark);}
  g.scale.setScalar(radius);return g;
 }
 function half(kind,radius,side){
  const spec=FRUIT_TYPES.find(f=>f.id===kind),g=new THREE.Group();
  const shell=new THREE.Mesh(geometry('half-'+side,()=>new THREE.SphereGeometry(1,32,20,side>0?-Math.PI/2:Math.PI/2,Math.PI)),materials.get(kind)||material(kind,spec.color,texture(kind)));g.add(shell);
  const disk=new THREE.Mesh(geometry('slice',()=>new THREE.CircleGeometry(1,40)),materials.get('flesh-'+kind)||material('flesh-'+kind,spec.flesh,texture(kind,true)));disk.rotation.y=side>0?-Math.PI/2:Math.PI/2;g.add(disk);g.scale.setScalar(radius);return g;
 }
 return{fruit,bomb,half,dispose(){resources.forEach(r=>r.dispose());resources.clear();}};
}
