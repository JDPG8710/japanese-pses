import {scheduleAutoAdvance,autoAdvanceText} from './AutoAdvance.mjs';
import {rankedAttempt,rankingMarkup} from '../arcade/ArcadeRanking.mjs';
import {townDifficulty,progressionLabel,townPointsLabel} from './TownProgression.mjs';
import {setupTownControls} from './TownControls.mjs';
import {createGameFeedback} from './GameFeedback.mjs?v=1';
import {MODES,AVATARS,ITEMS,startRun,questionFor,answerRun,nextStage,retryStage,buyItem,useHint} from './ArcadeRules.mjs?v=2';
import {ARCADE_TEXT} from './ArcadeText.mjs?v=6';
import {previewAvatar} from './Models3D.mjs?v=2';
import {CASUAL_ARCADE_IDS} from './TownBuildings.mjs?v=7';
import {startArcade,ARCADE_IDS} from '../arcade/ArcadeHub.mjs?v=4';
import {getTownAudio} from './TownAudio.mjs?v=1';
function exitGameFullscreen(){if(document.documentElement.classList.contains('town-immersive'))return;if(!document.fullscreenElement&&!document.webkitFullscreenElement)return;try{(document.exitFullscreen||document.webkitExitFullscreen)?.call(document)?.catch?.(()=>{});}catch{}}
import {arcadeText} from '../arcade/ArcadeText.mjs?v=3';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createExpansion({state,scene,persist,refresh,shell,close,getLocale,onActivity}){
 const w=()=>ARCADE_TEXT[getLocale()],name=o=>o[getLocale()]||o.en;let courseRanked=null,previewDispose=null,active=null,watchStart=null,watchIndex=-1;
 const $=id=>document.getElementById(id);let entryBuilding=null,arcadeBusy=false,activeCasual=null;
 const viewport=document.querySelector('.scene-viewport');
 const gameFeedback=createGameFeedback(viewport);
 let cancelAdvance=()=>{};
 function advanceCourse(){cancelAdvance();const mode=active,stage=state.expansion.runs[mode]?.stage;cancelAdvance=scheduleAutoAdvance(()=>{if(active===mode&&state.expansion.runs[mode]?.stage===stage&&nextStage(state,mode)){persist();loadStage();}},{isPaused:()=>document.hidden||scene.isPaused()});}
 const overlay=document.querySelector('.world-controls');
 viewport.append(overlay);
 const help=document.createElement('button');help.type='button';help.className='town-help-control';help.textContent='?';help.onclick=()=>$('help').click();overlay.append(help);
 const courseControls=document.createElement('div');courseControls.className='course-controls';courseControls.hidden=true;viewport.append(courseControls);
 const feedbackLayout=new ResizeObserver(()=>viewport.style.setProperty('--game-feedback-top',(courseControls.offsetTop+courseControls.offsetHeight+12)+'px'));feedbackLayout.observe(courseControls);
 const panel=document.createElement('aside');panel.className='arcade-panel';panel.hidden=true;document.querySelector('.town-layout').append(panel);
 const worldTask=document.createElement('div');worldTask.className='world-task';worldTask.hidden=true;document.querySelector('.scene-viewport').before(worldTask);
 const controls=document.createElement('div');controls.className='camera-controls';controls.innerHTML='<button type="button" data-camera="left">↶</button><button type="button" data-camera="right">↷</button><button type="button" data-camera="reset">⌖</button><button type="button" data-camera="view" class="view-toggle"></button><button type="button" data-camera="jump" class="jump-button">↑</button>';document.querySelector('.world-controls').append(controls);
 controls.onclick=e=>{const k=e.target.closest('[data-camera]')?.dataset.camera;if(k==='jump'){if(e.detail===0)scene.jump();$('town-canvas').focus({preventScroll:true});}if(k==='left')scene.orbit(-.35);if(k==='right')scene.orbit(.35);if(k==='reset')scene.resetCamera();if(k==='view')scene.toggleView();if(k)$('town-canvas').focus({preventScroll:true});};
 controls.querySelector('[data-camera="jump"]').addEventListener('pointerdown',e=>{e.preventDefault();scene.jump();});
 const touchControls=setupTownControls({scene,overlay,getLocale,onChange:persist});scene.onVehicleChange=()=>touchControls.refresh();
 function disposePreview(){previewDispose?.();previewDispose=null;}
 function renderCards(){
  touchControls.refresh();help.setAttribute('aria-label',$('help').getAttribute('aria-label')||'Help');

  const view=controls.querySelector('[data-camera="view"]');view.textContent=scene.viewMode==='first'?'1P':'3P';view.title=scene.viewMode==='first'?w().switchThird:w().switchFirst;view.setAttribute('aria-pressed',String(scene.viewMode==='first'));view.setAttribute('aria-label',scene.viewMode==='first'?w().switchThird:w().switchFirst);for(const [key,label]of [['left','rotateLeft'],['right','rotateRight'],['reset','camera'],['jump','jump']]){const b=controls.querySelector(`[data-camera="${key}"]`);b?.setAttribute('aria-label',w()[label]);if(key==='jump')b.textContent='↑';}
 }
 function hud(){if(!active)return;const r=state.expansion.runs[active],q=questionFor(r),watching=watchStart!==null;
  panel.innerHTML=`<div class="arcade-top"><span class="eyebrow">${w().modes[active][2]}</span><button type="button" data-exit-game aria-label="${w().back}">×</button></div><h2>${w().modes[active][0]}</h2><div class="arcade-stats"><b>${esc(progressionLabel(r.difficulty||townDifficulty(state),getLocale()))}</b><span aria-label="${w().hearts}: ${r.hearts}">${'♥'.repeat(r.hearts)}${'♡'.repeat(3-r.hearts)}</span><small>${w().streak} ${r.streak}</small></div><p class="arcade-question" id="arcade-question" ${active==='runner'||active==='garden'?'lang="en"':''}>${active==='memory'?(watching?w().watch:w().repeat):esc(q.question)}</p>${active==='memory'?`<div id="memory-cue" class="memory-cue" aria-live="polite">${watching?'…':`${w().memoryStep} ${r.memoryIndex} / ${q.sequence.length}`}</div>`:''}${r.hinted?`<p class="hint-box">${esc(q.explanation)}</p>`:''}${r.solved?`<p class="auto-next" role="status">${autoAdvanceText(getLocale())}</p>`:r.hearts===0?`<button type="button" data-retry-stage class="primary wide">${w().retry}</button>`:`<div class="answer-platforms">${q.options.map((o,i)=>`<div class="answer-label" data-answer-label="${i}"><span>${i+1}</span>${esc(o)}</div>`).join('')}</div><small class="muted">${w().guideNote}</small><div class="arcade-tools">${active==='memory'?`<button type="button" data-memory-replay ${watching?'disabled':''}>↻ ${w().replay}</button>`:''}<button type="button" data-arcade-hint ${r.hinted||!state.expansion.inventory.hint||watching?'disabled':''}>💡 ${w().hint} (${state.expansion.inventory.hint})</button></div>`}<p class="arcade-help">${w().modes[active][1]}</p><button type="button" data-exit-game class="wide">⌂ ${w().back}</button><small class="muted">${w().savedRun}</small>`;
  worldTask.hidden=false;worldTask.textContent=`${progressionLabel(r.difficulty||townDifficulty(state),getLocale())} · ${active==='memory'?(watching?w().watch:w().repeat):q.question}`;$('chapter').textContent=w().modes[active][0];
  scene.arcadeLocked=r.solved||r.hearts<=0||watching;panel.dataset.stage=String(r.stage);panel.dataset.solved=String(r.solved);syncCourseControls();
 }
 function syncCourseControls(){
  courseControls.hidden=!active;if(!active){courseControls.replaceChildren();return;}
  const buttons=[...panel.querySelectorAll('button')];
  buttons.filter(b=>b.hasAttribute('data-exit-game')).slice(1).forEach(b=>b.remove());
  courseControls.replaceChildren(...panel.querySelectorAll('button'));
  const back=courseControls.querySelector('[data-exit-game]');if(back){back.textContent='↩';back.title=w().back;}
 }
 function watch(){gameFeedback.clear();scene.clearCelebration();watchStart=scene.clock;watchIndex=-1;scene.arcadeLocked=true;scene.respawn();hud();}
 function loadStage(){cancelAdvance();courseRanked=rankedAttempt(active,state.expansion.runs[active].difficulty?.level||1);gameFeedback.clear();const r=state.expansion.runs[active],q=questionFor(r);watchStart=null;scene.enterGame(active,q,(r.difficulty?.level||r.stage)+(r.difficulty?.infiniteRound||0),choose,fall,r);if(active==='memory'&&!r.solved&&r.hearts>0)watch();else hud();if(r.solved){gameFeedback.show({kind:'success',title:w().correct,detail:q.explanation,animate:false});advanceCourse();}else if(r.hearts<=0)gameFeedback.show({kind:'retry',title:w().over,animate:false});}
 function enter(mode,{seed,shared=false}={}){disposePreview();if($('town-dialog').open)close();state.started=true;startRun(state,mode,seed,{shared});active=mode;onActivity?.(mode);persist();refresh();try{getTownAudio().enterCourse();}catch{}document.body.classList.add('playing-island');document.querySelector('.quest-panel').hidden=true;panel.hidden=false;loadStage();$('town-canvas').scrollIntoView({block:'center',behavior:'instant'});$('town-canvas').focus({preventScroll:true});}
 function leave(){cancelAdvance();if(!active)return;gameFeedback.clear();courseControls.hidden=true;courseControls.replaceChildren();watchStart=null;active=null;onActivity?.(null);worldTask.hidden=true;scene.arcadeLocked=false;scene.exitGame();exitGameFullscreen();if(entryBuilding)scene.returnFromBuilding(entryBuilding);panel.hidden=true;document.querySelector('.quest-panel').hidden=false;document.body.classList.remove('playing-island');try{getTownAudio().exitToTown();}catch{}persist();refresh();renderCards();$('town-canvas').focus({preventScroll:true});}
 function choose(index){
  if(!active||watchStart!==null)return;
  const result=answerRun(state,active,index);if(result.ignored)return;
  persist();refresh();
  if(result.partial){
   scene.celebrate(index,{partial:true});scene.respawn();
   const r=state.expansion.runs[active],q=questionFor(r);
   gameFeedback.show({kind:'partial',title:w().memoryStep,detail:r.memoryIndex+' / '+q.sequence.length});
   try{getTownAudio().correct();}catch{}
  }else if(result.ok){
   const r=state.expansion.runs[active];void courseRanked?.finish(r.stage).catch(()=>{});
   scene.stop();scene.celebrate(index);
   gameFeedback.show({kind:'success',title:w().correct,detail:'+'+townPointsLabel(result.points,getLocale())+' · '+progressionLabel(townDifficulty(state),getLocale())+' · '+result.explanation});
   try{getTownAudio().victory();}catch{}
  }else{
   scene.clearCelebration();scene.respawn();
   gameFeedback.show({kind:'retry',title:result.over?w().over:w().wrong,detail:(result.shield?'🛡 ':'')+(result.over?result.explanation:'')});
   try{getTownAudio().error();}catch{}
  }
  hud();renderCards();if(result.ok&&!result.partial)advanceCourse();
 }
 function fall(){if(!active)return;const q=questionFor(state.expansion.runs[active]);const result=answerRun(state,active,(q.answer+1)%q.options.length);if(result.ignored)return;scene.clearCelebration();gameFeedback.show({kind:'retry',title:result.over?w().over:w().fall});persist();refresh();hud();}
 function showShop(){disposePreview();scene.stop();const e=state.expansion;shell(w().shop,`<p>${w().bag} · <b>✦ ${state.coins}</b></p><div class="item-grid">${ITEMS.map(i=>{const owned=e.gear.includes(i.id);return `<article class="shop-item"><span class="item-icon">${i.icon}</span><h3>${name(i)}</h3><p>${w()[i.id==='hint'?'hintDescription':i.id]}</p><small>${i.kind==='use'?`${w().bag}: ${e.inventory[i.id]}`:owned?w().owned:`${i.price} ✦`}</small><button type="button" data-buy-item="${i.id}" ${owned||state.coins<i.price||i.kind==='use'&&e.inventory[i.id]>=99?'disabled':''}>${owned?'✓ '+w().owned:`${w().buy} · ${i.price} ✦`}</button>${i.kind==='style'&&owned?`<button type="button" data-equip-item="${i.id}" aria-pressed="${e.accessory===i.id}">${e.accessory===i.id?w().equipped:w().equip}</button>`:''}</article>`;}).join('')}</div>${e.accessory?`<button type="button" data-equip-item="">${w().remove}</button>`:''}`,'expansion-shop');}
 function decorateSettings(){disposePreview();const wrap=document.createElement('section');wrap.className='avatar-studio';wrap.innerHTML=`<div class="avatar-preview-wrap"><canvas id="avatar-preview" aria-label="${w().characters}"></canvas><small>${w().drag}</small></div><div><h3>${w().characters}</h3><p>${w().skins}</p><div class="avatar-choices">${AVATARS.map(a=>`<button type="button" data-character-id="${a.id}" aria-pressed="${state.expansion.character===a.id}" style="--avatar-color:#${a.color.toString(16).padStart(6,'0')}"><span class="avatar-head"></span><b>${name(a)}</b><small>${state.expansion.character===a.id?'✓ '+w().selected:'3D'}</small></button>`).join('')}</div></div>`;document.querySelector('#dialog-body .dialog-content').prepend(wrap);try{previewDispose=previewAvatar($('avatar-preview'),state.expansion.character,state.expansion.accessory,state.avatar>0?['#ec825f','#509fd4','#9c82cf','#62a67a'][state.avatar]:undefined,state.expansion.gear);}catch{$('avatar-preview').replaceWith(document.createTextNode(w().webgl));}}
 function rerender(){renderCards();if(active)hud();}

 function launchCasual(id,seed){
  const building=entryBuilding;entryBuilding=null;arcadeBusy=true;activeCasual=id;onActivity?.(id);close();scene.stop();
  startArcade(id,{locale:getLocale(),state,persist,seed,onProgress:()=>refresh(),onExit:()=>{arcadeBusy=false;activeCasual=null;onActivity?.(null);if(building)scene.returnFromBuilding(building);persist();refresh();$('town-canvas').focus({preventScroll:true});}});
 }
 function startShared({game,seed,level,infiniteRound=0}={}){
  const d=townDifficulty(state);
  if(![...MODES,...ARCADE_IDS].includes(game)||!Number.isSafeInteger(seed)||level!==d.level||infiniteRound!==d.infiniteRound||arcadeBusy)return false;
  if(active)leave();entryBuilding=null;
  if(MODES.includes(game))enter(game,{seed,shared:true});else launchCasual(game,seed);
  return true;
 }
 function handleCourseAction(e){const el=e.target.closest('button');if(!el||el.disabled)return;if(el.hasAttribute('data-exit-game'))leave();else if(el.hasAttribute('data-next-stage')){if(nextStage(state,active)){persist();loadStage();}}else if(el.hasAttribute('data-retry-stage')){retryStage(state,active);persist();loadStage();}else if(el.hasAttribute('data-memory-replay')){state.expansion.runs[active].memoryIndex=0;persist();watch();}else if(el.hasAttribute('data-arcade-hint')){if(useHint(state,active)){persist();hud();}}}
 panel.addEventListener('click',handleCourseAction);courseControls.addEventListener('click',handleCourseAction);
 $('town-dialog').addEventListener('click',e=>{const el=e.target.closest('button');if(!el||el.disabled)return;if(el.dataset.ranking){const target=document.querySelector('[data-town-board]');if(target){target.textContent='…';void rankingMarkup(el.dataset.ranking,townDifficulty(state).level,getLocale()).then(markup=>{if(target.isConnected)target.innerHTML=markup;});}return;}else if(el.dataset.casualGame){const id=el.dataset.casualGame;if(!ARCADE_IDS.includes(id))return;launchCasual(id);}else if(el.dataset.game){enter(el.dataset.game);}else if(el.dataset.characterId){state.expansion.character=el.dataset.characterId;persist();scene.syncAvatar();disposePreview();document.querySelector('.avatar-studio')?.remove();decorateSettings();}else if(el.dataset.buyItem){buyItem(state,el.dataset.buyItem);persist();refresh();showShop();}else if(el.hasAttribute('data-equip-item')){const id=el.dataset.equipItem;if(!id||state.expansion.gear.includes(id))state.expansion.accessory=id||null;persist();scene.syncAvatar();showShop();}});
 $('town-dialog').addEventListener('close',()=>{disposePreview();if(!active&&entryBuilding){scene.returnFromBuilding(entryBuilding);entryBuilding=null;persist();}});$('locale').addEventListener('change',()=>{if(!active)scene.buildTown();rerender();});scene.onViewChange=()=>{persist();renderCards();};scene.onBuilding=b=>{if(active||arcadeBusy)return;entryBuilding=b;if(b.id==='gear'){showShop();return;}
  const rankButton=`<button type="button" data-ranking="${b.id}">${{zh:'排行榜',ja:'ランキング',en:'Rankings'}[getLocale()]}</button><div data-town-board></div>`;
  if(CASUAL_ARCADE_IDS.includes(b.id)&&ARCADE_IDS.includes(b.id)){const t=arcadeText(getLocale()),g=t.games[b.id],icon={fruit:'🍉',breakout:'🧱',race:'🏎️',ninja:'🥷',bubble:'🎨',rhythm:'🥁'}[b.id]||'🎮';shell(g.title,`<p class="eyebrow">${esc(g.tag)} · ${esc(progressionLabel(townDifficulty(state),getLocale()))}</p><div class="npc-talk"><span>${icon}</span><p>${esc(g.blurb)}</p></div><p class="muted">${esc(g.tip||'')}</p><button type="button" class="primary wide" data-casual-game="${b.id}">${esc(t.play)}</button>${rankButton}`,'building-lobby casual-arcade');return;}
  const m=w().modes[b.id],r=state.expansion.runs[b.id];shell(m[0],`<p class="eyebrow">${m[2]}</p><p>${m[1]}</p><p>${esc(progressionLabel(townDifficulty(state),getLocale()))} · ${esc(townPointsLabel(state.townProgress.points,getLocale()))}</p><p>${w().best} · ${state.expansion.best[b.id]||0}</p><button type="button" class="primary wide" data-game="${b.id}">${r?`${w().resume} · ${progressionLabel(r.difficulty||townDifficulty(state),getLocale())}`:w().play}</button>${rankButton}`,'building-lobby');};

 function frame(){if(active&&watchStart!==null){const r=state.expansion.runs[active],q=questionFor(r),elapsed=scene.clock-watchStart,beat=1.15-(r.difficulty?.scale||0)*.28,index=Math.floor(elapsed/beat);if(index>=q.sequence.length){watchStart=null;scene.highlight(-1);hud();}else {const showing=elapsed%beat<beat*.74,key=index*2+(showing?0:1);if(key!==watchIndex){watchIndex=key;scene.highlight(showing?q.sequence[index]:-1);const cue=$('memory-cue');if(cue){cue.textContent=showing?`${index+1} / ${q.sequence.length} · ${q.options[q.sequence[index]]}`:'· · ·';cue.style.background=showing?'#'+q.colors[q.sequence[index]].toString(16):'#edf2e7';}}}}requestAnimationFrame(frame);}frame();renderCards();return {decorateSettings,disposePreview,rerender,leave,startShared,getActivity:()=>active||activeCasual,isPlaying:()=>!!active,isArcadeOpen:()=>arcadeBusy};
}
