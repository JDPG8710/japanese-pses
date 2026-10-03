// Audits every English multiple-choice item for "giveaway" option sets.
// Usage: node scripts/audit-english-choices.mjs [--examples=N] [--json]
import {auditChoiceSet,similarity} from '../src/runtime/ChoiceQuality.mjs';
import {getEnglishQuestionBank} from '../src/competitions/EnglishQuestionBank.mjs';
import {englishPool} from '../src/world/FoundationEnglish.mjs';
import {wordPool} from '../src/world/FoundationWords.mjs';
import {makeFoundationRounds} from '../src/world/FoundationRules.mjs';
import {createSession} from '../src/competitions/PracticeData.mjs';
import * as arcade from '../src/town/ArcadeRules.mjs';

// Topic of each picture word in the town "runner" word game.
const RUNNER_TOPICS={'🍎':'food','🍌':'food','🥛':'food','🍞':'food','🥕':'food','🐱':'animal','🐸':'animal','🐶':'animal','🐰':'animal','☀️':'sky','⭐':'sky','🌙':'sky','☁️':'sky','📘':'thing','⚽':'thing','🎩':'thing','☂️':'thing','🌳':'plant','🌷':'plant','🍁':'plant','🌵':'plant'};

export function collectEnglishChoiceItems(){
 const items=[];
 for(const mode of ['BASIC','EIKEN3','EIKEN2','SHORT_READING','LONG_READING'])
  for(const q of getEnglishQuestionBank(mode))items.push({source:`eiken/minigame:${mode}`,id:q.id,prompt:q.prompt,correct:q.correct,choices:q.options});
 for(let stage=1;stage<=6;stage++)for(const locale of ['zh','en','ja'])
  for(const q of englishPool(stage,locale))items.push({source:`world-english:${q.format}`,id:`${q.id}@${stage}/${locale}`,prompt:q.prompt,correct:q.correct,choices:q.choices});
 for(let stage=0;stage<=7;stage++)
  for(const q of wordPool(stage,'en'))items.push({source:`world-words-en:${stage<=1?'phonics':'stage'+stage}`,id:q.id,prompt:q.prompt,correct:q.correct,choices:q.choices,allow:q.allow});
 return items;
}

export function collectRunnerItems(){
 const items=[];
 for(let english=1;english<=3;english++)for(let seed=1;seed<=40;seed++)for(let stage=1;stage<=10;stage++){
  const q=arcade.questionFor({mode:'runner',seed,stage,math:1,english,hearts:3,streak:0,solved:false,memoryIndex:0,hinted:false});
  items.push({source:'town-runner',id:`${english}-${seed}-${stage}`,prompt:q.question,correct:q.options[q.answer],choices:q.options,answerIndex:q.answer});
 }
 return items;
}
export function runnerIssues(item){
 const topic=RUNNER_TOPICS[item.correct],others=item.choices.filter(c=>c!==item.correct).map(c=>RUNNER_TOPICS[c]);
 const issues=[];if(new Set(item.choices).size!==item.choices.length)issues.push({rule:'duplicate-option'});
 if(topic&&!others.includes(topic))issues.push({rule:'odd-category',detail:`only ${topic} picture`});
 return issues;
}

// Where does the correct answer land after the runtime shuffle?
export function positionStats(){
 const counts={foundation:[0,0,0,0],practice:[0,0,0,0],runner:[0,0,0,0]};
 for(let seed=1;seed<=300;seed++){
  const stage=1+seed%6;
  for(const q of makeFoundationRounds({profile:'CN63',year:`Y${stage}`,lesson:`english${stage}`,locale:'zh',stage:'1'},seed))counts.foundation[q.choices.indexOf(q.correct)]++;
 }
 let n=1;const random=()=>{n=(n*16807)%2147483647;return n/2147483647;};
 for(let i=0;i<200;i++)for(const q of createSession(getEnglishQuestionBank(i%2?'EIKEN3':'EIKEN2'),random))counts.practice[q.options.indexOf(q.correct)]++;
 for(const item of collectRunnerItems())counts.runner[item.answerIndex]++;
 return counts;
}

// The same option set appears once per locale/stage; count it once.
export function uniqueItems(items){
 const seen=new Set();return items.filter(item=>{const key=`${item.source}|${item.correct}|${[...item.choices].sort().join('|')}|${/[A-Za-z]{3}/.test(item.prompt)&&/reading/i.test(item.source)?item.prompt:''}`;if(seen.has(key))return false;seen.add(key);return true;});
}
export function summarize(items,check=item=>auditChoiceSet(item)){
 const byRule={},bySource={},flagged=[];
 for(const item of uniqueItems(items)){
  const issues=check(item);bySource[item.source]??={items:0,flagged:0,nearMiss:0};bySource[item.source].items++;
  // Plausibility: at least one wrong option shares >=50% of its character pairs with the answer.
  if(item.choices.some(c=>c!==item.correct&&similarity(c,item.correct)>=0.5))bySource[item.source].nearMiss++;
  if(issues.length){bySource[item.source].flagged++;flagged.push({...item,issues});}
  for(const issue of issues)byRule[issue.rule]=(byRule[issue.rule]||0)+1;
 }
 const nearMiss=Object.values(bySource).reduce((n,x)=>n+x.nearMiss,0);
 return {total:uniqueItems(items).length,flagged:flagged.length,nearMiss,byRule,bySource,examples:flagged};
}

if(import.meta.url===`file://${process.argv[1]}`){
 const arg=name=>process.argv.find(a=>a.startsWith(`--${name}`));
 const main=summarize(collectEnglishChoiceItems()),runner=summarize(collectRunnerItems(),runnerIssues),positions=positionStats();
 if(arg('json')){console.log(JSON.stringify({main:{...main,examples:undefined},runner:{...runner,examples:undefined},positions},null,1));}
 else{
  console.log(`English choice items: ${main.total}, flagged: ${main.flagged}, with a near-miss distractor: ${main.nearMiss}`);
  console.table(main.bySource);console.table(main.byRule);
  console.log(`Town runner items: ${runner.total}, flagged: ${runner.flagged}`,runner.byRule);
  console.log('Correct-answer position after runtime shuffle (A/B/C/D):',positions);
  const n=Number((arg('examples')||'--examples=8').split('=')[1]);
  for(const ex of main.examples.filter((e,i,a)=>a.findIndex(x=>x.source===e.source)===i||i%Math.max(1,Math.floor(a.length/n))===0).slice(0,n))
   console.log(`\n[${ex.source}] ${ex.id}\n  ${String(ex.prompt).replace(/\n/g,' / ').slice(0,160)}\n  ✔ ${ex.correct}\n  ✘ ${ex.choices.filter(c=>c!==ex.correct).join(' | ')}\n  → ${ex.issues.map(i=>i.rule).join(', ')}`);
 }
}
