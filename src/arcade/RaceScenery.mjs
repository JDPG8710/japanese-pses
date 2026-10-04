/** Track-local scenery: continuous asphalt, physical light/shadow, and layered landscapes. */
import {THREE} from './Arcade3D.mjs?v=3';
import {pointAtProgress, projectOnPath, buildPathMetrics} from './RaceTracks.mjs?v=1';

export function disposeRaceScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.isInstancedMesh) o.dispose();
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m) continue;
      materials.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    }
    o.shadow?.dispose();
  });
  geometries.forEach(g => g.dispose());
  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
  scene.userData.raceEnvironment?.dispose();
  scene.environment=null;scene.userData.raceEnvironment=null;
  scene.clear();
}

function noiseTexture(base, variation, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(256, 256);
  let seed = 8710;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const n = (seed / 4294967296 - 0.5) * variation;
    for (let c = 0; c < 3; c++) data.data[i + c] = base[c] + n;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

// Shared vertex positions at each join eliminate cracks and overlapping road slabs.
export function roadRibbon(path, width, y, offset = 0, metrics) {
  const positions = [], uv = [], indices = [];
  for (let i = 0; i <= path.length; i++) {
    const j = i % path.length, p = path[j];
    const prev = path[(j + path.length - 1) % path.length], next = path[(j + 1) % path.length];
    const a = new THREE.Vector2(p.x - prev.x, p.z - prev.z).normalize();
    const b = new THREE.Vector2(next.x - p.x, next.z - p.z).normalize();
    const tangent = a.clone().add(b).normalize();
    const nx = tangent.y, nz = -tangent.x;
    const miter = 1 / Math.max(0.65, tangent.dot(b));
    for (const lateral of [offset - width / 2, offset + width / 2]) {
      positions.push(p.x + nx * lateral * miter, y, p.z + nz * lateral * miter);
      uv.push(lateral / 6, (i === path.length ? metrics.total : metrics.cum[j]) / 6);
    }
    if (i < path.length) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  // Tight inner bends may fold an offset edge; keep every triangle facing up.
  for(let i=0;i<indices.length;i+=3) {
    const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
    const up=(positions[b+2]-positions[a+2])*(positions[c]-positions[a])-(positions[b]-positions[a])*(positions[c+2]-positions[a+2]);
    if(up<0) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildRaceScenery({scene, renderer, group, track, metrics}) {
  const night = track.id === 'neon', harbor = track.id === 'harbor', alpine = track.id === 'mountain';
  const sky = night ? 0x11182d : harbor ? 0x91b8cb : 0xa9cee2;
  renderer.setClearColor(sky, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = night ? 1.05 : 1.0;
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, night ? 120 : 170, 620);
  scene.add(new THREE.HemisphereLight(night ? 0x88a9ed : 0xd5ecff, 0x4e513c, night ? 1.3 : 1.65));
  const sun = new THREE.DirectionalLight(night ? 0xb7cdff : 0xffe0b1, night ? 1.5 : 3.0);
  sun.position.set(-45, 65, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left:-65, right:65, top:65, bottom:-65, near:1, far:180});
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);scene.add(sun.target);group.userData.sun=sun;
  const envScene=new THREE.Scene();envScene.background=new THREE.Color(night?0x33465f:0xc0d8e9);
  const envGeo=new THREE.SphereGeometry(100,16,12),envMat=new THREE.MeshBasicMaterial({color:night?0x445b79:0x9cc3dd,side:THREE.BackSide});
  envScene.add(new THREE.Mesh(envGeo,envMat));
  const panels=[];
  for(const [x,y,z,w,h] of [[-35,35,20,25,50],[25,25,-25,40,12],[0,65,0,70,30]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:night?0xa9c7ee:0xfff3d8,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m);panels.push(m);}
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.06);
  scene.environment=environment.texture;scene.environmentIntensity=.65;scene.userData.raceEnvironment=environment;
  pmrem.dispose();envGeo.dispose();envMat.dispose();panels.forEach(m=>{m.geometry.dispose();m.material.dispose();});

  const skyGeo = new THREE.SphereGeometry(850, 32, 20);
  const skyMat = new THREE.ShaderMaterial({side:THREE.BackSide, depthWrite:false, uniforms:{
    zenith:{value:new THREE.Color(night ? 0x030817 : 0x427da9)},
    horizon:{value:new THREE.Color(night ? 0x344568 : 0xb9d9ed)}
  }, vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;varying vec3 v;void main(){float h=clamp(normalize(v).y,0.,1.);gl_FragColor=vec4(mix(horizon,zenith,pow(h,.55)),1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}'});
  const dome = new THREE.Mesh(skyGeo, skyMat); dome.renderOrder = -1; group.add(dome);group.userData.dome=dome;

  // Batch repeated scenery by shape/material to keep the mobile draw-call count bounded.
  const batches = new Map();
  const shapes = {box:new THREE.BoxGeometry(1,1,1), sphere:new THREE.IcosahedronGeometry(1,2), cone:new THREE.ConeGeometry(1,1,9), cylinder:new THREE.CylinderGeometry(1,1,1,10)};
  const foliage=shapes.sphere.attributes.position;
  for(let i=0;i<foliage.count;i++) {
    const x=foliage.getX(i),y=foliage.getY(i),z=foliage.getZ(i);
    const r=1+0.1*Math.sin(x*31+y*17)*Math.cos(z*23-x*13);
    foliage.setXYZ(i,x*r,y*r,z*r);
  }
  shapes.sphere.computeVertexNormals();
  const dummy = new THREE.Object3D();
  function prop(shape, color, x,y,z, sx,sy,sz, yaw=0, glow=false) {
    const key = `${shape}:${color}:${glow}`;
    if (!batches.has(key)) batches.set(key,{shape,color,glow,matrices:[]});
    dummy.position.set(x,y,z); dummy.scale.set(sx,sy,sz); dummy.rotation.set(0,yaw,0); dummy.updateMatrix();
    batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function box(color,x,y,z,w,h,d,yaw=0,glow=false) {prop('box',color,x,y,z,w,h,d,yaw,glow);}
  function line(color,a,b,y,width,height) {
    box(color,(a.x+b.x)/2,y,(a.z+b.z)/2,width,height,Math.hypot(b.x-a.x,b.z-a.z)+0.05,Math.atan2(b.x-a.x,b.z-a.z));
  }

  // Terrain is genuinely volumetric; the driveable area stays level with the physics surface.
  const groundTex = noiseTexture(harbor ? [139,135,117] : night ? [91,100,94] : [111,131,81], 25, 70);
  const extent=Math.max(...track.path.map(p=>Math.max(Math.abs(p.x),Math.abs(p.z))))+190;
  const land = new THREE.PlaneGeometry(extent*2,extent*2,120,120);
  land.rotateX(-Math.PI / 2);
  const pos = land.attributes.position;
  const colors = [];
  const terrainPath=track.path.filter((_,i)=>i%6===0),terrainMetrics=buildPathMetrics(terrainPath);
  for (let i=0;i<pos.count;i++) {
    const x=pos.getX(i), z=pos.getZ(i), r=Math.hypot(x,z);
    const roadDistance=projectOnPath(terrainPath,terrainMetrics,x,z).dist;
    const hills = Math.max(0,roadDistance-30)*Math.exp(-Math.max(0,roadDistance-140)/200);
    const ridge = 0.22 + 0.25 * Math.sin(x*0.025+1)*Math.cos(z*0.029) + 0.12*Math.sin(x*0.056+z*0.042);
    const h = harbor ? (roadDistance>48?-.9:-.13) : Math.max(0,hills*ridge*(alpine ? 1.2 : night ? 0.3 : 0.52))-0.13;
    pos.setY(i,h);
    const c = new THREE.Color(h>37 ? 0xe1e3da : h>22 ? 0x939b89 : h>8 ? 0x779471 : 0xffffff);
    colors.push(c.r,c.g,c.b);
  }
  land.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); land.computeVertexNormals();
  const terrain = new THREE.Mesh(land,new THREE.MeshStandardMaterial({map:groundTex,roughness:1,vertexColors:true}));
  terrain.receiveShadow=true; group.add(terrain);
  if(harbor) {
    const water=new THREE.Mesh(new THREE.PlaneGeometry(extent*2.8,extent*2.8),new THREE.MeshStandardMaterial({color:0x397e95,roughness:0.27,metalness:0.35,map:noiseTexture([155,188,194],18,95)}));
    water.rotation.x=-Math.PI/2; water.position.y=-0.55; group.add(water);
    for(let i=0;i<26;i++) box(0x7faeb9,70+(i%5)*16,-0.53,-150+i*12,7+(i%4)*3,0.015,0.15);
    // Cargo yards follow the actual waterfront route instead of clustering at origin.
    for(let i=0;i<36;i++){
      const p=pointAtProgress(track.path,metrics,i/36),side=i%2?1:-1;
      const x=p.x+p.nx*side*26,z=p.z+p.nz*side*26;
      if(projectOnPath(track.path,metrics,x,z).dist<18)continue;
      box(i%2?0x547c8e:0xa56348,x,1.6,z,5,3.2,11,p.heading);
      for(let k=-2;k<=2;k++)box(0x354e59,x+Math.cos(p.heading)*2.52,1.6,z+k*1.8,.06,2.9,.08,p.heading);
      if(i%6===0){box(0xd8a347,x,12,z,1.1,24,1.1);box(0xd8a347,x,23.5,z,28,.7,.9,p.heading);box(0x53626b,x+10,18,z,.1,10,.1);}
      if(i%9===0){const sx=p.x+p.nx*side*75,sz=p.z+p.nz*side*75;if(projectOnPath(track.path,metrics,sx,sz).dist>58){box(0x354f60,sx,.6,sz,10,2.3,38,p.heading);box(0xdbddd7,sx,3.7,sz,8,4,8,p.heading);}}
    }
  }

  const offroad=track.id==='offroad';
  const asphaltTex = noiseTexture(offroad?[143,110,69]:[82,86,88],36,1);
  const road = new THREE.Mesh(roadRibbon(track.path,track.width,0.02,0,metrics),new THREE.MeshStandardMaterial({map:asphaltTex,color:offroad?0xc9a175:night?0x7b8398:0xb3b6b9,roughness:0.94}));
  road.receiveShadow=true; group.add(road);
  for(const side of [-1,1]) {
    const shoulder=new THREE.Mesh(roadRibbon(track.path,0.8,0.012,side*(track.width/2+0.4),metrics),new THREE.MeshStandardMaterial({color:0xacaba0,roughness:1}));
    shoulder.receiveShadow=true;group.add(shoulder);
    const edge=new THREE.Mesh(roadRibbon(track.path,0.12,0.026,side*(track.width/2-0.22),metrics),new THREE.MeshStandardMaterial({color:0xf3edcf,roughness:0.9}));
    group.add(edge);
    const curbGeo=roadRibbon(track.path,0.65,0.048,side*(track.width/2+0.4),metrics).toNonIndexed();
    const curbColors=[];
    for(let i=0;i<curbGeo.attributes.position.count;i++) {
      const c=new THREE.Color(Math.floor(i/6)%2?0xe9e4d5:0xb74c40);curbColors.push(c.r,c.g,c.b);
    }
    curbGeo.setAttribute('color',new THREE.Float32BufferAttribute(curbColors,3));
    const curb=new THREE.Mesh(curbGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.85}));
    curb.receiveShadow=true;group.add(curb);
  }
  const half=track.width/2;
  const sample=(s,lateral)=>{const p=pointAtProgress(track.path,metrics,s);return {...p,x:p.x+p.nx*lateral,z:p.z+p.nz*lateral};};
  const count=Math.ceil(metrics.total/1.4);
  for(let i=0;i<count;i++) {
    for(const side of [-1,1]) {


      const rail=sample(i/count,side*(half+1.7)), end=sample((i+1)/count,side*(half+1.7));
      // Keep barriers clear of nearby track segments at tight bends.
      if(projectOnPath(track.path,metrics,rail.x,rail.z).dist < half+1.0) continue;
      line(0xadb6b7,rail,end,0.65,0.1,0.22);
      if(i%3===0) box(0x666d6b,rail.x,0.39,rail.z,0.13,0.8,0.13);
    }
    if(i%4===0) {const a=sample(i/count,0),b=sample((i+1.2)/count,0);line(0xd7d3bf,a,b,0.03,0.09,0.015);}
  }
  for(const area of track.surfaces||[]){
    const vertices=[],indices=[];for(let i=0;i<=12;i++){const p=pointAtProgress(track.path,metrics,area.s+(i/12-.5)*area.length/metrics.total);for(const side of [-1,1])vertices.push(p.x+p.nx*(area.lateral+side*area.width/2),.065,p.z+p.nz*(area.lateral+side*area.width/2));if(i<12){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const patch=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:{grass:0x608535,mud:0x58402a,water:0x3cabc7}[area.kind],roughness:area.kind==='water'?.18:1,metalness:area.kind==='water'?.25:0,side:THREE.DoubleSide}));patch.userData.surface=area.kind;patch.receiveShadow=true;group.add(patch);
    for(let j=0;j<8;j++){const p=sample(area.s+(j/8-.5)*area.length/metrics.total,area.lateral+(j%3-1)*area.width*.25);if(area.kind==='grass')prop('cone',0x74a340,p.x,.18,p.z,.13,.4,.13);if(area.kind==='water')box(0x95dce9,p.x,.074,p.z,1.5,.012,.07,p.heading);}
  }
  for(const obstacle of track.obstacles||[]){const p=sample(obstacle.s,obstacle.lateral),r=obstacle.radius;if(obstacle.kind==='rock')prop('sphere',0x777970,p.x,.75,p.z,r,1.25,r,p.heading);else if(obstacle.kind==='log'){box(0x765035,p.x,.5,p.z,r*2,.9,1.1,p.heading);for(const side of [-1,1])box(0xb79059,p.x+Math.cos(p.heading)*side*r,.5,p.z-Math.sin(p.heading)*side*r,.05,.8,1,p.heading);}else for(let k=0;k<3;k++)prop('cylinder',0x263035,p.x,.22+k*.36,p.z,r,.35,r);}
  // Checkerboard start line and an overhead gantry give the track a readable scale.
  const start=pointAtProgress(track.path,metrics,0);
  const at=(x,z)=>({x:start.x+Math.cos(start.heading)*x+Math.sin(start.heading)*z,z:start.z-Math.sin(start.heading)*x+Math.cos(start.heading)*z});
  for(let x=0;x<12;x++)for(let z=0;z<2;z++) {const p=at((x-5.5)*track.width/12,(z-0.5)*0.5);box((x+z)%2?0x252a2b:0xf5eee0,p.x,0.035,p.z,track.width/12,0.025,0.5,start.heading);}
  for(const side of [-1,1]) {const p=at(side*(half+1.1),0);box(0x3b464b,p.x,3.5,p.z,0.2,7,0.2);}
  box(0x334550,start.x,6.85,start.z,track.width+2.5,0.45,0.3,start.heading);
  for(let i=-2;i<=2;i++) {const p=at(i*0.6,-0.2);box(0x8fe6ad,p.x,6.85,p.z,0.23,0.23,0.04,start.heading,true);}

  function tree(x,z,size,type=0) {
    prop('cylinder',0x67513b,x,size*0.45,z,0.14*size,size*0.9,0.14*size);
    if(alpine || type%3===0) {
      for(let j=0;j<3;j++)prop('cone',j%2?0x3e654b:0x315941,x,size*(1.0+j*0.36),z,size*(0.66-j*0.12),size*1.15,size*(0.66-j*0.12));
    } else {
      prop('sphere',type%2?0x42653b:0x587344,x,size*1.65,z,size*0.66,size*0.7,size*0.66);
      for(let j=0;j<5;j++) {
        const a=j*2.4+type,cx=x+Math.cos(a)*size*.48,cz=z+Math.sin(a)*size*.48;
        prop('sphere',j%2?0x4b703d:0x587e43,cx,size*(1.25+(j%3)*.15),cz,size*.52,size*.56,size*.53);
      }
    }
  }
  if(!night && !harbor) {
    for(let i=0;i<220;i++) {
      const p=sample(i/220,(half+10+(i%7)*7)*(i%2?1:-1));
      const x=p.x,z=p.z;
      if(projectOnPath(track.path,metrics,x,z).dist<half+5)continue;
      tree(x,z,1.4+(i%7)*0.3,i);
    }
    for(let i=0;i<75;i++) {
      const p=sample(i/75,(half+3.4)*(i%2?1:-1));
      if(projectOnPath(track.path,metrics,p.x,p.z).dist<half+2)continue;
      prop('sphere',i%2?0x737e4b:0x5f7640,p.x,.23,p.z,.45,.32,.38);
    }
    // Infield service pavilion and a covered spectator stand.
    box(0xc9c4af,0,1.3,3,9,2.6,5); box(0x4e6669,0,2.85,3,10,0.35,6);
    for(let i=-3;i<=3;i+=2)box(0x3e616b,i,1.5,0.48,1.4,1.1,0.04);
    for(let i=0;i<4;i++)box(i%2?0x889b9c:0xc6c0b3,-8,0.3+i*0.3,1+i*0.8,8,0.25,1.1);
    box(0x46616b,-8,3.2,2,9,0.2,5);
    for(const x of [-12,-4])for(const z of [0,4])box(0x667175,x,1.6,z,0.12,3.2,0.12);
  }
  if(night || harbor) {
    for(let i=0;i<38;i++) {
      const p=sample(i/38,(half+26+(i%4)*11)*(i%2?1:-1));
      const x=p.x,z=p.z,h=12+(i*13%39);
      if(projectOnPath(track.path,metrics,x,z).dist<half+12)continue;
      box(i%2?0x344451:0x475761,x,h/2-0.1,z,6,h,7);
      box(0x6e808a,x,h,z,6.4,0.25,7.4);
      if(night)for(let row=0;row<Math.floor(h/2);row++)for(let col=-1;col<=1;col++) {
        if((row+col+i)%4===0)continue;
        for(const side of [-1,1])box((i+row)%3?0xf4c886:0x83c4db,x+col*1.5,row*2+1,z+side*3.51,0.65,0.85,0.025,0,true);
      }
    }
  }
  for(let i=0;i<80;i++) {
    const p=sample(i/80,half+2.6);
    box(0x596469,p.x,2.1,p.z,0.13,4.2,0.13);
    box(0x434e55,p.x,4.2,p.z,0.8,0.16,0.4);
    box(night?0xffdfa1:0xece4cb,p.x,4.1,p.z,0.65,0.025,0.3,0,true);
    if(night && i%20===0) {const light=new THREE.PointLight(0xffcc88,13,13,2);light.position.set(p.x,3.8,p.z);group.add(light);}
  }
  if(!night) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const ctx=canvas.getContext('2d');
    for(let i=0;i<12;i++) {
      const x=28+i*18,y=65+Math.sin(i*3)*13,r=25+Math.sin(i)*9;
      const grad=ctx.createRadialGradient(x,y,2,x,y,r);
      grad.addColorStop(0,'rgba(255,255,248,0.7)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,256,128);
    }
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    for(let i=0;i<12;i++) {
      const a=i*2.4,r=190+(i%3)*20;
      const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0.65,depthWrite:false,fog:true}));
      cloud.position.set(Math.cos(a)*r,45+(i%4)*8,Math.sin(a)*r);cloud.scale.set(65,27,1);group.add(cloud);
    }
  }
  for(const {shape,color,glow,matrices} of batches.values()) {
    const mat=new THREE.MeshStandardMaterial({color,roughness:0.82,emissive:glow?color:0x000000,emissiveIntensity:glow?1.6:0});
    const mesh=new THREE.InstancedMesh(shapes[shape],mat,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.castShadow=!glow;mesh.receiveShadow=!glow;
    mesh.computeBoundingSphere();group.add(mesh);
  }
  // Dispose unused template geometries too; used ones are owned by the scene.
  for(const [shape,g] of Object.entries(shapes))if(![...batches.values()].some(b=>b.shape===shape))g.dispose();
}
