// Seeded, resumable challenges. Rewards are applied only on an unresolved stage.
export const MODES=['obby','tower','runner','memory','garden'];
export const AVATARS=[
 {id:'explorer',color:0xf07850,skin:0xf5c797,zh:'探险家',en:'Explorer',ja:'たんけんか'},
 {id:'robot',color:0x69bbda,skin:0xd4e8ee,zh:'小机器人',en:'Little robot',ja:'ロボット'},
 {id:'cat',color:0xb292e5,skin:0xffd6b1,zh:'猫咪伙伴',en:'Cat friend',ja:'ねこフレンド'},
 {id:'astro',color:0xe6eefb,skin:0xd4b093,zh:'宇航员',en:'Astronaut',ja:'うちゅうひこうし'},
 {id:'frog',color:0x77bc72,skin:0xf1c993,zh:'青蛙队长',en:'Frog captain',ja:'かえるキャプテン'},
 {id:'builder',color:0xf5c94e,skin:0x976441,zh:'建造师',en:'Builder',ja:'ビルダー'}
];
export const ITEMS=[
 {id:'shoes',price:18,icon:'👟',kind:'gear',zh:'轻快运动鞋',en:'Speed shoes',ja:'スピードシューズ',effect:'speed'},
 {id:'spring',price:24,icon:'🦘',kind:'gear',zh:'弹跳靴',en:'Spring boots',ja:'ジャンプブーツ',effect:'jump'},
 {id:'backpack',price:12,icon:'🎒',kind:'style',zh:'冒险背包',en:'Adventure pack',ja:'ぼうけんリュック',effect:'backpack'},
 {id:'crown',price:30,icon:'👑',kind:'style',zh:'星星王冠',en:'Star crown',ja:'スタークラウン',effect:'crown'},
 {id:'shield',price:8,icon:'🛡',kind:'use',zh:'练习护盾',en:'Practice shield',ja:'れんしゅうシールド',effect:'shield'},
 {id:'hint',price:6,icon:'💡',kind:'use',zh:'提示卡',en:'Hint card',ja:'ヒントカード',effect:'hint'}
];
const int=(v,lo,hi,d)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi?v:d;
export function newExpansion(){return {version:2,character:'explorer',accessory:null,gear:[],inventory:{shield:0,hint:0},runs:{},best:Object.fromEntries(MODES.map(id=>[id,0])),total:0};}
export function restoreExpansion(raw){
 const e=newExpansion();if(!raw||raw.version!==2)return e;
 e.character=AVATARS.some(a=>a.id===raw.character)?raw.character:e.character;
 e.gear=ITEMS.filter(i=>i.kind!=='use'&&Array.isArray(raw.gear)&&raw.gear.includes(i.id)).map(i=>i.id);
 e.accessory=['backpack','crown'].includes(raw.accessory)&&e.gear.includes(raw.accessory)?raw.accessory:null;
 for(const k of ['shield','hint'])e.inventory[k]=int(raw.inventory?.[k],0,99,0);
 e.total=int(raw.total,0,1e9,0);
 for(const mode of MODES){
  e.best[mode]=int(raw.best?.[mode],0,1e9,0);const r=raw.runs?.[mode];
  if(r&&r.mode===mode&&Number.isSafeInteger(r.seed))e.runs[mode]={mode,seed:r.seed>>>0,stage:int(r.stage,1,1e9,1),math:int(r.math,1,3,1),english:int(r.english,1,3,1),hearts:int(r.hearts,0,3,3),streak:int(r.streak,0,1e9,0),solved:r.solved===true,memoryIndex:int(r.memoryIndex,0,5,0),hinted:r.hinted===true};
 }
 return e;
}
export function startRun(s,mode,seed=Date.now()){
 if(!MODES.includes(mode))return null;
 const e=s.expansion??=newExpansion();
 return e.runs[mode]??=( {mode,seed:seed>>>0,stage:1,math:s.math,english:s.english,hearts:3,streak:0,solved:false,memoryIndex:0,hinted:false});
}
function random(seed){let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function questionFor(r){
 const rng=random((r.seed+Math.imul(r.stage,2654435761))>>>0),pick=n=>Math.floor(rng()*n),band=Math.min(4,Math.floor((r.stage-1)/8));
 const level=r.math||1,max=[0,10,30,80][level]+band*5;let a=1+pick(max),b=1+pick(level===1?9:12),answer,question,explanation;
 const op=level===1?pick(2):pick(4);
 if(op===0){answer=a+b;question=`${a} + ${b} = ?`;explanation=`${a} + ${b} = ${answer}`;}
 else if(op===1){if(b>a)[a,b]=[b,a];answer=a-b;question=`${a} − ${b} = ?`;explanation=`${a} − ${b} = ${answer}`;}
 else if(op===2){a=1+pick(level===2?9:12);answer=a*b;question=`${a} × ${b} = ?`;explanation=`${a} × ${b} = ${answer}`;}
 else{answer=a;question=`${a*b} ÷ ${b} = ?`;explanation=`${a*b} ÷ ${b} = ${answer}`;}
 let options;
 if(r.mode==='runner'){
  const vocab=[['apple','🍎','苹果','りんご'],['banana','🍌','香蕉','バナナ'],['book','📘','书','ほん'],['cat','🐱','猫','ねこ'],['frog','🐸','青蛙','かえる'],['sun','☀️','太阳','たいよう'],['tree','🌳','树','き'],['milk','🥛','牛奶','ミルク'],['star','⭐','星星','ほし']];
  const index=pick(vocab.length),word=vocab[index];
  options=[word,vocab[(index+1+pick(3))%vocab.length],vocab[(index+5+pick(3))%vocab.length]].map(v=>v[1]);answer=word[1];
  question=r.english===1?word[0]:r.english===2?`Find the ${word[0]}.`:`Please deliver the ${word[0]} to the blue gate.`;
  explanation=`${word[0]} = ${word[1]} · ${word[2]} · ${word[3]}`;
 }else if(r.mode==='garden'){
  const crops=[['apples','🍎'],['carrots','🥕'],['tomatoes','🍅'],['bananas','🍌']],crop=crops[pick(crops.length)],rows=2+pick(r.math===1?3:7),each=1+pick(r.math===1?4:9);
  answer=rows*each;question=r.english===1?`${rows} baskets × ${each} ${crop[0]}`:`Harvest ${rows} baskets with ${each} ${crop[0]} in each basket.`;
  explanation=`${rows} × ${each} = ${answer} ${crop[1]}`;
 }else if(r.mode==='memory'){
  const sequence=Array.from({length:Math.min(5,2+Math.floor((r.stage-1)/4))},()=>pick(4));
  return {question:'memory',sequence,options:['RED','BLUE','YELLOW','GREEN'],colors:[0xf17f79,0x76b8ef,0xf5cf5a,0x85c999],answer:sequence[Math.min(r.memoryIndex,sequence.length-1)],explanation:sequence.map(n=>['RED','BLUE','YELLOW','GREEN'][n]).join(' → ')};
 }
 if(!options){options=[String(answer)];for(const delta of [1+pick(3),-(1+pick(3)),5,10]){const v=String(Math.max(0,answer+delta));if(!options.includes(v))options.push(v);if(options.length===3)break;}answer=String(answer);}
 for(let i=options.length-1;i>0;i--){const j=pick(i+1);[options[i],options[j]]=[options[j],options[i]];}
 return {question,options,answer:options.indexOf(answer),explanation};
}
export function answerRun(s,mode,index){
 const r=s.expansion?.runs[mode];if(!r||r.solved||r.hearts<=0||!Number.isInteger(index))return {ok:false,ignored:true};
 const q=questionFor(r);if(index<0||index>=q.options.length)return {ok:false,ignored:true};
 if(index!==q.answer){
  const shield=s.expansion.inventory.shield>0;if(shield)s.expansion.inventory.shield--;else{r.hearts--;r.streak=0;}r.memoryIndex=0;
  return {ok:false,shield,explanation:q.explanation,over:r.hearts===0};
 }
 if(mode==='memory'&&++r.memoryIndex<q.sequence.length)return {ok:true,partial:true};
 r.solved=true;r.streak++;const coins=3+Math.min(3,Math.floor(r.stage/10))+(r.stage%5===0?5:0);
 s.coins=Math.min(1e9,s.coins+coins);s.xp=Math.min(1e9,s.xp+4);s.expansion.total++;s.expansion.best[mode]=Math.max(s.expansion.best[mode]||0,r.stage);
 return {ok:true,coins,explanation:q.explanation};
}
export function nextStage(s,mode){const r=s.expansion?.runs[mode];if(!r?.solved)return false;r.stage=Math.min(1e9,r.stage+1);r.solved=false;r.hearts=3;r.memoryIndex=0;r.hinted=false;r.math=s.math;r.english=s.english;return true;}
export function retryStage(s,mode){const r=s.expansion?.runs[mode];if(!r||r.solved||r.hearts>0)return false;r.hearts=3;r.memoryIndex=0;return true;}
export function buyItem(s,id){const i=ITEMS.find(i=>i.id===id),e=s.expansion;if(!i||!e||s.coins<i.price)return false;if(i.kind==='use'){if(e.inventory[id]>=99)return false;e.inventory[id]++;}else{if(e.gear.includes(id))return false;e.gear.push(id);}s.coins-=i.price;return true;}
export function useHint(s,mode){const r=s.expansion?.runs[mode];if(!r||r.solved||r.hinted||s.expansion.inventory.hint<1)return false;s.expansion.inventory.hint--;r.hinted=true;return true;}
