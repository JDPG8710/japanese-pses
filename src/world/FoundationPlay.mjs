import {validateFoundation,TOPICS,CONTENT_VERSION} from './FoundationCatalog.mjs';
import {makeFoundationRounds,publicQuestion,markFoundation} from './FoundationRules.mjs';
import {FOUNDATION_TEXT} from './FoundationText.mjs';
import {yearLabel} from './GradePaths.mjs';
import {languageForCountry,readCountry,normalizeCountry} from '../location/Country.mjs';
import {AuthManager} from '../auth/AuthManager.js?v=4';
import {gateUrl,journeyProgressKey,journeyState,lessonGateId,nextGate,readJourneyScores} from './GradeJourney.mjs';
import {createInteractionFeedback} from './InteractionFeedback.mjs';
import {isEarlyPrimaryChinese,rubyPinyin} from './PinyinRuby.mjs';
const params=new URLSearchParams(location.search);let storage;try{storage=localStorage;}catch{}
const country=normalizeCountry(params.get('country'))||readCountry(storage),locale=['en','zh','ja'].includes(params.get('locale'))?params.get('locale'):languageForCountry(country);
const input={profile:params.get('curriculum'),year:params.get('year'),lesson:params.get('lesson'),stage:params.get('stage')||'1',locale},candidate=validateFoundation(input),candidateScores=candidate?readJourneyScores(storage,candidate.profile,candidate.year,locale):{},candidateGate=candidate?journeyState(candidate.profile,candidate.year,candidateScores).find(gate=>gate.id===lessonGateId(candidate.lesson,candidate.stage)):null,route=candidateGate?.unlocked?candidate:null,w=FOUNDATION_TEXT[locale],app=document.querySelector('#foundation-app');
document.documentElement.lang=locale;document.title=`${w.title} · Piko Play`;
const backQ=new URLSearchParams({country:country||'',curriculum:route?.profile||'',year:route?.year||'',locale});
const back=document.querySelector('#grade-back');back.href=`grades.html?${backQ}`;back.textContent=w.back;
const auth=new AuthManager({apiBase:'/api',turnstileSiteKey:document.querySelector('meta[name="turnstile-site-key"]').content});
const interaction=createInteractionFeedback(),soundToggle=document.querySelector('#sound-toggle'),withPinyin=isEarlyPrimaryChinese(route?.profile,route?.year);
let member=false,busy=false,run=null,feedback='',verdict=null,timer,epoch=0,view='intro',boardEntries=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,text)=>`<button type="button" class="pill primary" data-action="${action}" ${busy?'disabled':''}>${esc(text)}</button>`;
const progressKey=route?`piko-foundation:${CONTENT_VERSION}:${route.profile}:${route.year}:${route.lesson}:${locale}${route.stage>1?`:s${route.stage}`:''}`:'';
const journeyKey=route?journeyProgressKey(route.profile,route.year,lessonGateId(route.lesson,route.stage)):'';
document.querySelector('#login').textContent=w.login;
document.querySelector('#login').onclick=()=>{if(!member&&!auth.localMode)void auth.showLogin({message:w.anonymous});};
function syncSoundToggle(){const muted=interaction.isMuted();soundToggle.setAttribute('aria-pressed',String(muted));soundToggle.textContent=`${muted?'🔇':'🔊'} ${muted?w.soundOff:w.soundOn}`;}
soundToggle.onclick=()=>{interaction.toggle();syncSoundToggle();};syncSoundToggle();
void auth.getSession().then(session=>{member=!!session?.authenticated;document.querySelector('#login').textContent=member?w.logged:w.login;});
function rich(value){return rubyPinyin(value,withPinyin);}
function context(){return `<p class="eyebrow">${rich(w.title)} · ${rich(yearLabel(route.year,locale))} · ${rich(w.stage)} ${route.stage}</p><h1>${rich(TOPICS[route.lesson].title[locale])}</h1>${['language','english'].includes(route.subject)?`<p class="quest-note">${rich(w.learning)}: ${route.learningLanguage==='zh'?'中文':'English'}${route.subject==='english'?` · ${esc(TOPICS[route.lesson].cefr)}`:''}</p>`:''}`;}
function render(){
 if(!route){app.innerHTML=`<p role="alert">${w.invalid}</p>`;return;}
 if(view==='intro'){
  let best=0;try{best=Number(storage.getItem(progressKey)||0);}catch{}
  app.innerHTML=`<section class="board quest-intro">${context()}<p>${w.intro}</p><p>${w.rules}</p><p>${w.anonymous}</p>${best?`<p>${w.progress}: ${best}/1000</p>`:''}<div class="quest-controls">${button('start',w.start)}${button('board',w.board)}</div><p role="status">${esc(feedback)}</p><p class="quest-note">${w.review}</p></section>`;
 }else if(view==='board'){
  app.innerHTML=`<section class="board">${context()}<h2>${w.board}</h2><p class="quest-note">${w.privacy}</p>${boardEntries?boardEntries.length?`<div class="quest-board-wrap"><table class="quest-board"><thead><tr><th>#</th><th>Piko</th><th>${w.score}</th></tr></thead><tbody>${boardEntries.map(r=>`<tr><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.score}</td></tr>`).join('')}</tbody></table></div>`:`<p>${w.empty}</p>`:`<p role="status">${esc(feedback||w.loading)}</p>`}<div class="quest-controls">${button('board',w.board)}${button('intro',w.back)}${button('start',w.start)}</div></section>`;
 }else if(view==='result'){
  const passed=run.score>=800&&!run.timedOut,scores=readJourneyScores(storage,route.profile,route.year,locale),next=passed?nextGate(route.profile,route.year,lessonGateId(route.lesson,route.stage),scores):null,nextUrl=next?gateUrl(next,{profile:route.profile,year:route.year,country,locale}):null;
  app.innerHTML=`<section class="board">${context()}<h2>${run.timedOut?w.timeout:passed?w.pass:w.fail}</h2><p class="target">${w.score}: ${run.score}/1000</p><p>${run.ranked?(run.timedOut?w.member:w.saved):(run.localSaved?w.local:({en:'This device could not save the practice result.',zh:'本设备无法保存本次练习结果。',ja:'この ききに ほぞんできなかったよ。'}[locale]))}</p><div class="quest-controls">${button('start',w.again)}${button('board',w.board)}${nextUrl?`<a class="pill primary" href="${esc(nextUrl)}">${w.nextLesson}</a>`:''}<a class="pill" href="${esc(back.href)}">${w.back}</a></div></section>`;
 }else if(view==='play'){
  const q=run.question;
   app.innerHTML=`<section class="board quest-board-scene scene-${route.subject} ${withPinyin?'with-pinyin':''}">${context()}<div class="hud"><span>${run.index+1}/10</span><span>${rich(w.score)}: ${run.score}</span><span>${rich(w.time)}: <span id="quest-clock"></span></span></div><div class="quest-progress"><span style="width:${run.index*10}%"></span></div><p class="quest-note">${rich(run.ranked?w.member:w.guest)}</p><div class="quest-stage" lang="${q.lang||locale}"><div class="quest-guide" aria-hidden="true"><span>✦</span><b>Piko</b></div><div class="quest-task"><p class="quest-prompt">${rich(q.prompt)}</p>${q.visual?.type==='dots'?`<div class="quest-dots" aria-label="${esc(w.answer)}">${'<span aria-hidden="true"></span>'.repeat(q.visual.count)}</div>`:q.visual?.type==='fraction'?`<div class="quest-parts" aria-hidden="true">${Array.from({length:q.visual.parts},(_,i)=>`<span class="${i<q.visual.shaded?'filled':''}"></span>`).join('')}</div>`:''}${q.kind==='choice'?`<div class="quest-choices">${q.choices.map((c,i)=>`<button class="quest-choice" data-choice="${i}" aria-pressed="false" ${busy||verdict?.done?'disabled':''}><span aria-hidden="true">${String.fromCharCode(65+i)}</span>${rich(c)}</button>`).join('')}</div>`:`<label for="quest-answer">${rich(w.answer)}</label><input id="quest-answer" class="quest-input" type="text" inputmode="text" maxlength="40" autocomplete="off" ${busy||verdict?.done?'disabled':''}><div class="quest-keypad" aria-label="${esc(w.answer)}">${['1','2','3','4','5','6','7','8','9','−','0','.','/','⌫'].map(key=>`<button type="button" data-key="${key}" ${busy||verdict?.done?'disabled':''}>${key}</button>`).join('')}</div><p class="quest-note">${rich(w.format)}</p>`}</div></div><p class="quest-feedback" role="status">${rich(feedback)}</p>${verdict?.hint?`<aside class="quest-explain" lang="${q.lang||locale}">${rich(w.hint)}: ${rich(verdict.hint)}</aside>`:''}${verdict?.done?`<aside class="quest-explain" lang="${q.lang||locale}">${rich(w.explain)}: ${rich(verdict.explanation)}</aside>`:''}<div class="quest-controls">${verdict?.done?button('next',run.pending.complete?w.finish:w.next):button('check',w.check)}</div></section>`;
  tick();
 }
}
async function api(path,body){const response=await fetch(`/api/foundation/${path}`,{method:body?'POST':'GET',credentials:'include',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok){const e=new Error(data.error);e.status=response.status;throw e;}return data;}
function stop(){epoch++;clearInterval(timer);busy=false;}
function finish(timedOut=false){stop();run.timedOut=timedOut;view='result';run.localSaved=false;try{storage.setItem(`${progressKey}:last`,JSON.stringify({score:run.score,passed:!timedOut&&run.score>=800,timedOut,finishedAt:Date.now()}));if(!timedOut&&run.score>=800){storage.setItem(progressKey,String(Math.max(Number(storage.getItem(progressKey)||0),run.score)));storage.setItem(journeyKey,String(Math.max(Number(storage.getItem(journeyKey)||0),run.score)));}run.localSaved=true;}catch{}render();if(!timedOut&&run.score>=800)interaction.victory();else if(timedOut)interaction.error();}
function tick(){if(view!=='play'||!run)return;const left=Math.max(0,Math.ceil((run.expiresAt-Date.now())/1000));const clock=document.querySelector('#quest-clock');if(clock)clock.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(left===0){if(run.pending?.complete){run.index=10;finish();}else finish(true);}}
async function start(){stop();const token=epoch;busy=true;view='intro';feedback=w.loading;render();try{
 const session=await auth.getSession();if(token!==epoch)return;if(member&&!session?.authenticated)throw new Error('SESSION_LOST');member=!!session?.authenticated;
 const state=member?{...await api('start',route),ranked:true}:(()=>{const rounds=makeFoundationRounds(route,crypto.getRandomValues(new Uint32Array(1))[0]);return {rounds,question:publicQuestion(rounds[0]),index:0,score:0,tries:0,ranked:false,expiresAt:Date.now()+180000};})();
 if(token!==epoch)return;run=state;view='play';busy=false;feedback='';verdict=null;render();timer=setInterval(tick,250);
 }catch{if(token!==epoch)return;busy=false;feedback=w.error;render();}}
async function check(){
 if(busy||!run||verdict?.done)return;const q=run.question,selected=app.querySelector('[data-choice][aria-pressed="true"]');const answer=q.kind==='choice'?(selected?q.choices[Number(selected.dataset.choice)]:null):app.querySelector('#quest-answer').value.trim();
 if(!answer){app.querySelector('.quest-feedback').textContent=w.select;return;}const token=epoch;busy=true;app.querySelectorAll('button,input').forEach(el=>el.disabled=true);
 try{let result;if(run.ranked)result=await api('answer',{id:run.id,revision:run.revision,answer});else{const value=markFoundation(run.rounds[run.index],answer,run.tries);const index=run.index+(value.done?1:0);result={...value,index,score:run.score+value.points,complete:index===10,question:publicQuestion(run.rounds[index],value.tries)};}
 if(token!==epoch||view!=='play')return;run.score=result.score;run.revision=result.revision;run.tries=result.tries;verdict=result;feedback=result.correct?w.correct:result.done?w.explain:w.wrong;
 if(result.done)run.pending=result;else run.question=result.question;busy=false;render();if(result.correct)interaction.correct();else interaction.error();
 }catch(e){if(token!==epoch)return;if(e.status===410){finish(true);return;}stop();view='intro';feedback=w.error;render();}
}
async function board(){stop();view='board';boardEntries=null;feedback='';render();const token=epoch;try{const data=await api(`leaderboard?${new URLSearchParams(route)}`);if(token!==epoch)return;boardEntries=data.entries;render();}catch{if(token!==epoch)return;feedback=w.boardError;render();}}
app.addEventListener('click',e=>{const target=e.target.closest('button,[data-action]');if(target&&!target.disabled)interaction.tap();const choice=e.target.closest('[data-choice]');if(choice&&!busy&&!verdict?.done){app.querySelectorAll('[data-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el===choice)));return;}const key=e.target.closest('[data-key]')?.dataset.key,input=app.querySelector('#quest-answer');if(key&&input&&!busy&&!verdict?.done){if(key==='⌫')input.value=input.value.slice(0,-1);else if(key==='−')input.value=input.value.startsWith('-')?input.value.slice(1):`-${input.value}`;else if(input.value.length<40)input.value+=key;input.focus({preventScroll:true});return;}const action=e.target.closest('[data-action]')?.dataset.action;if(!route||busy)return;if(action==='start')void start();if(action==='check')void check();if(action==='board')void board();if(action==='intro'){stop();view='intro';feedback='';render();}if(action==='next'&&run?.pending){if(run.pending.complete){run.index=10;finish();}else{run.index=run.pending.index;run.question=run.pending.question;run.pending=null;verdict=null;feedback='';render();}}});
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='quest-answer'){e.preventDefault();void check();}});
window.addEventListener('pagehide',stop);render();
