import assert from 'node:assert/strict';
import {newState,restoreState} from '../src/town/TownRules.mjs';
import {beginTownChallenge,cancelTownChallenge,settleTownChallenge,townDifficulty,normalizeDifficulty,progressionLabel,TOWN_GAME_IDS} from '../src/town/TownProgression.mjs';
import {startRun,answerRun,questionFor,nextStage} from '../src/town/ArcadeRules.mjs';
import {generateCourse} from '../src/town/PlatformCourse.mjs';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
import {createRaceGame,raceDifficultyFor} from '../src/arcade/RaceGame.mjs';
import {createBreakoutGame,breakoutDifficultyFor} from '../src/arcade/BreakoutGame.mjs';
import {createFruitSlashGame,fruitDifficultyFor} from '../src/arcade/FruitSlashGame.mjs';
import {createNinjaTypeGame,ninjaDifficultyFor} from '../src/arcade/NinjaTypeGame.mjs';

// Every successful challenge advances exactly once; level 20 must be cleared before endless.
let state=newState(),earned=0;
for(let clear=1;clear<=120;clear++){
 const before=townDifficulty(state),game=TOWN_GAME_IDS[(clear-1)%TOWN_GAME_IDS.length];
 assert.equal(before.level,Math.min(clear,20));assert.equal(before.infiniteRound,Math.max(0,clear-20));
 const ticket=beginTownChallenge(state,game,{seed:clear});
 state=restoreState(JSON.parse(JSON.stringify(state)));
 const reward=settleTownChallenge(state,ticket,{cleared:true,score:10});
 assert.equal(reward.awarded,true);earned+=reward.points;
 assert.equal(settleTownChallenge(state,ticket,{cleared:true,score:10}).awarded,false);
 assert.equal(state.coins,earned);assert.equal(state.townProgress.points,earned);
 assert.equal(state.townProgress.clears,clear);
}
assert.equal(state.townProgress.level,20);assert.equal(state.townProgress.infiniteRound,101);
assert.match(progressionLabel(state,'zh'),/无限挑战/);

// Failure, cancellation, invalid score and stale retry callbacks never award or unlock.
for(const result of [{cleared:false,score:100},{cleared:true,score:0},{cleared:true,score:NaN},{cleared:true,score:Infinity},{cleared:true,score:-1},{}]){
 const s=newState(),ticket=beginTownChallenge(s,'race');
 assert.equal(settleTownChallenge(s,ticket,result).awarded,false);
 assert.equal(settleTownChallenge(s,ticket,{cleared:true,score:1}).awarded,false);
 assert.equal(s.coins,0);assert.equal(s.townProgress.level,1);
}
{
 const s=newState(),old=beginTownChallenge(s,'fruit',{seed:1}),current=beginTownChallenge(s,'fruit',{seed:2});
 assert.equal(settleTownChallenge(s,old,{cleared:true,score:1}).awarded,false);
 cancelTownChallenge(s,current);assert.equal(settleTownChallenge(s,current,{cleared:true,score:1}).awarded,false);
 assert.equal(s.coins,0);
}

// Starting a new game uses the town level, while an in-progress challenge retains its snapshot.
{
 const s=newState(),memory=startRun(s,'memory',77),oldQ=questionFor(memory);
 settleTownChallenge(s,beginTownChallenge(s,'race'),{cleared:true,score:500});
 assert.deepEqual(questionFor(memory),oldQ);assert.equal(memory.difficulty.level,1);
 const obby=startRun(s,'obby',78);assert.equal(obby.difficulty.level,2);
 while(!memory.solved)answerRun(s,'memory',questionFor(memory).answer);
 assert.equal(s.townProgress.level,2,'a saved lower-level challenge must not skip another level');
 nextStage(s,'memory');assert.equal(memory.difficulty.level,2);
 const reloaded=restoreState(JSON.parse(JSON.stringify(s)));const r=reloaded.expansion.runs.obby;
 answerRun(reloaded,'obby',questionFor(r).answer);assert.equal(reloaded.townProgress.level,3);
}

// Migration keeps the old story, coins, equipment, and island progress without back-paying rewards.
{
 const old=newState();delete old.townProgress;old.coins=123;old.mission=7;old.expansion.best.obby=35;old.expansion.gear=['spring'];
 old.expansion.runs.obby={mode:'obby',seed:12,stage:36,math:2,english:3,hearts:2,streak:7,solved:false,memoryIndex:0,hinted:false};
 const migrated=restoreState(old);assert.equal(migrated.coins,123);assert.equal(migrated.mission,7);assert.deepEqual(migrated.expansion.gear,['spring']);
 assert.equal(migrated.townProgress.level,20);assert.equal(migrated.townProgress.infiniteRound,16);assert.equal(migrated.townProgress.points,0);
 assert.equal(startRun(migrated,'obby').stage,36);assert.equal(migrated.expansion.runs.obby.hearts,2);
}

// The same shared seed and level reproduce questions and courses independently of local run counts.
for(const mode of ['obby','tower','runner','memory','garden']){
 const a=newState(),b=newState();a.townProgress.level=b.townProgress.level=12;a.math=3;a.english=2;
 const ar=startRun(a,mode,12345,{shared:true}),br=startRun(b,mode,12345,{shared:true});br.stage=99;
 assert.equal(ar.math,1);assert.equal(ar.english,1);assert.equal(a.math,3);assert.equal(a.english,2);
 assert.deepEqual(questionFor(ar),questionFor(br));
 if(mode==='obby'||mode==='tower')assert.deepEqual(generateCourse(ar),generateCourse(br));
}

// Every numbered level changes effective difficulty in each existing arcade factory.
let previous;
for(let level=1;level<=20;level++){
 const d=normalizeDifficulty({level});
 const values=[raceDifficultyFor(d).aiSpeedMultiplier,breakoutDifficultyFor(d).ballSpeed,fruitDifficultyFor(d).bombChanceStart,ninjaDifficultyFor(d).fallSpeedStart];
 if(previous)values.forEach((v,i)=>assert.ok(v>previous[i]));previous=values;
 for(const factory of [createRaceGame,createBreakoutGame,createFruitSlashGame,createNinjaTypeGame]){
  const game=factory({canvas:createStubCanvas(),autoStart:false,difficulty:d,onHud(){},onEnd(){}});
  game.start();game.tick(1/60);assert.equal(game.getState().ended,false);assert.ok(game.getState().difficulty);game.destroy();
 }
}
// Returning to an existing unfinished island picks up the latest town level without losing bests.
{
 const s=newState(),run=startRun(s,'memory',9);run.memoryIndex=1;run.hearts=2;
 settleTownChallenge(s,beginTownChallenge(s,'bubble'),{cleared:true,score:20});
 assert.equal(run.difficulty.level,1);
 const resumed=startRun(s,'memory');assert.equal(resumed,run);assert.equal(run.difficulty.level,2);
 assert.equal(run.memoryIndex,0);assert.equal(run.hearts,3);assert.equal(run.stage,1);
}
// Shared seed gameplay stays reproducible, including a retry after partially consuming a word bag.
for(const factory of [createFruitSlashGame,createNinjaTypeGame]){
 const make=()=>factory({canvas:createStubCanvas(),seed:4242,difficulty:{level:12},autoStart:false,onHud(){},onEnd(){}});
 const a=make(),b=make();a.start();b.start();
 for(let i=0;i<120;i++){a.tick(1/60);b.tick(1/60);}
 assert.deepEqual(a.getState(),b.getState());
 const initial=a.getState();a.start();for(let i=0;i<120;i++)a.tick(1/60);assert.deepEqual(a.getState(),initial);
 a.destroy();b.destroy();
}
assert.ok(normalizeDifficulty({level:20,infiniteRound:1000000}).scale<=1.35);
console.log('Town progression: 20-level boundary, 100 endless clears, one-time rewards, cancellation/retry, migration, shared seeds and all arcade difficulty snapshots passed.');
