import {TOPICS,ARCHIVE,OFFICIAL_SAMPLE,amcBank,topicExamples,createSession,gradeResponse,resultFor,progressKey} from './PracticeData.mjs';
import {getEnglishQuestionBank} from './EnglishQuestionBank.mjs';
import {TEXT} from './PracticeText.mjs';

const course=document.body.dataset.course,params=new URLSearchParams(location.search),app=document.querySelector('#practice-app');
let locale=['ja','zh','en'].includes(params.get('lang'))?params.get('lang'):'ja',t=TEXT[locale];
let storage;try{storage=localStorage;const key='piko-practice-storage-check';storage.setItem(key,'1');storage.removeItem(key);}catch{storage=undefined;}
let storageOK=!!storage,session=null;
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
function home(){
  session=null;
  const prefix=course==='amc8'?'amc':'eiken';
  app.innerHTML=`<section class="hero"><p class="eyebrow">PIKO GAME · ${course==='eiken'?'ENGLISH':'MATH EXPLORER'}</p><h1>${t[course]}</h1><p>${t[`${prefix}Intro`]}</p></section><div class="course-intro"><p class="muted">${t[`${prefix}Note`]}</p>${course==='amc8'?`<p>${t.steps}</p>`:''}</div><section class="course-grid ${course==='eiken'?'two-columns':''}" aria-label="${t[course]}">${units().map(u=>`<article class="course-card"><span class="icon" aria-hidden="true">${u.icon}</span><h2>${esc(u.title)}</h2><p>${esc(u.description)}</p>${course==='amc8'?`<p class="muted">${t.familyCount}</p>`:''}<p class="pill">${t.best}: ${readBest(u.id)}/10</p><div class="card-actions"><button class="primary" data-start="${u.id}">${t.start}</button></div>${course==='amc8'?guide(u.id):''}</article>`).join('')}</section>${course==='amc8'?`<section class="archive" aria-labelledby="archive-title"><h2 id="archive-title">${t.archive}</h2><p>${t.archiveIntro}</p><ul class="archive-list">${ARCHIVE.map(paper=>`<li><a href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.year} AMC 8 — ${t.open} ↗</a><span class="muted">25 ${t.questions}</span></li>`).join('')}</ul><p><a href="${OFFICIAL_SAMPLE}" target="_blank" rel="noopener noreferrer">${t.official} ↗</a></p><p class="muted">${t.credit}</p></section>`:''}`;
}
function start(id){
  if(!units().some(u=>u.id===id))return;
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
  captureDraft();locale=event.target.value;t=TEXT[locale];params.set('lang',locale);history.replaceState(null,'',`${course}.html?${params}`);chrome();
  if(session?.complete)renderResult();else if(session)renderQuestion();else home();
});
app.addEventListener('submit',event=>{if(event.target.id==='answer-form'){event.preventDefault();captureDraft();submit(session.draft);}});
app.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-home')){home();app.scrollIntoView({block:'start'});}
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
chrome();home();
