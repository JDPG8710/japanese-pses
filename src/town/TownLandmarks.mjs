import {THREE,box,ball} from './Models3D.mjs';
export const LANDMARK_HEIGHTS={obby:14,tower:23,runner:15,memory:13,garden:12,gear:13,fruit:14,breakout:15,race:12,ninja:16,bubble:13,rhythm:13};
const COLORS=[0xff747d,0xffca58,0x69dfc0,0x65b9ff,0xaa86ef];
function shape(g,geometry,x,y,z,color){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
const cylinder=(g,x,y,z,r,h,c)=>shape(g,new THREE.CylinderGeometry(r,r,h,12),x,y,z,c);
const cone=(g,x,y,z,r,h,c)=>shape(g,new THREE.ConeGeometry(r,h,8),x,y,z,c);
const ring=(g,x,y,z,r,c)=>shape(g,new THREE.TorusGeometry(r,.16,6,24),x,y,z,c);
function windows(g,height,c=0xffedac){for(const x of [-2.98,2.98])for(let y=1.8;y<height;y+=1.8)for(const z of [-1.4,1.2])box(g,x,y,z,.06,.85,.8,c);}
export function buildLandmark(parent,b,title){
 const g=new THREE.Group();g.name=`landmark-${b.id}`;g.userData.theme=b.id;g.position.set(b.x,0,b.z);parent.add(g);
 box(g,0,.04,-3,3,.08,6,0xffedb9);box(g,0,.08,0,5.8,.16,5.8,0xf8efd7);
 // All lower walls preserve the tested walk-in doorway and collision footprint.
 for(const x of [-2.65,2.65])box(g,x,2,0,.6,4,5.8,b.color);
 box(g,0,2,2.65,5.8,4,.6,b.color);box(g,0,3.75,-2.7,5.8,.5,.6,0xfff4d8);
 for(const x of [-2.1,2.1])box(g,x,1.8,-2.94,.2,3.6,.12,0xfff3cf);
 if(b.id==='obby'){
  box(g,0,4.3,0,6.5,.6,6.5,0x67b9da);
  for(let i=0;i<5;i++){const x=(i%2?1:-1)*1.5,y=5+i*1.3;box(g,x,y,0,2.6,.35,2.6,COLORS[i]);cone(g,x,y-.6,0,1.2,1,0xc39bce);}
  for(const x of [-2.5,2.5]){cylinder(g,x,7,-1.4,.2,6,0xfaf5ff);cone(g,x,10.5,-1.4,.6,1.5,0xffb259);}
  ring(g,0,12,0,1.1,0xffcf54);for(const x of [-2,0,2])ball(g,x,4.5,2,1.1,0xf3fbff);
 }else if(b.id==='tower'){
  cylinder(g,0,11,0,2.65,14,0x7775d1);windows(g,16);
  for(let i=0;i<16;i++){const a=i*.68;const m=box(g,Math.cos(a)*2.2,4.6+i*.75,Math.sin(a)*2.2,2.1,.24,1.3,COLORS[i%5]);m.rotation.y=-a;}
  for(const x of [-2.3,2.3]){cylinder(g,x,5,1.7,.6,10,0xa28ce3);cone(g,x,11,1.7,.95,2,0x5e49a4);}
  cone(g,0,20,0,2.7,4,0x633dba);cylinder(g,0,22,0,.1,2,0xffd461);box(g,.55,22.1,0,1.1,.7,.05,0xffae66);
 }else if(b.id==='runner'){
  for(const x of [-2,2]){cylinder(g,x,7,.5,.75,7,0xf6fcff);cone(g,x,11.5,.5,.8,2.4,0xff8b62);for(const side of [-1,1])box(g,x+side*.7,4.5,.5,.3,1.8,1.6,0x508ad6);}
  for(let i=0;i<3;i++)ring(g,0,6+i*.15,-1,2-i*.2,COLORS[i+1]);
  box(g,0,4.25,0,6.2,.5,6.2,0x4265a4);ball(g,0,11.5,1,1.4,0x67e8d6);ring(g,0,11.5,1,2.2,0xffda66).rotation.x=.5;
 }else if(b.id==='memory'){
  box(g,0,4.3,0,6.6,.6,6.6,0x27305f);
  for(let layer=0;layer<3;layer++)for(let x=0;x<3;x++)for(let z=0;z<3;z++)box(g,(x-1)*1.65,5.5+layer*1.65,(z-1)*1.65,1.5,1.5,1.5,COLORS[(x+z+layer)%5]);
  const crown=box(g,0,11.4,0,2,2,2,0xffffff);crown.rotation.set(.35,.6,.35);
 }else if(b.id==='garden'){
  const roof=shape(g,new THREE.CylinderGeometry(3.2,3.2,5.5,12,1,false,0,Math.PI),0,5,0,0x8ae8ca);roof.rotation.z=Math.PI/2;roof.rotation.y=Math.PI/2;
  roof.material.transparent=true;roof.material.opacity=.6;roof.material.depthWrite=false;
  for(const x of [-2.5,0,2.5]){const arch=ring(g,x,5,0,2.6,0xf4f0c6);arch.rotation.y=Math.PI/2;}
  for(const x of [-2,0,2]){cylinder(g,x,4.9,1.5,.1,2,0x367b47);for(let i=0;i<5;i++)ball(g,x+Math.cos(i*1.256)*.5,6.2+Math.sin(i*1.256)*.5,1.5,.35,0xffa57e);ball(g,x,6.2,1.45,.3,0xffdc58);}
  cylinder(g,1,8,0,.15,4,0x4d9b5e);const leaf=ball(g,1.6,9,0,1,0x87cc67);leaf.scale.set(1,.35,.6);
 }else if(b.id==='gear'){
  box(g,0,5,0,6.2,2,6.2,0x4b8a9a);for(const x of [-2,0,2])box(g,x,4,-3,.9,.4,1.5,0xffc65a);
  for(const [x,y,r]of [[-1.1,8,1.8],[1.6,9.8,1.3]]){ring(g,x,y,0,r,0xffc65a);for(let i=0;i<10;i++){const a=i*Math.PI/5,m=box(g,x+Math.cos(a)*r,y+Math.sin(a)*r,0,.6,.6,.6,0xffd778);m.rotation.z=a;}}
  cylinder(g,-2,7,2,.4,6,0x49536a);for(let i=0;i<3;i++)ball(g,-2,10+i*.7,2,.4+i*.15,0xdbeff6);
 }else if(b.id==='fruit'){
  box(g,0,4.3,0,6.6,.5,6.6,0x70af65);for(let i=0;i<7;i++)box(g,-2.7+i*.9,3.8,-3.3,.85,.4,1.4,i%2?0xffffff:0xff8d88);
  ball(g,0,7,0,2.4,0xfa797b);cylinder(g,0,9.5,0,.16,1.2,0x558957);const leaf=ball(g,.7,9.7,0,.8,0x80c457);leaf.scale.y=.3;
  for(const x of [-2,2])for(let y=1;y<3;y++)box(g,x,y,-2.65,.9,.5,.6,0xe2ad62);
  for(let i=0;i<6;i++)ball(g,Math.sin(i)*1.7,5.2,Math.cos(i)*1.7,.45,[0xffd663,0xff934f,0xa7d968][i%3]);
 }else if(b.id==='breakout'){
  box(g,0,5.4,0,6.5,3,6.5,0x292c5f);box(g,0,6,-3.3,5.3,2,.1,0x10213f);
  for(let y=0;y<3;y++)for(let x=0;x<5;x++)box(g,-2.1+x*1.05,5.3+y*.55,-3.4,.85,.35,.15,COLORS[(x+y)%5]);
  for(const x of [-2.7,2.7])cylinder(g,x,7,0,.2,13,0x72edff);
  for(let i=0;i<5;i++)box(g,(i-2)*1.1,8+i%2,0,1,.5,3,COLORS[i]);ball(g,0,11,0,.75,0xfff9cd);ring(g,0,11,0,1.5,0xf382d2);
 }else if(b.id==='race'){
  box(g,0,4.3,0,6.8,.6,6.5,0xe75d51);for(let i=0;i<8;i++)for(let j=0;j<2;j++)box(g,-2.8+i*.8,4.7+j*.5,-2.8,.75,.45,.2,(i+j)%2?0xffffff:0x26324a);
  for(const x of [-2.3,2.3]){cylinder(g,x,6,1,.7,3.5,0x374960);cone(g,x,8.2,1,.9,1,0xffda64);}
  const wheel=shape(g,new THREE.TorusGeometry(1.7,.5,8,16),0,8,0,0x26314b);ring(g,0,8,-.1,1.15,0xf7d96a);for(let i=0;i<5;i++){const spoke=box(g,0,8,0,.12,2.3,.18,0xdbedf4);spoke.rotation.z=i*Math.PI/5;}
  for(const x of [-2,2])box(g,x,1.3,-2.95,.5,.3,.1,0x9ae9ff);
 }else if(b.id==='bubble'){
  box(g,0,4.3,0,6.5,.6,6.5,0x65b9df);for(let i=0;i<7;i++){const bubble=ball(g,Math.sin(i*2.4)*2,6+i*.6,Math.cos(i*2.4)*1.5,.85,COLORS[i%5]);bubble.material.roughness=.15;}ring(g,0,10.8,0,1.6,0xffffff);
 }else if(b.id==='rhythm'){
  box(g,0,4.3,0,6.5,.6,6.5,0x804f9d);for(let i=0;i<4;i++){cylinder(g,(i%2?1:-1)*1.5,5.4+Math.floor(i/2)*1.8,0,1,1.4,COLORS[i]);cylinder(g,(i%2?1:-1)*1.5,6.15+Math.floor(i/2)*1.8,0,1.1,.12,0xfff1d0);}for(const x of [-1,1]){const stick=box(g,x,10,0,.2,3,.2,0xffda9e);stick.rotation.z=x*.5;}
 }else if(b.id==='ninja'){
  for(let level=0;level<3;level++){const y=4.4+level*3,w=7-level*1.3;box(g,0,y,0,w,.35,w,0x2f3052);for(const side of [-1,1]){const roof=box(g,side*w*.22,y+.6,0,w*.56,.35,w,0x4d4770);roof.material.color.setHex(0x4d4770);roof.rotation.z=side*.28;}if(level<2)box(g,0,y+1.4,0,w-2,2.4,w-2,0xebc2aa);}
  for(const x of [-2,2]){cylinder(g,x,2.6,-2.9,.17,5,0xac394b);ball(g,x,3,-3.05,.38,0xffd582);}
  cone(g,0,14,0,.7,1.6,0xffd379);
 }
 // Distinct street-level facades, not just differently colored roofs.
 const facade={obby:[0x62cde3,0xffce62],tower:[0x9b87d8,0xffd173],runner:[0x397cb4,0x65eadc],memory:[0xce8fc8,0x84d8f1],garden:[0x79af66,0xf5efcc],gear:[0x3b697b,0xffc65d],fruit:[0xf58d83,0xffeeaf],breakout:[0x252c59,0x62e8ff],race:[0xd95058,0xffffff],ninja:[0x53394f,0xf7bd82],bubble:[0x499cca,0xb3fff0],rhythm:[0x9a599e,0xffdc77]}[b.id];
 for(const side of [-1,1]){
  for(let row=0;row<3;row++)box(g,side*2.6,.65+row*1.05,-3,.58,.8,.2,b.id==='memory'?COLORS[(row+(side>0?2:0))%5]:facade[0]);
  box(g,side*2.25,1.7,-3.03,.13,3.3,.12,facade[1]);
  for(let z=-1.4;z<=1.4;z+=1.4){box(g,side*2.98,1.95,z,.08,1.65,.92,facade[1]);box(g,side*3.04,1.95,z,.04,1.4,.72,b.id==='breakout'?0xb395ec:0x91cbd0);}
 }
 if(b.id==='gear')for(let y=.5;y<3.4;y+=.55)box(g,0,y,2.98,5.8,.06,.04,0xf2ca94);
 if(b.id==='garden')for(const x of [-1.7,1.7]){box(g,x,.45,-3.3,.8,.7,.5,0xc4946b);ball(g,x,1,-3.3,.5,0x91c96d);}
 // Measure the finished model, including flags and antennae, before placing the sign.
 const roof=new THREE.Box3().setFromObject(g).max.y;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#101c36';ctx.beginPath();ctx.roundRect(8,8,1008,240,48);ctx.fill();
 ctx.strokeStyle='#ffffff';ctx.lineWidth=10;ctx.stroke();ctx.fillStyle='#ffffff';
 ctx.font='800 126px "Segoe UI", "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(title,512,132,920);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,toneMapped:false,fog:false}));
 sign.name='floating-game-name';sign.userData.title=title;sign.scale.set(12,3,1);sign.position.set(0,roof+3.8,0);g.add(sign);
 const orbit=ring(g,0,roof+1,0,2,0xffffff);orbit.name='name-orbit';orbit.rotation.x=Math.PI/2;
 // Billboard lettering never turns edge-on; a gentle roll accompanies the rotating halo.
 g.userData.floatingName={sign,orbit,roof,phase:Math.abs(b.x+b.z)*.13};
 g.userData.height=LANDMARK_HEIGHTS[b.id];return g;
}

export function updateLandmarkNames(environment,camera,time,viewportHeight,reducedMotion=false){
 const point=new THREE.Vector3();
 for(const model of environment.children){
  const item=model.userData.floatingName;if(!item)continue;
  const {sign,orbit,roof,phase}=item,t=reducedMotion?0:time;
  sign.getWorldPosition(point);const distance=camera.position.distanceTo(point);
  // Keep distant names legible on phones without allowing unlimited map-wide banners.
  const unitsPerPixel=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,viewportHeight);
  const width=THREE.MathUtils.clamp(unitsPerPixel*144,12,22);sign.scale.set(width,width/4,1);
  sign.position.y=roof+width/8+2.3+(reducedMotion?0:Math.sin(t*1.4+phase)*.3);
  sign.material.rotation=reducedMotion?0:Math.sin(t*.8+phase)*.045;
  sign.material.color.setHSL((t*.055+phase)%1,.8,.76);
  orbit.rotation.z=t*.7+phase;orbit.rotation.y=reducedMotion?0:Math.sin(t*.6+phase)*.25;
  orbit.material.color.copy(sign.material.color);
 }
}
