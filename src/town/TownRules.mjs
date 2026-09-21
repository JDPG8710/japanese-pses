// 小镇规则与浏览器解耦。所有数值都以整数星币表示；第一版只保存本机进度。
import {newExpansion,restoreExpansion} from './ArcadeRules.mjs?v=2';
export const SAVE_KEY = 'piko-town-v1';
export const PRODUCTS = [
  {id:'apple',icon:'🍎',en:'apple',plural:'apples',zh:'苹果',ja:'りんご',price:3},
  {id:'banana',icon:'🍌',en:'banana',plural:'bananas',zh:'香蕉',ja:'バナナ',price:2},
  {id:'bread',icon:'🍞',en:'loaf of bread',plural:'loaves of bread',zh:'面包',ja:'パン',price:4},
  {id:'milk',icon:'🥛',en:'carton of milk',plural:'cartons of milk',zh:'牛奶',ja:'ミルク',price:5}
];
export const FURNITURE = [
  {id:'plant',icon:'🪴',price:0,zh:'开业绿植',en:'Welcome plant',ja:'おいわいの はち'},
  {id:'books',icon:'📚',price:8,zh:'故事书',en:'Story books',ja:'えほん'},
  {id:'lamp',icon:'💡',price:12,zh:'小夜灯',en:'Little lamp',ja:'ランプ'},
  {id:'bear',icon:'🧸',price:15,zh:'小熊伙伴',en:'Teddy bear',ja:'くまの ぬいぐるみ'},
  {id:'flowers',icon:'🌷',price:10,zh:'郁金香',en:'Tulips',ja:'チューリップ'},
  {id:'globe',icon:'🌎',price:20,zh:'世界地球仪',en:'World globe',ja:'ちきゅうぎ'}
];
export const MISSIONS = [
  {place:'guide',kind:'welcome'},
  {place:'shop',kind:'basket',items:[1,2,0,0]},
  {place:'shop',kind:'basket',items:[0,0,1,1]},
  {place:'shop',kind:'total',items:[2,1,0,0]},
  {place:'shop',kind:'change',items:[2,1,0,0]},
  {place:'shop',kind:'sale',items:[1,0,1,0]},
  {place:'shop',kind:'sale',items:[0,2,0,1]},
  {place:'shop',kind:'sale',items:[2,0,1,1]},
  {place:'home',kind:'decorate'},
  {place:'guide',kind:'opening'}
];
export const PLACES = {guide:{x:565,y:430},shop:{x:290,y:365},home:{x:835,y:370}};
export const OBSTACLES = [
  {x:145,y:160,w:280,h:170}, {x:710,y:170,w:240,h:160},
  {x:490,y:265,w:130,h:80}, {x:100,y:470,w:235,h:145}
];
export function canWalk(x,y){
  return x>=45&&x<=1055&&y>=100&&y<=655&&!OBSTACLES.some(r=>x>r.x-14&&x<r.x+r.w+14&&y>r.y-10&&y<r.y+r.h+12);
}
export function movePlayer(player,dx,dy){
  const next={...player};
  if(canWalk(next.x+dx,next.y))next.x+=dx;
  if(canWalk(next.x,next.y+dy))next.y+=dy;
  return next;
}
// 网格寻路只用于点击目的地。键盘和触控方向键沿同一碰撞规则移动。
export function findPath(from,to){
  const step=10,key=(x,y)=>`${x},${y}`,sx=Math.round(from.x/step),sy=Math.round(from.y/step),tx=Math.round(to.x/step),ty=Math.round(to.y/step);
  if(!canWalk(tx*step,ty*step))return [];
  const queue=[[sx,sy]],parents=new Map([[key(sx,sy),null]]);let end;
  for(let n=0;n<queue.length&&n<9000;n++){
    const [x,y]=queue[n];if(x===tx&&y===ty){end=[x,y];break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,k=key(xx,yy);
      // 衝突境界から余裕を取り、移動中の角のショートカットや浮動小数点で停止しない。
      const clear=canWalk(xx*step,yy*step)&&[[6,0],[-6,0],[0,6],[0,-6]].every(([ox,oy])=>canWalk(xx*step+ox,yy*step+oy));
      if(!parents.has(k)&&clear){parents.set(k,[x,y]);queue.push([xx,yy]);}
    }
  }
  if(!end)return [];
  const result=[];for(let cur=end;parents.get(key(...cur));cur=parents.get(key(...cur)))result.unshift({x:cur[0]*step,y:cur[1]*step});
  return result;
}
export function newState(){return {expansion:newExpansion(),version:1,mission:0,coins:0,xp:0,math:1,english:1,avatar:0,player:{x:560,y:555},owned:[],room:Array(9).fill(null),active:null,stats:{correct:0,mistakes:0,hints:0},started:false};}
const integer=(x,min,max,fallback)=>Number.isInteger(x)&&x>=min&&x<=max?x:fallback;
export function orderFor(mission,math=1,english=1){
  const spec=MISSIONS[mission];if(!spec||!spec.items)return null;
  const items=spec.items.map(n=>n? n+(math-1):0),prices=PRODUCTS.map(p=>p.price*(math===3?3:1));
  const total=items.reduce((sum,n,i)=>sum+n*prices[i],0),paid=Math.ceil((total+1)/(math===1?10:20))*(math===1?10:20);
  return {mission,math,english,items,prices,total,paid,phase:['total','change'].includes(spec.kind)?spec.kind:'basket',bag:[0,0,0,0],input:'',hinted:false};
}
export function restoreState(raw){
  const s=newState();if(!raw||raw.version!==1)return s;
  s.expansion=restoreExpansion(raw.expansion);s.mission=integer(raw.mission,0,10,0);s.coins=integer(raw.coins,0,1000000000,0);s.xp=integer(raw.xp,0,1000000000,0);
  s.math=integer(raw.math,1,3,1);s.english=integer(raw.english,1,3,1);s.avatar=integer(raw.avatar,0,3,0);s.started=raw.started===true;
  if(canWalk(raw.player?.x,raw.player?.y)&&Number.isFinite(raw.player.x)&&Number.isFinite(raw.player.y))s.player={x:raw.player.x,y:raw.player.y};
  s.owned=FURNITURE.filter(f=>Array.isArray(raw.owned)&&raw.owned.includes(f.id)).map(f=>f.id);
  const seen=new Set();s.room=Array.from({length:9},(_,i)=>{const id=raw.room?.[i];if(s.owned.includes(id)&&!seen.has(id)){seen.add(id);return id;}return null;});
  for(const k of Object.keys(s.stats))s.stats[k]=integer(raw.stats?.[k],0,100000,0);
  const a=raw.active;
  if(a&&a.mission===s.mission){
    const order=orderFor(s.mission,integer(a.math,1,3,s.math),integer(a.english,1,3,s.english));
    if(order){
      const phases=MISSIONS[s.mission].kind==='sale'?['basket','total','change']:[order.phase];
      if(phases.includes(a.phase))order.phase=a.phase;
      order.bag=Array.from({length:4},(_,i)=>integer(a.bag?.[i],0,9,0));
      order.input=typeof a.input==='string'&&/^\d{0,4}$/.test(a.input)?a.input:'';
      order.hinted=a.hinted===true;s.active=order;
    }
  }
  return s;
}
export function loadState(storage){try{return restoreState(JSON.parse(storage?.getItem(SAVE_KEY)));}catch{return newState();}}
export function saveState(storage,state){try{if(!storage)return false;storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function startOrder(s){if(!s.active)s.active=orderFor(s.mission,s.math,s.english);return s.active;}
export function completeMission(s,expected){
  if(expected!==s.mission||!MISSIONS[expected])return false;
  s.mission++;s.coins+=5;s.xp+=10;s.active=null;
  if(s.mission===8&&!s.owned.includes('plant'))s.owned.push('plant');
  return true;
}
export function submitOrder(s){
  const a=s.active;if(!a||a.mission!==s.mission)return {ok:false,reason:'missing'};
  const correct=a.phase==='basket'?a.items.every((n,i)=>a.bag[i]===n):/^\d+$/.test(a.input)&&Number(a.input)===(a.phase==='total'?a.total:a.paid-a.total);
  if(!correct){s.stats.mistakes++;return {ok:false,reason:a.phase};}
  s.stats.correct++;
  if(MISSIONS[s.mission].kind==='sale'&&a.phase!=='change'){a.phase=a.phase==='basket'?'total':'change';a.input='';a.hinted=false;return {ok:true,done:false};}
  completeMission(s,s.mission);return {ok:true,done:true};
}
export function buyFurniture(s,id){
  const f=FURNITURE.find(f=>f.id===id);
  if(!f||id==='plant'||s.owned.includes(id)||s.coins<f.price)return false;
  s.coins-=f.price;s.owned.push(id);return true;
}
export function placeFurniture(s,id,slot){
  if(!s.owned.includes(id)||!Number.isInteger(slot)||slot<0||slot>8)return false;
  const old=s.room.indexOf(id);if(old>=0)s.room[old]=null;s.room[slot]=id;
  if(s.mission===8)completeMission(s,8);return true;
}
const numbers=['zero','one','two','three','four','five','six','seven','eight','nine'];
export function englishOrder(a){
  const list=a.items.flatMap((n,i)=>n?[`${numbers[n]||n} ${n===1?PRODUCTS[i].en:PRODUCTS[i].plural}`]:[]);
  const phrase=list.length>1?`${list.slice(0,-1).join(', ')} and ${list.at(-1)}`:list[0];
  if(a.english===1)return `${phrase[0].toUpperCase()+phrase.slice(1)}, please.`;
  if(a.english===2)return `Hello! I would like ${phrase}, please.`;
  return `I'm getting ready for a picnic. Could I have ${phrase}? That's everything, thank you!`;
}
