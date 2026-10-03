import {TOPICS,FAMILIES,ARCHIVE,OFFICIAL_SAMPLE,amcBank,topicExamples,createSession,gradeResponse,resultFor,progressKey} from './PracticeData.mjs';
import {LESSONS,STAGES,FACTS,SOURCES,FACTS_CHECKED,LEARN_TEXT,LESSON_KEY,lessonForTopic} from './AmcLessons.mjs';
import {getEnglishQuestionBank} from './EnglishQuestionBank.mjs';
import {TEXT} from './PracticeText.mjs';

const course=document.body.dataset.course,params=new URLSearchParams(location.search),app=document.querySelector('#practice-app');
let locale=['ja','zh','en'].includes(params.get('lang'))?params.get('lang'):'ja',t=TEXT[locale];
let storage;try{storage=localStorage;const key='piko-practice-storage-check';storage.setItem(key,'1');storage.removeItem(key);}catch{storage=undefined;}
let storageOK=!!storage,session=null;
// AMC 8 has two views at the same level: practice sets and the learning guide.
// The view and the open lesson live in the URL so links, reloads, the back
// button and language switches all keep the learner where they were.
let view='practice',lessonId=null;
function readView(){
  const query=new URLSearchParams(location.search);
  for(const key of [...params.keys()])params.delete(key);
  query.forEach((value,key)=>params.set(key,value));
  view=course==='amc8'&&query.get('view')==='learn'?'learn':'practice';
  lessonId=view==='learn'&&LESSONS.some(lesson=>lesson.id===query.get('lesson'))?query.get('lesson'):null;
}
function writeView(push=false){
  params.delete('view');params.delete('lesson');
  if(view==='learn'){params.set('view','learn');if(lessonId)params.set('lesson',lessonId);}
  const search=String(params),url=`${location.pathname}${search?`?${search}`:''}`;
  if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);
}
readView();
const memoryLessons=new Set();
function doneLessons(){
  if(!storageOK)return new Set(memoryLessons);
  try{const saved=JSON.parse(storage.getItem(LESSON_KEY)||'[]');return new Set(Array.isArray(saved)?saved.filter(id=>LESSONS.some(lesson=>lesson.id===id)):[]);}catch{return new Set(memoryLessons);}
}
function setLessonDone(id,done){
  const ids=doneLessons();if(done)ids.add(id);else ids.delete(id);
  memoryLessons.clear();ids.forEach(value=>memoryLessons.add(value));
  try{if(storageOK)storage.setItem(LESSON_KEY,JSON.stringify([...ids]));}catch{storageOK=false;chrome();}
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bankCache=new Map();
function bank(id){const key=`${id}:${locale}`;if(!bankCache.has(key))bankCache.set(key,course==='eiken'?getEnglishQuestionBank(id):amcBank(id,locale));return bankCache.get(key);}
function units(){return course==='eiken'?[
  {id:'EIKEN3',title:t.eiken3,icon:'🌱',description:t.eiken3Desc},
  {id:'EIKEN2',title:t.eiken2,icon:'🌳',description:t.eiken2Desc}
]:TOPICS.map(topic=>({...topic,title:topic[locale],description:topic.goal[locale]}));}
function readBest(id){try{const value=Number(storage?.getItem(progressKey(course,id)));return Number.isInteger(value)&&value>=0&&value<=10?value:0;}catch{return 0;}}
function chrome(){
  document.documentElement.lang=locale==='zh'?'zh-Hans':locale;document.title=`${t[course]} · Piko Game`;
  document.querySelector('#locale').value=locale;
  document.querySelector('#language-label').textContent=t.language;
  const school=document.querySelector('[data-school]');school.textContent=t.school;
  const other=document.querySelector('[data-other-course]');other.textContent=course==='eiken'?'AMC 8':t.eikenLink;other.href=`/${course==='eiken'?'amc8':'eiken'}.html?lang=${locale}`;
  other.hidden=course==='amc8';
  document.querySelector('#practice-footer').innerHTML=`<p>${storageOK?t.saved:t.unavailable}</p><a href="/index.html">${t.footerBack}</a>`;
}
function localizedQuestion(q){
  if(course==='eiken')return q;
  const translated=bank(session.id).find(item=>item.id===q.id);
  return {...translated,...(q.options?{options:q.options}:{}),...(q.orderItems?{orderItems:q.orderItems}:{})};
}
function displayedAnswer(q,response=q.correct){
  if(q.kind==='multi')return q.fields.map((field,i)=>`${field.label}: ${response[i]}`).join(' · ');
  return Array.isArray(response)?response.join(' → '):String(response);
}
function explanation(q){
  const steps=q.steps||t.eikenSteps;
  return `<section class="explanation" aria-label="${t.solution}"><h3>${t.solution}</h3><ol>${steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="answer-line"><strong>${t.correctAnswer}</strong><span>${esc(displayedAnswer(q))}</span></p>${q.check?`<div class="check-note"><h4>${t.check}</h4><p>${esc(q.check)}</p></div>`:''}${q.mistake?`<div class="mistake-note"><h4>${t.mistake}</h4><p>${esc(q.mistake)}</p></div>`:''}</section>`;
}
function guide(id){return `<details class="topic-guide"><summary>${t.guide}</summary><div class="guide-body"><p class="muted">${t.guideIntro}</p>${topicExamples(id,locale).map(q=>`<details class="example"><summary>${esc(q.title)}</summary><div class="example-body"><p class="eyebrow">${t.example}</p><p>${esc(q.prompt)}</p>${q.orderItems?`<ul>${q.orderItems.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>`:''}${explanation(q)}</div></details>`).join('')}</div></details>`;}
const lt=()=>LEARN_TEXT[locale],pick=value=>value[locale];
function hero(){const prefix=course==='amc8'?'amc':'eiken';return `<section class="hero"><p class="eyebrow">PIKO GAME · ${course==='eiken'?'ENGLISH':'MATH EXPLORER'}</p><h1>${t[course]}</h1><p>${t[`${prefix}Intro`]}</p></section>`;}
function tabs(){
  if(course!=='amc8')return '';
  const l=lt();
  return `<nav class="view-tabs" aria-label="${t.amc8}">${[['practice','✏️',l.practiceTab],['learn','📘',l.learnTab]].map(([id,icon,label])=>`<button type="button" data-view="${id}" ${view===id?'aria-current="page"':''}><span aria-hidden="true">${icon}</span> ${label}</button>`).join('')}</nav>`;
}
function archive(){return `<section class="archive" aria-labelledby="archive-title"><h2 id="archive-title" tabindex="-1">${t.archive}</h2><p>${t.archiveIntro}</p><ul class="archive-list">${ARCHIVE.map(paper=>`<li><a href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.year} AMC 8 — ${t.open} ↗</a><span class="muted">25 ${t.questions}</span></li>`).join('')}</ul><p><a href="${OFFICIAL_SAMPLE}" target="_blank" rel="noopener noreferrer">${t.official} ↗</a></p><p class="muted">${t.credit}</p></section>`;}
const topicTitle=id=>units().find(u=>u.id===id)?.title||id;
const familyTitle=id=>FAMILIES.find(f=>f.id===id)?.title[locale]||id;
function lessonChip(id,done){const lesson=LESSONS.find(item=>item.id===id);return `<button type="button" class="lesson-chip" data-lesson="${id}"><span aria-hidden="true">${lesson.icon}</span> ${esc(pick(lesson.title))}${done.has(id)?` <span class="done-mark">✓<span class="visually-hidden"> ${lt().done}</span></span>`:''}</button>`;}
function learnHome(){
  const l=lt(),done=doneLessons();
  app.innerHTML=`${hero()}${tabs()}<section class="learn-intro"><h2>${l.learnTitle}</h2><p>${l.learnIntro}</p><p class="pill">${l.progress}: ${done.size} ${l.of} ${LESSONS.length}</p></section>
<section class="learn-section" aria-labelledby="what-title"><h2 id="what-title">${l.whatTitle}</h2><p>${l.whatIntro}</p><ul class="fact-grid">${FACTS.map(fact=>`<li class="fact"><span class="icon" aria-hidden="true">${fact.icon}</span><h3>${pick(fact.title)}</h3><p>${pick(fact.body)}</p></li>`).join('')}</ul><h3>${l.topicsTitle}</h3><p>${l.topicsBody}</p><p class="kid-note">${l.forKids}</p><p>${l.howJoin}</p><div class="sources muted"><p>${l.sources}</p><ul>${SOURCES.map(source=>`<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${esc(pick(source.label))} ↗</a></li>`).join('')}</ul><p>${l.checked}: ${FACTS_CHECKED}</p></div></section>
<section class="learn-section" aria-labelledby="roadmap-title"><h2 id="roadmap-title">${l.roadmapTitle}</h2><p>${l.roadmapIntro}</p><ol class="roadmap">${STAGES.map((stage,i)=>`<li class="stage"><p class="eyebrow">${l.stage} ${i+1}</p><h3><span aria-hidden="true">${stage.icon}</span> ${pick(stage.title)}</h3><p><strong>${l.stageGoal}:</strong> ${pick(stage.goal)}</p><ul>${stage.steps.map(step=>`<li>${pick(step)}</li>`).join('')}</ul>${stage.lessons.length?`<div class="stage-lessons" aria-label="${l.lessonsInStage}">${stage.lessons.map(id=>lessonChip(id,done)).join('')}</div>`:`<div class="stage-lessons"><button type="button" class="lesson-chip" data-jump="archive-title">📄 ${t.archive} ↓</button></div>`}</li>`).join('')}</ol></section>
<section class="learn-section" aria-labelledby="lessons-title"><h2 id="lessons-title">${l.lessonsTitle}</h2><p>${l.lessonsIntro}</p><div class="lesson-grid">${LESSONS.map(lesson=>`<article class="lesson-card${done.has(lesson.id)?' is-done':''}" data-lesson-card="${lesson.id}"><span class="icon" aria-hidden="true">${lesson.icon}</span><h3>${esc(pick(lesson.title))}</h3><p>${esc(pick(lesson.summary))}</p><p class="pill">${done.has(lesson.id)?`✓ ${l.done}`:l.notStarted}</p><div class="card-actions"><button type="button" class="primary" data-lesson="${lesson.id}">${l.open}</button></div></article>`).join('')}</div><p class="muted">${l.saved}</p></section>${archive()}`;
}
function lessonPage(id){
  const l=lt(),index=LESSONS.findIndex(lesson=>lesson.id===id),lesson=LESSONS[index],done=doneLessons().has(id);
  const stageIndex=STAGES.findIndex(stage=>stage.id===lesson.stage),prev=LESSONS[index-1],next=LESSONS[index+1],list=locale==='en'?', ':'、';
  document.title=`${pick(lesson.title)} · ${t.amc8} · Piko Game`;
  app.innerHTML=`${tabs()}<div class="practice-toolbar"><button type="button" data-lesson-list>${l.backToLearn}</button><span>${l.stage} ${stageIndex+1} · ${index+1} / ${LESSONS.length}</span></div><article class="lesson" data-lesson-id="${id}" aria-labelledby="lesson-title"><p class="eyebrow"><span aria-hidden="true">${lesson.icon}</span> ${pick(STAGES[stageIndex].title)}</p><h1 tabindex="-1" id="lesson-title">${esc(pick(lesson.title))}</h1>${done?`<p class="pill">✓ ${l.done}</p>`:''}
<div class="lesson-short"><h2>${l.inShort}</h2><p>${esc(pick(lesson.short))}</p></div><p>${esc(pick(lesson.body))}</p>
<h2>${l.ideas}</h2><ul class="idea-list">${lesson.ideas.map(idea=>`<li>${esc(pick(idea))}</li>`).join('')}</ul>
<section class="explanation worked-example" aria-labelledby="example-title"><h2 id="example-title">${l.example}</h2><p class="example-problem">${esc(pick(lesson.example.problem))}</p><h3>${l.stepByStep}</h3><ol>${lesson.example.steps.map(step=>`<li>${esc(pick(step))}</li>`).join('')}</ol><p class="answer-line"><strong>${l.answer}</strong><span>${esc(pick(lesson.example.answer))}</span></p></section>
<section class="mistake-note traps"><h2>${l.traps}</h2><ul>${lesson.traps.map(trap=>`<li>${esc(pick(trap))}</li>`).join('')}</ul></section>
<div class="check-note amc-tip"><h2>${l.amcTip}</h2><p>${esc(pick(lesson.tip))}</p></div>
<section class="lesson-practice" aria-labelledby="lesson-practice-title"><h2 id="lesson-practice-title">${l.practiceTitle}</h2><p>${l.practiceIntro}</p><p class="muted">${l.related}: ${lesson.families.map(familyTitle).map(esc).join(list)}</p><div class="actions">${lesson.practice.map(topic=>`<button type="button" class="primary" data-start="${topic}">${l.practiceButton}${esc(topicTitle(topic))}</button>`).join('')}</div></section>
<div class="actions lesson-done"><button type="button" class="mark-done" data-lesson-done="${id}">${done?l.markUndo:l.markDone}</button></div>
<nav class="lesson-nav" aria-label="${l.lessonsTitle}">${prev?`<button type="button" data-lesson="${prev.id}">${l.prev}</button>`:'<span></span>'}${next?`<button type="button" data-lesson="${next.id}">${l.next}</button>`:''}</nav></article>`;
}
function home(){
  session=null;
  if(course==='amc8'&&view==='learn'){if(lessonId)lessonPage(lessonId);else learnHome();return;}
  const prefix=course==='amc8'?'amc':'eiken';
  app.innerHTML=`${hero()}${tabs()}<div class="course-intro"><p class="muted">${t[`${prefix}Note`]}</p>${course==='amc8'?`<p>${t.steps}</p>`:''}</div><section class="course-grid ${course==='eiken'?'two-columns':''}" aria-label="${t[course]}">${units().map(u=>`<article class="course-card"><span class="icon" aria-hidden="true">${u.icon}</span><h2>${esc(u.title)}</h2><p>${esc(u.description)}</p>${course==='amc8'?`<p class="muted">${t.familyCount}</p>`:''}<p class="pill">${t.best}: ${readBest(u.id)}/10</p><div class="card-actions"><button class="primary" data-start="${u.id}">${t.start}</button>${course==='amc8'&&lessonForTopic(u.id)?`<button type="button" data-lesson="${lessonForTopic(u.id)}">📘 ${lt().learnLink}</button>`:''}</div>${course==='amc8'?guide(u.id):''}</article>`).join('')}</section>${course==='amc8'?archive():''}`;
}
function start(id){
  if(!units().some(u=>u.id===id))return;
  if(view==='learn'){view='practice';lessonId=null;writeView();}
  try{session={id,questions:createSession(bank(id)),index:0,score:0,answers:[],complete:false};beginQuestion();}
  catch(error){session=null;app.innerHTML=`<p role="alert">${t.error}</p><button data-home>${t.back}</button>`;console.error(error);}
}
function beginQuestion(){
  const s=session,q=s.questions[s.index];s.attempts=0;s.done=false;s.feedback=null;s.disabledOptions=[];
  s.draft=q.kind==='order'?[...q.orderItems]:q.kind==='multi'?q.fields.map(()=> ''):'';
  renderQuestion(true);
}
function answerControls(q){
  const s=session;
  if(q.kind==='choice')return `<div class="options">${q.options.map((option,i)=>`<button data-answer="${i}" ${s.done||s.disabledOptions.includes(option)?'disabled':''} class="${s.done&&option===q.correct?'right':s.disabledOptions.includes(option)?'wrong':''}">${esc(option)}</button>`).join('')}</div>`;
  if(q.kind==='order')return `<p id="answer-help" class="muted">${t.orderHelp}</p><ol class="order-list">${s.draft.map((value,i)=>`<li><span class="order-value">${esc(value)}</span><div class="order-actions"><button type="button" data-move="${i}" data-direction="-1" aria-label="${t.up}: ${esc(value)}" ${s.done||i===0?'disabled':''}>↑</button><button type="button" data-move="${i}" data-direction="1" aria-label="${t.down}: ${esc(value)}" ${s.done||i===s.draft.length-1?'disabled':''}>↓</button></div></li>`).join('')}</ol><button class="primary" data-submit ${s.done?'disabled':''}>${t.submit}</button>`;
  const fields=q.kind==='multi'?q.fields:[{label:t.numeric}],values=q.kind==='multi'?s.draft:[s.draft];
  return `<form id="answer-form" novalidate><p id="answer-help" class="muted">${t.numericHelp}</p><div class="answer-fields">${fields.map((field,i)=>`<label for="response-${i}"><span>${esc(field.label)}</span><input id="response-${i}" data-field="${i}" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-describedby="answer-help feedback" value="${esc(values[i])}" ${s.done?'disabled':''}></label>`).join('')}</div><button class="primary" type="submit" ${s.done?'disabled':''}>${t.submit}</button></form>`;
}
function renderQuestion(focus=false){
  const s=session,q=localizedQuestion(s.questions[s.index]),unit=units().find(u=>u.id===s.id);
  app.innerHTML=`<div class="practice-toolbar"><button data-home>${t.exit}</button><span>${esc(unit.title)} · ${t.progress} ${s.index+1} / 10</span></div><section class="question" data-question-id="${q.id}" data-kind="${q.kind}"><div class="question-meta"><span class="pill">${t.kinds[q.kind]}</span><span>${t.attempt}: ${s.attempts}/3</span></div><progress max="10" value="${s.index}" aria-label="${t.progress}"></progress>${q.title?`<p class="eyebrow">${esc(q.title)}</p>`:''}<h1 tabindex="-1" id="prompt">${esc(q.prompt)}</h1>${answerControls(q)}<p id="feedback" role="status" aria-live="polite">${s.feedback==='invalid'?t.invalid:s.feedback==='gentle'?t.gentle:s.feedback==='hint'?esc(q.hint||t.eikenHint):s.feedback==='correct'?t.good:s.feedback==='reveal'?t.answer:''}</p>${s.done?`${explanation(q)}<p class="muted">${t.learned}</p><button class="primary next-question" data-next>${t.next}</button>`:''}</section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#prompt').focus({preventScroll:true});}
}
function captureDraft(){
  if(!session||session.complete)return;
  const q=session.questions[session.index],inputs=[...app.querySelectorAll('[data-field]')];
  if(q.kind==='number'&&inputs[0])session.draft=inputs[0].value;
  else if(q.kind==='multi'&&inputs.length)session.draft=inputs.map(input=>input.value);
}
function submit(response){
  const s=session;if(!s||s.done||s.complete)return;
  const q=s.questions[s.index],result=gradeResponse(q,response);
  if(!result.valid){s.feedback='invalid';renderQuestion();app.querySelector('[data-field]')?.focus();return;}
  s.attempts++;
  if(s.attempts===1){if(result.correct)s.score++;s.answers.push({question:q,selected:Array.isArray(response)?[...response]:response,correct:result.correct});}
  if(q.kind==='choice'&&!result.correct)s.disabledOptions.push(response);
  if(result.correct||s.attempts>=3){s.done=true;s.feedback=result.correct?'correct':'reveal';}
  else s.feedback=s.attempts===1?'gentle':'hint';
  renderQuestion();
  if(!s.done)app.querySelector('[data-field]')?.focus();
}
function finish(){
  const s=session;s.complete=true;
  try{if(storageOK)storage.setItem(progressKey(course,s.id),String(Math.max(readBest(s.id),s.score)));}catch{storageOK=false;chrome();}
  renderResult(true);
}
function renderResult(focus=false){
  const s=session,result=resultFor(s.score),following=units()[units().findIndex(u=>u.id===s.id)+1];
  app.innerHTML=`<section class="result"><p class="eyebrow">${t.review}</p><h1 tabindex="-1" id="result-title">${result.passed?t.pass:t.fail}</h1><p>${t.score}: <strong>${s.score} / 10</strong></p><div class="actions"><button class="primary" data-start="${s.id}">${t.retry}</button>${result.passed&&following?`<button data-start="${following.id}">${t.continue}</button>`:''}<button data-home>${t.back}</button></div><h2>${t.review}</h2><div class="review-list">${s.answers.map((answer,i)=>{
    const q=localizedQuestion(answer.question);
    return `<details class="review-item"><summary><span aria-hidden="true">${answer.correct?'✓':'↻'}</span><span>${i+1}. ${esc(q.title||q.prompt)}</span></summary><div class="review-body"><p>${esc(q.prompt)}</p><div class="first-answer"><strong>${t.yourAnswer}</strong><p>${esc(displayedAnswer(q,answer.selected))}</p></div>${explanation(q)}</div></details>`;
  }).join('')}</div></section>`;
  if(focus){app.scrollIntoView({block:'start'});document.querySelector('#result-title').focus({preventScroll:true});}
}
document.querySelector('#locale').addEventListener('change',event=>{
  captureDraft();locale=event.target.value;t=TEXT[locale];params.set('lang',locale);writeView();chrome();
  if(session?.complete)renderResult();else if(session)renderQuestion();else home();
});
app.addEventListener('submit',event=>{if(event.target.id==='answer-form'){event.preventDefault();captureDraft();submit(session.draft);}});
app.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-home')){home();app.scrollIntoView({block:'start'});}
  else if(b.dataset.view){if(b.dataset.view===view&&!lessonId)return;view=b.dataset.view==='learn'?'learn':'practice';lessonId=null;writeView(true);chrome();home();app.scrollIntoView({block:'start'});app.querySelector(`[data-view="${view}"]`)?.focus();}
  else if(b.dataset.lesson){view='learn';lessonId=b.dataset.lesson;writeView(true);chrome();home();app.scrollIntoView({block:'start'});document.querySelector('#lesson-title')?.focus({preventScroll:true});}
  else if(b.hasAttribute('data-lesson-list')){const from=lessonId;lessonId=null;writeView(true);chrome();home();const card=app.querySelector(`[data-lesson-card="${from}"]`);if(card){card.scrollIntoView({block:'center'});card.querySelector('button')?.focus({preventScroll:true});}}
  else if(b.dataset.lessonDone){const done=!doneLessons().has(b.dataset.lessonDone);setLessonDone(b.dataset.lessonDone,done);lessonPage(b.dataset.lessonDone);const again=app.querySelector('[data-lesson-done]');again?.focus({preventScroll:true});}
  else if(b.dataset.jump){const target=document.getElementById(b.dataset.jump);target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});}
  else if(b.dataset.start)start(b.dataset.start);
  else if(b.hasAttribute('data-answer')&&session&&!session.complete)submit(session.questions[session.index].options[Number(b.dataset.answer)]);
  else if(b.hasAttribute('data-submit'))submit(session.draft);
  else if(b.hasAttribute('data-move')&&session&&!session.done){
    const from=Number(b.dataset.move),to=from+Number(b.dataset.direction),items=session.draft;
    if(to<0||to>=items.length)return;[items[from],items[to]]=[items[to],items[from]];renderQuestion();
    const preferred=app.querySelector(`[data-move="${to}"][data-direction="${b.dataset.direction}"]`);
    (preferred&&!preferred.disabled?preferred:app.querySelector(`[data-move="${to}"]:not(:disabled)`))?.focus();
    app.querySelector('#feedback').textContent=t.move;
  }
  else if(b.hasAttribute('data-next')&&session?.done&&!session.complete){session.index++;if(session.index===10)finish();else beginQuestion();}
});
// Older history entries may carry the previous ?lang; the learner's current choice wins.
window.addEventListener('popstate',()=>{readView();if(params.get('lang')!==locale&&params.has('lang')){params.set('lang',locale);writeView();}chrome();home();});
chrome();home();
