import assert from 'node:assert/strict';
import {PROFILES} from '../src/world/GradePaths.mjs';
import {lessonsFor,validateFoundation,YEAR_PATHS} from '../src/world/FoundationCatalog.mjs';
import {questionPool,makeFoundationRounds,publicQuestion,markFoundation} from '../src/world/FoundationRules.mjs';
import {numericEqual} from '../src/world/FoundationMath.mjs';
import {mathPool} from '../src/world/FoundationMath.mjs';
let routes=0,checks=0;
for(const [profile,p] of Object.entries(PROFILES))for(const year of p.years)for(const locale of ['en','zh','ja']){
 const lessons=lessonsFor(profile,year);assert.ok(lessons.length>=3,`${profile}/${year}`);
 for(const lesson of lessons){const input={profile,year,lesson:lesson.id,locale};routes++;
  assert.ok(validateFoundation(input));const pool=questionPool(input);assert.ok(pool.length>=12,JSON.stringify(input));
  for(const q of pool){checks++;assert.ok(q.prompt&&q.correct!==undefined&&q.hint&&q.explanation,JSON.stringify(q));assert.ok(!q.prompt.includes('undefined'));assert.ok(markFoundation(q,q.correct,0).correct,JSON.stringify(q));if(q.choices){assert.equal(new Set(q.choices).size,q.choices.length,JSON.stringify(q));assert.equal(q.choices.filter(c=>c===q.correct).length,1);assert.ok(q.choices.every(c=>typeof c==='string'&&c.length>0));}
   const visible=publicQuestion(q);assert.ok(!('correct' in visible)&&!('explanation' in visible)&&!('hint' in visible));
   assert.equal(markFoundation(q,'invalid-answer',0).points,0);assert.equal(markFoundation(q,'invalid-answer',2).done,true);
  }
  for(const seed of [1,2,3]){const round=makeFoundationRounds(input,seed);assert.equal(round.length,10);assert.equal(new Set(round.map(q=>q.id)).size,10);assert.equal(new Set(round.map(q=>q.prompt+JSON.stringify(q.visual||''))).size,10,JSON.stringify(input));}
 }
}
assert.ok(numericEqual('2/4','0.5'));assert.ok(numericEqual('1.00','1'));assert.ok(!numericEqual('1/0','1'));assert.ok(!numericEqual('Infinity','1'));assert.ok(!numericEqual('1e0','1'));assert.ok(!numericEqual('','0'));
assert.equal(validateFoundation({profile:'CN54',year:'Y6',lesson:'percent',locale:'zh'}),null);
assert.equal(validateFoundation({profile:'CN63',year:'Y1',lesson:'percent',locale:'zh'}),null);
assert.equal(validateFoundation({profile:'CN63',year:'Y1',lesson:'add20',locale:'fr'}),null);
assert.equal(validateFoundation({profile:'toString',year:'Y1',lesson:'add20',locale:'en'}),null);
assert.equal(validateFoundation({profile:{},year:'Y1',lesson:'add20',locale:'en'}),null);
assert.ok(lessonsFor('CN63','Y2').some(x=>x.id==='multiply'));assert.ok(!lessonsFor('US','G2').some(x=>x.id==='multiply'));
assert.equal(YEAR_PATHS.SCT.P1,0);assert.equal(YEAR_PATHS.NZ.Y8,7);
assert.equal(lessonsFor('CN63','Y1','language')[0].learningLanguage,'zh');assert.equal(lessonsFor('US','G1','language')[0].learningLanguage,'en');
for(const [topic,expected] of Object.entries({add20:'1',add100:'11',place:'1',multiply:'1',divide:'1',fractions:'1/2',measure:'10',area:'6',decimal:'1.1',fractionSum:'2/3',volume:'3',percent:'2',ratio:'3',money:'1',time:'0'}))assert.ok(numericEqual(mathPool(topic,'en','US')[0].correct,expected),`independent first-item oracle ${topic}`);
assert.ok(mathPool('money','en','US')[0].prompt.includes('USD'));assert.ok(mathPool('money','zh','CN63')[0].prompt.includes('CNY'));assert.ok(mathPool('money','en','AU')[0].prompt.includes('AUD'));
console.log(`Foundation content: ${routes} valid localized routes; ${checks} item checks; 10 unique rounds, answers, options, hints, curriculum isolation passed.`);
