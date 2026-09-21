import assert from 'node:assert/strict';
import {ARTICLES,EXAMPLES} from '../content/learning-articles.mjs';
import {checkAnswer,waterState,makeRounds,solution} from '../src/world/WorldRules.mjs';
import {diagnoseAnswer,answerFeedback} from '../src/world/WorldFeedback.mjs';
import {TOPICS,lessonsFor} from '../src/world/FoundationCatalog.mjs';
import {PROFILES} from '../src/world/GradePaths.mjs';
import {lessonObjective} from '../src/world/LearningObjectives.mjs';
import {mathPool,numericEqual} from '../src/world/FoundationMath.mjs';
import {orderFor,englishOrder,newState,startOrder,submitOrder} from '../src/town/TownRules.mjs';

for(const game of ['sudoku','robot','water']){
 const e=EXAMPLES[game];assert.ok(checkAnswer(game,e.question,e.answer),`${game} published answer`);
 assert.equal(diagnoseAnswer(game,e.question,e.answer),null);
}
assert.ok(checkAnswer('robot',EXAMPLES.robot.question,EXAMPLES.robot.alternative));
assert.ok(!checkAnswer('robot',EXAMPLES.robot.question,EXAMPLES.robot.wrong));
assert.deepEqual(diagnoseAnswer('robot',EXAMPLES.robot.question,EXAMPLES.robot.wrong),{kind:'blocked',step:2,row:1,column:2});
assert.equal(diagnoseAnswer('robot',EXAMPLES.robot.question,[0]).kind,'blocked');
assert.equal(diagnoseAnswer('robot',EXAMPLES.robot.question,[1]).kind,'destination');
assert.equal(diagnoseAnswer('robot',EXAMPLES.robot.question,[1,3,1,1,2,2]).kind,'limit');
const water=EXAMPLES.water;
const expectedWater=[[0,0],[0,5],[3,2],[0,2],[2,0],[2,5],[3,4]];
for(let i=0;i<=6;i++)assert.deepEqual(waterState(water.question,water.answer.slice(0,i)),expectedWater[i]);
assert.deepEqual(diagnoseAnswer('water',water.question,[1,5]),{kind:'water',a:3,b:2,target:4});
assert.equal(diagnoseAnswer('water',water.question,[1,5,2,5,1,5,0]).kind,'limit');
const sudoku=EXAMPLES.sudoku,wrongRow=[...sudoku.answer];wrongRow[1]=1;
assert.deepEqual(diagnoseAnswer('sudoku',sudoku.question,wrongRow),{kind:'row',index:1,value:1});
const noGivens={...sudoku.question,givens:Array(16).fill(0)};
assert.equal(diagnoseAnswer('sudoku',noGivens,[1,2,3,4,1,2,3,4,2,1,4,3,4,3,2,1]).kind,'column');
assert.equal(diagnoseAnswer('sudoku',noGivens,[1,2,3,4,2,3,4,1,3,4,1,2,4,1,2,3]).kind,'box');
assert.equal(diagnoseAnswer('sudoku',sudoku.question,sudoku.question.givens).kind,'incomplete');
for(const locale of ['en','zh','ja']){
 for(const [game,e] of Object.entries(EXAMPLES).filter(([game])=>game!=='town')){
  const bad=game==='robot'?e.wrong:game==='water'?[1,5]:wrongRow;
  const feedback=answerFeedback(game,e.question,bad,locale);
  assert.ok(feedback.length>15&&!feedback.includes('undefined'),`${game}/${locale}`);
 }
 for(const id of Object.keys(TOPICS))assert.ok(lessonObjective(id,locale,'en').length>10,`${id}/${locale}`);
 for(const [profile,p] of Object.entries(PROFILES))for(const year of p.years)for(const lesson of lessonsFor(profile,year))assert.ok(lessonObjective(lesson.id,locale,lesson.learningLanguage));
 const sum=mathPool('add20',locale,'CN63').find(q=>q.prompt==='8 + 5 = ?');
 assert.equal(sum.correct,'13');assert.ok(sum.explanation.includes('10 + 3 = 13'));
}
for(const game of ['sudoku','robot','water'])for(const level of [1,2])for(const q of makeRounds(game,level,9417)){
 const solved=solution(game,q);assert.ok(checkAnswer(game,q,solved));
 assert.equal(diagnoseAnswer(game,q,solved),null,`no false error for ${game}/${level}`);
}
const town=EXAMPLES.town,order=orderFor(town.mission,town.math,town.english);
assert.deepEqual(order.items,town.items);assert.equal(order.total,7);assert.equal(order.paid,10);
assert.equal(englishOrder(order),'One apple and one loaf of bread, please.');
const state=newState();state.mission=5;startOrder(state);state.active.bag=[1,0,1,0];
assert.deepEqual(submitOrder(state),{ok:true,done:false});
state.active.input='7';assert.deepEqual(submitOrder(state),{ok:true,done:false});
state.active.input='7';assert.ok(!submitOrder(state).ok,'price must not pass as change');
state.active.input='3';assert.deepEqual(submitOrder(state),{ok:true,done:true});
assert.equal(orderFor(3).total,8);assert.equal(orderFor(4).paid-orderFor(4).total,2);
assert.ok(numericEqual('2/4','1/2'));
assert.equal(ARTICLES.length,7);
console.log('Learning guides: published game examples, independent water states, town checkout, multilingual goals and diagnostic feedback passed.');
