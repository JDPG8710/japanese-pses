/** Vehicle classes with metre-scale proportions and distinct driving characteristics. */

export const RACE_CARS = Object.freeze([
  Object.freeze({
    id: 'sports',
    accel: 38,
    topSpeed: 42,
    brake: 52,
    handling: 2.4,
    grip: 1.0,
    mass: 1.0,
    color: 0x6ff0ad,
    accent: 0xffffff,
    profile: 'coupe'
  }),
  Object.freeze({
    id: 'gt',
    accel: 30,
    topSpeed: 52,
    brake: 44,
    handling: 1.85,
    grip: 0.92,
    mass: 1.25,
    color: 0x57dfff,
    accent: 0xffe6a8,
    profile: 'gt'
  }),
  Object.freeze({
    id: 'openwheel',
    accel: 48,
    topSpeed: 46,
    brake: 58,
    handling: 2.9,
    grip: 1.12,
    mass: 0.85,
    color: 0xff5c7a,
    accent: 0xffffff,
    profile: 'open'
  }),
  Object.freeze({
    id: 'kart',
    accel: 44,
    topSpeed: 34,
    brake: 60,
    handling: 3.4,
    grip: 1.2,
    mass: 0.7,
    color: 0xffd45e,
    accent: 0xff6b4a,
    profile: 'kart'
  })
]);

export function getRaceCar(id) {
  return RACE_CARS.find(c => c.id === id) || RACE_CARS[0];
}

/** Authored sports-car surfaces in metres, with independent wheels and damageable panels. */
export function makeRaceCarMesh(THREE, boxMesh, carDef, {ghost=false}={}) {
 const g=new THREE.Group(),chassis=new THREE.Group();g.add(chassis);
 const profile=carDef.profile,open=profile==='open',kart=profile==='kart',gt=profile==='gt';
 const paint=new THREE.MeshPhysicalMaterial({color:carDef.color,metalness:.8,roughness:.22,clearcoat:1,clearcoatRoughness:.13});
 const carbon=new THREE.MeshStandardMaterial({color:0x14191e,metalness:.2,roughness:.55});
 const rubber=new THREE.MeshStandardMaterial({color:0x111317,roughness:.94});
 const chrome=new THREE.MeshStandardMaterial({color:0xafbbc4,metalness:.94,roughness:.22});
 const glass=new THREE.MeshPhysicalMaterial({color:0x244352,metalness:.2,roughness:.09,transparent:true,opacity:.66,depthWrite:false,side:THREE.DoubleSide,clearcoat:1});
 const interior=new THREE.MeshStandardMaterial({color:0x242c32,roughness:.9});
 const red=new THREE.MeshStandardMaterial({color:0x8e1012,emissive:0xff1810,emissiveIntensity:.8});
 const white=new THREE.MeshStandardMaterial({color:0xeefaff,emissive:0xc9eaff,emissiveIntensity:2});
 const caliper=new THREE.MeshStandardMaterial({color:0xdb4530,metalness:.25,roughness:.5});
 const damage=[];g.userData={wheels:[],chassis,damage,brakeMaterial:red,radius:kart?.27:.35};
 function mesh(geometry,material,x=0,y=0,z=0,parent=chassis){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
 const box=(w,h,d,mat,x,y,z,parent=chassis)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
 function tube(points,r,mat,parent=chassis){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*4),r,6,false),mat,0,0,0,parent);}
 function pane(v,mat){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(geo,mat);}
 // Loft a continuous shoulder/bonnet, including raised wheel openings at both axles.
 function shell(rings){
  const pos=[],idx=[];
  for(const [z,w,top,side,bottom] of rings){
   const arch=Math.max(0,1-Math.min(Math.abs(z-1.37),Math.abs(z+1.35))/.48);
   const sill=Math.max(bottom,.18+arch*.54);
   for(const [x,y] of [[-w*.8,bottom],[-w,sill],[-w,side],[-w*.68,top],[0,top+.018],[w*.68,top],[w,side],[w,sill],[w*.8,bottom]])pos.push(x,y,z);
  }
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<8;k++){const a=j*9+k,b=a+9;idx.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const m=mesh(geo,paint);damage.push({mesh:m,base:new Float32Array(pos)});return m;
 }
 const halfLength=kart?1.25:2.3,wheelZ=kart?.78:1.36,wheelX=open?1.02:kart?.86:.93,radius=kart?.27:.35;
 if(!open&&!kart){
  const rings=[[-2.25,.72,.66,.55,.27],[-2.05,.9,.76,.63,.23],[-1.72,.97,.83,.67,.21],[-1.35,.98,.84,.67,.2],[-.96,.91,.79,.65,.21],[-.5,.9,.72,.61,.21],[0,.9,.7,.61,.21],[.88,.91,.72,.61,.21],[1.36,.98,.7,.64,.21],[1.72,.95,.65,.56,.23],[2.08,.87,.52,.44,.26],[2.28,.7,.43,.35,.28]];
  shell(rings);
  // Close both bumper ends; the passenger compartment remains separate from the shell.
  pane([[-.7,.28,2.28],[.7,.28,2.28],[.7,.43,2.28],[-.7,.43,2.28]],paint);
  pane([[.72,.27,-2.25],[-.72,.27,-2.25],[-.72,.66,-2.25],[.72,.66,-2.25]],paint);
  box(1.6,.13,3.65,carbon,0,.23,0);
  // Tinted glazing, roof, pillars and visible twin bucket seats.
  pane([[-.79,.73,.91],[.79,.73,.91],[.61,1.23,.14],[-.61,1.23,.14]],glass);
  pane([[.77,.8,-1.33],[-.77,.8,-1.33],[-.6,1.2,-.72],[.6,1.2,-.72]],glass);
  pane([[-.61,1.23,.14],[.61,1.23,.14],[.6,1.2,-.72],[-.6,1.2,-.72]],paint);
  for(const side of [-1,1]){
   pane([[side*.79,.73,.84],[side*.61,1.23,.14],[side*.6,1.2,-.72],[side*.77,.8,-1.25]],glass);
   tube([[side*.8,.73,.91],[side*.61,1.25,.14],[side*.6,1.22,-.72],[side*.79,.8,-1.33]],.038,paint);
   tube([[side*.79,.75,.89],[side*.84,.69,0],[side*.79,.8,-1.28]],.018,chrome);
   tube([[side*.615,1.22,-.38],[side*.81,.73,-.43]],.027,carbon);
   // Door shut lines, handles, side sill, vents and mirrored glass.
   tube([[side*.908,.66,.59],[side*.924,.32,.45],[side*.924,.31,-.89],[side*.916,.71,-1]],.008,carbon);
   box(.025,.035,.2,chrome,side*.925,.65,-.65);
   box(.1,.13,2.2,carbon,side*.96,.24,-.07);
   box(.24,.105,.32,paint,side*1.08,.81,.68);
   box(.2,.07,.025,chrome,side*1.08,.815,.51);
   for(let i=0;i<3;i++)box(.2,.02,.035,carbon,side*.64,.73,1.2+i*.09);
   const seat=box(.47,.55,.17,interior,side*.37,.79,-.52);seat.rotation.x=-.16;
   box(.47,.13,.56,interior,side*.37,.5,-.28);box(.24,.2,.13,interior,side*.37,1.04,-.54);
   const exhaust=mesh(new THREE.CylinderGeometry(.085,.085,.24,16),chrome,side*.54,.3,-2.21);exhaust.rotation.x=Math.PI/2;
   const hole=mesh(new THREE.CircleGeometry(.061,16),carbon,side*.54,.3,-2.338);hole.rotation.y=Math.PI;
   // Wraparound LED strips and a red rear light signature.
   box(.46,.055,.055,white,side*.59,.49,2.1);
   box(.53,.055,.055,red,side*.55,.64,-2.18);
  }
  box(1.43,.18,.15,carbon,0,.33,2.17);
  for(let i=-6;i<=6;i++)box(.018,.13,.016,chrome,i*.092,.33,2.254);
  box(1.84,.045,.32,carbon,0,.21,2.07);
  box(1.72,.13,.24,carbon,0,.24,-2.08);
  for(let x=-.6;x<=.61;x+=.3)box(.025,.17,.4,carbon,x,.24,-2.05);
  box(1.22,.2,.31,interior,0,.72,.53);
  const steering=mesh(new THREE.TorusGeometry(.16,.023,8,24),rubber,.36,.85,.32);steering.rotation.x=-.35;
  if(gt){for(const x of [-.6,.6])box(.055,.36,.09,carbon,x,.95,-1.88);box(2.05,.065,.38,carbon,0,1.13,-1.87);for(const x of [-1.03,1.03])box(.035,.21,.42,carbon,x,1.12,-1.87);}
 }else{
  // Open-wheel profiles keep their exposed suspension and cockpit proportions.
  const length=kart?2.1:4.3,width=kart?1.25:1.02;
  const shape=new THREE.Shape();shape.moveTo(-width/2,-length/2);shape.lineTo(width/2,-length/2);shape.lineTo(width*.28,length/2);shape.lineTo(-width*.28,length/2);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelSize:.09,bevelThickness:.06,bevelSegments:3});geo.rotateX(Math.PI/2);geo.translate(0,.51,0);mesh(geo,paint);
  box(.65,.42,.22,interior,0,.68,-.5);box(.65,.13,.65,interior,0,.46,-.22);
  const wheel=mesh(new THREE.TorusGeometry(.17,.025,8,20),rubber,0,.73,.2);wheel.rotation.x=-.4;
  if(open){box(1.9,.065,.42,carbon,0,.27,2.05);box(1.75,.07,.37,carbon,0,.89,-1.93);for(const x of [-.55,.55])box(.055,.52,.07,carbon,x,.61,-1.93);tube([[-.33,.61,-.53],[-.35,.95,-.37],[0,1.01,.42],[.35,.95,-.37],[.33,.61,-.53]],.032,carbon);}
  else tube([[-.9,.25,-1.1],[-1,.25,1],[0,.25,1.18],[1,.25,1],[.9,.25,-1.1]],.055,chrome);
 }
 for(const side of [-1,1])for(const z of [-wheelZ,wheelZ]){
  const pivot=new THREE.Group();pivot.position.set(side*wheelX,radius,z);pivot.userData.front=z>0;
  const rolling=new THREE.Group();pivot.add(rolling);g.add(pivot);g.userData.wheels.push(pivot);
  const tire=mesh(new THREE.CylinderGeometry(radius,radius,.29,32),rubber,0,0,0,rolling);tire.rotation.z=Math.PI/2;
  for(const face of [-1,1]){
   const lip=mesh(new THREE.TorusGeometry(radius*.73,.018,6,28),chrome,face*.151,0,0,rolling);lip.rotation.y=Math.PI/2;
   const rotor=mesh(new THREE.CylinderGeometry(radius*.6,radius*.6,.012,24),chrome,face*.1,0,0,rolling);rotor.rotation.z=Math.PI/2;
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const spoke=box(.018,radius*1.22,.035,chrome,face*.16,0,0,rolling);spoke.rotation.x=a;}
   const hub=mesh(new THREE.CylinderGeometry(.06,.06,.02,12),carbon,face*.17,0,0,rolling);hub.rotation.z=Math.PI/2;
   for(let i=0;i<24;i++){const a=i*Math.PI*2/24;const tread=box(.25,.008,.012,carbon,0,Math.cos(a)*(radius+.002),Math.sin(a)*(radius+.002),rolling);tread.rotation.x=a;}
  }
  box(.06,.17,.1,caliper,side*.09,0,-.16,pivot);
  if(open||kart)for(const y of [.28,.43])tube([[side*.4,y,z-.13],[side*wheelX,radius,z]],.022,chrome);
  else {const arch=mesh(new THREE.TorusGeometry(radius+.055,.045,8,24,Math.PI),paint,side*.95,radius,z);arch.rotation.y=Math.PI/2;}
 }
 // Batch stationary details by material to keep desktop/mobile draw calls bounded.
 function batch(parent){
  const buckets=new Map();for(const child of [...parent.children]){
   if(!child.isMesh||damage.some(d=>d.mesh===child)||child.material===red)continue;
   child.updateMatrix();const transformed=child.geometry.clone().applyMatrix4(child.matrix);const geo=transformed.index?transformed.toNonIndexed():transformed;if(geo!==transformed)transformed.dispose();
   if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(geo);parent.remove(child);child.geometry.dispose();
  }
  for(const [mat,geos] of buckets){const merged=new THREE.BufferGeometry();for(const attr of ['position','normal']){const arrays=geos.map(q=>q.getAttribute(attr)?.array);if(arrays.some(a=>!a))continue;const data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){data.set(a,at);at+=a.length;}merged.setAttribute(attr,new THREE.BufferAttribute(data,3));}geos.forEach(q=>q.dispose());mesh(merged,mat,0,0,0,parent);}
 }
 batch(chassis);for(const wheel of g.userData.wheels)batch(wheel.children[0]);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 if(ghost)g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;}});
 return g;
}

export function updateRaceCar(mesh,{speed=0,steering=0,brake=0,impact=0,damage=0,dt=0}={}) {
 if(!mesh)return;
 const data=mesh.userData;
 data.chassis.rotation.z=steering*Math.min(Math.abs(speed)/45,1)*.025+Math.sin(impact*34)*Math.min(impact,.3)*.08;
 data.chassis.rotation.x=brake*Math.min(Math.abs(speed)/35,1)*.018;
 data.chassis.position.y=Math.sin(impact*28)*Math.min(impact,.3)*.025;
 data.brakeMaterial.emissiveIntensity=brake?3.5:.8;
 for(const w of data.wheels){w.rotation.y=w.userData.front?-steering*.38:0;w.children[0].rotation.x+=speed*dt/(mesh.userData.radius||.35);}
 if(data.appliedDamage!==damage){
  for(const {mesh:panel,base} of data.damage){const p=panel.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],end=Math.max(0,(Math.abs(z)-1.6)/.7);p.setXYZ(i,x*(1-damage*end*.035),y-damage*end*.12*(.6+.4*Math.sin(x*17)),z-Math.sign(z)*damage*end*.24);}p.needsUpdate=true;panel.geometry.computeVertexNormals();}
  data.appliedDamage=damage;
 }
}
