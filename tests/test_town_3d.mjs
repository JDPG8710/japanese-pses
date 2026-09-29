import assert from 'node:assert/strict';
import {newState,restoreState} from '../src/town/TownRules.mjs';
import {MODES,ITEMS,AVATARS,startRun,questionFor,answerRun,nextStage,retryStage,buyItem,useHint,restoreExpansion} from '../src/town/ArcadeRules.mjs';
import {ARCADE_TEXT} from '../src/town/ArcadeText.mjs';
let checks=0;const ok=s=>{checks++;console.log(`ok ${checks} - ${s}`);};
for(const mode of MODES)for(let math=1;math<=3;math++)for(let english=1;english<=3;english++){
 const s=newState();s.math=math;s.english=english;let r=startRun(s,mode,42),coins=0;
 for(let n=1;n<=120;n++){
  const q=questionFor(r);assert.deepEqual(q,questionFor(r));assert.ok(q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);
  let result;do{result=answerRun(s,mode,questionFor(r).answer);}while(result.partial);
  assert.equal(result.ok,true);assert.equal(r.solved,true);coins+=result.coins;assert.equal(s.coins,coins);
  assert.equal(answerRun(s,mode,q.answer).ignored,true);assert.equal(s.coins,coins);
  const restored=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(restored.expansion.runs[mode].solved,true);assert.equal(answerRun(restored,mode,q.answer).ignored,true);
  assert.equal(nextStage(s,mode),true);assert.equal(nextStage(s,mode),false);assert.equal(r.stage,n+1);
 }
 assert.equal(s.expansion.best[mode],120);
}
ok('5 modes × 9 difficulty combinations × 120 stages: valid questions, progress, one-time rewards and reload safety');
for(let seed=0;seed<80;seed++){
 const s=newState(),r=startRun(s,'obby',seed),q=questionFor(r),[a,op,b]=q.question.split(' ');const expected=op==='+'?Number(a)+Number(b):op==='−'?Number(a)-Number(b):op==='×'?Number(a)*Number(b):Number(a)/Number(b);assert.equal(Number(q.options[q.answer]),expected);
 const wrong=(q.answer+1)%q.options.length;for(let i=0;i<3;i++)answerRun(s,'obby',wrong);assert.equal(r.hearts,0);assert.equal(answerRun(s,'obby',q.answer).ignored,true);assert.equal(s.coins,0);assert.equal(retryStage(s,'obby'),true);assert.equal(r.stage,1);assert.deepEqual(questionFor(r),q);
}
ok('arithmetic is correct, three mistakes stop rewards, retry retains the same challenge');
{
 const s=newState();s.coins=200;const r=startRun(s,'runner',88),q=questionFor(r);for(const item of ITEMS){const before=s.coins;assert.equal(buyItem(s,item.id),true);assert.equal(s.coins,before-item.price);if(item.kind!=='use')assert.equal(buyItem(s,item.id),false);}
 assert.equal(buyItem(s,'invalid'),false);r.streak=3;const result=answerRun(s,'runner',(q.answer+1)%q.options.length);assert.equal(result.shield,true);assert.equal(r.hearts,3);assert.equal(r.streak,3);assert.equal(s.expansion.inventory.shield,0);
 assert.equal(useHint(s,'runner'),true);assert.equal(useHint(s,'runner'),false);assert.equal(s.expansion.inventory.hint,0);s.coins=0;assert.equal(buyItem(s,'hint'),false);
 const restored=restoreState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.expansion,s.expansion);
}
ok('shop prices, ownership, insufficient funds, automatic shields, hints, and equipment persistence');
{
 const s=newState(),r=startRun(s,'memory',7),q=questionFor(r);assert.equal(answerRun(s,'memory',q.answer).partial,true);assert.equal(s.coins,0);const restored=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(restored.expansion.runs.memory.memoryIndex,1);const q2=questionFor(r);answerRun(s,'memory',(q2.answer+1)%4);assert.equal(r.memoryIndex,0);
 s.math=3;const oldMath=r.math;assert.equal(oldMath,1);while(!r.solved)answerRun(s,'memory',questionFor(r).answer);nextStage(s,'memory');assert.equal(r.math,3);
}
ok('memory is a sequence, intermediate steps do not reward, settings take effect only next stage');
{
 const raw=newState();delete raw.expansion;raw.mission=7;raw.coins=44;const migrated=restoreState(raw);assert.equal(migrated.mission,7);assert.equal(migrated.coins,44);assert.equal(migrated.expansion.character,'explorer');
 const bad=restoreExpansion({version:2,character:'<script>',gear:['crown','x','crown'],accessory:'backpack',inventory:{hint:-5,shield:Infinity},runs:{obby:{mode:'obby',seed:3,stage:-3,hearts:999}}});assert.equal(bad.character,'explorer');assert.deepEqual(bad.gear,['crown']);assert.equal(bad.accessory,null);assert.equal(bad.inventory.hint,0);assert.equal(bad.runs.obby.stage,1);
 for(const id of MODES){const r=startRun(migrated,id,2);assert.equal(startRun(migrated,id,7),r);}assert.equal(Object.keys(migrated.expansion.runs).length,5);
}
ok('v1 migration, malformed saves, independent island saves');
for(const lang of ['zh','en','ja']){assert.deepEqual(Object.keys(ARCADE_TEXT[lang]).sort(),Object.keys(ARCADE_TEXT.en).sort());for(const id of MODES)assert.equal(ARCADE_TEXT[lang].modes[id].length,3);for(const a of AVATARS)assert.ok(a[lang]);for(const i of ITEMS)assert.ok(i[lang]);}
ok('all game, character, and shop content exists in Chinese, English, and Japanese');
console.log(`Town 3D rules: ${checks} groups passed.`);
