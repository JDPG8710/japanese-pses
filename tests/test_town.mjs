import assert from 'node:assert/strict';
import {newState,restoreState,loadState,saveState,orderFor,startOrder,submitOrder,completeMission,buyFurniture,placeFurniture,canWalk,movePlayer,findPath,PLACES,MISSIONS,FURNITURE,englishOrder} from '../src/town/TownRules.mjs';
import {TEXT} from '../src/town/TownText.mjs';
import {townEntry} from '../src/town/TownEntry.mjs';
let checks=0;const check=(name,fn)=>{fn();checks++;console.log(`ok ${checks} - ${name}`);};
check('all 9 combinations of independent levels complete the entire story',()=>{
  for(let math=1;math<=3;math++)for(let english=1;english<=3;english++){
    let s=newState();s.math=math;s.english=english;completeMission(s,0);
    for(let mission=1;mission<=7;mission++){
      const a=startOrder(s);assert.equal(a.mission,mission);assert.ok(a.paid>a.total);assert.equal(a.items.reduce((sum,n,i)=>sum+n*a.prices[i],0),a.total);assert.match(englishOrder(a),/[.!]$/);
      while(s.mission===mission){const a=s.active;if(a.phase==='basket')a.bag=[...a.items];else a.input=String(a.phase==='total'?a.total:a.paid-a.total);assert.equal(submitOrder(s).ok,true);if(s.active)s=restoreState(JSON.parse(JSON.stringify(s)));}
    }
    assert.equal(s.mission,8);assert.equal(s.coins,40);assert.ok(s.owned.includes('plant'));assert.equal(placeFurniture(s,'plant',4),true);assert.equal(s.mission,9);
    assert.equal(completeMission(s,9),true);assert.equal(s.coins,50);assert.equal(s.xp,100);assert.equal(s.mission,10);
    assert.equal(completeMission(s,9),false);assert.equal(submitOrder(s).ok,false);assert.equal(s.coins,50);
  }
});
check('wrong items, extra items, empty answers and wrong change cannot advance',()=>{
  const s=newState();s.mission=1;const a=startOrder(s);assert.equal(submitOrder(s).ok,false);a.bag=[...a.items];a.bag[3]=1;assert.equal(submitOrder(s).ok,false);assert.equal(s.mission,1);assert.equal(s.coins,0);
  s.mission=4;s.active=null;startOrder(s);for(const value of ['', ' ', '0','1e1','-2','2.0','0003']){s.active.input=value;assert.equal(submitOrder(s).ok,false,value);}assert.equal(s.mission,4);
});
check('order snapshot and partial answer survive reload and changing settings',()=>{
  const s=newState();s.mission=5;const a=startOrder(s);a.bag=[...a.items];submitOrder(s);a.input='7';s.math=3;s.english=3;a.hinted=true;
  const r=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(r.active.phase,'total');assert.equal(r.active.input,'7');assert.equal(r.active.math,1);assert.equal(r.active.english,1);assert.equal(r.active.hinted,true);
});
check('malformed storage, missing storage and quota failures are safe',()=>{
  assert.deepEqual(loadState({getItem:()=>'{broken'}),newState());assert.deepEqual(loadState({getItem(){throw Error();}}),newState());assert.equal(saveState(null,newState()),false);assert.equal(saveState({setItem(){throw Error('quota');}},newState()),false);
  for(const raw of [null,{},[],{version:2},{version:1,mission:-1,coins:-3,player:{x:NaN,y:0},owned:'plant',room:['plant'],active:{mission:0}}])assert.equal(restoreState(raw).mission,0);
  const s=restoreState({version:1,mission:1,active:{mission:1,phase:'change',items:[99],paid:1000,bag:[Infinity,3,-1],input:'<script>'}});assert.equal(s.active.phase,'basket');assert.deepEqual(s.active.items,[1,2,0,0]);assert.equal(s.active.paid,10);assert.equal(s.active.input,'');
});
check('purchases cannot duplicate, overspend or buy the quest gift',()=>{
  const s=newState();assert.equal(buyFurniture(s,'books'),false);s.coins=30;assert.equal(buyFurniture(s,'plant'),false);assert.equal(buyFurniture(s,'missing'),false);assert.equal(buyFurniture(s,'books'),true);assert.equal(s.coins,22);assert.equal(buyFurniture(s,'books'),false);assert.equal(s.coins,22);assert.equal(buyFurniture(s,'globe'),true);assert.equal(buyFurniture(s,'lamp'),false);
});
check('room placement moves items and retains replaced furniture in inventory',()=>{
  const s=newState();s.owned=['plant','books'];assert.equal(placeFurniture(s,'bear',1),false);assert.equal(placeFurniture(s,'plant',9),false);placeFurniture(s,'plant',0);placeFurniture(s,'plant',4);assert.equal(s.room[0],null);placeFurniture(s,'books',4);assert.equal(s.room[4],'books');assert.ok(s.owned.includes('plant'));
  const r=restoreState({...s,room:['books','books','plant','bad']});assert.deepEqual(r.room,['books',null,'plant',null,null,null,null,null,null]);
});
check('every place is reachable from every other place and the initial spawn',()=>{
  for(const from of [...Object.values(PLACES),newState().player])for(const to of Object.values(PLACES)){
    if(from===to)continue;const route=findPath(from,to);assert.ok(route.length>0);assert.ok(route.every(p=>canWalk(p.x,p.y)));assert.ok(Math.hypot(route.at(-1).x-to.x,route.at(-1).y-to.y)<8);
    let p={...from};for(const dest of route){let steps=0;while(Math.hypot(dest.x-p.x,dest.y-p.y)>=4&&steps++<50){const d=Math.hypot(dest.x-p.x,dest.y-p.y);p=movePlayer(p,(dest.x-p.x)/d*3,(dest.y-p.y)/d*3);}assert.ok(steps<50,`movement stuck: ${JSON.stringify({from,to,p,dest})}`);}
  }
});
check('buildings, lake and town edges block movement',()=>{
  assert.equal(canWalk(150,200),false);assert.equal(canWalk(200,500),false);assert.equal(canWalk(44,500),false);assert.deepEqual(findPath(newState().player,{x:200,y:200}),[]);
  const p={x:500,y:360};assert.deepEqual(movePlayer(p,0,-5),p);
});
check('every locale covers all UI fields, mission names and objectives',()=>{
  for(const l of ['zh','en','ja']){assert.deepEqual(Object.keys(TEXT[l]).sort(),Object.keys(TEXT.en).sort());assert.equal(TEXT[l].missions.length,MISSIONS.length);assert.equal(TEXT[l].objectives.length,MISSIONS.length);for(const f of FURNITURE)assert.ok(f[l]);assert.ok(!townEntry(l,'CN').includes('undefined'));}
  assert.ok(!townEntry('<script>','"><img>').includes('<script>'));
});
console.log(`Town rules: ${checks} groups passed.`);
