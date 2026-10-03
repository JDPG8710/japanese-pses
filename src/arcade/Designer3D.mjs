import * as THREE from '../town/vendor/three.module.js';
import {prepareCelebration} from './DesignerCelebration.mjs';
import {renderDesignPart} from './DesignerRender.mjs';

const U=.01;
export function designShape(p){
 const s=new THREE.Shape();
 if(p.kind==='path'){
  const tokens=p.path.match(/[MLQCZ]|-?\d*\.?\d+/g);let i=0,command='';
  const number=()=>Number(tokens[i++]);
  while(i<tokens.length){if(/^[A-Z]$/.test(tokens[i]))command=tokens[i++];
   if(command==='M'){s.moveTo(number()*U,-number()*U);command='L';}
   else if(command==='L')s.lineTo(number()*U,-number()*U);
   else if(command==='Q')s.quadraticCurveTo(number()*U,-number()*U,number()*U,-number()*U);
   else if(command==='C')s.bezierCurveTo(number()*U,-number()*U,number()*U,-number()*U,number()*U,-number()*U);
   else if(command==='Z'){s.closePath();command='';}
   else throw new Error('Unsupported design path');
  }
 }else{
  const w=p.w*U,h=p.h*U,r=Math.min(p.radius? p.radius*U:.12,w/3,h/3);
  s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 }
 return s;
}
const DEPTH={plane:.85,car:1.65,phone:.14,rocket:1.02,robot:.78,boat:1.35,building:2.3};
export function designPartDepth(kit,p){
 if(p.mechanic)return p.mechanic.depth;
 if(p.kind==='drawing')return .01;
 if(kit.category==='phone')return p.kind==='phone-body'?.14:.018;
 const profiles={
  plane:{fuselage:.85,tail:.065,'near-wing':.065,'far-wing':.065,tailplane:.065},
  car:{body:1.65,cab:1.65,cargo:1.65,chassis:1.35,mirror:.15,exhaust:.16,spare:.22},
  rocket:{core:1.28,'fin-0':.045,'fin-1':.045},
  robot:{torso:.78,head:.65,neck:.42,waist:.5,antenna:.04},
  boat:{hull:1.35,deck:1.35,cabin:.9,mast:.14,boom:.11,mainsail:.015,jib:.015,keel:.06,rudder:.06,flag:.012},
  building:{foundation:2.5,'ground-floor':2.3,'upper-floor':2.3,roof:2.5,chimney:.43,balcony:.55,canopy:.55,steps:.5}
 };
 if(profiles[kit.category]?.[p.id]!==undefined)return profiles[kit.category][p.id];
 if(kit.category==='robot'&&/arm|leg|hand|foot/.test(p.id))return .4;
 if(kit.category==='robot'&&/shoulder|elbow/.test(p.id))return .42;
 if(p.kind==='wheel')return kit.category==='boat'?.07:.22;
 if(p.kind==='solar'||p.kind==='stripe'||p.kind==='wordmark'||p.kind==='cargo-mark')return .015;
 if(p.kind==='rack'||p.kind==='gear')return .035;
 if(p.kind==='planter')return .25;
 return .035;
}
// A drawing's bounding rectangle is not a solid mechanical component.
function landingGear(part,p){
 const h=p.h*U,r=p.w*U*.22,wheelY=-h*.31;
 const metal=new THREE.MeshStandardMaterial({color:p.color,metalness:.7,roughness:.3});
 const strut=new THREE.Mesh(new THREE.CylinderGeometry(.025,.032,h*.81,16),metal);
 strut.position.y=h*.095;part.add(strut);
 for(const z of [-.055,.055]){
  const tire=new THREE.Mesh(new THREE.TorusGeometry(r*.76,r*.24,12,32),new THREE.MeshStandardMaterial({color:'#172431',roughness:.9}));
  tire.position.set(0,wheelY,z);part.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.5,.025,24),metal);
  hub.rotation.x=Math.PI/2;hub.position.copy(tire.position);part.add(hub);
 }
}
function disposeGroup(group){const textures=new Set(),materials=new Set(),geometries=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
function partTexture(doc,p){const c=doc.createElement('canvas'),scale=Math.min(2,512/Math.max(p.w,p.h));c.width=Math.ceil(p.w*scale+8);c.height=Math.ceil(p.h*scale+8);const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.scale(scale,scale);renderDesignPart(ctx,{...p,x:0,y:0,rotation:0,scale:1},{shadow:false});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return {texture:t,w:c.width/scale*U,h:c.height/scale*U};}

/** Each installed part has a closed solid, two visible surfaces, and its edited pose/color. */
export function createDesignModel(kit,parts,{doc=null,demo=false,strokes=[],cutaway=false}={}){
 const model=new THREE.Group(),depth=DEPTH[kit.category]||1,b=kit.bounds;
 const placed=parts.filter(p=>p.placed||demo);const visible=placed.length?placed:parts;
 for(const source of visible){const ghost=!placed.length||(cutaway&&!source.engineering&&source.kind!=='drawing');let p=demo?{...source,x:source.tx,y:source.ty,rotation:0,scale:1}:source;const part=new THREE.Group();const aircraft=kit.category==='plane',engine=aircraft&&p.kind==='engine',wing=aircraft&&/^(near-wing|far-wing)$/.test(p.id);if(engine){const ref=kit.parts.find(q=>q.id==='engine-a');p={...p,w:ref.w,h:ref.h};}if(wing)p={...p,w:230,h:164,path:'M -50 -4 L -165 -170 L -100 -170 L 65 4 Z'};part.userData.partId=p.id;part.userData.engineering=Boolean(p.engineering);part.userData.color=p.color;part.userData.ghost=ghost;
  const phone=kit.category==='phone'&&!p.engineering&&p.kind!=='drawing',rear=phone&&p.tx>430;
  part.position.set((phone?(p.x-(rear?590:287))*(rear?-1:1):p.x-b.x-b.w/2)*U,-(p.y-b.y-b.h/2)*U,0);
  part.rotation.z=-(p.rotation||0)*Math.PI/180;part.scale.setScalar(p.scale||1);
  let thickness=designPartDepth(kit,p);part.userData.thickness=thickness;
  const circular=['lens','wheel','badge','flash','sensor'].includes(p.kind);
  let geometry;
  if(kit.category==='car'&&kit.parts.some(q=>q.id==='cab')&&p.id==='windshield')p={...p,w:155};
  if(p.kind==='drawing'||(aircraft&&p.kind==='gear')||p.kind==='rack'){geometry=new THREE.BoxGeometry(.01,.01,.01);}
  else if(kit.category==='boat'&&p.id==='hull'){geometry=new THREE.SphereGeometry(1,64,32,0,Math.PI*2,Math.PI/2,Math.PI/2);geometry.scale(p.w*U/2,p.h*U*.86,depth/2);geometry.translate(0,p.h*U*.41,0);}
  else if(kit.category==='boat'&&p.id==='deck'){geometry=new THREE.CylinderGeometry(1,1,p.h*U,64);geometry.scale(p.w*U/2,1,depth/2);thickness=p.h*U;}
  else if(aircraft&&p.id==='livery'){const points=[];for(let i=0;i<=48;i++){const x=-p.w*U/2+p.w*U*i/48,rx=(p.x+x/U-460)/330,ry=(p.y-285)/46;points.push(new THREE.Vector3(x,0,depth/2*Math.sqrt(Math.max(.025,1-rx*rx-ry*ry))+.012));}geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,p.h*U/2,8,false);}
  else if(aircraft&&p.id==='fuselage'){geometry=new THREE.SphereGeometry(1,64,32);geometry.scale(p.w*U/2,p.h*U/2,depth/2);}
  else if(p.mechanic?.shape==='rings'){geometry=new THREE.TorusGeometry((p.w*U+p.mechanic.depth)/4-.008,.008,12,32);geometry.rotateX(Math.PI/2);}
  else if(p.mechanic&&['piston','liner','valve','bolt'].includes(p.mechanic.shape)){geometry=new THREE.CylinderGeometry(p.w*U/2,p.w*U/2,p.h*U,32,1,p.mechanic.shape==='liner');}
  else if(p.mechanic?.shape==='shaft'){geometry=new THREE.CylinderGeometry(p.h*U/2,p.h*U/2,p.w*U,32);geometry.rotateZ(Math.PI/2);}
  else if(p.kind==='engine'&&kit.category==='plane'){geometry=new THREE.CylinderGeometry(p.h*U*.46,p.h*U*.43,p.w*U,36);geometry.rotateZ(Math.PI/2);thickness=p.h*U;}
  else if(kit.category==='rocket'&&/^(core|booster-\d|nose|booster-cap-\d|engine|nozzle-\d)$/.test(p.id)){const nose=/nose|cap/.test(p.id),nozzle=/engine|nozzle/.test(p.id);geometry=new THREE.CylinderGeometry(nose?0:p.w*U*(nozzle?.3:.5),p.w*U/2,p.h*U,40);thickness=p.w*U;}
  else if(circular){geometry=new THREE.CylinderGeometry(p.w*U/2,p.w*U/2,thickness,32);geometry.rotateX(Math.PI/2);geometry.scale(1,p.h/p.w,1);}
  else{geometry=new THREE.ExtrudeGeometry(designShape(p),{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(.025,p.w*U*.025,p.h*U*.025),bevelThickness:Math.min(.018,thickness*.15),curveSegments:12});geometry.translate(0,0,-thickness/2);}
  const glass=/window|screen|lens|glass|cockpit|face/.test(p.kind+' '+p.id),material=new THREE.MeshStandardMaterial({color:p.color,metalness:glass?.35:.32,roughness:glass?.18:.48,transparent:ghost||Boolean(p.mechanic?.cutaway)||p.mechanic?.shape==='liner',opacity:ghost?.2:p.mechanic?.cutaway?.18:p.mechanic?.shape==='liner'?.25:1,wireframe:ghost||Boolean(p.mechanic?.cutaway)});
  const solid=new THREE.Mesh(geometry,material);solid.castShadow=true;solid.receiveShadow=true;part.add(solid);
  if(aircraft&&p.kind==='gear'){solid.visible=false;landingGear(part,p);}
  if(p.kind==='rack'){
   solid.visible=false;const rail=(w,h,x,y)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,thickness),material);mesh.position.set(x,y,0);part.add(mesh);};
   if(kit.category==='car'){
    for(const z of [-depth*.43,depth*.43]){const side=new THREE.Mesh(new THREE.BoxGeometry(p.w*U,.025,.025),material);side.position.set(0,p.h*U/2,z);part.add(side);for(const x of [-p.w*U/2,p.w*U/2]){const post=new THREE.Mesh(new THREE.BoxGeometry(.025,p.h*U,.025),material);post.position.set(x,0,z);part.add(post);}}
    for(const x of [-p.w*U/2,p.w*U/2]){const cross=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,depth*.86),material);cross.position.set(x,p.h*U/2,0);part.add(cross);}
   }else{rail(p.w*U,.025,0,p.h*U/2);rail(p.w*U,.025,0,-p.h*U/2);const count=Math.max(2,Math.ceil(p.w/55));for(let i=0;i<=count;i++)rail(.018,p.h*U,-p.w*U/2+p.w*U*i/count,0);}
  }
  if(p.kind==='drawing'){solid.visible=false;for(const ink of p.ink||[]){const points=ink.points.map(q=>new THREE.Vector3(q.x*U,-q.y*U,0));if(points.length>1){const curve=new THREE.CatmullRomCurve3(points),tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(600,Math.max(8,points.length*2)),ink.size*U/2,8,false),new THREE.MeshStandardMaterial({color:ink.color,roughness:.5}));part.add(tube);}}}
  if(doc&&['status','icons','wordmark','case','cargo-mark'].includes(p.kind))solid.visible=false;
  if(p.kind==='engine'&&kit.category==='plane'){const ring=new THREE.Mesh(new THREE.TorusGeometry(p.h*U*.4,p.h*U*.045,8,32),new THREE.MeshStandardMaterial({color:'#b8cbd9',metalness:.65,roughness:.25}));ring.rotation.y=Math.PI/2;ring.position.x=p.w*U/2;part.add(ring);const fan=new THREE.Mesh(new THREE.CircleGeometry(p.h*U*.36,32),new THREE.MeshStandardMaterial({color:'#19394b',side:THREE.DoubleSide}));fan.rotation.y=Math.PI/2;fan.position.x=p.w*U/2+.003;part.add(fan);for(let i=0;i<12;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.012,p.h*U*.28,.017),new THREE.MeshStandardMaterial({color:'#9cb5c7',metalness:.4}));const angle=i*Math.PI/6;blade.position.set(p.w*U/2+.012,Math.cos(angle)*p.h*U*.18,Math.sin(angle)*p.h*U*.18);blade.rotation.x=angle;part.add(blade);}}
  if(phone){part.position.z=(rear?-1:1)*(p.kind==='phone-body'?0:depth/2+p.z*.007);if(rear)part.rotation.y=Math.PI;}
  else if(thickness<depth*.8)part.position.z=depth/2+thickness/2+.006;
  if(kit.category==='robot'&&/^(head|torso|neck|waist|arm-\d|leg-\d|hand-\d|foot-\d|shoulder-\d|elbow-\d|antenna)$/.test(p.id))part.position.z=0;
  if(kit.category==='rocket'&&(p.kind==='solar'||/^fin-/.test(p.id)))part.position.z=0;
  if(aircraft){
   if(wing){part.position.set((490-b.x-b.w/2+(p.x-p.tx))*U,-(285-b.y-b.h/2+(p.y-p.ty))*U,p.id==='near-wing'?.28:-.28);part.rotation.x=p.id==='near-wing'?Math.PI/2:-Math.PI/2;}
   if(p.id==='tail')part.position.z=0;
   if(p.id==='livery'){part.position.z=0;const reverse=solid.clone();reverse.scale.z=-1;part.add(reverse);}
   if(p.id==='tailplane'){part.scale.y*=2.5;part.position.y=-(285-b.y-b.h/2+(p.y-p.ty))*U;part.position.z=0;part.rotation.x=Math.PI/2;}
   if(engine){const ref=kit.parts.find(q=>q.id==='engine-a'),jet=kit.name.en.includes('Jet');part.position.set(((jet?ref.tx:450)-b.x-b.w/2+p.x-p.tx)*U,-((jet?285:330)-b.y-b.h/2+p.y-p.ty)*U,p.id==='engine-a'?(jet?.7:1.25):-(jet?.7:1.25));}
   if(/window|cockpit/.test(p.id)){const rx=(p.tx-460)/330,ry=(p.ty-285)/46;part.position.z=depth/2*Math.sqrt(Math.max(.025,1-rx*rx-ry*ry))+.035+(p.z||0)*.002;}
   if(p.id==='emblem')part.position.z=designPartDepth(kit,{id:'tail'})/2+thickness/2+.006;
   if(p.id==='winglet')part.position.set((390-b.x-b.w/2+p.x-p.tx)*U,-(285-b.y-b.h/2+p.y-p.ty)*U,1.98);
   if(p.kind==='gear'){
    const contact=380,pivot=contact-p.h*.31-p.w*.22;
    part.position.y=-(pivot-b.y-b.h/2+p.y-p.ty)*U;
    part.position.z=p.id==='gear-a'?.32:0;
   }
   if(p.id==='wing-light'){
    part.position.set((390-b.x-b.w/2+p.x-p.tx)*U,-(285-b.y-b.h/2+p.y-p.ty)*U,1.98);
   }
  }
  if(kit.category==='car'){
   const truck=kit.parts.some(q=>q.id==='cab');
   if(truck&&p.id==='windshield'){part.position.x=(166-b.x-b.w/2+p.x-p.tx)*U;part.position.z=0;part.rotation.y=-Math.PI/2;}
   if(truck&&/^(grille|headlight|bumper)$/.test(p.id)){part.position.x=(118-b.x-b.w/2+p.x-p.tx)*U;part.rotation.y=-Math.PI/2;part.position.z=p.id==='headlight'?.48:0;}
   if(truck&&p.id==='cargo-lock'){part.position.x=(777-b.x-b.w/2+p.x-p.tx)*U;part.position.z=0;part.rotation.y=Math.PI/2;}
   if(!truck&&/^(lamp|intake|tail-light)$/.test(p.id)){const front=p.id!=='tail-light';part.position.x=((front?791:130)-b.x-b.w/2+p.x-p.tx)*U;part.position.z=p.id==='intake'?0:.52;part.rotation.y=front?Math.PI/2:-Math.PI/2;}
   if(p.id==='spare'){part.position.z=0;part.rotation.y=-Math.PI/2;}
   if(/spoiler|roof-rack/.test(p.id)){part.position.z=0;if(p.kind!=='rack')solid.scale.z=depth/thickness;}
  }
  if(kit.category==='boat'&&/mast|boom|mainsail|jib|keel|rudder|flag/.test(p.id))part.position.z=0;
  if(kit.category==='boat'&&p.id==='cabin')part.position.z=0;
  if(kit.category==='boat'&&p.id==='glass')part.position.z=.9/2+thickness/2+.006;
  if(kit.category==='boat'&&p.id==='deck')part.position.z=0;if(kit.category==='boat'&&/porthole/.test(p.id)){const rx=(p.tx-450)/310,ry=(p.ty-380)/109;part.position.z=depth/2*Math.sqrt(Math.max(.025,1-rx*rx-ry*ry))+.025;}
  if(kit.category==='building'&&p.id==='solar'){part.position.z=0;part.rotation.x=-Math.PI/2;part.position.y=-(98-b.y-b.h/2+p.y-p.ty)*U;}
  if(kit.category==='building'&&p.id==='chimney')part.position.z=0;
  if(kit.category==='building'&&p.id==='rail')part.position.z=depth/2+.5;
  if(p.mechanic){part.position.z=0;part.rotation.x=p.bankAngle||0;
   if(p.bankAngle){const prefix=p.id.split(/-(?:head|cam|liner|piston|rings|rod|bearing|spark|valve|bolt)-/)[0],crank=parts.find(q=>q.id===prefix+'-crankshaft');if(crank){const pivot=-(crank.ty-b.y-b.h/2)*U,dy=-(p.ty-crank.ty)*U;part.position.y+=dy*(Math.cos(p.bankAngle)-1);part.position.z=dy*Math.sin(p.bankAngle)-(p.bankAngle>0?.27:-.27)+(crank.depthPosition||0);}}
  }
  part.position.z+=p.depthPosition||0;part.rotation.x+=(p.tilt||0)*Math.PI/180;part.rotation.y+=(p.turn||0)*Math.PI/180;
  if(engine&&!kit.name.en.includes('Jet')){const pylon=new THREE.Mesh(new THREE.BoxGeometry(.3,.22,.06),new THREE.MeshStandardMaterial({color:p.color,metalness:.35,roughness:.4}));pylon.position.y=.35;part.add(pylon);}
  const roundRocket=kit.category==='rocket'&&/^(core|booster-\d|nose|booster-cap-\d|engine|nozzle-\d)$/.test(p.id);
  if(doc&&!ghost&&!roundRocket&&!p.mechanic&&p.kind!=='drawing'&&p.kind!=='gear'&&p.kind!=='rack'&&!engine&&!wing&&!(kit.category==='boat'&&/^(hull|deck)$/.test(p.id))&&!(aircraft&&/^(fuselage|livery)$/.test(p.id))){const t=partTexture(doc,p),decalMaterial=new THREE.MeshStandardMaterial({map:t.texture,transparent:true,roughness:glass?.22:.6,metalness:.12,depthWrite:false});
   const front=new THREE.Mesh(new THREE.PlaneGeometry(t.w,t.h),decalMaterial);front.position.z=thickness/2+.003;part.add(front);
   if(!phone){const back=front.clone();back.rotation.y=Math.PI;back.position.z=-thickness/2-.003;part.add(back);}
  }
  model.add(part);
  // Wheels form a real axle pair, visible from the opposite side as well.
  if((!phone||p.symmetric===true)&&p.symmetric!==false&&!p.mechanic&&Math.abs(part.position.z)>.01&&!wing&&!engine){const opposite=part.clone(true);opposite.position.z=-part.position.z;opposite.scale.z*=-1;opposite.userData.mirrored=true;opposite.traverse(m=>{if(m.material?.map){const mat=m.material.clone();mat.map=m.material.map.clone();mat.map.repeat.x=-1;mat.map.offset.x=1;mat.map.needsUpdate=true;m.material=mat;}});model.add(opposite);}if(kit.category==='plane'&&p.id==='tailplane'&&p.symmetric!==false){const opposite=part.clone(true);opposite.scale.y*=-1;opposite.userData.mirrored=true;model.add(opposite);}
 }
 if(doc&&strokes.length&&kit.category==='phone'){
  for(const [cx,rear]of [[287,false],[590,true]]){
   const c=doc.createElement('canvas');c.width=376;c.height=806;const ink=c.getContext('2d');ink.scale(2,2);ink.translate(94-cx,201.5-294);
   for(const s of strokes){ink.globalCompositeOperation=s.erase?'destination-out':'source-over';ink.strokeStyle=s.color;ink.lineWidth=s.size;ink.lineCap='round';ink.lineJoin='round';ink.beginPath();s.points.forEach((p,i)=>i?ink.lineTo(p.x,p.y):ink.moveTo(p.x,p.y));ink.stroke();}
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.88,4.03),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));mesh.position.set(0,-(294-b.y-b.h/2)*U,(rear?-1:1)*.145);if(rear)mesh.rotation.y=Math.PI;model.add(mesh);
  }
 }
 if(doc&&strokes.length&&kit.category!=='phone'){
  const c=doc.createElement('canvas');c.width=1024;c.height=Math.ceil(1024*b.h/b.w);const ink=c.getContext('2d');ink.scale(c.width/b.w,c.height/b.h);ink.translate(-b.x,-b.y);
  for(const s of strokes){ink.globalCompositeOperation=s.erase?'destination-out':'source-over';ink.strokeStyle=s.color;ink.lineWidth=s.size;ink.lineCap='round';ink.lineJoin='round';ink.beginPath();s.points.forEach((p,i)=>i?ink.lineTo(p.x,p.y):ink.moveTo(p.x,p.y));ink.stroke();}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const inkMesh=new THREE.Mesh(new THREE.PlaneGeometry(b.w*U,b.h*U),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));inkMesh.position.z=depth/2+.23;model.add(inkMesh);const reverse=inkMesh.clone();reverse.position.z=-inkMesh.position.z;reverse.scale.z=-1;model.add(reverse);
 }
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());model.position.sub(center);model.userData.radius=Math.max(.8,box.getSize(new THREE.Vector3()).length()/2);model.userData.partCount=visible.length;return model;
}

export function createDesigner3D(canvas){
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});}catch{return null;}
 renderer.setPixelRatio(Math.min(canvas.ownerDocument.defaultView.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8edf3');scene.add(new THREE.HemisphereLight('#f4fbff','#596b83',2.4));
 for(const [x,y,z,power]of [[4,6,7,3],[-5,3,-6,2]]){const light=new THREE.DirectionalLight('#ffffff',power);light.position.set(x,y,z);scene.add(light);}
 const camera=new THREE.PerspectiveCamera(38,1,.01,200),pointers=new Map();let model=null,yaw=.45,pitch=.18,zoom=1,disposed=false,pinched=false,animation=null;
 const state=()=>({yaw,pitch,zoom,parts:model?.userData.partCount||0,meshes:renderer.info.render.calls,celebrating:Boolean(animation),elapsed:animation?.elapsed||0});
 function render(){if(disposed)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();const fov=Math.min(camera.fov*Math.PI/180,2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)),distance=(model?.userData.radius||3)/Math.sin(fov/2)*1.06*(animation?1.3:1)/zoom;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);}
 function update(kit,parts,options={}){finishCelebration();if(model){scene.remove(model);disposeGroup(model);}model=createDesignModel(kit,parts,{doc:canvas.ownerDocument,...options});scene.add(model);render();}
 function down(e){e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinched=pointers.size>1;}
 function move(e){if(!pointers.has(e.pointerId))return;e.preventDefault();const old=pointers.get(e.pointerId),other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>5)zoom=Math.max(.55,Math.min(2.5,zoom*after/before));}else if(!pinched){yaw-=(e.clientX-old.x)*.008;pitch=Math.max(-1.5,Math.min(1.5,pitch+(e.clientY-old.y)*.008));}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});render();}
 function up(e){pointers.delete(e.pointerId);if(!pointers.size)pinched=false;}
 function wheel(e){e.preventDefault();zoom=Math.max(.55,Math.min(2.5,zoom*Math.exp(-e.deltaY*.001)));render();}
 for(const [name,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up]])canvas.addEventListener(name,fn);canvas.addEventListener('wheel',wheel,{passive:false});
 function finishCelebration(){if(!animation)return;const a=animation;animation=null;canvas.ownerDocument.defaultView.cancelAnimationFrame(a.raf);a.effect.destroy();a.resolve();render();}
 function celebrate(category,duration=6500){finishCelebration();return new Promise(resolve=>{const win=canvas.ownerDocument.defaultView,a={resolve,effect:prepareCelebration(scene,model,category),elapsed:0,last:win.performance.now(),raf:0};animation=a;const step=now=>{if(animation!==a||disposed)return;const dt=Math.min(.1,(now-a.last)/1000);a.last=now;if(!canvas.ownerDocument.hidden)a.elapsed+=dt;a.effect.frame(a.elapsed,Math.min(1,a.elapsed*1000/duration));render();if(a.elapsed*1000>=duration)finishCelebration();else a.raf=win.requestAnimationFrame(step);};a.raf=win.requestAnimationFrame(step);});}
 function setView(view){const views={front:[0,0],back:[Math.PI,0],left:[-Math.PI/2,0],right:[Math.PI/2,0],top:[0,1.48],bottom:[0,-1.48],reset:[.45,.18]};if(views[view]){[yaw,pitch]=views[view];zoom=1;}render();}
 return {update,render,setView,state,celebrate,finishCelebration,zoomBy(v){zoom=Math.max(.55,Math.min(2.5,zoom*v));render();},clearPointers(){pointers.clear();pinched=false;},exportImage(){render();return canvas.toDataURL('image/png');},destroy(){finishCelebration();disposed=true;for(const [name,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up]])canvas.removeEventListener(name,fn);canvas.removeEventListener('wheel',wheel);if(model)disposeGroup(model);renderer.dispose();renderer.forceContextLoss();}};
}
