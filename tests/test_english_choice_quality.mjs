// Fails when any English multiple-choice item lets a child find the answer by
// option shape alone (length, word count, punctuation, form, topic, echo).
import assert from 'node:assert/strict';
import {auditChoiceSet,pickDistractors,repairChoices,CHOICE_RULES} from '../src/runtime/ChoiceQuality.mjs';
import {collectEnglishChoiceItems,collectRunnerItems,runnerIssues,positionStats,summarize} from '../scripts/audit-english-choices.mjs';
import {getEnglishQuestionBank} from '../src/competitions/EnglishQuestionBank.mjs';
import {makeFoundationRounds} from '../src/world/FoundationRules.mjs';
import {readFileSync} from 'node:fs';
let checks=0;const ok=label=>{checks++;console.log(`ok ${checks} - ${label}`);};

// 1. Validator catches the classic giveaways.
const bad=[
 [{prompt:'“It is a red ball.”最合适的中文意思是？',correct:'这是一个红色的球。',choices:['这是一个红色的球。','你好。','早上好。','谢谢。']},'answer-longest'],
 [{prompt:'What time do you get up?',correct:'At seven.',choices:['At seven.','In the kitchen.','On Monday books.','Because it is red.']},'answer-shortest'],
 [{correct:'How are you?',choices:['How are you?','Hello.','Goodbye.','Thank you.']},'odd-ending'],
 [{correct:'personification',choices:['personification','a question','a rhyme']},'odd-multiword'],
 [{correct:'The seedling grew 3 cm.',choices:['The seedling grew 3 cm.','The seedling grew a lot.','The seedling grew tall.']},'odd-digits'],
 [{correct:'cat',choices:['cat','red','blue','green']},'odd-category'],
 [{prompt:'Mia went to the library.\nWhere did Mia go?',correct:'the library',choices:['the library','the museum','the station','the bakery']},'stem-echo'],
 [{correct:'Hello.',choices:['Hello.','hello','Goodbye.']},'duplicate-option']
];
for(const [item,rule] of bad)assert.ok(auditChoiceSet(item).some(i=>i.rule===rule),`${rule} not detected: ${JSON.stringify(item)}`);
assert.deepEqual(auditChoiceSet({correct:"girl's",choices:["girl's",'girls',"girls'"]}),[]);
assert.deepEqual(auditChoiceSet({correct:'I like apples.',choices:['I like apples.','I like oranges.','I have apples.',"I don't like apples."]}),[]);
ok('validator flags length, word-count, punctuation, digits, topic, stem-echo and duplicate giveaways');

// 2. Generator helper keeps distractors close to the answer.
const picked=pickDistractors('the library',['the beach','the community center','the town hall','the art museum','the recycling center','the zoo'],{count:3});
assert.equal(picked.length,3);assert.deepEqual(auditChoiceSet({correct:'the library',choices:['the library',...picked]}),[]);
const repaired=repairChoices({prompt:'',correct:'I want some water.',choices:['I want some water.','Hello.','Hi.','Thanks.']},['I want some milk.','I want some bread.',"I don't want any water.",'Good night.']);
assert.deepEqual(auditChoiceSet({correct:repaired.correct,choices:repaired.choices}),[]);
ok(`pickDistractors/repairChoices produce passing sets (rules: ${JSON.stringify(CHOICE_RULES)})`);

// 3. Every English item in the product passes.
const main=summarize(collectEnglishChoiceItems());
assert.equal(main.flagged,0,main.examples.slice(0,10).map(e=>`[${e.source}] ${e.id}: ${e.correct} | ${e.choices.join(' / ')} → ${e.issues.map(i=>i.rule).join(',')}`).join('\n'));
ok(`${main.total} unique English option sets pass every rule`);
const runner=summarize(collectRunnerItems(),runnerIssues);
assert.equal(runner.flagged,0);ok(`${runner.total} town picture-word sets use one topic per question`);

// 4. Translation items offer a near-miss option (same frame or same action).
for(const mode of ['BASIC','EIKEN3','EIKEN2']){
 const bank=getEnglishQuestionBank(mode);
 for(const q of bank){assert.equal(q.options.length,4);assert.equal(q.options[0],q.correct);}
 assert.ok(main.bySource[`eiken/minigame:${mode}`].nearMiss>=bank.length*0.9,mode);
}
ok('EIKEN/BASIC translation options share the sentence frame or action with the answer');

// 5. Reading distractors are details that really appear in the passage.
for(const mode of ['SHORT_READING','LONG_READING'])for(const q of getEnglishQuestionBank(mode)){
 const passage=q.passage.toLowerCase(),inText=q.options.filter(o=>passage.includes(o.replace(/^To |\.$/g,'').replace(/^[A-Z][a-z]+ /,'').toLowerCase()));
 assert.ok(inText.length>=2,`${q.id}: only the answer is mentioned in the passage`);
}
ok('reading questions include a decoy that is mentioned in the passage');

// 6. The answer position is shuffled at runtime (no fixed A/B/C/D).
const positions=positionStats();
for(const [name,counts] of Object.entries(positions)){
 const used=counts.filter(Boolean),total=used.reduce((a,b)=>a+b,0);
 for(const n of used)assert.ok(n/total>1/used.length-0.08&&n/total<1/used.length+0.08,`${name} position bias ${counts}`);
}
ok(`answer position is balanced after shuffle ${JSON.stringify(positions)}`);

// 7. Foundation rounds keep passing after the runtime guard and shuffle.
for(let stage=1;stage<=6;stage++)for(const seed of [1,7,99]){
 for(const q of makeFoundationRounds({profile:'CN63',year:`Y${stage}`,lesson:`english${stage}`,locale:'zh',stage:'1'},seed))
  assert.deepEqual(auditChoiceSet({prompt:q.prompt,correct:q.correct,choices:q.choices}),[],q.id);
}
ok('world English rounds pass the validator at runtime');

// 8. The Japanese mini-game uses the same checked bank (no second copy).
const mini=readFileSync(new URL('../MiniGameSystem.js',import.meta.url),'utf8');
assert.ok(mini.includes("from './src/competitions/EnglishQuestionBank.mjs"));
assert.ok(!/function getEnglishQuestionBank/.test(mini));
ok('MiniGameSystem re-exports the shared English bank');
console.log(`English choice quality: ${checks} groups passed.`);
