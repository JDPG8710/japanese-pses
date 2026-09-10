import { texts } from './GoText.mjs';
import { newGame, play, score, sgf } from './GoRules.mjs';
import { AuthManager } from '../auth/AuthManager.js';
import { createPlayroom } from './PlayroomUI.mjs';
import { playroomText } from './PlayroomText.mjs';

const app = document.querySelector('#app'), notice = document.querySelector('#notice');
const params = new URLSearchParams(location.search);
let locale = params.get('lang') || (navigator.language.startsWith('zh') ? 'zh' : navigator.language.startsWith('ja') ? 'ja' : 'en');
if (!texts[locale]) locale = 'en';
let room = null, identity = null, busy = false, socket = null, reconnectTimer = null, matchingAt = 0, autoAI = false, level = 'easy', connected = false, alive = true, review = null, offset = 0, fallbackShown = false;
let boardSize = params.get('size') === '19' ? 19 : 9, rules = params.get('rules') === 'japanese' ? 'japanese' : 'chinese', markMode = 'dead', zoom = innerWidth < 761 ? 'large' : 'fit';
let connectionEpoch = 0, reconnectAttempt = 0, pendingRoom = params.get('room'), recent = [];
let followingRoom = null;
const auth = new AuthManager({ turnstileSiteKey: document.querySelector('meta[name="turnstile-site-key"]').content });
const t = () => texts[locale];
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const label = key => escape(t()[key]);
const button = (action, key, cls = '', disabled = false) => `<button type="button" data-action="${action}" class="${cls}" ${disabled ? 'disabled' : ''}>${label(key)}</button>`;
function message(text = '') { notice.textContent = text; }
async function api(path, body) {
  const response = await fetch(`/api/arena/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000) });
  let data; try { data = await response.json(); } catch { throw new Error('UNAVAILABLE'); }
  if (!response.ok || data.error) { const e = new Error(data.error || 'UNAVAILABLE'); e.roomId = data.roomId; throw e; } return data;
}
function error(e) {
  message(playroomText[locale].errors[e.message] || t().errors[e.message] || t().unavailable);
  if (/^[a-f0-9-]{36}$/.test(e.roomId || '')) {
    const link = document.createElement('a'); link.href = `/arena.html?room=${e.roomId}&lang=${locale}`; link.textContent = ` ${t().room} →`; notice.append(link);
  }
}
async function run(fn) {
  if (busy) return; busy = true; render();
  try { await fn(); } catch (e) { error(e); if (e.message === 'STALE' && room) { try { update(await api(`rooms/${room.id}`)); } catch {} } }
  finally { busy = false; render(); }
}
function update(next) {
  if (room && next.id === room.id && next.revision < room.revision) return;
  room = next; boardSize = next.game.size || 9; rules = next.game.rules || 'chinese'; level = next.difficulty || level; offset = next.now - Date.now();
  if (room.phase !== 'waiting') matchingAt = 0;
  render();
  if (next.nextRoom && followingRoom !== next.nextRoom) {
    followingRoom = next.nextRoom;
    void api(`rooms/${next.nextRoom}`).then(fresh=>{if(room?.id===next.id)enter(fresh);}).catch(error).finally(()=>{followingRoom=null;});
  }
}
function disconnect() { connectionEpoch++; clearTimeout(reconnectTimer); reconnectTimer = null; if (socket) { socket.onclose = null; socket.close(); socket = null; } connected = false; }
function connect() {
  disconnect(); if (!room || !alive || room.phase==='expired') return;
  const epoch = connectionEpoch, id = room.id;
  const url = new URL(`/api/arena/rooms/${id}/socket`, location.origin); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(url);
  socket.onopen = () => { connected = true; reconnectAttempt = 0; renderConnection(); };
  socket.onmessage = event => { if (event.data === 'pong' || epoch !== connectionEpoch) return; try { update(JSON.parse(event.data)); } catch { message(t().unavailable); } };
  socket.onerror = () => { connected = false; renderConnection(); };
  socket.onclose = event => {
    if (epoch !== connectionEpoch || !alive) return; connected = false; renderConnection();
    if (event.code === 4001) { message(t().errors.LOGIN_REQUIRED); return; }
    if (room && room.phase!=='expired') reconnectTimer = setTimeout(async () => {
      try { update(await api(`rooms/${id}`)); connect(); } catch (e) { error(e); if (e.message !== 'LOGIN_REQUIRED') connect(); }
    }, Math.min(15000, 1000 * 2 ** reconnectAttempt++));
  };
}
function enter(next) {
  disconnect(); room = null; review = null; pendingRoom = null; update(next);
  history.replaceState(null, '', `/arena.html?room=${next.id}&lang=${locale}`); connect();
}
async function action(type, extra = {}) { update(await api(`rooms/${room.id}`, { type, revision: room.revision, ...extra })); }
async function openGame(type,id,prefetched) {
  if(type==='go') {
    if(id)return enter(prefetched||await api(`rooms/${id}`));
    document.querySelector('.go-section-title')?.scrollIntoView({behavior:'smooth'});return;
  }
  location.href=`/arena.html?game=chess&lang=${locale}${id?`&room=${id}`:''}`;
}
function difficulty() { return `<label>${label('difficulty')} <select id="difficulty">${['beginner','easy','medium','hard'].map(k => `<option value="${k}" ${k === level ? 'selected' : ''}>${label(k)}</option>`).join('')}</select></label>`; }
function settings() { return {size:boardSize,rules}; }
function settingLabel(game) { return `${game.size || 9} × ${game.size || 9} · ${label(game.rules || 'chinese')} · ${label('komi')} ${game.komi ?? 7.5}`; }
function lobby() {
  return `<h2 class="go-section-title">⚫ ⚪ ${escape(playroomText[locale].go)}</h2><div class="game-settings"><label>${label("boardSize")} <select id="board-size"><option value="9" ${boardSize===9?"selected":""}>9 × 9</option><option value="19" ${boardSize===19?"selected":""}>19 × 19</option></select></label><label>${label("ruleChoice")} <select id="rules"><option value="chinese" ${rules==="chinese"?"selected":""}>${label("chinese")} · 7.5</option><option value="japanese" ${rules==="japanese"?"selected":""}>${label("japanese")} · 6.5</option></select></label></div><div class="cards"><section class="card"><span class="icon">⚫ ⚪</span><h2>${label('invite')}</h2><p>${label('inviteDesc')}</p>${button('create','create','primary',busy || !identity)}</section>
    <section class="card"><span class="icon">↔</span><h2>${label('match')}</h2><p>${label('matchDesc')}</p><label class="toggle"><input id="auto-ai" type="checkbox" ${autoAI ? 'checked' : ''}>${label('auto')}</label>${button('match','match','primary',busy || !identity)}</section>
    <section class="card"><span class="icon">✳</span><h2>${label('ai')}</h2><p>${label('aiDesc')}</p>${difficulty()}<small class="muted">${label('aiNote')}</small>${button('ai','startAI','primary',busy || !identity)}</section></div>
    <form class="join" id="join-form"><input id="room-code" required aria-label="${label('code')}" placeholder="${label('code')}"><button ${busy || !identity ? 'disabled' : ''}>${label('join')}</button></form>
    <details><summary>${label('history')}</summary><p class="muted">${label('noHistory')}</p><div class="history">${recent.map((r,i) => `<button data-history="${i}">${escape(new Date(r.finished_at).toLocaleDateString(locale))} · ${r.mode === 'ai' ? label('computer') : label('playing')} · ${label('replay')}</button>`).join('')}</div></details>`;
}
function boardHTML(game, disabled = false) {
  const size = game.size || 9, edge = size * 50 - 25, dimension = size * 50;
  const lines = Array.from({ length: size }, (_, i) => { const n = 25 + i * 50; return `<path d="M25 ${n}H${edge} M${n} 25V${edge}"/>`; }).join('');
  const stars = size === 19 ? [3,9,15].flatMap(y=>[3,9,15].map(x=>y*size+x)) : [20,24,40,56,60];
  const last = game.moves.at(-1)?.point;
  return `${size===19?`<label class="zoom-control">${label('boardView')} <select id="board-zoom"><option value="fit" ${zoom==='fit'?'selected':''}>${label('fit')}</option><option value="large" ${zoom==='large'?'selected':''}>${label('large')}</option></select></label><p class="muted">${label('panHint')}</p>`:''}<div class="board-scroll"><div class="board-wrap ${size===19&&zoom==='large'?'board-large':''}"><div class="board" style="grid-template-columns:repeat(${size},1fr)" role="group" aria-label="${size} × ${size} Go"><svg viewBox="0 0 ${dimension} ${dimension}" aria-hidden="true"><g fill="none" stroke="#78582e" stroke-width="1.3">${lines}</g><g fill="#78582e">${stars.map(p => `<circle cx="${25+p%size*50}" cy="${25+Math.floor(p/size)*50}" r="4"/>`).join('')}</g></svg>${game.board.map((stone,p) => {
    const coordinate = `${'ABCDEFGHJKLMNOPQRST'[p%size]}${size-Math.floor(p/size)}`;
    return `<button type="button" class="point ${p === last ? 'last' : ''}" data-point="${p}" aria-label="${coordinate}${stone ? ` ${stone === 1 ? label('black') : label('white')}` : ''}" ${disabled ? 'disabled' : ''}>${stone ? `<span class="stone ${stone === 1 ? 'black':'white'} ${game.dead.includes(p) ? 'dead':''} ${game.seki?.includes(p)?'seki':''}"></span>` : ''}</button>`;
  }).join('')}</div></div></div>`;
}
function reviewGame() {
  let game = newGame(review.game.size || 9, review.game.rules || "chinese");
  for (const m of review.game.moves.slice(0,review.step)) { game.phase = 'playing'; game = play(game,m.point); }
  return game;
}
function render() {
  const scroll=app.querySelector('.board-scroll'), scrollX=scroll?.scrollLeft||0, scrollY=scroll?.scrollTop||0;
  const focus = document.activeElement?.dataset?.point;
  document.documentElement.lang = locale; document.querySelector('#locale').value = locale;
  document.querySelector('#title').textContent = 'Piko Playroom'; document.querySelector('.eyebrow').textContent = room ? `${playroomText[locale].go} · ${boardSize} × ${boardSize}` : 'PLAY · CONNECT · LEARN'; document.querySelector('#subtitle').textContent = playroomText[locale].tagline;
  document.querySelector('#login').textContent = identity?.authenticated ? t().logged : t().login;
  document.querySelector('#login').hidden = !!room;
  if (review) {
    app.innerHTML = `<div class="table-layout">${boardHTML(reviewGame(),true)}<section class="panel"><h2>${label('replay')}</h2><p>${settingLabel(review.game)}</p><p>${review.step} / ${review.game.moves.length} ${label('moves')}</p><input type="range" id="review-step" aria-label="${label('replay')}" min="0" max="${review.game.moves.length}" value="${review.step}"><div class="actions">${button('review-back',room?'live':'home')}${button('export','export')}</div></section></div>`;
  } else if (!room) {
    app.innerHTML = pendingRoom ? `<section class="panel"><h2>${label('joinTitle')}</h2><p>${label('joinDesc')}</p><p class="room-code">${escape(pendingRoom)}</p><div class="actions">${button('join-link','join','primary',busy || !identity)}${button('home','home')}</div></section>` : lobby();
    if (!identity) app.innerHTML += button('retry','retry');
  } else {
    const game = room.game, phase = room.phase, yourTurn = phase === 'playing' && room.seat === game.turn;
    const result = game.result;
    app.innerHTML = `<div class="table-layout"><section><div class="players">${[1,2].map(color => `<div class="player ${phase==='playing' && game.turn===color?'active':''}"><strong>${color===1?'●':'○'} ${color===1?label('black'):label('white')} ${room.seat===color?`· ${label('you')}`:''}</strong><small>${room.players[color-1] ? room.mode==='ai'&&color===2?`${label('computer')} · ${label(room.difficulty)}`:escape(room.players[color-1].name):label('empty')}</small><span class="clock" data-clock="${color}"></span></div>`).join('')}</div>
      ${boardHTML(game,busy || !(yourTurn || phase==='scoring'))}<p class="preview-note">${phase==='playing'?yourTurn?`${label('turn')} ${room.seat===1?label('black'):label('white')}`:label('notTurn'):''}</p>
      ${phase==='playing'?`<div class="actions">${button('pass','pass','',busy || !yourTurn)}</div>`:''}</section>
      <aside class="panel"><p class="game-config">${settingLabel(game)}</p><h2>${label(phase==='ready'?'readyPhase':phase)}</h2><p id="connection" class="status"></p>
      ${phase==='ready'?button('ready',room.players[room.seat-1]?.ready?'readyDone':'ready','primary',busy || room.players[room.seat-1]?.ready):''}
      ${phase==='waiting'?`<p>${label('inviteDesc')}</p><div class="actions">${button('copy','copy')}${navigator.share?button('share','share'):''}</div><p class="room-code">${label('room')} ${escape(room.id)}</p><a class="button" target="_blank" rel="noopener" href="/arena.html?practice=1&size=${boardSize}&rules=${rules}&lang=${locale}">${label('practice')}</a>${room.mode==='match'?`<p id="fallback" ${fallbackShown?'':'hidden'}>${label('fallback')}</p>${difficulty()}${button('ai-now','aiNow','',busy)}`:''}<div class="actions">${button('cancel','cancel','',busy)}</div>`:''}
      ${phase==='scoring'?`<p>${label('deadHint')}</p>${game.rules==='japanese'?`<label>${label('markChoice')} <select id="mark-mode"><option value="dead" ${markMode==='dead'?'selected':''}>${label('deadMark')}</option><option value="seki" ${markMode==='seki'?'selected':''}>${label('sekiMark')}</option></select></label>`:''}<p>${label('score')}: ${label('black')} ${score(game).black} · ${label('white')} ${score(game).white}</p><div class="actions">${button('accept',game.accepted.includes(room.seat)?'accepted':'accept','primary',busy || game.accepted.includes(room.seat))}${button('resume','resume','',busy)}</div>`:''}
      ${result?`<p class="result">${result.winner===1?label('black'):label('white')} ${label('win')}</p><p>${result.reason==='score'?`${label('score')}: ${result.black} : ${result.white}`:label(result.reason==='timeout'?'timeout':'resigned')}</p>`:''}
      ${phase==='finished'?`<div class="actions"><button data-action="rematch" class="primary" ${busy?'disabled':''}>${escape(playroomText[locale][room.nextRoom?'nextGame':'rematch'])}</button>${room.rematchVotes?.includes(room.seat)&&!room.nextRoom?`<button data-action="rematch-cancel">${escape(playroomText[locale].cancelRematch)}</button>`:''}</div><p>${escape(room.rematchVotes?.includes(room.seat)?playroomText[locale].rematchWait:room.rematchVotes?.length?playroomText[locale].rematchOffer:'')}</p>${room.mode!=='ai'?`<p class="muted">${escape(playroomText[locale].rematchHint)}</p>`:''}`:''}
      ${['playing','scoring'].includes(phase)?button('resign','resign','danger',busy):''}<hr><div class="actions">${game.moves.length?button('review','replay'):''}${game.moves.length?button('export','export'):''}${button('home','home','',busy)}</div></aside></div>`;
  }
  app.innerHTML += `<details><summary>${label('rules')}</summary><p>${label('rulesText')}</p></details>`;
  renderConnection(); clocks(); playroom.render();
  const nextScroll=app.querySelector('.board-scroll');if(nextScroll){nextScroll.scrollLeft=scrollX;nextScroll.scrollTop=scrollY;}
  if (focus !== undefined) app.querySelector(`[data-point="${focus}"]`)?.focus({preventScroll:true});
}
function renderConnection() { const el = document.querySelector('#connection'); if (el) el.textContent = ['finished','expired'].includes(room?.phase)?'':connected?t().connected:t().reconnecting; }
function clocks() {
  if (!room) return;
  for (const el of document.querySelectorAll('[data-clock]')) {
    const color = Number(el.dataset.clock), elapsed = room.phase === 'playing' && room.game.turn === color ? Date.now()+offset-room.turnAt : 0;
    const seconds = Math.max(0,Math.ceil((room.remaining[color-1]-elapsed)/1000)); el.textContent = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
}
async function start(mode) {
  const next = await api(mode==='match'?'match':'rooms',{mode,difficulty:level,...settings()});
  matchingAt = mode==='match'?Date.now():0; fallbackShown = false; message(); enter(next);
}
async function switchAI() {
  await api('match/cancel',settings());
  const fresh = await api(`rooms/${room.id}`); update(fresh);
  if (room.phase !== 'waiting') return;
  await action('cancel'); matchingAt = 0; await start('ai');
}
async function home() {
  if (room && ['playing','scoring'].includes(room.phase) && !confirm(t().leaveAsk)) return;
  if (room && ['waiting','ready'].includes(room.phase)) { await api('match/cancel',settings()); await action('cancel'); }
  const familyId=room?.family;
  disconnect(); room = null; pendingRoom = null; review = null; matchingAt = 0; history.replaceState(null,'',`/arena.html?lang=${locale}`); message();
  await playroom.restoreFamily(familyId);
  if (identity?.authenticated) { try { recent=(await api('history')).entries; } catch (e) { error(e); } }
}
app.addEventListener('click',event => {
  const point = event.target.closest('[data-point]');
  if (point && !point.disabled && room) {
    const p = Number(point.dataset.point);
    if (room.phase === 'scoring') { void run(()=>action(room.game.rules==='japanese'?markMode:'dead',{point:p})); return; }
    void run(async () => { message(); await action('move',{point:p}); }); return;
  }
  const h = event.target.closest('[data-history]');
  if (h) { review={game:JSON.parse(recent[Number(h.dataset.history)].game_json),step:0}; render(); return; }
  const actionName = event.target.closest('[data-action]')?.dataset.action;
  if (!actionName) return;
  void run(async () => {
    if (actionName==='retry') return initialize();
    if (actionName==='create') return start('invite');
    if (actionName==='match') return start('match');
    if (actionName==='ai') return start('ai');
    if (actionName==='rematch') {
      if(room.mode==='ai'){await start('ai');await action('ready');return;}
      if(room.nextRoom)return enter(await api(`rooms/${room.nextRoom}`));
      await action('rematch');
      return;
    }
    if (actionName==='rematch-cancel') return action('rematch',{accept:false});
    if (actionName==='ai-now') return switchAI();
    if (actionName==='join-link') { if (!/^[a-f0-9-]{36}$/.test(pendingRoom)) throw new Error('ROOM_NOT_FOUND'); enter(await api(`rooms/${pendingRoom}`,{type:'join'})); return; }
    if (actionName==='pass') return action('move',{point:null});
    if (['ready','accept','resume'].includes(actionName)) return action(actionName);
    if (actionName==='resign') { if(confirm(t().resignAsk)) await action('resign'); return; }
    if (actionName==='home'||actionName==='cancel') return home();
    if (actionName==='copy'||actionName==='share') {
      const url=`${location.origin}/arena.html?room=${room.id}&lang=${locale}`;
      if(actionName==='share') { try { await navigator.share({title:t().title,url}); } catch(e) { if(e.name!=='AbortError') throw e; } }
      else { try { await navigator.clipboard.writeText(url); message(t().copied); } catch { message(url); } } return;
    }
    if(actionName==='review') { review={game:structuredClone(room.game),step:0}; return; }
    if(actionName==='review-back') { review=null; return; }
    if(actionName==='export') {
      const url=URL.createObjectURL(new Blob([sgf(review?.game||room.game)],{type:'application/x-go-sgf'})), a=document.createElement('a'); a.href=url;a.download=`piko-go-${(review?.game||room.game).size||9}.sgf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  });
});
app.addEventListener('change',e=>{if(e.target.id==='board-size'){boardSize=Number(e.target.value);render();}if(e.target.id==='rules'){rules=e.target.value;render();}if(e.target.id==='board-zoom'){zoom=e.target.value;render();}if(e.target.id==='mark-mode')markMode=e.target.value;if(e.target.id==='difficulty')level=e.target.value;if(e.target.id==='auto-ai')autoAI=e.target.checked;});
app.addEventListener('input',e=>{if(e.target.id==='review-step'){review.step=Number(e.target.value);render();document.querySelector('#review-step')?.focus();}});
app.addEventListener('submit',e=>{
  if(e.target.id!=='join-form')return;e.preventDefault();const raw=document.querySelector('#room-code').value.trim();
  let id=raw;try { id=new URL(raw).searchParams.get('room'); }catch{}
  void run(async()=>{if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('ROOM_NOT_FOUND');enter(await api(`rooms/${id}`,{type:'join'}));});
});
document.querySelector('#locale').onchange=e=>{locale=e.target.value;message();render();};
document.querySelector('#login').onclick=()=>{if(!identity?.authenticated)void auth.showLogin();};
async function initialize() {
  message(t().identity);
  try {
    identity=await api('identity',{});message();
    await playroom.initialize();
    if(pendingRoom && /^[a-f0-9-]{36}$/.test(pendingRoom)) { try { enter(await api(`rooms/${pendingRoom}`)); } catch(e) { if(!['NOT_PLAYER','ROOM_NOT_FOUND'].includes(e.message))error(e); } }
    if(identity.authenticated)recent=(await api('history')).entries;
    if(params.get('practice')==='1'&&!room)await start('ai');
  }catch(e){error(e);}render();
}
const timer=setInterval(()=>{
  clocks();
  if(matchingAt && room?.phase==='waiting' && Date.now()-matchingAt>=20000 && !fallbackShown){fallbackShown=true;render();if(autoAI&&!busy)void run(switchAI);}
},500);
const heartbeat=setInterval(()=>{if(socket?.readyState===WebSocket.OPEN)socket.send('ping');},25000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden && room)void run(async()=>{update(await api(`rooms/${room.id}`));connect();});});
window.addEventListener('pagehide',()=>{alive=false;disconnect();clearInterval(timer);clearInterval(heartbeat);playroom.dispose();},{once:true});
const playroom=createPlayroom({api,getLocale:()=>locale,getIdentity:()=>identity,setIdentity:next=>{identity=next;},getRoom:()=>room,openGame,onError:error});
render();void initialize();
