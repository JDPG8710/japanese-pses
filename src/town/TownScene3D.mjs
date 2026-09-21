import {PLACES,movePlayer,findPath} from './TownRules.mjs?v=2';
import {THREE,box,ball,label,makeAvatar,animateAvatar,disposeGroup} from './Models3D.mjs?v=2';
export const AVATAR_COLORS=['#ec825f','#509fd4','#9c82cf','#62a67a'];
const toWorld=p=>({x:(p.x-550)/25,z:(p.y-380)/25});
const toSave=p=>({x:p.x*25+550,y:p.z*25+380});
export class TownScene {
 constructor(canvas,options){
  Object.assign(this,options);this.canvas=canvas;this.keys=new Set();this.path=[];this.position=new THREE.Vector3(toWorld(this.state.player).x,0,toWorld(this.state.player).z);this.velocity=0;this.grounded=true;this.near=null;this.clock=0;this.yaw=.22;this.pitch=.58;this.distance=22;this.mode=null;this.cooldown=0;this.characterKey='';
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.world=new THREE.Scene();this.world.background=new THREE.Color(0xbfe8fb);this.world.fog=new THREE.Fog(0xbfe8fb,42,110);this.camera=new THREE.PerspectiveCamera(48,1,.1,150);this.cameraTarget=new THREE.Vector3();this.ray=new THREE.Raycaster();
  this.world.add(new THREE.HemisphereLight(0xfffff0,0x93a9b6,2.5));const sun=new THREE.DirectionalLight(0xfff0d7,3);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:70});sun.shadow.bias=-.0006;this.world.add(sun);this.sun=sun;
  this.environment=new THREE.Group();this.world.add(this.environment);this.buildTown();this.syncAvatar();this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
  const blocked=e=>e.target.closest('input,select,textarea,button,a');
  window.addEventListener('keydown',e=>{if(this.isPaused()||blocked(e))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){e.preventDefault();this.keys.add(key);this.path=[];this.destination=null;}if(e.code==='Space'){e.preventDefault();this.jump();}if(key==='e'&&this.near&&!this.mode)this.onArrive(this.near);if(key==='q')this.orbit(-.15);if(key==='r')this.resetCamera();});
  window.addEventListener('keyup',e=>this.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>this.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(this.isPaused())return;canvas.focus({preventScroll:true});this.drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>5)d.moved=true;if(d.moved){this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.004,.25,1.05);}d.x=e.clientX;d.y=e.clientY;});
  canvas.addEventListener('pointerup',e=>{const d=this.drag;this.drag=null;if(d&&!d.moved&&!this.isPaused())this.clickGround(e);});canvas.addEventListener('pointercancel',()=>this.drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=THREE.MathUtils.clamp(this.distance+e.deltaY*.012,8,34);},{passive:false});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.onGraphicsError?.();});canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;});
  this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);canvas.dataset.renderer='webgl-3d';
 }
 size(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.render();}
 syncAvatar(){const e=this.state.expansion,key=`${e?.character}:${e?.accessory}:${this.state.avatar}:${e?.gear.join(',')}`;if(key===this.characterKey)return;this.characterKey=key;if(this.avatar){this.world.remove(this.avatar);disposeGroup(this.avatar);}this.avatar=makeAvatar(e?.character,e?.accessory,this.state.avatar>0?AVATAR_COLORS[this.state.avatar]:undefined,e?.gear);this.world.add(this.avatar);}
 floor(x,z,w,d,y=0,color=0xa6cf83){const m=box(this.environment,x,y-.3,z,w,.6,d,color);this.platforms.push({x,z,w,d,y});return m;}
 tree(x,z,scale=1){const g=new THREE.Group();this.environment.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);box(g,0,1,0,.42,2,.42,0xb98d68);box(g,0,2.4,0,1.8,1.5,1.8,0x64ad7a);box(g,.1,3.25,.05,1.3,.8,1.3,0x85c486);}
 house(x,z,color,roof,name,shop=false){const g=new THREE.Group();g.position.set(x,0,z);this.environment.add(g);box(g,0,2,0,7.8,4,5.7,color);box(g,0,4.15,0,8.5,.4,6.3,roof);box(g,0,4.5,0,7.4,.4,5.2,roof);box(g,0,4.85,0,6.2,.35,4.2,roof);box(g,0,1.35,2.89,1.5,2.7,.14,0x568b90);box(g,0,1.9,3,1.1,1.2,.1,0xafe2e4);box(g,.5,1.1,3.1,.12,.12,.12,0xffdc74);for(const px of [-2.5,2.5]){box(g,px,2,2.92,1.45,1.7,.15,0xfff4d9);box(g,px,2,3.03,1.18,1.4,.1,0x90d4e1);box(g,px,2,3.11,.06,1.4,.07,0xfff4d9);box(g,px,2,3.11,1.18,.06,.07,0xfff4d9);}if(shop)for(let i=0;i<8;i++)box(g,-3.5+i,3.2,3.35,1,.25,1.2,i%2?0xffefc9:0xf08b72);label(g,name,0,5.65,.5,{width:6});}
 clearEnvironment(){disposeGroup(this.environment);this.platforms=[];this.targets=[];this.hazards=[];this.npcs=[];}
 buildTown(){
  this.clearEnvironment();this.floor(0,0,48,34,0,0x9dcd85);box(this.environment,0,-.8,0,48,1.1,34,0xb79873);box(this.environment,0,.025,0,5,.05,30,0xf1ddb0);box(this.environment,0,.03,0,40,.05,4,0xf1ddb0);
  this.house(-10.9,-5.6,0xffe4b5,0xee8e74,this.words().shopShort,true);this.house(10.6,-5.4,0xe7eed8,0x78abb9,this.words().homeShort);
  box(this.environment,0,.7,-3,3,1.4,2.2,0xd4c5ad);box(this.environment,0,1.5,-3,3.5,.25,2.7,0xf1e5cb);box(this.environment,0,1.62,-3,2.9,.06,2.1,0x8bd4e5);ball(this.environment,0,2.2,-3,.5,0xb1e6f1);
  for(const [x,z,s]of [[-20,-10,1.3],[-18,5,1],[-20,12,1.2],[20,-12,1.5],[19,2,1],[19,13,1.3],[-4,-12,1],[5,-13,.85],[-6,12,.8]])this.tree(x,z,s);
  box(this.environment,-14,.08,7,7,.16,4,0x73bfcf);for(const x of [-17.5,-10.5])box(this.environment,x,.15,7,.35,.3,4.5,0xc6c6aa);for(const z of [4.8,9.2])box(this.environment,-14,.15,z,7,.3,.35,0xc6c6aa);
  for(let i=0;i<6;i++){box(this.environment,5+i*1.4,.2,11,.75,.4,.75,0xc89475);ball(this.environment,5+i*1.4,.75,11,.42,i%2?0xf4bcd4:0xffd782);}
  for(const [id,p]of Object.entries(PLACES)){const pos=toWorld(p),npc=makeAvatar(id==='shop'?'builder':id==='home'?'astro':'frog');npc.position.set(pos.x,0,pos.z);this.environment.add(npc);label(this.environment,{guide:'Piko',shop:'Mia',home:'Noah'}[id],pos.x,3.2,pos.z,{width:2.2});this.npcs.push(npc);}
  const portal=new THREE.Group();portal.position.set(11,0,8);this.environment.add(portal);for(const x of [-1.65,1.65])box(portal,x,2,0,.6,4,.6,0x947adc);box(portal,0,4.2,0,4,.6,.7,0xa898ec);box(portal,0,.06,0,4,.12,2,0xc9b7ff);label(portal,'GAME ISLANDS',0,5.2,0,{width:5});this.portal=portal;
  for(let i=0;i<5;i++){const island=box(this.environment,-13+i*6,8+(i%2),-22,3.5,1.2,3.5,[0xf3c265,0xab9ce4,0x78c8c5][i%3]);island.rotation.y=i*.2;box(this.environment,-13+i*6,8.8+(i%2),-22,3.7,.4,3.7,0xa9d891);}
 }
 stop(){this.keys.clear();this.path=[];this.destination=null;this.drag=null;if(!this.mode)this.onMove();}
 direction(key,pressed){if(pressed){this.path=[];this.keys.add(key);}else this.keys.delete(key);}
 orbit(delta){this.yaw+=delta;}
 resetCamera(){this.yaw=.22;this.pitch=.58;this.distance=this.mode?18:22;}
 jump(){if(!this.isPaused()&&this.grounded){this.velocity=this.state.expansion?.gear.includes('spring')?10.5:9;this.grounded=false;}}
 travel(id){if(this.isPaused()||this.mode)return;this.keys.clear();const p=PLACES[id];if(!p)return;this.path=findPath(this.state.player,{x:p.x+30,y:p.y+35}).map(toWorld);this.destination=id;if(!this.path.length&&Math.hypot(this.state.player.x-p.x,this.state.player.y-p.y)<75){this.destination=null;this.onArrive(id);}}
 clickGround(e){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=new THREE.Vector3();if(!this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit))return;if(this.mode){const target=this.targets.find(t=>Math.hypot(hit.x-t.x,hit.z-t.z)<2.2);if(target)this.travelChoice(target.index);return;}if(Math.hypot(hit.x-11,hit.z-8)<2.3){this.onArcade?.();return;}const p=toSave(hit),near=Object.entries(PLACES).find(([,v])=>Math.hypot(v.x-p.x,v.y-p.y)<60);if(near)this.travel(near[0]);else{this.path=findPath(this.state.player,p).map(toWorld);this.destination=null;}}
 enterGame(mode,q,stage,onChoice,onFall){this.stop();this.mode=mode;this.question=q;this.onChoice=onChoice;this.onFall=onFall;this.clearEnvironment();this.resetCamera();this.distance=mode==='tower'?21:18;this.yaw=0;
  const bg={obby:0xd3ecff,tower:0xe4dffa,runner:0xc0eafb,memory:0xe2eeed,garden:0xd8edd0}[mode];this.world.background.setHex(bg);this.world.fog.color.setHex(bg);
  if(mode==='obby'||mode==='tower'){
   this.spawn={x:0,y:0,z:7};this.floor(0,7,6,5,0,0x9bccaa);this.floor(0,2.7,4.6,3,mode==='tower'?1:0,0xb0a3dd);this.floor(0,-1,4.6,3,mode==='tower'?2:0,0xf1c875);
   const top=mode==='tower'?3:0;for(let i=0;i<3;i++){const x=(i-1)*5.8;this.floor(x,-5.3,4.6,4,top,[0xecb4a2,0xa8cee6,0xb3d39a][i]);this.targets.push({x,z:-5.3,y:top,index:i});label(this.environment,q.options[i],x,top+2,-5.3,{width:3.5,size:64});box(this.environment,x,top+.04,-5.3,3,.08,3,0xfff0b6);}
   if(mode==='tower'){for(const x of [-9,9])box(this.environment,x,3,-2,1,9,1,0x9285b7);label(this.environment,`↑ ${stage}`,0,6.3,-7,{width:3});}
   for(let i=0;i<9;i++)ball(this.environment,Math.sin(i*7+stage)*18,-4-i%3,Math.cos(i*4)*17,1.8,0xf7fafc);
  }else if(mode==='runner'){
   this.spawn={x:0,y:0,z:8};this.floor(0,0,19,25,0,0xcee2d5);for(const x of [-3.3,3.3])box(this.environment,x,.025,0,.1,.05,24,0xfff8e6);
   for(let i=0;i<3;i++){const x=(i-1)*6;this.targets.push({x,z:-8,y:0,index:i});for(const dx of [-1.9,1.9])box(this.environment,x+dx,1.6,-8,.35,3.2,.35,0x6aa9d7);box(this.environment,x,3.3,-8,4.2,.35,.4,0x6aa9d7);label(this.environment,q.options[i],x,4.25,-8,{width:3.5,size:65});}
   for(const [i,z]of [[0,2],[1,-3]]){const m=box(this.environment,0,.4,z,2.8,.8,.7,0xf2937b);this.hazards.push({mesh:m,z,offset:i*2});}
  }else if(mode==='memory'){
   this.spawn={x:0,y:0,z:7};this.floor(0,2,17,17,0,0xc5d7cf);q.options.forEach((name,i)=>{const x=(i%2?1:-1)*4,z=i<2?-3:3;const tile=box(this.environment,x,.1,z,5,.2,4,q.colors[i]);this.targets.push({x,z,y:0,index:i,mesh:tile});label(this.environment,name,x,1.7,z,{width:3.5,size:44});});
  }else{
   this.spawn={x:0,y:0,z:8};this.floor(0,0,23,23,0,0xb4d497);for(let i=0;i<3;i++){const x=(i-1)*7;this.targets.push({x,z:-5,y:0,index:i});box(this.environment,x,.4,-5,5,.8,4,0xab805a);box(this.environment,x,.83,-5,4.7,.1,3.7,0x745a42);for(let j=0;j<6;j++){box(this.environment,x-1.4+j%3*1.4,1,-5.8+Math.floor(j/3)*1.5,.15,.4,.15,0x5a934c);ball(this.environment,x-1.4+j%3*1.4,1.3,-5.8+Math.floor(j/3)*1.5,.38,stage%2?0xef9b62:0xe47265);}label(this.environment,q.options[i],x,2.8,-5,{width:4,size:62});}
   for(let i=0;i<Math.min(6,stage-1);i++){box(this.environment,-9+i*3.5,.4,-10,1.8,.8,1.4,0xf5c478);ball(this.environment,-9+i*3.5,1,-10,.4,0xed8866);}for(const x of [-11,11])for(let z=-11;z<=11;z+=2){box(this.environment,x,.6,z,.2,1.2,.2,0xf6ead0);box(this.environment,x,.8,z,.15,.18,2,0xf6ead0);}
  }
  this.respawn();this.cooldown=.8;this.cameraTarget.copy(this.position);this.canvas.dataset.mode=mode;
 }
 exitGame(){this.stop();this.mode=null;this.world.background.setHex(0xbfe8fb);this.world.fog.color.setHex(0xbfe8fb);this.buildTown();const p=toWorld(this.state.player);this.position.set(p.x,0,p.z);this.velocity=0;this.grounded=true;this.resetCamera();this.cameraTarget.copy(this.position);delete this.canvas.dataset.mode;}
 respawn(){if(!this.spawn)return;this.position.set(this.spawn.x,this.spawn.y,this.spawn.z);this.velocity=0;this.grounded=true;this.path=[];this.cooldown=.9;}
 travelChoice(index){if(!this.mode||this.isPaused()||this.arcadeLocked)return;const t=this.targets[index];if(!t)return;this.path=['obby','tower'].includes(this.mode)?[{x:0,z:2.7},{x:0,z:-1},{x:t.x,z:t.z}]:[{x:t.x,z:t.z}];this.keys.clear();this.autoJump=true;this.canvas.focus({preventScroll:true});this.canvas.scrollIntoView({block:'center',behavior:'instant'});}
 highlight(index){for(const t of this.targets)if(t.mesh){t.mesh.material.emissive.setHex(t.index===index?0xffffff:0x000000);t.mesh.material.emissiveIntensity=t.index===index?.55:0;}}
 frame(now){const dt=Math.min((now-this.last)/1000,.04);this.last=now;this.syncAvatar();const paused=this.isPaused()||document.hidden||this.contextLost;let moving=false;
  if(!paused){this.clock+=dt;this.cooldown=Math.max(0,this.cooldown-dt);let dx=0,dz=0;const locked=this.mode&&this.arcadeLocked;
   if(!locked){if(this.keys.has('ArrowLeft')||this.keys.has('a'))dx--;if(this.keys.has('ArrowRight')||this.keys.has('d'))dx++;if(this.keys.has('ArrowUp')||this.keys.has('w'))dz--;if(this.keys.has('ArrowDown')||this.keys.has('s'))dz++;const sx=dx*Math.cos(this.yaw)+dz*Math.sin(this.yaw),sz=-dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw);dx=sx;dz=sz;
    if(this.path.length){const p=this.path[0],d=Math.hypot(p.x-this.position.x,p.z-this.position.z);if(d<.35){if(!this.mode||this.grounded)this.path.shift();}else{dx=(p.x-this.position.x)/d;dz=(p.z-this.position.z)/d;if(this.mode&&this.autoJump&&this.grounded&&['obby','tower'].includes(this.mode)&&d>1.5)this.jump();}}
   }
   if(this.mode==='runner'&&this.path.length&&this.grounded&&this.hazards.some(h=>this.position.z-h.z>0&&this.position.z-h.z<2.6))this.jump();
   const len=Math.hypot(dx,dz),speed=this.state.expansion?.gear.includes('shoes')?8.5:7.2;moving=len>0;if(moving){dx=dx/len*speed*dt;dz=dz/len*speed*dt;if(this.mode){this.position.x+=dx;this.position.z+=dz;}else{const next=movePlayer(toSave(this.position),dx*25,dz*25);const p=toWorld(next);this.position.x=p.x;this.position.z=p.z;this.state.player=next;}this.avatar.rotation.y=Math.atan2(dx,dz);this.moved=true;}else if(this.moved){this.moved=false;if(!this.mode)this.onMove();}
   const prevY=this.position.y;this.velocity-=22*dt;this.position.y+=this.velocity*dt;this.grounded=false;const platforms=this.platforms.filter(p=>Math.abs(this.position.x-p.x)<p.w/2-.16&&Math.abs(this.position.z-p.z)<p.d/2-.16&&prevY>=p.y-.15&&this.position.y<=p.y&&this.velocity<=0).sort((a,b)=>b.y-a.y);if(platforms.length){this.position.y=platforms[0].y;this.velocity=0;this.grounded=true;}
   if(this.mode){
    for(const h of this.hazards){h.mesh.position.x=Math.sin(this.clock*1.1+h.offset)*6;if(!locked&&this.cooldown===0&&this.position.y<.65&&Math.abs(this.position.x-h.mesh.position.x)<1.8&&Math.abs(this.position.z-h.z)<.6){this.respawn();this.onFall?.();}}
    if(this.position.y< -7){this.respawn();if(!locked)this.onFall?.();}
    if(!locked&&this.cooldown===0){const t=this.targets.find(t=>Math.hypot(this.position.x-t.x,this.position.z-t.z)<1.7&&Math.abs(this.position.y-t.y)<1.5);if(t){this.cooldown=1;this.path=[];this.onChoice?.(t.index);}}
   }else{
    if(!this.path.length&&this.destination){const id=this.destination;this.destination=null;if(Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)this.onArrive(id);}
    const near=Object.keys(PLACES).find(id=>Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)||null;if(near!==this.near){this.near=near;this.onNear(near);}
    if(Math.hypot(this.position.x-11,this.position.z-8)<1.6&&this.cooldown===0){this.cooldown=3;this.onArcade?.();}
   }
  }else{this.keys.clear();}
  this.canvas.dataset.position=[this.position.x,this.position.y,this.position.z].map(v=>v.toFixed(2)).join(',');this.canvas.dataset.cameraYaw=this.yaw.toFixed(2);this.avatar.position.copy(this.position);animateAvatar(this.avatar,this.clock,moving);this.cameraTarget.lerp(this.position,Math.min(1,dt*8));this.render();requestAnimationFrame(this.frame);
 }
 render(){if(!this.camera||!this.avatar||this.contextLost)return;const p=this.cameraTarget;this.camera.position.set(p.x+Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,p.y+Math.sin(this.pitch)*this.distance+2,p.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);this.camera.lookAt(p.x,p.y+1.3,p.z);this.renderer.render(this.world,this.camera);}
}
