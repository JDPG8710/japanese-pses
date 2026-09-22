import {TOWN_BUILDINGS,CASUAL_ARCADE_IDS,buildingAt,frameSeconds} from './TownBuildings.mjs?v=7';
import {ARCADE_TEXT} from './ArcadeText.mjs?v=6';
import {arcadeText} from '../arcade/ArcadeText.mjs?v=3';
import {PLACES,movePlayer,findPath,canWalk} from './TownRules.mjs?v=4';
import {THREE,box,ball,label,makeAvatar,animateAvatar,disposeGroup} from './Models3D.mjs?v=2';
import {generateCourse,advanceVertical,standingOnTarget} from './PlatformCourse.mjs?v=3';
import {spawnTownLife} from './TownLife.mjs?v=3';
export const AVATAR_COLORS=['#ec825f','#509fd4','#9c82cf','#62a67a'];
const toWorld=p=>({x:(p.x-550)/25,z:(p.y-380)/25});
const toSave=p=>({x:p.x*25+550,y:p.z*25+380});
export class TownScene {
 constructor(canvas,options){
  Object.assign(this,options);this.canvas=canvas;this.keys=new Set();this.path=[];this.position=new THREE.Vector3(toWorld(this.state.player).x,0,toWorld(this.state.player).z);this.velocity=0;this.grounded=true;this.near=null;this.clock=0;this.yaw=Math.PI;this.pitch=.58;this.distance=22;this.mode=null;this.cooldown=0;this.characterKey='';this.viewMode=this.state.expansion?.cameraMode||'third';this.firstPitch=.08;this.jumpCount=0;this.platformId=null;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.world=new THREE.Scene();this.world.background=new THREE.Color(0xbfe8fb);this.world.fog=new THREE.Fog(0xbfe8fb,110,340);this.camera=new THREE.PerspectiveCamera(48,1,.1,520);this.cameraTarget=new THREE.Vector3();this.ray=new THREE.Raycaster();
  this.world.add(new THREE.HemisphereLight(0xfffff0,0x93a9b6,2.5));const sun=new THREE.DirectionalLight(0xfff0d7,3);sun.position.set(-18,32,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:220});sun.shadow.bias=-.0006;this.world.add(sun);this.sun=sun;
  this.environment=new THREE.Group();this.world.add(this.environment);this.buildTown();const entry=buildingAt(this.position.x,this.position.z);if(entry)this.returnFromBuilding(entry);this.syncAvatar();this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
  const blocked=e=>e.target.closest('input,select,textarea,button,a');
  window.addEventListener('keydown',e=>{if(this.isPaused()||blocked(e))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){e.preventDefault();this.keys.add(key);this.path=[];this.destination=null;}if(e.code==='Space'){e.preventDefault();this.jump();}if(key==='e'&&this.near&&!this.mode)this.onArrive(this.near);if(key==='v'){e.preventDefault();this.toggleView();}if(key==='q')this.orbit(-.15);if(key==='r')this.resetCamera();});
  window.addEventListener('keyup',e=>this.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>this.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(this.isPaused())return;canvas.focus({preventScroll:true});this.drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>5)d.moved=true;if(d.moved){this.yaw-=dx*.006;if(this.viewMode==='first')this.firstPitch=THREE.MathUtils.clamp(this.firstPitch+dy*.004,-1.05,1.05);else this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.004,.25,1.05);}d.x=e.clientX;d.y=e.clientY;});
  canvas.addEventListener('pointerup',e=>{const d=this.drag;this.drag=null;if(d&&!d.moved&&!this.isPaused())this.clickGround(e);});canvas.addEventListener('pointercancel',()=>this.drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(this.viewMode==='first')return;this.distance=THREE.MathUtils.clamp(this.distance+e.deltaY*.012,8,55);},{passive:false});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.onGraphicsError?.();});canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;document.querySelector('.graphics-error')?.remove();});
  this.last=null;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);canvas.dataset.renderer='webgl-3d';
 }
 size(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();this.render();}
 syncAvatar(){const e=this.state.expansion,key=`${e?.character}:${e?.accessory}:${this.state.avatar}:${e?.gear.join(',')}`;if(key===this.characterKey)return;this.characterKey=key;if(this.avatar){this.world.remove(this.avatar);disposeGroup(this.avatar);}this.avatar=makeAvatar(e?.character,e?.accessory,this.state.avatar>0?AVATAR_COLORS[this.state.avatar]:undefined,e?.gear);this.world.add(this.avatar);}
 floor(x,z,w,d,y=0,color=0xa6cf83,id=null){const m=box(this.environment,x,y-.3,z,w,.6,d,color);this.platforms.push({x,z,w,d,y,id});return m;}
 tree(x,z,scale=1){const g=new THREE.Group();this.environment.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);box(g,0,1,0,.42,2,.42,0xb98d68);box(g,0,2.4,0,1.8,1.5,1.8,0x64ad7a);box(g,.1,3.25,.05,1.3,.8,1.3,0x85c486);}
 house(x,z,color,roof,name,shop=false){const g=new THREE.Group();g.position.set(x,0,z);this.environment.add(g);box(g,0,2,0,7.8,4,5.7,color);box(g,0,4.15,0,8.5,.4,6.3,roof);box(g,0,4.5,0,7.4,.4,5.2,roof);box(g,0,4.85,0,6.2,.35,4.2,roof);box(g,0,1.35,2.89,1.5,2.7,.14,0x568b90);box(g,0,1.9,3,1.1,1.2,.1,0xafe2e4);box(g,.5,1.1,3.1,.12,.12,.12,0xffdc74);for(const px of [-2.5,2.5]){box(g,px,2,2.92,1.45,1.7,.15,0xfff4d9);box(g,px,2,3.03,1.18,1.4,.1,0x90d4e1);box(g,px,2,3.11,.06,1.4,.07,0xfff4d9);box(g,px,2,3.11,1.18,.06,.07,0xfff4d9);}if(shop)for(let i=0;i<8;i++)box(g,-3.5+i,3.2,3.35,1,.25,1.2,i%2?0xffefc9:0xf08b72);label(g,name,0,5.65,.5,{width:6});}
 clearEnvironment(){this.answerLayer?.replaceChildren();this.answerLabels=[];this.townLife=null;disposeGroup(this.environment);this.platforms=[];this.targets=[];this.hazards=[];this.npcs=[];}
 buildTown(){
  this.clearEnvironment();
  // Sprawling footprint: districts reach ~±70 on x/z with roomy venue spacing.
  this.floor(0,0,160,160,0,0x9dcd85);box(this.environment,0,-.8,0,160,1.1,160,0xb79873);
  // Main plaza ring + arteries linking educational belt and arcade corners.
  box(this.environment,0,.025,0,10,.05,110,0xf1ddb0);box(this.environment,0,.03,8,110,.05,8,0xf1ddb0);
  box(this.environment,0,.025,36,120,.05,5,0xf1ddb0);box(this.environment,0,.025,-24,110,.05,5,0xf1ddb0);
  box(this.environment,-40,.025,0,5,.05,90,0xf1ddb0);box(this.environment,40,.025,8,5,.05,95,0xf1ddb0);
  box(this.environment,-60,.025,-44,32,.05,4,0xf1ddb0);box(this.environment,50,.025,68,34,.05,4,0xf1ddb0);
  box(this.environment,-64,.025,10,20,.05,4,0xf1ddb0);box(this.environment,60,.025,-40,20,.05,4,0xf1ddb0);
  // Soft district pads
  box(this.environment,-64,.02,10,18,.04,16,0xcfe9b8);box(this.environment,60,.02,-40,16,.04,14,0xd9c8f0);
  box(this.environment,50,.02,70,16,.04,14,0xb9d7f0);box(this.environment,-60,.02,-44,18,.04,14,0xf0c2b0);
  box(this.environment,-18,.02,42,90,.04,28,0xd8ecd0);box(this.environment,-18,.02,-8,14,.04,12,0xf5e6c8);box(this.environment,16,.02,-6,12,.04,10,0xdce8ef);
  // Shop SW + home SE houses follow districts.
  this.house(-18,-8,0xffe4b5,0xee8e74,this.words().shopShort,true);this.house(16,-6,0xe7eed8,0x78abb9,this.words().homeShort);
  // Plaza fountain near guide
  box(this.environment,0,.7,4,3,1.4,2.2,0xd4c5ad);box(this.environment,0,1.5,4,3.5,.25,2.7,0xf1e5cb);box(this.environment,0,1.62,4,2.9,.06,2.1,0x8bd4e5);ball(this.environment,0,2.2,4,.5,0xb1e6f1);
  for(const [x,z,s]of [[-70,-24,1.4],[-68,22,1.2],[-36,60,1.3],[24,62,1.5],[72,24,1.2],[72,-48,1.4],[12,-52,1],[-12,-56,.9],[-74,2,1.1],[0,72,1],[58,12,.95],[-28,-52,1.1],[36,-56,1],[-6,58,.85]])this.tree(x,z,s);
  // Pond near plaza west
  box(this.environment,-8,.08,14,7,.16,4,0x73bfcf);for(const x of [-11.5,-4.5])box(this.environment,x,.15,14,.35,.3,4.5,0xc6c6aa);for(const z of [11.8,16.2])box(this.environment,-8,.15,z,7,.3,.35,0xc6c6aa);
  for(let i=0;i<6;i++){box(this.environment,4+i*1.4,.2,16,.75,.4,.75,0xc89475);ball(this.environment,4+i*1.4,.75,16,.42,i%2?0xf4bcd4:0xffd782);}
  // Street lamps along main road
  for(const [x,z]of [[-24,0],[24,0],[-24,36],[24,36],[-48,-24],[48,-24],[0,-36],[0,56],[-64,8],[50,66]]){box(this.environment,x,1.6,z,.12,3.2,.12,0x6a7a88);ball(this.environment,x,3.3,z,.22,0xfff1c2);}
  // District marker posts
  const locale=this.locale?.()||document.documentElement.lang;const words=ARCADE_TEXT[locale]||ARCADE_TEXT.en;const casual=arcadeText(locale);
  for(const [x,z,title]of [[-64,4,words.districtPark||'ORCHARD'],[60,-46,words.districtDojo||'DOJO'],[50,64,words.districtAlley||'ARCADE'],[-60,-50,words.districtTrack||'TRACK'],[-18,56,words.districtLearn||'LEARN'],[0,12,words.districtPlaza||'PLAZA']]){box(this.environment,x,.9,z,.25,1.8,.25,0x8a7460);label(this.environment,title,x,2.4,z,{width:3.2,size:36});}
  for(const [id,p]of Object.entries(PLACES)){const pos=toWorld(p),npc=makeAvatar(id==='shop'?'builder':id==='home'?'astro':'frog');npc.position.set(pos.x,0,pos.z);this.environment.add(npc);label(this.environment,{guide:'Piko',shop:'Mia',home:'Noah'}[id],pos.x,3.2,pos.z,{width:2.2});this.npcs.push(npc);}
  const icons={obby:'＋',tower:'×',runner:'ABC',memory:'▦',garden:'🌱',gear:'🎒',fruit:'🍉',breakout:'🧱',race:'🏎️',ninja:'🥷'};
  for(const b of TOWN_BUILDINGS){
   const g=new THREE.Group();g.position.set(b.x,0,b.z);this.environment.add(g);
   box(g,0,.035,-3,3,.07,6,0xffecc4);box(g,0,.08,0,5.8,.16,5.8,0xfff3d5);
   for(const x of [-2.65,2.65])box(g,x,2.1,0,.6,4.2,5.8,b.color);
   box(g,0,2.1,2.65,5.8,4.2,.6,b.color);box(g,0,4.35,0,6.3,.5,6.3,b.color);
   box(g,0,3.65,-2.8,5.3,1,.35,0xfff4d4);
   const casualIds=CASUAL_ARCADE_IDS;const title=b.id==='gear'?words.shop:casualIds.includes(b.id)?(casual.games[b.id]?.title||b.id):(words.modes[b.id]?.[0]||b.id);
   label(g,title,0,5.3,-2.7,{width:6,size:48});
   label(g,icons[b.id]||'✦',0,2,.8,{width:2.6,size:86});
   if(b.id==='tower')for(let i=0;i<3;i++)box(g,0,4.9+i*.5,0,3-i*.5,.5,3-i*.5,b.color);
   if(b.id==='fruit')for(const [dx,dz,c]of [[-1.2,.6,0xff6b6b],[0,.9,0xffd45e],[1.1,.5,0xff9f43]])ball(g,dx,1.2,dz,.35,c);
   if(b.id==='breakout')for(let r=0;r<2;r++)for(let c=0;c<3;c++)box(g,-1.2+c*1.2,4.9+r*.45,-.2,1,.35,.7,[0xff6b8a,0xffd45e,0x7dffb3][(r+c)%3]);
   if(b.id==='race'){box(g,0,4.7,0,4.2,.35,1.2,0x2b3340);box(g,-1.4,5.1,0,.6,.8,.2,0xffefc9);box(g,1.4,5.1,0,.6,.8,.2,0xffefc9);}
   if(b.id==='ninja'){box(g,0,5.1,0,3.2,.9,3.2,0x2d2438);box(g,0,5.7,0,1.6,.5,1.6,0x1b1524);}
  }
  this.canvas.dataset.buildings=TOWN_BUILDINGS.map(b=>b.id).join(',');
  // Ambient life: wandering townsfolk + critters (no player collision / building triggers).
  this.townLife=spawnTownLife(this.environment);
  this.canvas.dataset.life=`${this.townLife.wandererCount}w+${this.townLife.animalCount}a`;
  this.recoverTown();

 }
 stop(){this.keys.clear();this.path=[];this.destination=null;this.drag=null;if(!this.mode)this.onMove();}
 direction(key,pressed){if(pressed){this.path=[];this.keys.add(key);}else this.keys.delete(key);}
 orbit(delta){this.yaw+=delta;}
 resetCamera(){this.yaw=this.mode?0:Math.PI;this.pitch=.5;this.firstPitch=.08;this.distance=this.mode?14:28;}
 toggleView(){this.viewMode=this.viewMode==='first'?'third':'first';this.state.expansion.cameraMode=this.viewMode;this.onViewChange?.();this.render();}
 jump(){if(!this.isPaused()&&!this.arcadeLocked&&this.grounded){this.jumpCount++;this.velocity=this.state.expansion?.gear.includes('spring')?10.5:9;this.grounded=false;}}
 travel(id){if(this.isPaused()||this.mode)return;this.keys.clear();const p=PLACES[id];if(!p)return;this.path=findPath(this.state.player,{x:p.x+30,y:p.y+35}).map(toWorld);this.destination=id;if(!this.path.length&&Math.hypot(this.state.player.x-p.x,this.state.player.y-p.y)<75){this.destination=null;this.onArrive(id);}}
 clickGround(e){if(this.mode)return;const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=new THREE.Vector3();if(!this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit))return;const p=toSave(hit),near=Object.entries(PLACES).find(([,v])=>Math.hypot(v.x-p.x,v.y-p.y)<60);if(near)this.travel(near[0]);else{this.path=findPath(this.state.player,p).map(toWorld);this.destination=null;}}
 enterGame(mode,q,stage,onChoice,onFall,run){this.stop();this.mode=mode;this.question=q;this.onChoice=onChoice;this.onFall=onFall;this.clearEnvironment();this.resetCamera();this.distance=14;this.yaw=0;
  const bg={obby:0xd3ecff,tower:0xe4dffa,runner:0xc0eafb,memory:0xe2eeed,garden:0xd8edd0}[mode];this.world.background.setHex(bg);this.world.fog.color.setHex(bg);
  if(mode==='obby'||mode==='tower'){
   this.course=generateCourse(run||this.state.expansion.runs[mode]);this.spawn=this.course.spawn;
   const palette=[0xaacbaf,0xb4a1df,0xedc06d,0x82becd,0xeca58e];
   for(const [i,p]of this.course.platforms.entries()){
    this.floor(p.x,p.z,p.w,p.d,p.y,palette[(i+this.course.pattern)%palette.length],p.id);
    if(p.index!==undefined){this.targets.push({...p,labelHeight:1.5});box(this.environment,p.x,p.y+.025,p.z,p.w*.72,.05,p.d*.72,0xffedb5);}
    else if(i>0)label(this.environment,String(i),p.x,p.y+.6,p.z,{width:1.1,size:75});
   }
   for(let i=0;i<12;i++)ball(this.environment,Math.sin(i*7+stage)*20,-5-i%3,-i*4,1.6,0xf7fafc);
   const last=this.course.platforms.at(-1);label(this.environment,mode==='tower'?'NUMBER TOWER':'SKY ISLANDS',last.x,last.y+4,last.z-3,{width:6});
  }else if(mode==='runner'){
   this.spawn={x:0,y:0,z:8};this.floor(0,0,19,25,0,0xcee2d5);for(const x of [-3.3,3.3])box(this.environment,x,.025,0,.1,.05,24,0xfff8e6);
   for(let i=0;i<3;i++){const x=(i-1)*6;this.targets.push({x,z:-8,y:0,index:i});for(const dx of [-1.9,1.9])box(this.environment,x+dx,1.6,-8,.35,3.2,.35,0x6aa9d7);box(this.environment,x,3.3,-8,4.2,.35,.4,0x6aa9d7);this.targets.at(-1).labelHeight=4.3;}
   for(const [i,z]of [[0,2],[1,-3]]){const m=box(this.environment,0,.4,z,2.8,.8,.7,0xf2937b);this.hazards.push({mesh:m,z,offset:i*2});}
  }else if(mode==='memory'){
   this.spawn={x:0,y:0,z:7};this.floor(0,2,17,17,0,0xc5d7cf);q.options.forEach((name,i)=>{const x=(i%2?1:-1)*4,z=i<2?-3:3;const tile=box(this.environment,x,.1,z,5,.2,4,q.colors[i]);this.targets.push({x,z,y:0,index:i,mesh:tile});this.targets.at(-1).labelHeight=1.2;});
  }else{
   this.spawn={x:0,y:0,z:8};this.floor(0,0,23,23,0,0xb4d497);for(let i=0;i<3;i++){const x=(i-1)*7;this.targets.push({x,z:-5,y:0,index:i});box(this.environment,x,.4,-5,5,.8,4,0xab805a);box(this.environment,x,.83,-5,4.7,.1,3.7,0x745a42);for(let j=0;j<6;j++){box(this.environment,x-1.4+j%3*1.4,1,-5.8+Math.floor(j/3)*1.5,.15,.4,.15,0x5a934c);ball(this.environment,x-1.4+j%3*1.4,1.3,-5.8+Math.floor(j/3)*1.5,.38,stage%2?0xef9b62:0xe47265);}this.targets.at(-1).labelHeight=2.7;}
   for(let i=0;i<Math.min(6,stage-1);i++){box(this.environment,-9+i*3.5,.4,-10,1.8,.8,1.4,0xf5c478);ball(this.environment,-9+i*3.5,1,-10,.4,0xed8866);}for(const x of [-11,11])for(let z=-11;z<=11;z+=2){box(this.environment,x,.6,z,.2,1.2,.2,0xf6ead0);box(this.environment,x,.8,z,.15,.18,2,0xf6ead0);}
  }
  this.createAnswerLabels();this.respawn();this.cooldown=.8;this.cameraTarget.copy(this.position);this.canvas.dataset.mode=mode;
 }
 exitGame(){this.stop();this.mode=null;this.world.background.setHex(0xbfe8fb);this.world.fog.color.setHex(0xbfe8fb);this.buildTown();const p=toWorld(this.state.player);this.position.set(p.x,0,p.z);this.velocity=0;this.grounded=true;this.resetCamera();this.cameraTarget.copy(this.position);delete this.canvas.dataset.mode;}
 recoverTown(){
  if(this.mode)return;
  const p=toSave(this.position);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!canWalk(p.x,p.y)){this.position.set(.4,0,7);this.state.player=toSave(this.position);this.velocity=0;this.grounded=true;}
  // Solid town ground never permits an underground spawn, including a stale frame timestamp.
  if(!Number.isFinite(this.position.y)||this.position.y<0||!Number.isFinite(this.velocity)){this.position.y=0;this.velocity=0;this.grounded=true;}
 }
 returnFromBuilding(b){this.position.set(b.x,0,b.z-5);this.state.player=toSave(this.position);this.velocity=0;this.grounded=true;this.insideBuilding=null;this.cameraTarget.copy(this.position);}
 createAnswerLabels(){
  if(!this.answerLayer){this.answerLayer=document.createElement('div');this.answerLayer.className='scene-answers';this.canvas.parentElement.append(this.answerLayer);}
  this.answerLayer.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('answer-leaders');this.answerLayer.append(svg);this.answerLabels=this.targets.map(t=>{const color=['#416d9b','#a56923','#8765b4','#387c68'][t.index];const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke',color);svg.append(line);const el=document.createElement('div');el.className='scene-answer';el.dataset.sceneAnswer=String(t.index);el.textContent=this.question.options[t.index];el.style.borderColor=color;this.answerLayer.append(el);return {t,el,line};});
 }
 updateAnswerLabels(){
  if(!this.mode||!this.answerLabels?.length)return;const width=this.canvas.clientWidth,height=this.canvas.clientHeight,placed=[];
  const labels=this.answerLabels.map(a=>({...a,p:new THREE.Vector3(a.t.x,a.t.y+(a.t.labelHeight||1.5),a.t.z).project(this.camera)})).sort((a,b)=>a.p.x-b.p.x);
  for(const {el,p,t,line}of labels){el.hidden=p.z< -1||p.z>1||Math.abs(p.x)>1.2||Math.abs(p.y)>1.2;line.style.display=el.hidden?'none':'';if(el.hidden)continue;
   const w=el.offsetWidth,h=el.offsetHeight,anchorX=(p.x+1)*width/2,anchorY=(1-p.y)*height/2;let x=Math.max(4,Math.min(width-w-4,anchorX-w/2)),y=Math.max(4,Math.min(height-h-4,anchorY-h));
   const candidates=[y];for(let i=1;i<=8;i++)candidates.push(y-i*(h+8),y+i*(h+8));
   y=candidates.find(candidate=>candidate>=4&&candidate+h<=height-4&&!placed.some(r=>x<r.x+r.w+6&&x+w+6>r.x&&candidate<r.y+r.h+6&&candidate+h+6>r.y))??y;
   el.style.left=x+'px';el.style.top=y+'px';const foot=new THREE.Vector3(t.x,t.y+(t.labelHeight||1.5)-1,t.z).project(this.camera);for(const [key,value]of Object.entries({x1:x+w/2,y1:y+h,x2:(foot.x+1)*width/2,y2:(1-foot.y)*height/2}))line.setAttribute(key,String(value));placed.push({x,y,w,h});
  }
 }
 respawn(){if(!this.spawn)return;this.position.set(this.spawn.x,this.spawn.y,this.spawn.z);this.velocity=0;this.grounded=true;this.platformId='start';this.jumpCount=0;this.path=[];this.keys.clear();this.cooldown=.9;}
 highlight(index){for(const t of this.targets)if(t.mesh){t.mesh.material.emissive.setHex(t.index===index?0xffffff:0x000000);t.mesh.material.emissiveIntensity=t.index===index?.55:0;}}
 frame(now){const dt=this.last===null?0:frameSeconds(now,this.last);this.last=now;if(!this.mode)this.recoverTown();this.syncAvatar();const paused=this.isPaused()||document.hidden||this.contextLost;let moving=false;
  if(!paused){this.clock+=dt;this.cooldown=Math.max(0,this.cooldown-dt);let dx=0,dz=0;const locked=this.mode&&this.arcadeLocked;
   if(!locked){if(this.keys.has('ArrowLeft')||this.keys.has('a'))dx--;if(this.keys.has('ArrowRight')||this.keys.has('d'))dx++;if(this.keys.has('ArrowUp')||this.keys.has('w'))dz--;if(this.keys.has('ArrowDown')||this.keys.has('s'))dz++;const sx=dx*Math.cos(this.yaw)+dz*Math.sin(this.yaw),sz=-dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw);dx=sx;dz=sz;
    if(!this.mode&&this.path.length){const p=this.path[0],d=Math.hypot(p.x-this.position.x,p.z-this.position.z);if(d<.35){if(!this.mode||this.grounded)this.path.shift();}else{dx=(p.x-this.position.x)/d;dz=(p.z-this.position.z)/d;}}
   }
   const len=Math.hypot(dx,dz),speed=this.state.expansion?.gear.includes('shoes')?8.5:7.2;moving=len>0;if(moving){dx=dx/len*speed*dt;dz=dz/len*speed*dt;if(this.mode){this.position.x+=dx;this.position.z+=dz;}else{const next=movePlayer(toSave(this.position),dx*25,dz*25);const p=toWorld(next);this.position.x=p.x;this.position.z=p.z;this.state.player=next;}this.avatar.rotation.y=Math.atan2(dx,dz);this.moved=true;}else if(this.moved){this.moved=false;if(!this.mode)this.onMove();}
   const body={x:this.position.x,y:this.position.y,z:this.position.z,velocity:this.velocity};advanceVertical(body,this.platforms,dt);this.position.y=body.y;this.velocity=body.velocity;this.grounded=body.grounded;this.platformId=body.platformId;

   if(this.mode){
    for(const h of this.hazards){h.mesh.position.x=Math.sin(this.clock*1.1+h.offset)*6;if(!locked&&this.cooldown===0&&this.position.y<.65&&Math.abs(this.position.x-h.mesh.position.x)<1.8&&Math.abs(this.position.z-h.z)<.6){this.respawn();this.onFall?.();}}
    if(this.position.y< -7){this.respawn();if(!locked)this.onFall?.();}
    if(!locked&&this.cooldown===0){const t=this.targets.find(t=>t.w?this.jumpCount>0&&standingOnTarget({...this.position,grounded:this.grounded},t):this.grounded&&Math.hypot(this.position.x-t.x,this.position.z-t.z)<1.7&&Math.abs(this.position.y-t.y)<.05);if(t){this.cooldown=1;this.path=[];this.onChoice?.(t.index);}}
   }else{
    if(!this.path.length&&this.destination){const id=this.destination;this.destination=null;if(Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)this.onArrive(id);}
    const near=Object.keys(PLACES).find(id=>Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)||null;if(near!==this.near){this.near=near;this.onNear(near);}
    const building=buildingAt(this.position.x,this.position.z);if(!building)this.insideBuilding=null;if(building&&this.insideBuilding!==building.id&&this.grounded){this.insideBuilding=building.id;this.stop();this.onBuilding?.(building);}
    this.townLife?.update(dt,{paused:false,active:true});
   }
  }else{this.keys.clear();}
  this.canvas.dataset.position=[this.position.x,this.position.y,this.position.z].map(v=>v.toFixed(2)).join(',');this.canvas.dataset.cameraYaw=this.yaw.toFixed(3);this.canvas.dataset.grounded=String(this.grounded);this.canvas.dataset.platform=this.platformId||'';this.canvas.dataset.jumps=String(this.jumpCount);this.avatar.position.copy(this.position);animateAvatar(this.avatar,this.clock,moving);this.cameraTarget.lerp(this.position,Math.min(1,dt*8));this.render();requestAnimationFrame(this.frame);
 }
 render(){
  if(!this.camera||!this.avatar||this.contextLost)return;
  const first=this.viewMode==='first';this.canvas.dataset.view=this.viewMode;this.avatar.visible=!first;this.canvas.closest('.world-card')?.classList.toggle('is-first-person',first);
  const fov=first?76:48;if(this.camera.fov!==fov){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  if(first){const p=this.position;this.camera.position.set(p.x,p.y+2.03,p.z);this.camera.lookAt(p.x-Math.sin(this.yaw)*Math.cos(this.firstPitch),p.y+2.03-Math.sin(this.firstPitch),p.z-Math.cos(this.yaw)*Math.cos(this.firstPitch));}
  else{const p=this.cameraTarget;this.camera.position.set(p.x+Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,p.y+Math.sin(this.pitch)*this.distance+2,p.z+Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);this.camera.lookAt(p.x,p.y+1.3,p.z);}
  this.sun.position.set(this.position.x-12,this.position.y+25,this.position.z+14);this.sun.target.position.copy(this.position);this.sun.target.updateMatrixWorld();this.renderer.render(this.world,this.camera);this.updateAnswerLabels();
 }
}
