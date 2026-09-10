import { playroomText } from './PlayroomText.mjs';
import { mountGoLearn } from './GoLearn.mjs';
import { mountChessLearn } from './ChessLearn.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatars = ['🌱','🐼','🐱','🦊','🐧','🐻','🐰','⭐'];
const extra={zh:{games:'选择游戏',open:'开始玩',chess:'国际象棋',chessHint:'和家人朋友对战，支持邀请、匹配和再战。',chessLearn:'国际象棋新手课',chessLearnHint:'认识棋子，学会将军与将死。'},en:{games:'Choose a game',open:'Play',chess:'Chess',chessHint:'Play family and friends with invitations, matching and rematches.',chessLearn:'Learn chess',chessLearnHint:'Meet every piece, then learn check and checkmate.'},ja:{games:'ゲームをえらぶ',open:'あそぶ',chess:'チェス',chessHint:'かぞくやともだちと、しょうたい・マッチング・もういっかい。',chessLearn:'はじめてのチェス',chessLearnHint:'こまをおぼえて、チェックとチェックメイトまでまなぼう。'}};
export function createPlayroom({ api, getLocale, getIdentity, setIdentity, getRoom, openGame, onError }) {
  const host = document.querySelector('#playroom'), learning = document.querySelector('#learn-room');
  const tab = crypto.randomUUID();
  let family = null, familyId = new URLSearchParams(location.search).get('family'), directory = { players:[],invites:[] }, pending = false, polling = false, disposed = false, lessonClose = null, learned = 0, lastMarkup = '', lastLocale = getLocale(), navigationEpoch = 0;
  const text = () => playroomText[getLocale()];
  const more = () => extra[getLocale()];
  const statusLabel=p=>p.game==='chess'&&p.status==='playing'?{zh:'国际象棋对局中',en:'Playing chess',ja:'チェスでたいせんちゅう'}[getLocale()]:text()[p.status];
  const b = (action,label,extra='') => `<button data-pr="${action}" ${extra}>${esc(text()[label])}</button>`;
  const self = () => getIdentity()?.publicId;
  function notice(s) { document.querySelector('#notice').textContent = s; }
  function rememberFamily(id) { familyId = id; try { if(id)localStorage.setItem('piko-family',id);else localStorage.removeItem('piko-family'); } catch {} }
  async function call(type, extra = {}) {
    const id=familyId, next=await api(`families/${id}`, {type,revision:family?.revision,tab,...extra});
    if(id===familyId && (!family || next.revision>=family.revision))family=next;
    return next;
  }
  function profileHTML() {
    const i=getIdentity()||{};
    return `<details class="profile-panel" ${!i.configured?'open':''}><summary>${esc(text().profile)} · ${esc(i.avatar||'🌱')} ${esc(i.name)}</summary><form id="playroom-profile"><label>${esc(text().name)}<input name="nickname" maxlength="40" required value="${esc(i.configured?i.name:'')}" autocomplete="nickname"></label><label>${esc(text().avatar)}<select name="avatar">${avatars.map(a=>`<option ${a===i.avatar?'selected':''}>${a}</option>`).join('')}</select></label><label class="toggle"><input name="visible" type="checkbox" ${i.visible?'checked':''}>${esc(text().visible)}</label><p class="muted">${esc(text().privacy)}</p><button class="primary">${esc(text().save)}</button></form></details>`;
  }
  function familyHTML() {
    if (!family) return `<section class="panel"><p class="eyebrow">TOGETHER</p><h2>${esc(text().family)}</h2><p>${esc(text().familyHint)}</p>${b('family-create','createFamily')}<form id="family-join" class="join"><input name="code" aria-label="${esc(text().code)}" placeholder="${esc(text().code)}" value="${esc(familyId||'')}" required><button>${esc(text().joinFamily)}</button></form></section>`;
    const isHost=family.host===self(), mine=family.members.find(m=>m.key===self());
    const marker=family.gameType==='chess'?'♔♚':'⚫⚪';
    const names=[0,1].map(n=>`<select name="seat${n}" aria-label="${n+1}">${family.members.map(m=>`<option value="${esc(m.key)}" ${family.seats[n]===m.key?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`).join('');
    const settings=`<select name="gameType" aria-label="${esc(more().games)}"><option value="go" ${family.gameType==='go'?'selected':''}>⚫⚪ ${esc(text().go)}</option><option value="chess" ${family.gameType==='chess'?'selected':''}>♔♚ ${esc(more().chess)}</option></select>${names}<select name="size" aria-label="9 / 19" ${family.gameType==='chess'?'disabled':''}><option value="9" ${family.size===9?'selected':''}>9 × 9</option><option value="19" ${family.size===19?'selected':''}>19 × 19</option></select><select name="rules" aria-label="Rules" ${family.gameType==='chess'?'disabled':''}><option value="chinese" ${family.rules==='chinese'?'selected':''}>${getLocale()==='zh'?'中国计分':getLocale()==='ja'?'ちゅうごくルール':'Chinese scoring'}</option><option value="japanese" ${family.rules==='japanese'?'selected':''}>${getLocale()==='zh'?'日本计分':getLocale()==='ja'?'にほんルール':'Japanese scoring'}</option></select>`;
    return `<section class="panel family-panel"><p class="eyebrow">${esc(text().privateRoom)}</p><h2>${esc(text().members)}</h2><div class="member-list">${family.members.map(m=>`<div class="member"><span class="avatar">${esc(m.avatar)}</span><div><strong>${esc(m.name)} ${m.key===family.host?`· ${esc(text().host)}`:''}</strong><small>${esc(text()[m.online?'online':'offline'])} · ${esc(text()[m.ready?'readyDone':'notReady'])}${m.selected?` · ${marker}`:''}</small></div></div>`).join('')}</div><div class="actions">${b('family-copy','copy')}${b('family-leave','leave')}</div><p class="room-code">${esc(family.id)}</p>${isHost&&family.members.length>=2?`<form id="family-settings"><label>${esc(text().seats)}</label><div class="game-settings">${settings}</div><button>${esc(text().settings)}</button></form>`:''}<div class="actions">${mine?.selected?b('family-ready','ready'):''}${isHost?b('family-start','start','class="primary"'):''}${family.game?b('family-game','enter'):''}</div></section>`;
  }
  function render() {
    if(disposed)return;
    if(getRoom()&&lessonClose){lessonClose();lessonClose=null;learning.hidden=true;document.querySelector('#app').hidden=false;}
    host.hidden=!!getRoom()||!!lessonClose;
    if(host.hidden)return;
    const i=getIdentity(), t=text();
    const chessProgress=i?.tutorials?.chess||0;
    const catalog=`<section class="game-catalog"><h2>${esc(more().games)}</h2><div class="cards game-choice"><article class="card"><span class="icon">⚫ ⚪</span><h2>${esc(t.go)}</h2><p>${esc(t.learnHint)}</p><button data-pr="open-go">${esc(more().open)}</button></article><article class="card"><span class="icon">♔ ♚</span><h2>${esc(more().chess)}</h2><p>${esc(more().chessHint)}</p><button data-pr="open-chess" class="primary">${esc(more().open)}</button></article></div></section>`;
    const lessons=`<section class="panel learn-card"><p class="eyebrow">LEARN BY PLAYING</p><h2>${esc(t.learn)}</h2><p>${esc(t.learnHint)}</p><p>${esc(t.progress)} ${Math.max(i?.tutorial||0,learned)} / 5</p>${b('learn','learn','class="primary"')}<hr><h2>${esc(more().chessLearn)}</h2><p>${esc(more().chessLearnHint)}</p><p>${esc(t.progress)} ${chessProgress} / 8</p><button data-pr="learn-chess">${esc(more().chessLearn)}</button></section>`;
    const markup = `${profileHTML()}${catalog}<div class="playroom-grid">${familyHTML()}${lessons}</div><section class="panel public-panel"><div class="learn-top"><h2>${esc(t.public)} (${directory.players.length})</h2>${b('refresh','refresh')}</div><p class="muted">${esc(t.privacy)}</p><div class="member-list">${directory.players.length?directory.players.map(p=>`<div class="member"><span class="avatar">${esc(p.avatar)}</span><div><strong>${esc(p.name)}</strong><small>${esc(statusLabel(p))}</small></div>${p.key!==self()&&p.status==='idle'&&i?.visible&&!family?b('invite','invite',`data-target="${esc(p.key)}"`):''}</div>`).join(''):`<p>${esc(t.empty)}</p>`}</div><div class="invitations">${directory.invites.map(v=>`<div class="invitation"><strong>${esc(v.from.name)}</strong> ${esc(t[v.accepted?'accepted':'incoming'])}${v.accepted?b('open-invite','openFamily',`data-family="${v.family}"`):v.incoming?`${b('accept','accept',`data-invite="${v.id}"`)} ${b('decline','decline',`data-invite="${v.id}"`)}`:''}</div>`).join('')}</div></section>`;
    // Presence updates must not erase a nickname or settings being edited.
    if(markup!==lastMarkup && !host.contains(document.activeElement?.closest('input,select'))) { host.innerHTML=markup;lastMarkup=markup; }
    if(pending)host.querySelectorAll('button').forEach(el=>el.disabled=true);
  }
  async function refresh() {
    if(polling||disposed||!getIdentity()?.configured)return;
    polling=true;
    try {
      const room=getRoom();
      directory=await api('presence',{tab,status:room&&['playing','scoring'].includes(room.phase)?'playing':room&&['waiting','ready'].includes(room.phase)?'waiting':'idle',game:room?.gameType||new URLSearchParams(location.search).get('game')||'go',private:!!familyId});
      render();
    } catch(e) { if(!disposed)onError(e); } finally {polling=false;}
  }
  async function run(fn) { if(pending)return;pending=true;render();try{await fn();}catch(e){onError(e);if(e.message==='FAMILY_STALE')try{await call('get');}catch{}}finally{pending=false;lastMarkup='';render();} }
  async function join(id) {
    let value=id.trim();try{value=new URL(value).searchParams.get('family')||'';}catch{}
    if(!/^[a-f0-9-]{36}$/.test(value))throw new Error('FAMILY_NOT_FOUND');
    const next=await api(`families/${value}`,{type:'join',tab});family=next;rememberFamily(value);await refresh();
  }
  host.addEventListener('submit', e=>{
    e.preventDefault();const data=new FormData(e.target);
    void run(async()=>{
      if(e.target.id==='playroom-profile') {
        const profile=await api('profile',{name:data.get('nickname'),avatar:data.get('avatar'),visible:data.has('visible')});setIdentity({...getIdentity(),...profile});notice(text().saved);await refresh();
      }
      if(e.target.id==='family-join')await join(data.get('code'));
      if(e.target.id==='family-settings')await call('settings',{gameType:data.get('gameType'),size:Number(data.get('size')||family.size||9),rules:data.get('rules')||family.rules||'chinese',seats:[data.get('seat0'),data.get('seat1')]});
    });
  });
  host.addEventListener('click',e=>{
    const el=e.target.closest('[data-pr]');if(!el)return;
    void run(async()=>{
      const action=el.dataset.pr;
      if(action==='open-go')return openGame('go');
      if(action==='open-chess')return openGame('chess');
      if(action==='refresh')await refresh();
      if(action==='family-create'){family=await api('families',{tab});rememberFamily(family.id);await refresh();}
      if(action==='family-copy'){const url=`${location.origin}/arena.html?family=${family.id}&lang=${getLocale()}`;try{await navigator.clipboard.writeText(url);notice(text().copied);}catch{notice(url);}}
      if(action==='family-leave'&&confirm(text().leaveAsk)){await call('leave');family=null;rememberFamily(null);await refresh();}
      if(action==='family-ready')await call('ready');
      if(action==='family-start'){await call('start');if(family.seats.includes(self()))openGame(family.gameType,family.game);}
      if(action==='family-game')openGame(family.gameType,family.game);
      if(action==='invite'||action==='accept'||action==='decline'){directory=await api('invitation',{type:action,target:el.dataset.target,invite:el.dataset.invite});}
      if(action==='open-invite')await join(el.dataset.family);
      if(action==='learn') {
        const oldProgress=Math.max(getIdentity()?.tutorial||0,learned);
        lessonClose=mountGoLearn(learning,{locale:getLocale(),progress:oldProgress,onProgress:step=>{learned=Math.max(learned,step);if(getIdentity()?.configured)void api('tutorial',{step}).catch(onError);},onClose:()=>{lessonClose?.();lessonClose=null;learning.hidden=true;document.querySelector('#app').hidden=false;render();}});
        learning.hidden=false;document.querySelector('#app').hidden=true;host.hidden=true;learning.scrollIntoView({block:'start',behavior:'smooth'});
      }
      if(action==='learn-chess') {
        const oldProgress=getIdentity()?.tutorials?.chess||0;
        lessonClose=mountChessLearn(learning,{locale:getLocale(),progress:oldProgress,onProgress:step=>{const i=getIdentity();setIdentity({...i,tutorials:{...i.tutorials,chess:Math.max(i.tutorials?.chess||0,step)}});if(i?.configured)void api('tutorial',{game:'chess',step}).catch(onError);},onClose:()=>{lessonClose?.();lessonClose=null;learning.hidden=true;document.querySelector('#app').hidden=false;lastMarkup='';render();}});
        learning.hidden=false;document.querySelector('#app').hidden=true;host.hidden=true;learning.scrollIntoView({block:'start',behavior:'smooth'});
      }
    });
  });
  const timer=setInterval(()=>{if(!document.hidden)void refresh();},20000);
  let familyPolling=false;
  const familyTimer=setInterval(async()=>{
    if(disposed||document.hidden||!family||familyPolling||pending)return;
    familyPolling=true;
    try {
      const previous=family.game, epoch=navigationEpoch, wasInGame=!!getRoom();
      await call('beat');render();
      if(!wasInGame&&epoch===navigationEpoch&&!getRoom()&&family?.game&&family.game!==previous&&family.seats.includes(self())) {
        const route=family.gameType==='chess'?`chess/rooms/${family.game}`:`rooms/${family.game}`;
        const game=await api(route);
        if(epoch===navigationEpoch&&!getRoom()&&game.phase==='playing')openGame(family.gameType,family.game,game);
      }
    }catch(e){onError(e);}finally{familyPolling=false;}
  },3000);
  const onVisibility=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',onVisibility);
  return {
    render(){if(lastLocale!==getLocale()){lastLocale=getLocale();lastMarkup='';}render();},
    async initialize(){if(!familyId)try{familyId=localStorage.getItem('piko-family');}catch{}if(familyId&&getIdentity()?.configured){try{family=await api(`families/${familyId}`,{type:'get'});}catch(e){if(e.message!=='NOT_MEMBER'&&e.message!=='FAMILY_NOT_FOUND')onError(e);}}render();await refresh();},
    async restoreFamily(id){navigationEpoch++;if(id){rememberFamily(id);try{await call('get');}catch(e){onError(e);}}await refresh();render();},
    dispose(){disposed=true;clearInterval(timer);clearInterval(familyTimer);document.removeEventListener('visibilitychange',onVisibility);lessonClose?.();}
  };
}
