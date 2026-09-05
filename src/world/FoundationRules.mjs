import {validateFoundation,CONTENT_VERSION} from './FoundationCatalog.mjs';
import {mathPool,numericEqual} from './FoundationMath.mjs';
import {wordPool} from './FoundationWords.mjs';
import {sciencePool} from './FoundationScience.mjs';
import {englishPool} from './FoundationEnglish.mjs';
export {CONTENT_VERSION};
export function questionPool(input){
 const route=validateFoundation(input);if(!route)throw new Error('INVALID_LESSON');
 if(route.subject==='math')return mathPool(route.lesson,route.locale,route.profile);
 if(route.subject==='english')return englishPool(Number(route.lesson.replace('english','')),route.locale);
 const stage=Number(route.lesson.replace(/^(words|science)/,''));
 return route.subject==='language'?wordPool(stage,route.learningLanguage):sciencePool(stage,route.locale);
}
export function makeFoundationRounds(input,seed){
 const route=validateFoundation(input);if(!route)throw new Error('INVALID_LESSON');
 let state=((seed>>>0)^Math.imul(route.stage,0x9E3779B1))>>>0;const random=()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
 const shuffle=items=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const pool=questionPool(input);
 if(pool.length<12||new Set(pool.map(q=>q.id)).size!==pool.length)throw new Error('INVALID_POOL');
 return shuffle(pool).slice(0,10).map(q=>({...q,...(q.choices?{choices:shuffle(q.choices)}:{})}));
}
export function publicQuestion(q,tries=0){
 if(!q)return null;
 const {correct,explanation,hint,...visible}=q;return {...visible,...(tries>=2?{hint}:{})};
}
export function markFoundation(q,answer,tries){
 const correct=typeof answer==='string'&&answer.length<=240&&(q.kind==='number'?numericEqual(answer,q.correct):answer===q.correct);
 const done=correct||tries>=2;
 return {correct,done,points:correct?[100,70,40][tries]:0,tries:done?0:tries+1,...(done?{explanation:q.explanation,answer:q.correct}:tries>=1?{hint:q.hint}:{})};
}
