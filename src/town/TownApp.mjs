import {TEXT} from './TownText.mjs?v=2';
import {SAVE_KEY,PRODUCTS,FURNITURE,MISSIONS,PLACES,PLACE_ARCADE,loadState,restoreState,saveState,startOrder,submitOrder,completeMission,buyFurniture,placeFurniture,englishOrder} from './TownRules.mjs?v=2';
import {TownScene,AVATAR_COLORS} from './TownScene.mjs?v=2';
import {startArcade,ARCADE_IDS} from '../arcade/ArcadeHub.mjs?v=1';
import {arcadeText} from '../arcade/ArcadeText.mjs?v=1';

const $=id=>document.getElementById(id),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;try{storage=localStorage;}catch{}
const params=new URLSearchParams(location.search);let savedLocale;try{savedLocale=storage?.getItem('world-locale');}catch{}
let locale=[params.get('locale'),savedLocale,navigator.language?.slice(0,2),'en'].find(l=>TEXT[l]);
const state=loadState(storage),w=()=>TEXT[locale],dialog=$('town-dialog');
let modal=null,arcadeBusy=false,translated=false,feedback='',feedbackGood=false,selected=null,saveOK=true,scene;
const label=p=>p[locale]||p.en;
function persist(){saveOK=saveState(storage,state);$('save-status').textContent=saveOK?w().saved:w().saveFail;$('save-status').classList.toggle('save-error',!saveOK);}
function button(action,text,cls=''){return `<button type="button" data-action="${action}" class="${cls}">${esc(text)}</button>`;}
function shell(title,content,kind=''){
  $('dialog-body').innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">${esc(w().chapter)}</p><h2 id="dialog-title">${esc(title)}</h2></div>${button('close','×','close-button')}</div><div class="dialog-content ${kind}">${content}</div>`;
  dialog.querySelector('.close-button').setAttribute('aria-label',w().close);
  if(!dialog.open){dialog.showModal();dialog.querySelector('button')?.focus();}
}
function close(){dialog.close();modal=null;feedback='';translated=false;scene?.stop();$('town-canvas').focus({preventScroll:true});window.speechSynthesis?.cancel();}
dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
function refresh(){
  $('town-guide-link').href=`/${locale}/guides/town-shop`;
  $('town-guide-link').textContent={en:'Shop worked example',zh:'商店例题与解析',ja:'お店の 例題と 解説'}[locale];
  document.documentElement.lang=locale;document.title=w().title+' · Piko Game';$('locale').value=locale;
  const texts={'town-title':'title','town-tag':'tag','world-link':'back','chapter':'chapter','mission-label':'mission','progress-label':'progress','journal-label':'journal','local-note':'local','walk-tip':'walk','coins-label':'coins','xp-label':'xp','guide-label':'guide','shop-label':'shop','home-label':'home','character':'settings','privacy-link':'privacy','terms-link':'terms'};
  for(const [id,key]of Object.entries(texts))$(id).textContent=w()[key];
  $('help').setAttribute('aria-label',w().help);
  if($('legend-title')){$('legend-title').textContent=w().legendTitle;$('legend-tip').textContent=w().legendTip;for(const id of ['fruit','breakout','race','ninja']){const el=$(`legend-${id}`);if(el)el.textContent=w()[`${id}Short`];}}
  $('world-link').href=`world.html?${new URLSearchParams({locale,...(params.get('country')?{country:params.get('country')}:{})})}`;
  $('town-canvas').setAttribute('aria-label',`${w().title}. ${w().helpKeys}`);
  $('coins').textContent=state.coins;$('xp').textContent=state.xp;
  const finished=state.mission>=10;
  $('mission-number').textContent=finished?'✦':String(state.mission+1).padStart(2,'0');
  $('mission-title').textContent=finished?w().done:w().missions[state.mission];
  $('mission-objective').textContent=finished?w().allDone:w().objectives[state.mission];
  $('go-mission').textContent=`${w().explore} → ${w()[`${finished?'home':MISSIONS[state.mission].place}Short`]}`;
  $('progress').value=state.mission;$('progress').setAttribute('aria-label',w().progress);$('progress-count').textContent=`${state.mission} / 10`;
  $('journal').innerHTML=w().missions.map((name,i)=>`<li class="${i<state.mission?'complete':i===state.mission?'current':''}"><span>${i<state.mission?'✓':String(i+1).padStart(2,'0')}</span>${esc(name)}</li>`).join('');
  updateNear(scene?.near);$('save-status').textContent=saveOK?w().local:w().saveFail;
}
function nearLabel(id){return {guide:'Piko',shop:'Mia',home:'Noah',fruit:w().fruitShort,breakout:w().breakoutShort,race:w().raceShort,ninja:w().ninjaShort}[id]||id;}
function updateNear(id){$('interact').disabled=!id;$('interact').textContent=id?`${w().talk} · ${nearLabel(id)}`:w().near;}
function intro(){modal='intro';shell(w().hello,`<div class="welcome-art" aria-hidden="true"><span>☀</span><b>⌂</b><i>✳</i></div><p class="intro-copy">${w().intro}</p><div class="intro-features"><span>🔤 English</span><span>🔢 Maths</span><span>🌱 My home</span></div>${button('begin',w().start,'primary wide')}<small class="local-detail">${w().local}</small>`,'welcome');}
function showPlace(id){
  scene?.stop();feedback='';translated=false;window.speechSynthesis?.cancel();
  if(!state.started){intro();return;}
  modal=id;
  if(id==='shop'&&state.mission>=1&&state.mission<=7){startOrder(state);persist();}
  renderModal();
}
function renderModal(){
  if(modal==='intro'){intro();return;}
  if(modal==='help'){shell(w().help,`<div class="npc-talk"><span>🧭</span><p>${w().helpText}</p></div><p>${w().helpKeys}</p>${button('close',w().close,'primary')}`);return;}
  if(modal==='settings'){
    shell(w().settings,`<p>${w().chooseAvatar}</p><div class="outfits">${AVATAR_COLORS.map((color,i)=>`<button type="button" data-avatar="${i}" style="--outfit:${color}" aria-pressed="${state.avatar===i}"><span class="mini-person" aria-hidden="true"></span>${w().avatars[i]}</button>`).join('')}</div><div class="level-settings">${['math','english'].map(k=>`<label>${w()[k]}<select id="${k}-level">${w()[`${k}Levels`].map((name,i)=>`<option value="${i+1}" ${state[k]===i+1?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}</div><p class="muted">${w().difficultyNote}</p>${button('close',w().close,'primary')}`);
    for(const k of ['math','english'])$(`${k}-level`).onchange=e=>{state[k]=Number(e.target.value);persist();};return;
  }
  if(modal==='guide'){
    if(state.mission===0)shell('Piko',`<div class="npc-talk"><span>🧑‍🌾</span><p>${w().guideWelcome}</p></div>${button('accept',w().accept,'primary wide')}`);
    else if(state.mission===9)shell(w().finished,`<div class="celebration-art" aria-hidden="true">🎊 🏡 🎊</div><p>${w().finishedText}</p>${button('celebrate',w().celebrate,'primary wide')}`);
    else if(state.mission===10)certificate();
    else shell('Piko',`<div class="npc-talk"><span>🧑‍🌾</span><p>${w().guideWait}</p></div>${button('close',w().close,'primary')}`);
    return;
  }
  if(modal==='shop'){
    if(!state.active){shell('Mia · '+w().shopShort,`<div class="npc-talk"><span>👩‍🍳</span><p>${state.mission===0?w().waitShop:state.mission===10?w().completedShop:w().allShop}</p></div>${button('close',w().close,'primary')}`);return;}
    renderOrder();return;
  }
  if(PLACE_ARCADE[modal]){renderArcade(modal);return;}
  if(modal==='home'){renderHome();return;}
  if(modal==='reward'){
    shell(w().reward,`<div class="reward-star" aria-hidden="true">✦</div><p>${w().rewardText}</p><div class="rewards"><b>${w().rewardCoins}</b><b>${w().rewardXP}</b></div>${state.mission===8?`<p class="gift">🪴 ${w().plantGift}</p>`:''}<p>${esc(w().missions[state.mission]||w().done)}</p>${button('reward-next',w().next,'primary wide')}`,'reward');return;
  }
  if(modal==='certificate')certificate();
}
function renderArcade(id){
  const game=PLACE_ARCADE[id], t=arcadeText(locale), g=t.games[game];
  const icon={fruit:'🍉',breakout:'🧱',race:'🏎️',ninja:'🥷'}[id];
  shell(w()[id]||g.title,`<div class="npc-talk"><span>${icon}</span><p>${w()[id+'Welcome']}</p></div><p class="muted">${esc(g.blurb)} · ${esc(t.hardHint||t.hardHint)}</p><div class="arcade-actions">${button('play-arcade:'+game,w().playArcade,'primary wide')}${button('close',w().close)}</div>`,'arcade-venue');
}
function certificate(){shell(w().finished,`<div class="certificate"><span aria-hidden="true">🏅</span><p>PIKO TOWN · CHAPTER 01</p><h3>${w().badge}</h3><p>${w().finishedText}</p><div class="rewards"><b>${state.stats.correct} ${w().correctCount}</b><b>${state.stats.hints} ${w().hintCount}</b></div><small>${w().hintUsed}</small></div>${button('close',w().close,'primary wide')}`);}
function itemSummary(a){return a.items.flatMap((n,i)=>n?[`${PRODUCTS[i].icon} ${label(PRODUCTS[i])} × ${n}`]:[]).join(' · ');}
function hintText(a){
  if(a.phase==='basket')return w().hintBasket;
  if(a.phase==='total')return w().hintTotal+a.items.flatMap((n,i)=>n?[`${n} × ${a.prices[i]}`]:[]).join(' + ');
  return `${w().hintChange} ${a.paid} − ${a.total} = ?`;
}
function renderOrder(){
  const a=state.active,phase=a.phase;
  const receipt=a.items.flatMap((n,i)=>n?[`<div><span>${PRODUCTS[i].icon} ${esc(label(PRODUCTS[i]))} × ${n}</span><b>${n} × ${a.prices[i]} ✦</b></div>`]:[]).join('');
  const question=phase==='basket'?w().shelf:phase==='total'?w().total:w().change;
  shell(w().missions[state.mission],`<div class="order-header"><span class="customer-face" aria-hidden="true">${['👧','🧒','👩','👨'][state.mission%4]}</span><div><small>${w().order}</small><p lang="en" id="english-order">${esc(englishOrder(a))}</p></div></div><div class="order-tools">${button('listen','▶ '+w().listen)}${button('translate',w().translate)}</div><p id="translation" class="translation" ${translated?'':'hidden'}>${w().translation}${esc(itemSummary(a))}</p><div class="phase-track">${['basket','total','change'].map((p,i)=>`<span class="${p===phase?'active':''}">${i+1} ${['🛍','✦','↩'][i]}</span>`).join('')}</div><h3 class="question">${question}</h3>${phase==='basket'?`<div class="shelf">${PRODUCTS.map((p,i)=>`<button type="button" data-product="${i}" ${a.bag[i]>=9?'disabled':''} aria-label="${esc(p.en)} +1"><span>${p.icon}</span><b lang="en">${esc(p.en)}</b><small>${a.prices[i]} ✦</small></button>`).join('')}</div><div class="shopping-bag"><h4>🛍 ${w().bag}</h4><div id="bag-items">${a.bag.some(Boolean)?a.bag.flatMap((n,i)=>n?[`<button type="button" data-remove="${i}" aria-label="${esc(w().remove+' '+label(PRODUCTS[i]))}">${PRODUCTS[i].icon} × ${n} <span>−</span></button>`]:[]).join(''):`<p>${w().empty}</p>`}</div></div>`:`<div class="checkout"><div class="receipt">${receipt}${phase==='change'?`<div class="receipt-total"><span>${w().bill}</span><b>${a.total} ✦</b></div><div class="receipt-paid"><span>${w().paid}</span><b>${a.paid} ✦</b></div>`:''}</div><div class="cash-panel"><label for="coin-answer">${w().answer}</label><div class="answer-input"><input id="coin-answer" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" value="${esc(a.input)}"><span>✦</span></div><p>${w().coinTray}</p><div class="coin-buttons">${[1,2,5,10].map(n=>button(`coin:${n}`,`+${n}`)).join('')}${button('clear',w().clear)}</div></div></div>`}<div id="order-feedback" role="status" class="order-feedback ${feedbackGood?'good':''}">${esc(feedback)}</div>${a.hinted?`<p class="hint-box">💡 ${esc(hintText(a))}</p>`:''}<div class="order-actions">${button('hint','💡 '+w().hint)}${button('submit',w()[phase==='basket'?'checkBasket':phase==='total'?'checkTotal':'checkChange'],'primary')}</div>`,'order-dialog');
  $('coin-answer')?.addEventListener('input',e=>{a.input=e.target.value.replace(/[^0-9]/g,'').slice(0,4);e.target.value=a.input;persist();});
  $('coin-answer')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});
}
function renderHome(){
  if(selected&&!state.owned.includes(selected))selected=null;
  shell(w().homeShort,`<div class="npc-talk compact"><span>🧑‍🎨</span><p>${state.mission>=8?w().homeReady:w().homeWelcome}</p></div><div class="home-layout"><div><div class="room-wall"><div class="room-window" aria-hidden="true">☀</div><span>HOME SWEET HOME</span></div><div class="room-floor">${state.room.map((id,i)=>{const f=FURNITURE.find(f=>f.id===id);return `<button type="button" data-slot="${i}" aria-label="${w().slot} ${i+1}: ${f?esc(label(f)):w().emptySlot}" class="${f?'furnished':''}">${f?`<span>${f.icon}</span>`:'<span>＋</span>'}</button>`;}).join('')}</div><p class="room-instruction">${selected?`${w().selected}: ${label(FURNITURE.find(f=>f.id===selected))}`:w().place}</p><p class="muted">${w().roomHint}</p></div><div class="furniture-catalog"><h3>${w().furniture} <small>✦ ${state.coins}</small></h3>${FURNITURE.map(f=>{const owned=state.owned.includes(f.id);return `<button type="button" data-furniture="${f.id}" class="furniture ${selected===f.id?'selected':''}" ${!owned&&(f.id==='plant'||state.coins<f.price)?'disabled':''} aria-pressed="${selected===f.id}"><span>${f.icon}</span><div><b>${esc(label(f))}</b><small>${owned?w().owned:f.id==='plant'?w().lockedPlant:`${w().buy} · ${f.price} ✦`}</small></div>${owned?'<i>✓</i>':''}</button>`;}).join('')}</div></div><p class="order-feedback good" role="status">${esc(feedback)}</p>${button('close',w().close,'primary')}`,'home-dialog');
}
function submit(){
  const phase=state.active?.phase;if(!phase)return;
  const result=submitOrder(state);feedbackGood=result.ok;
  feedback=result.ok?w().correct:w()[phase==='basket'?'wrongBasket':phase==='total'?'wrongTotal':'wrongChange'];
  persist();refresh();if(result.done){modal='reward';translated=false;}renderModal();
  if(result.done)dialog.querySelector('[data-action="reward-next"]')?.focus();else if(!result.ok)$('order-feedback')?.scrollIntoView({block:'nearest'});
}
function listen(){
  if(!state.active)return;
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){feedback=w().audioUnavailable;renderModal();return;}
  try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(englishOrder(state.active));u.lang='en-US';u.rate=state.active.english===1?.78:.9;u.onerror=e=>{if(!['canceled','interrupted'].includes(e.error)&&modal==='shop'){feedback=w().audioUnavailable;renderModal();}};window.speechSynthesis.speak(u);}catch{feedback=w().audioUnavailable;renderModal();}
}
dialog.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;
  const a=el.dataset.action;
  if(a==='close'){close();return;}
  if(a?.startsWith('play-arcade:')){
    const id=a.slice('play-arcade:'.length);if(!ARCADE_IDS.includes(id))return;
    close();arcadeBusy=true;
    startArcade(id,{locale,onExit:()=>{arcadeBusy=false;$('town-canvas').focus({preventScroll:true});}});
    return;
  }
  if(a==='begin'){state.started=true;persist();close();return;}
  if(a==='accept'&&state.mission===0){completeMission(state,0);persist();refresh();modal='reward';renderModal();return;}
  if(a==='celebrate'&&state.mission===9){completeMission(state,9);persist();refresh();modal='certificate';renderModal();return;}
  if(a==='reward-next'){close();if(state.mission>=1&&state.mission<=7)scene.travel('shop');return;}
  if(a==='listen'){listen();return;}
  if(a==='translate'&&state.active){translated=!translated;renderModal();return;}
  if(a==='hint'&&state.active){if(!state.active.hinted){state.stats.hints++;state.active.hinted=true;persist();}renderModal();return;}
  if(a==='submit'){submit();return;}
  if(a==='clear'&&state.active){state.active.input='';persist();renderModal();return;}
  if(a?.startsWith('coin:')&&state.active){state.active.input=String(Math.min(9999,Number(state.active.input||0)+Number(a.split(':')[1])));persist();renderModal();return;}
  if(el.dataset.product!==undefined&&state.active?.phase==='basket'){const i=Number(el.dataset.product);state.active.bag[i]=Math.min(9,state.active.bag[i]+1);feedback='';persist();renderModal();dialog.querySelector(`[data-product="${i}"]`)?.focus();return;}
  if(el.dataset.remove!==undefined&&state.active?.phase==='basket'){const i=Number(el.dataset.remove);state.active.bag[i]=Math.max(0,state.active.bag[i]-1);feedback='';persist();renderModal();return;}
  if(el.dataset.avatar!==undefined){state.avatar=Number(el.dataset.avatar);persist();renderModal();dialog.querySelector(`[data-avatar="${state.avatar}"]`)?.focus();return;}
  if(el.dataset.furniture){const id=el.dataset.furniture;if(state.owned.includes(id)||buyFurniture(state,id)){selected=id;persist();refresh();renderModal();}return;}
  if(el.dataset.slot!==undefined){const i=Number(el.dataset.slot);if(selected){const previous=state.mission;placeFurniture(state,selected,i);feedback=previous===8&&state.mission===9?`${w().reward} ${w().rewardCoins} · ${w().missions[9]}`:'';selected=null;}else if(state.room[i]){selected=state.room[i];state.room[i]=null;}persist();refresh();renderModal();}
});
$('locale').onchange=e=>{locale=e.target.value;try{storage?.setItem('world-locale',locale);}catch{}const q=new URLSearchParams(location.search);q.set('locale',locale);history.replaceState(null,'',`${location.pathname}?${q}`);refresh();if(modal)renderModal();};
$('help').onclick=()=>{modal='help';scene.stop();renderModal();};
$('character').onclick=()=>{modal='settings';scene.stop();renderModal();};
$('go-mission').onclick=()=>{if(!state.started){intro();return;}scene.travel(state.mission>=10?'home':MISSIONS[state.mission].place);};
$('interact').onclick=()=>{if(scene.near)showPlace(scene.near);};
document.querySelectorAll('[data-travel]').forEach(el=>el.onclick=()=>{if(!state.started){intro();return;}scene.travel(el.dataset.travel);});
document.querySelectorAll('[data-direction]').forEach(el=>{
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(dialog.open||!state.started)return;el.setPointerCapture(e.pointerId);scene.direction(el.dataset.direction,true);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,()=>scene.direction(el.dataset.direction,false));
  el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();scene.direction(el.dataset.direction,true);}});
  el.addEventListener('keyup',()=>scene.direction(el.dataset.direction,false));
  el.addEventListener('blur',()=>scene.direction(el.dataset.direction,false));
});
scene=new TownScene($('town-canvas'),{state,words:w,onArrive:showPlace,onMove:()=>{if(state.started)persist();},onNear:updateNear,isPaused:()=>dialog.open||!state.started||arcadeBusy});
window.addEventListener('pagehide',()=>{if(state.started)persist();});
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&e.newValue){try{Object.assign(state,restoreState(JSON.parse(e.newValue)));scene.stop();if(dialog.open)close();refresh();}catch{}}});
refresh();
// 言語設定後に既存の同意UIを初期化する。新規訪問でも町と同じ言語で表示する。
await import('../privacy/ConsentManager.mjs?v=1');
if(!state.started)intro();
