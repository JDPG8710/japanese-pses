import {PLACES,WORLD,movePlayer,findPath} from './TownRules.mjs?v=2';
export const AVATAR_COLORS=['#ec825f','#509fd4','#9c82cf','#62a67a'];
const STORY=['guide','shop','home'];
const VENUE_COLOR={guide:'#9ab57a',shop:'#eaa46c',home:'#8aadd0',fruit:'#e2b84a',breakout:'#5ec6e8',race:'#ff7a5c',ninja:'#b58ae8'};
const VENUE_LABEL={guide:'Piko',shop:'Mia',home:'Noah',fruit:'🍈',breakout:'🕹️',race:'🏎️',ninja:'🥷'};
export class TownScene {
  constructor(canvas,{state,words,onArrive,onMove,onNear,isPaused}){
    Object.assign(this,{canvas,state,words,onArrive,onMove,onNear,isPaused});
    this.ctx=canvas.getContext('2d');this.keys=new Set();this.path=[];this.destination=null;this.near=null;this.last=0;this.clock=0;
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(canvas);this.size();
    window.addEventListener('keydown',e=>{
      if(this.isPaused()||e.target.closest('input,select,textarea,button,a'))return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){e.preventDefault();this.keys.add(e.key);this.path=[];this.destination=null;}
      if(e.key.toLowerCase()==='e'&&this.near){e.preventDefault();onArrive(this.near);}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.key));
    window.addEventListener('blur',()=>this.stop());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
    canvas.addEventListener('pointerdown',e=>{
      if(this.isPaused())return;canvas.focus({preventScroll:true});const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/this.scale+this.camera.x,y=(e.clientY-rect.top)/this.scale+this.camera.y;
      const place=Object.keys(PLACES).find(id=>Math.hypot(x-PLACES[id].x,y-(PLACES[id].y-20))<52);
      if(place)this.travel(place);else{this.path=findPath(this.state.player,{x,y});this.destination=null;}
    });
    this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  size(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(globalThis.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;this.draw();}
  stop(){this.keys.clear();this.path=[];this.destination=null;this.onMove();}
  travel(id){if(this.isPaused()||!PLACES[id])return;this.keys.clear();const place=PLACES[id];this.path=findPath(this.state.player,{x:place.x+30,y:place.y+35});this.destination=id;if(!this.path.length&&Math.hypot(this.state.player.x-place.x,this.state.player.y-place.y)<75){this.destination=null;this.onArrive(id);}}
  direction(key,pressed){if(pressed){this.path=[];this.destination=null;this.keys.add(key);}else this.keys.delete(key);}
  frame(time){
    const dt=Math.min((time-this.last)/1000||0,0.04);this.last=time;
    const paused=this.isPaused()||document.hidden;
    if(!paused){
      this.clock+=dt;const p=this.state.player;let dx=0,dy=0;
      if(this.keys.has('ArrowLeft')||this.keys.has('a'))dx--;
      if(this.keys.has('ArrowRight')||this.keys.has('d'))dx++;
      if(this.keys.has('ArrowUp')||this.keys.has('w'))dy--;
      if(this.keys.has('ArrowDown')||this.keys.has('s'))dy++;
      if(this.path.length){const next=this.path[0],dist=Math.hypot(next.x-p.x,next.y-p.y);if(dist<4){this.path.shift();}else{dx=(next.x-p.x)/dist;dy=(next.y-p.y)/dist;}}
      const length=Math.hypot(dx,dy);this.walking=length>0;
      if(length){this.state.player=movePlayer(p,dx/length*180*dt,dy/length*180*dt);this.moved=true;}
      else if(this.moved){this.moved=false;this.onMove();}
      if(!this.path.length&&this.destination){const id=this.destination;this.destination=null;if(Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)this.onArrive(id);}
      const nearest=Object.keys(PLACES).find(id=>Math.hypot(this.state.player.x-PLACES[id].x,this.state.player.y-PLACES[id].y)<75)||null;
      if(nearest!==this.near){this.near=nearest;this.onNear(nearest);}
    }else{this.walking=false;this.keys.clear();}
    this.draw();requestAnimationFrame(this.frame);
  }
  round(x,y,w,h,r,color){const c=this.ctx;c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
  ellipse(x,y,rx,ry,color){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  text(value,x,y,size=16,color='#355a4c',weight=700){const c=this.ctx;c.font=`${weight} ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`;c.fillStyle=color;c.textAlign='center';c.fillText(value,x,y);}
  tree(x,y,k=1){const c=this.ctx;c.save();c.translate(x,y);c.scale(k,k);this.ellipse(9,8,29,12,'#518a6c30');this.round(-5,-40,10,42,3,'#b38a64');this.ellipse(0,-50,29,35,'#478f6d');this.ellipse(-12,-62,21,25,'#60aa7f');this.ellipse(11,-69,20,23,'#7abb8a');this.ellipse(-9,-77,10,9,'#94cc97');c.restore();}
  house(x,y,w,h,color,roof,label,shop=false){
    const c=this.ctx;this.ellipse(x+w/2+17,y+h+10,w*.59,22,'#39665220');
    this.poly([[x+w,y+20],[x+w+30,y],[x+w+30,y+h-22],[x+w,y+h]],'#d9c8ab');
    this.round(x,y,w,h,7,color);this.poly([[x-12,y+8],[x+w+10,y+8],[x+w+37,y-24],[x+16,y-24]],roof);
    this.round(x-12,y+4,w+22,14,3,roof);this.round(x+18,y+36,w-36,37,5,'#fff9e9');this.text(label,x+w/2,y+61,17,'#4a6252');
    this.round(x+w*.39,y+h-70,w*.23,70,6,'#799c88');this.round(x+w*.41,y+h-66,w*.19,44,3,'#bde2d9');this.ellipse(x+w*.56,y+h-18,3,3,'#fff1c8');
    for(const wx of [x+22,x+w-65]){this.round(wx,y+89,43,42,5,'#fff7e6');this.round(wx+4,y+93,35,31,3,'#a8d9d2');c.fillStyle='#f9f6de';c.fillRect(wx+21,y+93,3,32);c.fillRect(wx+4,y+108,35,3);}
    if(shop){for(let i=0;i<8;i++)this.round(x+i*w/8,y+76,w/8+1,19,4,i%2?'#fff4d5':'#ed8c76');this.round(x-15,y+h-12,62,26,5,'#d3a16c');this.text('🍎 🍌',x+16,y+h+7,20);}
    else{this.round(x+19,y+h-15,42,16,4,'#bf9677');this.text('🌷🌷',x+39,y+h-13,19);}
    this.round(x+w*.34,y+h-1,w*.33,13,3,'#d1c3a8');
  }
  person(x,y,color,kind='player',moving=false){
    const c=this.ctx,bob=moving?Math.sin(this.clock*15)*2:0;c.save();c.translate(x,y);this.ellipse(0,2,17,7,'#355b5035');c.translate(0,bob);
    const step=moving?Math.sin(this.clock*15)*4:0;
    this.round(-11,-17+step,9,16,3,'#4c6871');this.round(3,-17-step,9,16,3,'#4c6871');
    this.round(-13,-3+step,12,6,2,'#fff7e3');this.round(2,-3-step,12,6,2,'#fff7e3');
    this.round(-17,-39,34,26,7,color);this.round(-22,-36,8,24,4,'#f3c296');this.round(14,-36,8,24,4,'#f3c296');
    this.round(-14,-64,28,28,8,'#f3c296');this.round(-15,-67,30,11,5,kind==='guide'?'#b77748':kind==='ninja'?'#2d2438':'#574334');
    if(kind==='shop'){this.round(-17,-69,34,7,3,'#ffefc4');this.round(-10,-78,20,12,3,'#ffefc4');this.round(-11,-34,22,19,3,'#fff2d9');}
    if(kind==='home')this.round(-19,-68,38,8,4,'#94b9d5');
    if(kind==='fruit')this.round(-16,-70,32,8,4,'#f0c85a');
    if(kind==='breakout'){this.round(-18,-72,36,10,3,'#3ad0ff');this.round(-10,-34,20,16,3,'#dff7ff');}
    if(kind==='race')this.round(-18,-70,36,9,3,'#ff8a6a');
    if(kind==='ninja'){this.round(-16,-70,32,9,3,'#1b1524');this.round(-12,-54,24,8,3,'#1b1524');}
    this.ellipse(-5,-51,1.7,2,'#493b31');this.ellipse(6,-51,1.7,2,'#493b31');
    c.strokeStyle='#b76f56';c.lineWidth=1.5;c.beginPath();c.arc(1,-45,4,0,Math.PI);c.stroke();c.restore();
  }
  road(x,y,w,h){this.round(x,y,w,h,28,'#c3b99b');this.round(x+6,y+6,w-12,h-12,24,'#f2e6c9');}
  landmarkFruit(x,y){
    this.round(x-70,y-95,140,70,10,'#8fbf6a');this.round(x-60,y-88,120,28,6,'#ffe08a');this.text(this.words().fruitShort,x,y-68,13,'#6a5a28');
    this.text('🍉',x-35,y-40,28);this.text('🍎',x,y-44,26);this.text('🍋',x+34,y-40,24);
    for(const [tx,ty,k] of [[x-90,y-20,.7],[x+85,y-10,.85],[x-40,y+5,.6]])this.tree(tx,ty,k);
  }
  landmarkBreakout(x,y){
    this.round(x-55,y-100,110,85,8,'#1d2a44');this.round(x-48,y-93,96,28,5,'#57dfff');this.text(this.words().breakoutShort,x,y-73,12,'#083047');
    for(let r=0;r<3;r++)for(let c=0;c<4;c++)this.round(x-40+c*20,y-55+r*14,16,10,2,['#ff6b8a','#ffd45e','#7dffb3','#c791ff'][(r+c)%4]);
    this.round(x-22,y-10,44,8,3,'#9ad8ff');
  }
  landmarkRace(x,y){
    this.ellipse(x,y-20,78,36,'#5a6570');this.ellipse(x,y-20,62,24,'#3d4650');
    this.round(x-70,y-95,60,50,6,'#ff6b4a');this.round(x-64,y-88,48,18,4,'#ffe0d4');this.text('🏁',x-40,y-72,20);
    this.text(this.words().raceShort,x+30,y-78,12,'#fff5ef');
    this.round(x+10,y-100,70,40,6,'#2b3340');
  }
  landmarkNinja(x,y){
    this.poly([[x-70,y-40],[x,y-110],[x+70,y-40]],'#5b4a78');this.round(x-55,y-40,110,55,6,'#efe6ff');
    this.round(x-18,y-5,36,20,4,'#3a2d52');this.text(this.words().ninjaShort,x,y-55,13,'#3a2d52');
    this.text('🥷',x,y-78,26);
  }
  draw(){
    if(!this.width||!this.height)return;const c=this.ctx,W=WORLD.w,H=WORLD.h,p=this.state.player;
    this.scale=this.width>=640?Math.min(this.width/1100,this.height/650):Math.max(this.width/700,this.height/650);
    const vw=this.width/this.scale,vh=this.height/this.scale;
    this.camera={x:Math.max(0,Math.min(W-vw,p.x-vw/2)),y:Math.max(0,Math.min(H-vh,p.y-vh*.58))};
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.scale(this.scale,this.scale);c.translate(-this.camera.x,-this.camera.y);
    c.fillStyle='#b9d8a1';c.fillRect(this.camera.x,this.camera.y,vw,vh);
    // soft district washes
    this.ellipse(480,180,220,140,'#cfe9b855');this.ellipse(1520,160,210,130,'#d9c8f040');
    this.ellipse(260,920,200,150,'#b9d7f040');this.ellipse(1600,980,220,150,'#f0c2b040');
    this.ellipse(300,420,210,140,'#f3d7b840');this.ellipse(1500,470,210,140,'#c5dff040');
    this.ellipse(900,540,260,180,'#e8efc850');
    this.poly([[0,0],[W,0],[W,180],[0,240]],'#c8e1b0');
    for(let i=0;i<260;i++){const x=(i*137)%W,y=(i*83)%H;this.ellipse(x,y,2,1.1,i%3?'#a2c68a':'#e2e9a7');}
    // road network
    this.road(820,120,160,960);this.road(120,470,1560,120);
    this.road(420,120,140,420);this.road(1380,120,140,420);
    this.road(160,820,780,110);this.road(900,820,720,110);
    this.road(200,200,420,90);this.road(1280,160,420,90);
    this.ellipse(900,560,150,110,'#c4bca0');this.ellipse(900,556,138,100,'#f6e9cc');
    c.strokeStyle='#e3d5b6';c.lineWidth=1;for(let y=160;y<1080;y+=36){c.beginPath();c.moveTo(848,y);c.lineTo(952,y);c.stroke();}
    // pond
    this.round(790,830,220,130,54,'#98ba91');this.round(800,838,200,112,48,'#80bec1');this.round(808,844,184,98,45,'#a3d5d2');
    this.ellipse(900,900,14,6,'#71af87');this.text('✿',900,899,16,'#f6efcb');
    // decoration trees (non-blocking)
    for(const [x,y,k] of [[70,180,1.2],[90,640,1],[70,1100,.9],[300,110,1],[700,100,.85],[1100,110,1],[1700,160,1.2],[1720,640,1],[1700,1100,1],[1100,1100,.9],[620,640,.7],[1180,640,.7],[480,360,.65],[1320,360,.65]])this.tree(x,y,k);
    // story buildings
    this.house(155,235,255,150,'#fff0ce','#db8770',this.words().shopShort,true);
    this.house(1390,305,230,140,'#fcf5dd','#82aab3',this.words().homeShort);
    this.round(845,360,120,62,5,'#c49b6b');this.round(851,366,108,46,3,'#f9f0cf');this.text('PIKO TOWN',905,388,13);this.text('✦ MAP ✦',905,408,12,'#c58d4f');
    for(const x of [780,1010]){this.round(x,500,5,65,2,'#66867b');this.round(x-9,494,23,15,5,'#fff0b9');}
    // arcade landmarks
    this.landmarkFruit(PLACES.fruit.x,PLACES.fruit.y);
    this.landmarkBreakout(PLACES.breakout.x,PLACES.breakout.y);
    this.landmarkRace(PLACES.race.x,PLACES.race.y);
    this.landmarkNinja(PLACES.ninja.x,PLACES.ninja.y);
    // district signs
    this.round(430,320,120,28,10,'#ffffffcc');this.text(this.words().districtPark,490,339,11,'#5d734f');
    this.round(200,700,130,28,10,'#ffffffcc');this.text(this.words().districtAlley,265,719,11,'#3d5a73');
    this.round(1480,720,140,28,10,'#ffffffcc');this.text(this.words().districtTrack,1550,739,11,'#8a4a3a');
    this.round(1480,300,130,28,10,'#ffffffcc');this.text(this.words().districtDojo,1545,319,11,'#5a4578');
    if(this.path.length){for(let i=3;i<this.path.length;i+=5)this.ellipse(this.path[i].x,this.path[i].y,3,2,'#b89a69a0');}
    const actors=Object.entries(PLACES).map(([kind,pos])=>({...pos,kind,color:VENUE_COLOR[kind]||'#9ab57a'}));
    actors.push({...p,kind:'player',color:AVATAR_COLORS[this.state.avatar]});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>this.person(a.x,a.y,a.color,a.kind,a.kind==='player'&&this.walking));
    for(const [id,pos] of Object.entries(PLACES)){
      const target=this.state.mission<10&&['guide','shop','shop','shop','shop','shop','shop','shop','home','guide'][this.state.mission]===id;
      if(target){const bob=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(this.clock*3)*3;this.ellipse(pos.x,pos.y-93+bob,12,13,'#ffe0a0');this.text('!',pos.x,pos.y-88+bob,20,'#8b653b');}
      const label=STORY.includes(id)?VENUE_LABEL[id]:(this.words()[`${id}Short`]||VENUE_LABEL[id]);
      const tw=STORY.includes(id)?50:Math.max(54,String(label).length*7+16);
      this.round(pos.x-tw/2,pos.y+13,tw,19,9,'#fff8e6e8');this.text(label,pos.x,pos.y+27,11);
    }
    this.poly([[p.x-5,p.y-82],[p.x+5,p.y-82],[p.x,p.y-75]],'#ffffff');
    if(this.state.mission>=10){this.text('✦',820,300,28,'#edb961');this.text('✦',980,310,22,'#edb961');}
  }
}
