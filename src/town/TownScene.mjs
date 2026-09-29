import {PLACES,movePlayer,findPath} from './TownRules.mjs?v=1';
export const AVATAR_COLORS=['#ec825f','#509fd4','#9c82cf','#62a67a'];
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
      const place=Object.keys(PLACES).find(id=>Math.hypot(x-PLACES[id].x,y-(PLACES[id].y-20))<48);
      if(place)this.travel(place);else{this.path=findPath(this.state.player,{x,y});this.destination=null;}
    });
    this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  size(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;this.draw();}
  stop(){this.keys.clear();this.path=[];this.destination=null;this.onMove();}
  travel(id){if(this.isPaused())return;this.keys.clear();const place=PLACES[id];this.path=findPath(this.state.player,{x:place.x+30,y:place.y+35});this.destination=id;if(!this.path.length&&Math.hypot(this.state.player.x-place.x,this.state.player.y-place.y)<75){this.destination=null;this.onArrive(id);}}
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
    this.round(-14,-64,28,28,8,'#f3c296');this.round(-15,-67,30,11,5,kind==='guide'?'#b77748':'#574334');
    if(kind==='shop'){this.round(-17,-69,34,7,3,'#ffefc4');this.round(-10,-78,20,12,3,'#ffefc4');this.round(-11,-34,22,19,3,'#fff2d9');}
    if(kind==='home')this.round(-19,-68,38,8,4,'#94b9d5');
    this.ellipse(-5,-51,1.7,2,'#493b31');this.ellipse(6,-51,1.7,2,'#493b31');
    c.strokeStyle='#b76f56';c.lineWidth=1.5;c.beginPath();c.arc(1,-45,4,0,Math.PI);c.stroke();c.restore();
  }
  draw(){
    if(!this.width||!this.height)return;const c=this.ctx;
    this.scale=this.width>=640?Math.min(this.width/1100,this.height/650):Math.max(this.width/700,this.height/650);
    const vw=this.width/this.scale,vh=this.height/this.scale,p=this.state.player;
    this.camera={x:this.width>=640?(1100-vw)/2:Math.max(0,Math.min(1100-vw,p.x-vw/2)),y:this.width>=640?70:Math.max(0,Math.min(720-vh,p.y-vh*.66))};
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.scale(this.scale,this.scale);c.translate(-this.camera.x,-this.camera.y);
    c.fillStyle='#b9d8a1';c.fillRect(this.camera.x,this.camera.y,vw,vh);
    this.poly([[0,0],[1100,0],[1100,160],[0,215]],'#c8e1b0');
    for(let i=0;i<140;i++){const x=(i*137)%1100,y=(i*83)%720;this.ellipse(x,y,2,1.1,i%3?'#a2c68a':'#e2e9a7');}
    this.round(440,110,195,550,50,'#c3b99b');this.round(447,110,181,550,48,'#f2e6c9');
    this.round(225,325,655,116,40,'#c3b99b');this.round(225,325,655,108,38,'#f2e6c9');
    this.ellipse(548,492,140,102,'#c4bca0');this.ellipse(548,488,132,96,'#f6e9cc');
    c.strokeStyle='#e3d5b6';c.lineWidth=1;for(let y=145;y<650;y+=32){c.beginPath();c.moveTo(467,y);c.lineTo(608,y);c.stroke();}
    this.round(102,475,228,131,54,'#98ba91');this.round(111,482,210,113,48,'#80bec1');this.round(119,487,193,99,45,'#a3d5d2');
    for(let i=0;i<4;i++){this.round(140+i*26,520+i%2*24,37,3,2,'#d7eece');}this.ellipse(270,559,14,6,'#71af87');this.text('✿',270,558,16,'#f6efcb');
    // 花壇、垣根、街灯は歩行範囲を妨げない装飾。
    for(const [x,y,k] of [[70,168,1.3],[87,335,1],[1021,180,1.3],[1030,360,1],[366,140,.8],[685,155,1],[362,590,.9],[970,590,1.2],[70,653,.9],[703,640,.75]])this.tree(x,y,k);
    for(let i=0;i<8;i++){this.round(706+i*30,555,21,12,3,'#8ab87e');this.text(i%2?'✿':'✦',715+i*30,554,15,i%2?'#fff2c5':'#ee9ca0');}
    this.house(150,168,265,157,'#fff0ce','#db8770',this.words().shopShort,true);
    this.house(720,180,220,149,'#fcf5dd','#82aab3',this.words().homeShort);
    this.round(493,271,122,65,5,'#c49b6b');this.round(499,277,110,48,3,'#f9f0cf');this.text('PIKO TOWN',554,299,13);this.text('✦ 01 ✦',554,319,13,'#c58d4f');
    this.round(500,334,8,18,1,'#aa825e');this.round(600,334,8,18,1,'#aa825e');
    for(const x of [405,672]){this.round(x,385,5,65,2,'#66867b');this.round(x-9,379,23,15,5,'#fff0b9');}
    this.round(748,477,119,17,4,'#b39471');this.round(752,498,110,13,3,'#c6a07a');this.round(758,512,6,14,2,'#856d59');this.round(849,512,6,14,2,'#856d59');
    this.ellipse(550,512,34,13,'#dccbad');this.text('✳',550,524,40,'#d7bd8e');
    if(this.path.length){for(let i=3;i<this.path.length;i+=5)this.ellipse(this.path[i].x,this.path[i].y,3,2,'#b89a69a0');}
    const actors=Object.entries(PLACES).map(([kind,pos])=>({...pos,kind,color:kind==='shop'?'#eaa46c':kind==='home'?'#8aadd0':'#9ab57a'}));
    actors.push({...p,kind:'player',color:AVATAR_COLORS[this.state.avatar]});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>this.person(a.x,a.y,a.color,a.kind,a.kind==='player'&&this.walking));
    for(const [id,pos] of Object.entries(PLACES)){
      const target=this.state.mission<10&&['guide','shop','shop','shop','shop','shop','shop','shop','home','guide'][this.state.mission]===id;
      if(target){const bob=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(this.clock*3)*3;this.ellipse(pos.x,pos.y-93+bob,12,13,'#ffe0a0');this.text('!',pos.x,pos.y-88+bob,20,'#8b653b');}
      const label={guide:'Piko',shop:'Mia',home:'Noah'}[id];this.round(pos.x-25,pos.y+13,50,19,9,'#fff8e6e8');this.text(label,pos.x,pos.y+27,12);
    }
    this.poly([[p.x-5,p.y-82],[p.x+5,p.y-82],[p.x,p.y-75]],'#ffffff');
    if(this.state.mission>=10){this.text('✦',448,227,28,'#edb961');this.text('✦',658,240,22,'#edb961');}
  }
}
