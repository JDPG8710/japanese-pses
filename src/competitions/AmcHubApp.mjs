// AMC hub (amc.html): one page for AMC 8 / AMC 10 / AMC 12 with three views —
// Practise, Learn and Registration. Level, view and open lesson live in the
// URL (?lang=&level=&view=&lesson=) so links, reloads, the back button and
// language switches keep the learner where they were.
import {TOPICS,FAMILIES,ARCHIVE,OFFICIAL_SAMPLE,amcBank,topicExamples,createSession,gradeResponse,resultFor,progressKey,shuffle} from './PracticeData.mjs';
import {LESSONS,STAGES,FACTS,SOURCES,FACTS_CHECKED,LEARN_TEXT,LESSON_KEY,lessonForTopic} from './AmcLessons.mjs';
import {UPPER} from './AmcUpperLessons.mjs';
import {AMC8_AREAS,AMC8_REAL_BANK} from './AmcBank8.mjs';
import {AMC10_AREAS,AMC10_BANK} from './AmcBank10.mjs';
import {AMC12_AREAS,AMC12_BANK} from './AmcBank12.mjs';
import {LETTERS,citation,aopsUrl} from './AmcRealCore.mjs';
import {REGISTRATION,REG_VERIFIED} from './AmcRegistration.mjs';
import {HUB_TEXT} from './AmcHubText.mjs';
import {TEXT} from './PracticeText.mjs';

const LEVELS=['8','10','12'],VIEWS=['practice','learn','register'];
const app=document.querySelector('#practice-app'),tabSlot=document.querySelector('#view-tabs');
const params=new URLSearchParams(location.search);
let locale=['ja','zh','en'].includes(params.get('lang'))?params.get('lang'):'ja';
let h=HUB_TEXT[locale],t=TEXT[locale];
let storage;try{storage=localStorage;const key='piko-practice-storage-check';storage.setItem(key,'1');storage.removeItem(key);}catch{storage=undefined;}
let storageOK=!!storage;
let level='8',view='practice',lessonId=null,drill=null,rs=null,timer=null;

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick=value=>value[locale];
const ext=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;

// ---------- level data ----------
const BANKS={8:{areas:AMC8_AREAS,bank:AMC8_REAL_BANK},10:{areas:AMC10_AREAS,bank:AMC10_BANK},12:{areas:AMC12_AREAS,bank:AMC12_BANK}};
function levelData(lv=level){
  if(lv==='8')return {lessons:LESSONS,stages:STAGES,facts:FACTS,sources:SOURCES,key:LESSON_KEY,text:LEARN_TEXT[locale]};
  const u=UPPER[lv];return {lessons:u.lessons,stages:u.stages,facts:u.facts,sources:u.sources,key:u.key,text:{...LEARN_TEXT[locale],...u.intro[locale]}};
}
const areas=(lv=level)=>BANKS[lv].areas,bank=(lv=level)=>BANKS[lv].bank;
const areaTitle=(id,lv=level)=>{const a=areas(lv).find(item=>item.id===id);return a?pick(a.title):id;};

// ---------- URL state ----------
function readState(){
  const query=new URLSearchParams(location.search);
  for(const key of [...params.keys()])params.delete(key);
  query.forEach((value,key)=>params.set(key,value));
  level=LEVELS.includes(query.get('level'))?query.get('level'):'8';
  view=VIEWS.includes(query.get('view'))?query.get('view'):'practice';
  const lesson=query.get('lesson');
  lessonId=view==='learn'&&levelData().lessons.some(item=>item.id===lesson)?lesson:null;
}
function writeState(push=false){
  for(const key of ['level','view','lesson'])params.delete(key);
  params.set('lang',locale);params.set('level',level);
  if(view!=='practice')params.set('view',view);
  if(view==='learn'&&lessonId)params.set('lesson',lessonId);
  const url=`${location.pathname}?${params}`;
  if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);
}

// ---------- storage ----------
const memory=new Map();
function getItem(key){try{return storageOK?storage.getItem(key):memory.get(key)??null;}catch{return memory.get(key)??null;}}
function setItem(key,value){memory.set(key,value);try{if(storageOK)storage.setItem(key,value);}catch{storageOK=false;chrome();}}
function doneLessons(){
  const d=levelData();try{const saved=JSON.parse(getItem(d.key)||'[]');return new Set(Array.isArray(saved)?saved.filter(id=>d.lessons.some(lesson=>lesson.id===id)):[]);}catch{return new Set();}
}
function setLessonDone(id,done){const ids=doneLessons();if(done)ids.add(id);else ids.delete(id);setItem(levelData().key,JSON.stringify([...ids]));}
const realKey=(lv,area)=>`piko-amc-real:v1:${lv}:${area}`;
function readNumber(key,max){const value=Number(getItem(key));return Number.isFinite(value)&&value>=0&&value<=max?value:0;}
const readDrillBest=id=>{const v=readNumber(progressKey('amc8',id),10);return Number.isInteger(v)?v:0;};

// ---------- chrome ----------
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function chrome(){
  document.documentElement.lang=locale==='zh'?'zh-Hans':locale;
  document.title=`${h.title} · AMC ${level} · Piko Game`;
  document.querySelector('#locale').value=locale;
  document.querySelector('#language-label').textContent=h.language;
  const other=document.querySelector('[data-other-course]');
  if(other){other.textContent=h.eikenLink;other.href=`/eiken.html?lang=${locale}`;other.hidden=false;}
  document.querySelector('#practice-footer').innerHTML=`<p>${storageOK?h.saved:h.unavailable}</p><p class="muted">${h.bankNote}</p><a href="/index.html">${h.footerBack}</a>`;
}
function hideTabs(){if(tabSlot){tabSlot.hidden=true;tabSlot.innerHTML='';}}
function showTabs(){
  if(!tabSlot)return;tabSlot.hidden=false;
  tabSlot.innerHTML=`<nav class="view-tabs hub-tabs" aria-label="AMC">${[['practice','✏️'],['learn','📘'],['register','🗓️']].map(([id,icon])=>`<button type="button" data-view="${id}" ${view===id?'aria-current="page"':''}><span aria-hidden="true">${icon}</span> ${h.tabs[id]}</button>`).join('')}</nav>`;
}
function hero(){
  return `<section class="hero hub-hero"><p class="eyebrow">${h.eyebrow}</p><h1>${h.title}</h1><p>${h.intro}</p>
<div class="level-switch" role="group" aria-label="${h.levelLabel}">${LEVELS.map(lv=>`<button type="button" data-level="${lv}" aria-pressed="${lv===level}"><strong>AMC ${lv}</strong><span>${h.levels[lv]}</span></button>`).join('')}</div></section>`;
}

// ---------- practice home ----------
function realSection(){
  const list=areas();
  return `<section class="hub-section" aria-labelledby="real-title"><h2 id="real-title">${h.realTitle} · AMC ${level}</h2><p>${h.realIntro}</p>
<div class="course-grid real-grid">${list.map(a=>{const n=bank().filter(p=>p.area===a.id).length,size=Math.min(10,n),best=readNumber(realKey(level,a.id),size);
  return `<article class="course-card" data-real-card="${a.id}"><span class="icon" aria-hidden="true">${a.icon}</span><h3>${esc(pick(a.title))}</h3><p>${esc(pick(a.goal))}</p><p class="muted">${h.realCount(n)}</p><div class="best"><p class="pill">${h.best}: ${best}/${size}</p><div class="meter" aria-hidden="true"><span style="width:${best/size*100}%"></span></div></div><div class="card-actions"><button type="button" class="primary" data-real="${a.id}">${h.realStart}</button></div></article>`;}).join('')}
<article class="course-card mock-card"><span class="icon" aria-hidden="true">⏱️</span><h3>${h.mockTitle}</h3><p>${h.mockIntro[level]}</p><div class="best"><p class="pill">${h.best}: ${readNumber(realKey(level,'mock'),150)}${level==='8'?'/25':'/150'}</p></div><div class="card-actions"><button type="button" class="primary" data-mock>${h.mockStart}</button></div></article></div></section>`;
}
function guide(id){return `<details class="topic-guide"><summary>${t.guide}</summary><div class="guide-body"><p class="muted">${t.guideIntro}</p>${topicExamples(id,locale).map(q=>`<details class="example"><summary>${esc(q.title)}</summary><div class="example-body"><p class="eyebrow">${t.example}</p><p>${esc(q.prompt)}</p>${q.orderItems?`<ul>${q.orderItems.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>`:''}${drillExplanation(q)}</div></details>`).join('')}</div></details>`;}
const drillUnits=()=>TOPICS.map(topic=>({...topic,title:topic[locale],description:topic.goal[locale]}));
function drillSection(){
  return `<section class="hub-section" aria-labelledby="drill-title"><h2 id="drill-title">${h.drillsTitle}</h2><p>${h.drillsIntro}</p><p class="muted">${t.amcNote}</p>
<div class="course-grid">${drillUnits().map(u=>`<article class="course-card"><span class="icon" aria-hidden="true">${u.icon}</span><h3>${esc(u.title)}</h3><p>${esc(u.description)}</p><p class="muted">${t.familyCount}</p><div class="best"><p class="pill">${t.best}: ${readDrillBest(u.id)}/10</p><div class="meter" aria-hidden="true"><span style="width:${readDrillBest(u.id)*10}%"></span></div></div><div class="card-actions"><button class="secondary" data-start="${u.id}">${t.start}</button>${lessonForTopic(u.id)?`<button type="button" class="ghost" data-lesson="${lessonForTopic(u.id)}">📘 ${LEARN_TEXT[locale].learnLink}</button>`:''}</div>${guide(u.id)}</article>`).join('')}</div></section>`;
}
function pastPapers(){
  if(level==='8')return `<section class="archive" aria-labelledby="archive-title"><h2 id="archive-title" tabindex="-1">${h.pastTitle}</h2><p>${t.archiveIntro}</p><ul class="archive-list">${ARCHIVE.map(paper=>`<li><a href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.year} AMC 8 — ${t.open} ↗</a><span class="muted">25 ${t.questions}</span></li>`).join('')}</ul><p>${ext(OFFICIAL_SAMPLE,t.official)}</p><p class="muted">${t.credit}</p></section>`;
  const papers=[];for(let year=2025;year>=2019;year--)for(const v of ['A','B'])papers.push({year,v,url:`https://artofproblemsolving.com/wiki/index.php/${year}_AMC_${level}${v}_Problems`});
  return `<section class="archive" aria-labelledby="archive-title"><h2 id="archive-title" tabindex="-1">${h.pastTitle}</h2><p>${h.pastIntro}</p><ul class="archive-list">${papers.map(p=>`<li><a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.year} AMC ${level}${p.v} ↗</a><span class="muted">25 · AoPS Wiki</span></li>`).join('')}</ul><p class="muted">${h.pastCredit}</p></section>`;
}
function practiceHome(){
  app.innerHTML=`${hero()}${realSection()}${level==='8'?drillSection():''}${pastPapers()}`;
}

// ---------- learn ----------
function lessonChip(id,done){const lesson=levelData().lessons.find(item=>item.id===id);if(!lesson)return '';return `<button type="button" class="lesson-chip" data-lesson="${id}"><span aria-hidden="true">${lesson.icon}</span> ${esc(pick(lesson.title))}${done.has(id)?` <span class="done-mark">✓<span class="visually-hidden"> ${levelData().text.done}</span></span>`:''}</button>`;}
function learnHome(){
  const d=levelData(),l=d.text,done=doneLessons();
  app.innerHTML=`${hero()}<section class="learn-intro"><h2>${l.learnTitle}</h2><p>${l.learnIntro}</p><p class="pill">${l.progress}: ${done.size} ${l.of} ${d.lessons.length}</p></section>
<section class="learn-section" aria-labelledby="what-title"><h2 id="what-title">${l.whatTitle}</h2><p>${l.whatIntro}</p><ul class="fact-grid">${d.facts.map(fact=>`<li class="fact"><span class="icon" aria-hidden="true">${fact.icon}</span><h3>${pick(fact.title)}</h3><p>${pick(fact.body)}</p></li>`).join('')}</ul><h3>${l.topicsTitle}</h3><p>${l.topicsBody}</p><p class="kid-note">${l.forKids}</p><p>${l.howJoin} <button type="button" class="link-button" data-view="register">${h.tabs.register} →</button></p><div class="sources muted"><p>${l.sources}</p><ul>${d.sources.map(source=>`<li>${ext(source.url,pick(source.label))}</li>`).join('')}</ul><p>${l.checked}: ${FACTS_CHECKED}</p></div></section>
<section class="learn-section" aria-labelledby="roadmap-title"><h2 id="roadmap-title">${l.roadmapTitle}</h2><p>${l.roadmapIntro}</p><ol class="roadmap">${d.stages.map((stage,i)=>`<li class="stage"><p class="eyebrow">${l.stage} ${i+1}</p><h3><span aria-hidden="true">${stage.icon}</span> ${pick(stage.title)}</h3><p><strong>${l.stageGoal}:</strong> ${pick(stage.goal)}</p><ul>${stage.steps.map(step=>`<li>${pick(step)}</li>`).join('')}</ul>${stage.lessons.length?`<div class="stage-lessons" aria-label="${l.lessonsInStage}">${stage.lessons.map(id=>lessonChip(id,done)).join('')}</div>`:`<div class="stage-lessons"><button type="button" class="lesson-chip" data-mock>⏱️ ${h.mockTitle}</button><button type="button" class="lesson-chip" data-jump="archive-title">📄 ${h.pastTitle} ↓</button></div>`}</li>`).join('')}</ol></section>
<section class="learn-section" aria-labelledby="lessons-title"><h2 id="lessons-title">${l.lessonsTitle}</h2><p>${l.lessonsIntro}</p><div class="lesson-grid">${d.lessons.map(lesson=>`<article class="lesson-card${done.has(lesson.id)?' is-done':''}" data-lesson-card="${lesson.id}"><span class="icon" aria-hidden="true">${lesson.icon}</span><h3>${esc(pick(lesson.title))}</h3><p>${esc(pick(lesson.summary))}</p><p class="pill">${done.has(lesson.id)?`✓ ${l.done}`:l.notStarted}</p><div class="card-actions"><button type="button" class="primary" data-lesson="${lesson.id}">${l.open}</button></div></article>`).join('')}</div><p class="muted">${l.saved}</p></section>${pastPapers()}`;
}
const familyTitle=id=>FAMILIES.find(f=>f.id===id)?.title[locale]||id;
function lessonPractice(lesson){
  const buttons=[];
  for(const id of lesson.practice){
    if(id==='mock'){buttons.push(`<button type="button" class="primary" data-mock>⏱️ ${h.lessonMock}</button>`);continue;}
    if(areas().some(a=>a.id===id))buttons.push(`<button type="button" class="primary" data-real="${id}">${h.lessonReal}${esc(areaTitle(id))}</button>`);
    if(level==='8'&&TOPICS.some(topic=>topic.id===id))buttons.push(`<button type="button" class="secondary" data-start="${id}">${h.lessonDrill}${esc(TOPICS.find(topic=>topic.id===id)[locale])}</button>`);
  }
  return buttons.join('');
}
function lessonPage(id){
  const d=levelData(),l=d.text,index=d.lessons.findIndex(lesson=>lesson.id===id),lesson=d.lessons[index],done=doneLessons().has(id);
  const stageIndex=d.stages.findIndex(stage=>stage.id===lesson.stage),prev=d.lessons[index-1],next=d.lessons[index+1],list=locale==='en'?', ':'、';
  document.title=`${pick(lesson.title)} · AMC ${level} · Piko Game`;
  app.innerHTML=`<div class="practice-toolbar"><button type="button" class="ghost" data-lesson-list>${l.backToLearn}</button><span>AMC ${level} · ${l.stage} ${stageIndex+1} · ${index+1} / ${d.lessons.length}</span></div><article class="lesson" data-lesson-id="${id}" aria-labelledby="lesson-title"><p class="eyebrow"><span aria-hidden="true">${lesson.icon}</span> ${pick(d.stages[stageIndex].title)}</p><h1 tabindex="-1" id="lesson-title">${esc(pick(lesson.title))}</h1>${done?`<p class="pill">✓ ${l.done}</p>`:''}
<div class="lesson-short"><h2>${l.inShort}</h2><p>${esc(pick(lesson.short))}</p></div><p>${esc(pick(lesson.body))}</p>
<h2>${l.ideas}</h2><ul class="idea-list">${lesson.ideas.map(idea=>`<li>${esc(pick(idea))}</li>`).join('')}</ul>
<section class="explanation worked-example" aria-labelledby="example-title"><h2 id="example-title">${l.example}</h2><p class="example-problem">${esc(pick(lesson.example.problem))}</p><h3>${l.stepByStep}</h3><ol>${lesson.example.steps.map(step=>`<li>${esc(pick(step))}</li>`).join('')}</ol><p class="answer-line"><strong>${l.answer}</strong><span>${esc(pick(lesson.example.answer))}</span></p></section>
<section class="mistake-note traps"><h2>${l.traps}</h2><ul>${lesson.traps.map(trap=>`<li>${esc(pick(trap))}</li>`).join('')}</ul></section>
<div class="check-note amc-tip"><h2>${l.amcTip}</h2><p>${esc(pick(lesson.tip))}</p></div>
${lesson.models?.length?`<section class="model-list"><h2>${h.models}</h2><ul>${lesson.models.map(m=>`<li>${ext(aopsUrl(m.contest,m.number),h.modelLink(m.contest,m.number))}</li>`).join('')}</ul></section>`:''}
<section class="lesson-practice" aria-labelledby="lesson-practice-title"><h2 id="lesson-practice-title">${l.practiceTitle}</h2><p>${l.practiceIntro}</p>${lesson.families?`<p class="muted">${l.related}: ${lesson.families.map(familyTitle).map(esc).join(list)}</p>`:''}<div class="actions">${lessonPractice(lesson)}</div></section>
<div class="actions lesson-done"><button type="button" class="mark-done" data-lesson-done="${id}">${done?l.markUndo:l.markDone}</button></div>
<nav class="lesson-nav" aria-label="${l.lessonsTitle}">${prev?`<button type="button" data-lesson="${prev.id}">${l.prev}</button>`:'<span></span>'}${next?`<button type="button" data-lesson="${next.id}">${l.next}</button>`:''}</nav></article>`;
}

// ---------- registration ----------
function registerView(){
  const r=REGISTRATION,cols=r.dateCols.map(pick),current=row=>({8:/AMC 8/,10:/AMC 10/,12:/12[AB]/})[level].test(row.event.en);
  const regionCard=g=>`<article class="reg-card" id="reg-${g.id}" data-region="${g.id}"><h3><span aria-hidden="true">${g.flag}</span> ${esc(pick(g.title))}</h3><p class="reg-org">${esc(pick(g.organizer))}</p><ul class="reg-how">${g.how.map(item=>`<li>${esc(pick(item))}</li>`).join('')}</ul>
${g.dates.length?`<div class="table-wrap"><table class="reg-table"><thead><tr>${cols.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${g.dates.map(row=>`<tr class="${current(row)?'is-current':''}"><th scope="row" data-label="${esc(cols[0])}">${esc(pick(row.event))}</th><td data-label="${esc(cols[1])}">${esc(pick(row.local))}</td><td data-label="${esc(cols[2])}">${esc(pick(row.jst))}</td><td data-label="${esc(cols[3])}">${esc(pick(row.note))}${row.unverified?` <span class="flag-unverified">${pick(r.unverifiedLabel)}</span>`:''}</td></tr>`).join('')}</tbody></table></div>`:''}
${g.unverified.length?`<div class="reg-unverified"><h4>⚠️ ${pick(r.unverifiedLabel)}</h4><ul>${g.unverified.map(item=>`<li>${esc(pick(item))}</li>`).join('')}</ul></div>`:''}
<p class="reg-links"><strong>${pick(r.officialLinks)}:</strong></p><ul class="reg-link-list">${g.links.map(link=>`<li>${ext(link.url,pick(link.label))}</li>`).join('')}</ul></article>`;
  app.innerHTML=`${hero()}<section class="hub-section reg" aria-labelledby="reg-title"><h2 id="reg-title">${pick(r.title)}</h2><p>${pick(r.intro)}</p><p class="pill reg-verified">${pick(r.verified)}: ${REG_VERIFIED}</p>
<nav class="reg-jump" aria-label="${pick(r.title)}">${r.regions.map(g=>`<a href="#reg-${g.id}"><span aria-hidden="true">${g.flag}</span> ${esc(pick(g.title))}</a>`).join('')}<a href="#reg-path">🏆 AIME</a></nav>
<p class="reg-caution">⚠️ ${pick(r.caution)}</p>
<div class="reg-grid">${r.regions.map(regionCard).join('')}</div></section>
<section class="hub-section reg-path" id="reg-path" aria-labelledby="path-title"><h2 id="path-title">${pick(r.path.title)}</h2><ol class="path-steps">${r.path.steps.map(step=>`<li><span class="path-icon" aria-hidden="true">${step.icon}</span><div><h3>${esc(pick(step.title))}</h3><p>${esc(pick(step.body))}</p></div></li>`).join('')}</ol><div class="kid-note intl-note"><p>${esc(pick(r.path.intl))}</p></div><ul class="reg-link-list">${r.path.links.map(link=>`<li>${ext(link.url,pick(link.label))}</li>`).join('')}</ul></section>
<section class="hub-section" aria-labelledby="tips-title"><h2 id="tips-title">${pick(r.tips.title)}</h2><ul class="idea-list">${r.tips.items.map(item=>`<li>${esc(pick(item))}</li>`).join('')}</ul></section>`;
}

// ---------- real-style sets and mock ----------
function interleaveByArea(pool){
  const groups=new Map();for(const p of shuffle(pool)){if(!groups.has(p.area))groups.set(p.area,[]);groups.get(p.area).push(p);}
  const out=[],lists=shuffle([...groups.values()]);while(lists.some(g=>g.length))for(const g of lists)if(g.length)out.push(g.shift());return out;
}
export function pickMock(lv,random=Math.random){
  const all=BANKS[lv].bank,targets={8:[12,9,4],10:[9,11,5],12:[8,12,5]}[lv],chosen=[];
  [1,2,3].forEach((band,i)=>chosen.push(...interleaveByArea(all.filter(p=>p.band===band)).slice(0,targets[i])));
  if(chosen.length<25){const ids=new Set(chosen.map(p=>p.id));chosen.push(...shuffle(all.filter(p=>!ids.has(p.id)),random).slice(0,25-chosen.length));}
  return chosen.slice(0,25).sort((a,b)=>a.band-b.band);
}
export function pickSet(lv,area,random=Math.random){return shuffle(BANKS[lv].bank.filter(p=>p.area===area),random).slice(0,10).sort((a,b)=>a.band-b.band);}
export function scoreFor(lv,items,answers){
  let correct=0,blank=0;items.forEach((p,i)=>{if(answers[i]===null||answers[i]===undefined)blank++;else if(answers[i]===p.answer)correct++;});
  const wrong=items.length-correct-blank;return {correct,blank,wrong,points:lv==='8'?correct:correct*6+blank*1.5};
}
function startReal(area){
  if(!areas().some(a=>a.id===area))return;
  if(view!=='practice'){view='practice';lessonId=null;writeState();}
  drill=null;stopTimer();rs={type:'real',level,area,items:pickSet(level,area),index:0,answers:[],revealed:false,complete:false};renderReal(true);
}
function startMock(){
  if(view!=='practice'){view='practice';lessonId=null;writeState();}
  drill=null;stopTimer();
  const minutes=level==='8'?40:75;
  rs={type:'mock',level,items:pickMock(level),index:0,answers:Array(25).fill(null),complete:false,deadline:Date.now()+minutes*60000};
  timer=setInterval(tick,1000);renderMock(true);
}
const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
function tick(){
  if(!rs||rs.type!=='mock'||rs.complete){stopTimer();return;}
  const left=rs.deadline-Date.now(),el=document.querySelector('#mock-timer');if(el)el.textContent=fmt(left);
  if(left<=0){rs.timeUp=true;finishSet();}
}
function citeLine(p){return `<p class="citation"><span class="cite-badge">${esc(h.modeled)}</span> <span>${esc(citation(p.model,locale))}</span> · <a href="${p.model.url}" target="_blank" rel="noopener noreferrer">${h.viewOriginal}</a></p>`;}
function steps(p){return `<section class="explanation" aria-label="${h.solution}"><h3>${h.solution}</h3><ol>${p.steps.map(step=>`<li>${esc(pick(step))}</li>`).join('')}</ol><p class="answer-line"><strong>${h.answerIs}</strong><span>(${LETTERS[p.answer]}) ${esc(p.options[p.answer])}</span></p></section>`;}
function options(p,chosen,reveal){
  return `<div class="options" role="group" aria-label="A–E">${p.options.map((option,i)=>{
    const cls=reveal?(i===p.answer?'right':i===chosen?'wrong':''):(i===chosen?'selected':'');
    return `<button type="button" data-pick="${i}" aria-label="(${LETTERS[i]}) ${esc(option)}" ${reveal?'disabled':''} aria-pressed="${i===chosen}" class="${cls}">${esc(option)}</button>`;}).join('')}</div>`;
}
function problemHead(p,index,total){
  return `<div class="question-meta"><span class="pill band band-${p.band}">${h.bands[p.band]}</span><span>${esc(areaTitle(p.area,rs.level))}</span></div><progress max="${total}" value="${index}" aria-label="${h.question}${index+1}${h.questionSuffix}"></progress><p class="eyebrow">AMC ${rs.level} · ${h.question}${index+1}${h.questionSuffix}${h.of}${total}</p><h1 tabindex="-1" id="prompt" class="amc-prompt">${esc(pick(p.prompt))}</h1>`;
}
function renderReal(focus=false){
  const s=rs,p=s.items[s.index],chosen=s.answers[s.index],total=s.items.length;hideTabs();
  const fb=!s.revealed?'':chosen===null?h.blanked:chosen===p.answer?h.correct:h.wrong,state=!s.revealed?'':chosen===p.answer?'correct':chosen===null?'reveal':'wrong';
  app.innerHTML=`<div class="practice-toolbar"><button class="ghost" data-hub>${h.exit}</button><span>${esc(areaTitle(s.area,s.level))} · ${s.index+1} / ${total}</span></div><section class="question amc-q" data-problem-id="${p.id}" data-band="${p.band}">${problemHead(p,s.index,total)}${options(p,chosen,s.revealed)}
${s.revealed?'':`<div class="actions"><button type="button" class="ghost blank-btn" data-blank>${h.blank}</button></div>`}${citeLine(p)}
<p id="feedback" class="feedback" data-state="${state}" role="status" aria-live="polite">${fb}</p>${s.revealed?`${steps(p)}<button class="primary next-question" data-real-next>${s.index+1===total?h.finish:h.next}</button>`:''}</section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#prompt').focus({preventScroll:true});}
}
function renderMock(focus=false){
  const s=rs,p=s.items[s.index],chosen=s.answers[s.index],answered=s.answers.filter(a=>a!==null).length;hideTabs();
  app.innerHTML=`<div class="practice-toolbar mock-bar"><button class="ghost" data-hub>${h.exit}</button><span class="mock-timer-wrap">⏱️ ${h.timeLeft} <strong id="mock-timer" aria-live="off">${fmt(s.deadline-Date.now())}</strong></span><span>${h.answered}: ${answered} / 25</span></div>
<section class="question amc-q mock" data-problem-id="${p.id}" data-band="${p.band}">${problemHead(p,s.index,25)}${options(p,chosen,false)}${citeLine(p)}
<div class="mock-nav"><button type="button" data-mock-go="${s.index-1}" ${s.index===0?'disabled':''}>${h.prev}</button>${chosen!==null?`<button type="button" class="ghost" data-blank>${h.blank}</button>`:''}${s.index<24?`<button type="button" class="primary" data-mock-go="${s.index+1}">${h.next}</button>`:`<button type="button" class="primary" data-finish>${h.finish}</button>`}</div>
<nav class="palette" aria-label="${h.question}">${s.items.map((q,i)=>`<button type="button" data-mock-go="${i}" class="${s.answers[i]!==null?'answered':''}" ${i===s.index?'aria-current="true"':''} aria-label="${h.question}${i+1}${h.questionSuffix}${s.answers[i]!==null?` · ${h.answered}`:''}">${i+1}</button>`).join('')}</nav>
<div class="actions"><button type="button" class="secondary" data-finish>${h.finish}</button></div></section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#prompt').focus({preventScroll:true});}
}
function finishSet(){
  const s=rs;if(!s||s.complete)return;s.complete=true;stopTimer();
  if(s.type==='real')while(s.answers.length<s.items.length)s.answers.push(null);
  const sc=scoreFor(s.level,s.items,s.answers);
  if(s.type==='real'){const key=realKey(s.level,s.area);setItem(key,String(Math.max(readNumber(key,s.items.length),sc.correct)));}
  else{const key=realKey(s.level,'mock');setItem(key,String(Math.max(readNumber(key,150),sc.points)));}
  renderResult(true);
}
function renderResult(focus=false){
  const s=rs,sc=scoreFor(s.level,s.items,s.answers),total=s.items.length,max=s.type==='mock'?(s.level==='8'?25:150):total,value=s.type==='mock'?sc.points:sc.correct;hideTabs();
  const aime=s.type==='mock'&&s.level!=='8'?`<p class="kid-note aime-line">${(s.level==='10'?sc.points>=100:sc.points>=85)?h.aimeYes[s.level]:h.aimeNo[s.level]}</p>`:s.level==='8'?`<p class="muted">${h.amc8Score}</p>`:'';
  app.innerHTML=`<section class="result amc-result" data-type="${s.type}"><p class="eyebrow">AMC ${s.level} · ${s.type==='mock'?h.mockTitle:esc(areaTitle(s.area,s.level))}</p><h1 tabindex="-1" id="result-title">${s.type==='mock'?h.mockResult:h.resultTitle}</h1>${s.timeUp?`<p role="status">${h.timeUp}</p>`:''}
<div class="score-card"><p class="score-label">${h.score}</p><p class="score-value"><strong>${value} / ${max}</strong></p><div class="meter" aria-hidden="true"><span style="width:${value/max*100}%"></span></div><p class="score-breakdown"><span>✓ ${h.correctCount} ${sc.correct}</span><span>○ ${h.blankCount} ${sc.blank}</span><span>✕ ${h.wrongCount} ${sc.wrong}</span></p></div>${aime}
<div class="actions">${s.type==='mock'?`<button class="primary" data-mock>${h.retry}</button>`:`<button class="primary" data-real="${s.area}">${h.retry}</button>`}<button class="ghost" data-hub>${h.backHub}</button></div>
<h2>${h.review}</h2><div class="review-list">${s.items.map((p,i)=>{const a=s.answers[i],ok=a===p.answer;return `<details class="review-item" data-problem-id="${p.id}"><summary><span class="review-mark ${ok?'is-right':'is-retry'}" aria-hidden="true">${ok?'✓':a===null?'○':'✕'}</span><span>${i+1}. ${esc(pick(p.prompt))}</span></summary><div class="review-body"><p>${esc(pick(p.prompt))}</p>${options(p,a,true)}<div class="first-answer"><strong>${h.yourAnswer}</strong><p>${a===null?h.noAnswer:`(${LETTERS[a]}) ${esc(p.options[a])}`}</p></div>${citeLine(p)}${steps(p)}</div></details>`;}).join('')}</div></section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#result-title').focus({preventScroll:true});}
}

// ---------- foundation drills (AMC 8; same engine as the original AMC 8 page) ----------
const drillCache=new Map();
function drillBank(id){const key=`${id}:${locale}`;if(!drillCache.has(key))drillCache.set(key,amcBank(id,locale));return drillCache.get(key);}
function localizedQuestion(q){const translated=drillBank(drill.id).find(item=>item.id===q.id);return {...translated,...(q.options?{options:q.options}:{}),...(q.orderItems?{orderItems:q.orderItems}:{})};}
function displayedAnswer(q,response=q.correct){if(q.kind==='multi')return q.fields.map((field,i)=>`${field.label}: ${response[i]}`).join(' · ');return Array.isArray(response)?response.join(' → '):String(response);}
function drillExplanation(q){return `<section class="explanation" aria-label="${t.solution}"><h3>${t.solution}</h3><ol>${q.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="answer-line"><strong>${t.correctAnswer}</strong><span>${esc(displayedAnswer(q))}</span></p>${q.check?`<div class="check-note"><h4>${t.check}</h4><p>${esc(q.check)}</p></div>`:''}${q.mistake?`<div class="mistake-note"><h4>${t.mistake}</h4><p>${esc(q.mistake)}</p></div>`:''}</section>`;}
function startDrill(id){
  if(!TOPICS.some(topic=>topic.id===id))return;
  if(level!=='8'){level='8';}
  if(view!=='practice'){view='practice';lessonId=null;}writeState();
  rs=null;stopTimer();
  try{drill={id,questions:createSession(drillBank(id)),index:0,score:0,answers:[],complete:false};beginDrillQuestion();}
  catch(error){drill=null;hideTabs();app.innerHTML=`<p role="alert">${h.error}</p><button data-hub>${h.backHub}</button>`;console.error(error);}
}
function beginDrillQuestion(){const s=drill,q=s.questions[s.index];s.attempts=0;s.done=false;s.feedback=null;s.disabledOptions=[];s.draft=q.kind==='order'?[...q.orderItems]:q.kind==='multi'?q.fields.map(()=> ''):'';renderDrill(true);}
function drillControls(q){
  const s=drill;
  if(q.kind==='choice')return `<div class="options">${q.options.map((option,i)=>`<button data-answer="${i}" ${s.done||s.disabledOptions.includes(option)?'disabled':''} class="${s.done&&option===q.correct?'right':s.disabledOptions.includes(option)?'wrong':''}">${esc(option)}</button>`).join('')}</div>`;
  if(q.kind==='order')return `<p id="answer-help" class="muted">${t.orderHelp}</p><ol class="order-list">${s.draft.map((value,i)=>`<li><span class="order-value">${esc(value)}</span><div class="order-actions"><button type="button" data-move="${i}" data-direction="-1" aria-label="${t.up}: ${esc(value)}" ${s.done||i===0?'disabled':''}>↑</button><button type="button" data-move="${i}" data-direction="1" aria-label="${t.down}: ${esc(value)}" ${s.done||i===s.draft.length-1?'disabled':''}>↓</button></div></li>`).join('')}</ol><button class="primary" data-submit ${s.done?'disabled':''}>${t.submit}</button>`;
  const fields=q.kind==='multi'?q.fields:[{label:t.numeric}],values=q.kind==='multi'?s.draft:[s.draft];
  return `<form id="answer-form" novalidate><p id="answer-help" class="muted">${t.numericHelp}</p><div class="answer-fields">${fields.map((field,i)=>`<label for="response-${i}"><span>${esc(field.label)}</span><input id="response-${i}" data-field="${i}" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-describedby="answer-help feedback" value="${esc(values[i])}" ${s.done?'disabled':''}></label>`).join('')}</div><button class="primary" type="submit" ${s.done?'disabled':''}>${t.submit}</button></form>`;
}
function renderDrill(focus=false){
  const s=drill,q=localizedQuestion(s.questions[s.index]),unit=drillUnits().find(u=>u.id===s.id);hideTabs();
  app.innerHTML=`<div class="practice-toolbar"><button class="ghost" data-hub>← ${t.exit}</button><span>${esc(unit.title)} · ${t.progress} ${s.index+1} / 10</span></div><section class="question" data-question-id="${q.id}" data-kind="${q.kind}"><div class="question-meta"><span class="pill">${t.kinds[q.kind]}</span><span>${t.attempt}: ${s.attempts}/3</span></div><progress max="10" value="${s.index}" aria-label="${t.progress}"></progress>${q.title?`<p class="eyebrow">${esc(q.title)}</p>`:''}<h1 tabindex="-1" id="prompt">${esc(q.prompt)}</h1>${drillControls(q)}<p id="feedback" class="feedback" data-state="${s.feedback||''}" role="status" aria-live="polite">${s.feedback==='invalid'?t.invalid:s.feedback==='gentle'?t.gentle:s.feedback==='hint'?esc(q.hint||''):s.feedback==='correct'?t.good:s.feedback==='reveal'?t.answer:''}</p>${s.done?`${drillExplanation(q)}<p class="muted">${t.learned}</p><button class="primary next-question" data-next>${t.next}</button>`:''}</section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#prompt').focus({preventScroll:true});}
}
function captureDraft(){
  if(!drill||drill.complete)return;
  const q=drill.questions[drill.index],inputs=[...app.querySelectorAll('[data-field]')];
  if(q.kind==='number'&&inputs[0])drill.draft=inputs[0].value;else if(q.kind==='multi'&&inputs.length)drill.draft=inputs.map(input=>input.value);
}
function submitDrill(response){
  const s=drill;if(!s||s.done||s.complete)return;
  const q=s.questions[s.index],result=gradeResponse(q,response);
  if(!result.valid){s.feedback='invalid';renderDrill();app.querySelector('[data-field]')?.focus();return;}
  s.attempts++;
  if(s.attempts===1){if(result.correct)s.score++;s.answers.push({question:q,selected:Array.isArray(response)?[...response]:response,correct:result.correct});}
  if(q.kind==='choice'&&!result.correct)s.disabledOptions.push(response);
  if(result.correct||s.attempts>=3){s.done=true;s.feedback=result.correct?'correct':'reveal';}else s.feedback=s.attempts===1?'gentle':'hint';
  renderDrill();if(!s.done)app.querySelector('[data-field]')?.focus();
}
function finishDrill(){const s=drill;s.complete=true;setItem(progressKey('amc8',s.id),String(Math.max(readDrillBest(s.id),s.score)));renderDrillResult(true);}
function renderDrillResult(focus=false){
  const s=drill,result=resultFor(s.score),units=drillUnits(),following=units[units.findIndex(u=>u.id===s.id)+1];hideTabs();
  app.innerHTML=`<section class="result" data-passed="${result.passed}"><p class="eyebrow">${esc(units.find(u=>u.id===s.id)?.title||'')}</p><h1 tabindex="-1" id="result-title">${result.passed?t.pass:t.fail}</h1><div class="score-card"><p class="score-label">${t.score}</p><p class="score-value"><strong>${s.score} / 10</strong></p><div class="meter" aria-hidden="true"><span style="width:${s.score*10}%"></span></div></div><div class="actions"><button class="primary" data-start="${s.id}">${t.retry}</button>${result.passed&&following?`<button data-start="${following.id}">${t.continue}</button>`:''}<button class="ghost" data-hub>${t.back}</button></div><h2>${t.review}</h2><div class="review-list">${s.answers.map((answer,i)=>{
    const q=localizedQuestion(answer.question);
    return `<details class="review-item"><summary><span class="review-mark ${answer.correct?'is-right':'is-retry'}" aria-hidden="true">${answer.correct?'✓':'↻'}</span><span>${i+1}. ${esc(q.title||q.prompt)}</span></summary><div class="review-body"><p>${esc(q.prompt)}</p><div class="first-answer"><strong>${t.yourAnswer}</strong><p>${esc(displayedAnswer(q,answer.selected))}</p></div>${drillExplanation(q)}</div></details>`;
  }).join('')}</div></section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#result-title').focus({preventScroll:true});}
}

// ---------- routing ----------
function home(){
  drill=null;rs=null;stopTimer();chrome();showTabs();
  if(view==='learn'){if(lessonId)lessonPage(lessonId);else learnHome();}
  else if(view==='register')registerView();
  else practiceHome();
}
function rerender(){
  if(rs){if(rs.complete)renderResult();else if(rs.type==='mock')renderMock();else renderReal();}
  else if(drill){if(drill.complete)renderDrillResult();else renderDrill();}
  else home();
}
document.querySelector('#locale').addEventListener('change',event=>{
  captureDraft();locale=event.target.value;h=HUB_TEXT[locale];t=TEXT[locale];writeState();chrome();rerender();
});
app.addEventListener('submit',event=>{if(event.target.id==='answer-form'){event.preventDefault();captureDraft();submitDrill(drill.draft);}});
function onClick(event){
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-hub')){home();app.scrollIntoView({block:'start'});}
  else if(b.dataset.level){if(b.dataset.level===level)return;level=b.dataset.level;if(lessonId&&!levelData().lessons.some(l=>l.id===lessonId))lessonId=null;writeState(true);home();document.querySelector(`[data-level="${level}"]`)?.focus({preventScroll:true});}
  else if(b.dataset.view){if(b.dataset.view===view&&!lessonId)return;view=VIEWS.includes(b.dataset.view)?b.dataset.view:'practice';lessonId=null;writeState(true);home();scrollTo({top:0});document.querySelector(`#view-tabs [data-view="${view}"]`)?.focus();}
  else if(b.dataset.lesson){view='learn';lessonId=b.dataset.lesson;writeState(true);home();app.scrollIntoView({block:'start'});document.querySelector('#lesson-title')?.focus({preventScroll:true});}
  else if(b.hasAttribute('data-lesson-list')){const from=lessonId;lessonId=null;writeState(true);home();const card=app.querySelector(`[data-lesson-card="${from}"]`);if(card){card.scrollIntoView({block:'center'});card.querySelector('button')?.focus({preventScroll:true});}}
  else if(b.dataset.lessonDone){const done=!doneLessons().has(b.dataset.lessonDone);setLessonDone(b.dataset.lessonDone,done);lessonPage(b.dataset.lessonDone);app.querySelector('[data-lesson-done]')?.focus({preventScroll:true});}
  else if(b.dataset.jump){const target=document.getElementById(b.dataset.jump);target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});}
  else if(b.dataset.real)startReal(b.dataset.real);
  else if(b.hasAttribute('data-mock'))startMock();
  else if(b.dataset.start)startDrill(b.dataset.start);
  else if(b.dataset.pick!==undefined&&rs&&!rs.complete){
    const i=Number(b.dataset.pick);
    if(rs.type==='real'){if(rs.revealed)return;rs.answers[rs.index]=i;rs.revealed=true;renderReal();app.querySelector('[data-real-next]')?.focus({preventScroll:true});}
    else{rs.answers[rs.index]=rs.answers[rs.index]===i?null:i;renderMock();app.querySelector(`[data-pick="${i}"]`)?.focus({preventScroll:true});}
  }
  else if(b.hasAttribute('data-blank')&&rs&&!rs.complete){
    if(rs.type==='real'){rs.answers[rs.index]=null;rs.revealed=true;renderReal();app.querySelector('[data-real-next]')?.focus({preventScroll:true});}
    else{rs.answers[rs.index]=null;renderMock();}
  }
  else if(b.hasAttribute('data-real-next')&&rs?.revealed){if(rs.index+1>=rs.items.length)finishSet();else{rs.index++;rs.revealed=false;renderReal(true);}}
  else if(b.dataset.mockGo!==undefined&&rs?.type==='mock'&&!rs.complete){const i=Number(b.dataset.mockGo);if(i>=0&&i<25){rs.index=i;renderMock(true);}}
  else if(b.hasAttribute('data-finish')&&rs?.type==='mock'&&!rs.complete){if(rs.answers.some(a=>a===null)&&!confirm(h.finishConfirm))return;finishSet();}
  else if(b.hasAttribute('data-answer')&&drill&&!drill.complete)submitDrill(drill.questions[drill.index].options[Number(b.dataset.answer)]);
  else if(b.hasAttribute('data-submit'))submitDrill(drill.draft);
  else if(b.hasAttribute('data-move')&&drill&&!drill.done){
    const from=Number(b.dataset.move),to=from+Number(b.dataset.direction),items=drill.draft;
    if(to<0||to>=items.length)return;[items[from],items[to]]=[items[to],items[from]];renderDrill();
    const preferred=app.querySelector(`[data-move="${to}"][data-direction="${b.dataset.direction}"]`);
    (preferred&&!preferred.disabled?preferred:app.querySelector(`[data-move="${to}"]:not(:disabled)`))?.focus();
    app.querySelector('#feedback').textContent=t.move;
  }
  else if(b.hasAttribute('data-next')&&drill?.done&&!drill.complete){drill.index++;if(drill.index===10)finishDrill();else beginDrillQuestion();}
}
app.addEventListener('click',onClick);tabSlot?.addEventListener('click',onClick);
window.addEventListener('popstate',()=>{readState();writeState();home();});
readState();writeState();home();
