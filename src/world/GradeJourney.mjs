import {availableTasks, PROFILES} from './GradePaths.mjs';
import {CONTENT_VERSION, YEAR_PATHS, lessonsFor} from './FoundationCatalog.mjs';

export const JOURNEY_VERSION='piko-grade-journey-1';
export const JOURNEY_SUBJECTS=['math','english','language','science','coding','art','music','thinking'];
export const JAPAN_GRADE_STAGE_TOTALS={1:58,2:56,3:102,4:102,5:102,6:102};

export const lessonGateId=(lesson,stage=1)=>`lesson-${lesson}${stage>1?`:s${stage}`:''}`;
export const gameGateId=(game,stage=1)=>`game-${game}${stage>1?`:s${stage}`:''}`;

export function japanStageTarget(profile,year){
 const localStage=YEAR_PATHS[profile]?.[year];if(localStage===undefined)return 0;
 return JAPAN_GRADE_STAGE_TOTALS[Math.max(1,Math.min(6,localStage))];
}

function expandToJapaneseStageCount(baseGates,target){
 if(!baseGates.length||target<baseGates.length)return baseGates;
 const baseCount=Math.floor(target/baseGates.length),extra=target%baseGates.length;
 return baseGates.flatMap((gate,index)=>{
  const stages=baseCount+(index<extra?1:0),seriesId=gate.id;
  return Array.from({length:stages},(_,offset)=>{const stage=offset+1;return {...gate,id:gate.kind==='lesson'?lessonGateId(gate.lesson,stage):gameGateId(gate.game,stage),seriesId,stage,stages};});
 });
}

export function journeyProgressKey(profile,year,gateId){
 return `piko-grade-journey:${JOURNEY_VERSION}:${profile}:${year}:${gateId}`;
}

export function legacyLessonProgressKey(profile,year,lesson,locale){
 return `piko-foundation:${CONTENT_VERSION}:${profile}:${year}:${lesson}:${locale}`;
}

export function journeyFor(profile,year,subject='all'){
 if(typeof profile!=='string'||!Object.hasOwn(PROFILES,profile)||!PROFILES[profile].years.includes(year))return [];
 const lessonGates=lessonsFor(profile,year).map(lesson=>({
  id:lessonGateId(lesson.id),kind:'lesson',subject:lesson.subject,lesson:lesson.id,
  title:lesson.title,learningLanguage:lesson.learningLanguage,cefr:lesson.cefr
 }));
 const gameGates=availableTasks(profile,year).map(task=>({
  id:gameGateId(task.game),kind:'game',subject:task.subject,game:task.game,
  objective:task.objective,skill:task.skill,level:task.level,review:task.review
 }));
 const ordered=JOURNEY_SUBJECTS.flatMap(subjectId=>{
  const lessons=lessonGates.filter(gate=>gate.subject===subjectId),games=gameGates.filter(gate=>gate.subject===subjectId);
  return subjectId==='math'&&lessons.length&&games.length?[lessons[0],games[0],...lessons.slice(1),...games.slice(1)]:[...lessons,...games];
 });
 const expanded=expandToJapaneseStageCount(ordered,japanStageTarget(profile,year));
 return subject==='all'?expanded:expanded.filter(gate=>gate.subject===subject);
}

export function readJourneyScores(storage,profile,year,locale='en'){
 const scores={};
 if(!storage)return scores;
 for(const gate of journeyFor(profile,year)){
  let score=0;
  try{
   score=Number(storage.getItem(journeyProgressKey(profile,year,gate.id))||0);
   if(gate.kind==='lesson'&&gate.stage===1)score=Math.max(score,Number(storage.getItem(legacyLessonProgressKey(profile,year,gate.lesson,locale))||0));
  }catch{}
  scores[gate.id]=Number.isFinite(score)?score:0;
 }
 return scores;
}

export function journeyState(profile,year,scores={},subject='all'){
 const gates=journeyFor(profile,year,subject),previousBySubject=new Map();
 return gates.map(gate=>{
  const score=Number(scores[gate.id]||0),complete=score>=800,previous=previousBySubject.get(gate.subject);
  const unlocked=!previous||previous.complete||complete;
  const state={...gate,score,complete,unlocked};previousBySubject.set(gate.subject,state);return state;
 });
}

export function nextGate(profile,year,gateId,scores={}){
 const current=journeyState(profile,year,scores).find(gate=>gate.id===gateId);
 if(!current)return null;
 const sameSubject=journeyState(profile,year,scores,current.subject),index=sameSubject.findIndex(gate=>gate.id===gateId);
 return sameSubject[index+1]||null;
}

export function gateUrl(gate,{profile,year,country='',locale='en'}={}){
 if(!gate||!profile||!year)return null;
 const values={curriculum:profile,year,locale};if(country)values.country=country;
 values.stage=String(gate.stage||1);
 if(gate.kind==='lesson')values.lesson=gate.lesson;
 else{values.subject=gate.subject;values.game=gate.game;values.level=String(gate.level);}
 return `${gate.kind==='lesson'?'learn':'world'}.html?${new URLSearchParams(values)}`;
}
