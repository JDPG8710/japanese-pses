import { playroomText } from './PlayroomText.mjs';
import { mountGoLearn } from './GoLearn.mjs';
import { mountChessLearn } from './ChessLearn.mjs';
import { hasParentalAck, requireParentalGate } from '../privacy/ParentalGate.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatars = ['🌱','🐼','🐱','🦊','🐧','🐻','🐰','⭐'];
const extra={zh:{games:'选择游戏',open:'开始玩',chess:'国际象棋',chessHint:'和家人朋友对战，支持邀请、匹配和再战。',chessLearn:'国际象棋新手课',chessLearnHint:'认识棋子，学会将军与将死。'},en:{games:'Choose a game',open:'Play',chess:'Chess',chessHint:'Play family and friends with invitations, matching and rematches.',chessLearn:'Learn chess',chessLearnHint:'Meet every piece, then learn check and checkmate.'},ja:{games:'ゲームをえらぶ',open:'あそぶ',chess:'チェス',chessHint:'かぞくやともだちと、しょうたい・マッチング・もういっかい。',chessLearn:'はじめてのチェス',chessLearnHint:'こまをおぼえて、チェックとチェックメイトまでまなぼう。'}};
export function createPlayroom({ api, getLocale, getIdentity, setIdentity, getRoom, openGame, onError, headless = false }) {
  const host = document.querySelector('#playroom'), learning = document.querySelector('#learn-room');
  if (headless && host) {
    host.hidden = true;
    host.innerHTML = '';
  }
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
  let defaultGuestName = '';
  function getGuestName() {
    if (!defaultGuestName) {
      const num = Math.floor(1000 + Math.random() * 9000);
      defaultGuestName = (getLocale()==='ja'?'ゲスト':getLocale()==='zh'?'游客':'Guest') + `-${num}`;
    }
    return defaultGuestName;
  }
  function profileHTML() {
    const i=getIdentity()||{};
    const gate=hasParentalAck();
    const currentAvatar=i.avatar||'🌱';
    const guestName = getGuestName();
    const displayName = i.configured ? i.name : guestName;
    return `<details class="profile-panel" ${!i.configured?'open':''}>
      <summary class="kid-profile-summary">
        <span class="kid-profile-pill">
          <span class="avatar-pill">${esc(currentAvatar)}</span>
          <span class="profile-name-text"><strong>${esc(displayName)}</strong> <small class="kid-guest-tag">${esc(i.configured ? (text().playerCard || '小棋手') : (text().guestBadge || '临时游客'))}</small></span>
          <span class="profile-edit-tag">✏️ ${esc(i.configured ? (text().changeAvatar || '换形象') : (text().customNickname || '修改名字'))}</span>
        </span>
      </summary>
      <form id="playroom-profile" class="kid-profile-form">
        <p class="kid-form-tip">${!i.configured ? `🌱 ${esc(text().guestTip || '已为你分配临时游客身份，免填即可畅玩！随时可点击修改。')}` : `✨ ${esc(text().chooseAvatar || '选个喜欢的萌宠头像：')}`}</p>
        <div class="kid-avatar-picker" role="radiogroup" aria-label="${esc(text().avatar)}">
          ${avatars.map(a => `<span role="button" tabindex="0" class="avatar-choice-btn ${a === currentAvatar ? 'picked' : ''}" data-avatar="${a}" aria-label="${a}">${a}</span>`).join('')}
        </div>
        <div class="hidden-select-wrap">
          <select name="avatar" aria-label="${esc(text().avatar)}">${avatars.map(a=>`<option value="${a}" ${a===currentAvatar?'selected':''}>${a}</option>`).join('')}</select>
        </div>
        <label class="kid-name-label">
          <span>📝 ${esc(text().name)}</span>
          <input name="nickname" maxlength="20" required value="${esc(displayName)}" placeholder="${esc(text().namePlaceholder || '输入小棋手名字')}" autocomplete="nickname">
        </label>
        <label class="toggle kid-toggle">
          <input name="visible" type="checkbox" ${i.visible&&gate?'checked':''}>
          <span>👀 ${esc(text().visible)}</span>
        </label>
        <p class="muted kid-privacy-tip">🔒 ${esc(text().privacy)} ${esc(text().parentGateHint||'')}</p>
        <button class="primary kid-save-btn">✨ ${esc(text().save)}</button>
      </form>
    </details>`;
  }
  function familyHTML() {
    if (!family) return '';
    const isHost=family.host===self(), mine=family.members.find(m=>m.key===self());
    const marker=family.gameType==='chess'?'♔♚':'⚫⚪';
    const names=[0,1].map(n=>`<select name="seat${n}" aria-label="${n+1}">${family.members.map(m=>`<option value="${esc(m.key)}" ${family.seats[n]===m.key?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`).join('');
    const settings=`<select name="gameType" aria-label="${esc(more().games)}"><option value="go" ${family.gameType==='go'?'selected':''}>⚫⚪ ${esc(text().go)}</option><option value="chess" ${family.gameType==='chess'?'selected':''}>♔♚ ${esc(more().chess)}</option></select>${names}<select name="size" aria-label="9 / 19" ${family.gameType==='chess'?'disabled':''}><option value="9" ${family.size===9?'selected':''}>9 × 9</option><option value="19" ${family.size===19?'selected':''}>19 × 19</option></select><select name="rules" aria-label="Rules" ${family.gameType==='chess'?'disabled':''}><option value="chinese" ${family.rules==='chinese'?'selected':''}>${getLocale()==='zh'?'中国计分':getLocale()==='ja'?'ちゅうごくルール':'Chinese scoring'}</option><option value="japanese" ${family.rules==='japanese'?'selected':''}>${getLocale()==='zh'?'日本计分':getLocale()==='ja'?'にほんルール':'Japanese scoring'}</option></select>`;
    return `<section class="panel family-panel"><p class="eyebrow">${esc(text().privateRoom)}</p><h2>${esc(text().members)}</h2><div class="member-list">${family.members.map(m=>`<div class="member"><span class="avatar">${esc(m.avatar)}</span><div><strong>${esc(m.name)} ${m.key===family.host?`· ${esc(text().host)}`:''}</strong><small>${esc(text()[m.online?'online':'offline'])} · ${esc(text()[m.ready?'readyDone':'notReady'])}${m.selected?` · ${marker}`:''}</small></div></div>`).join('')}</div><div class="actions">${b('family-copy','copy')}${b('family-leave','leave')}</div><p class="room-code">${esc(family.id)}</p>${isHost&&family.members.length>=2?`<form id="family-settings"><label>${esc(text().seats)}</label><div class="game-settings">${settings}</div><button>${esc(text().settings)}</button></form>`:''}<div class="actions">${mine?.selected?b('family-ready','ready'):''}${isHost?b('family-start','start','class="primary"'):''}${family.game?b('family-game','enter'):''}</div></section>`;
  }
  function render() {
    if(disposed)return;
    if(headless) {
      if (host) host.hidden = true;
      return;
    }
    if(getRoom()&&lessonClose){lessonClose();lessonClose=null;learning.hidden=true;document.querySelector('#app').hidden=false;}
    host.hidden=!!getRoom()||!!lessonClose;
    if(host.hidden)return;
    const i=getIdentity(), t=text();
    const chessProgress=i?.tutorials?.chess||0;
    const isChess = new URLSearchParams(location.search).get('game') === 'chess';
    const catalog=`<section class="game-catalog">
      <div class="catalog-header">
        <span class="kid-badge">🎈 ${esc(t.hubTitle || '趣味棋类乐园')}</span>
        <h2 class="catalog-title">${esc(t.hubDesc || '选一个喜欢的棋盘游戏，开始今天的智慧大冒险吧！')}</h2>
      </div>
      <div class="game-choice-grid">
        <article class="kid-game-card go-card ${!isChess ? 'active-game' : ''}" data-target-game="go">
          <div class="kid-game-card-top">
            <div class="kid-game-icon-wrap go-bg">
              <span class="kid-game-icon">⚪⚫</span>
            </div>
            <span class="kid-game-tag">${esc(t.goBadge || '黑白吃子 · 争地盘')}</span>
          </div>
          <div class="kid-game-info">
            <h3>${esc(t.goTitle || t.go)}</h3>
            <p class="kid-game-desc">${esc(t.goDesc || t.learnHint)}</p>
          </div>
          <a href="/arena.html?game=go&lang=${getLocale()}" class="kid-game-enter-btn go-btn" data-pr="open-go">${esc(t.playGo || more().open)}</a>
        </article>

        <article class="kid-game-card chess-card ${isChess ? 'active-game' : ''}" data-target-game="chess">
          <div class="kid-game-card-top">
            <div class="kid-game-icon-wrap chess-bg">
              <span class="kid-game-icon">♔♚</span>
            </div>
            <span class="kid-game-tag">${esc(t.chessBadge || '骑士王后 · 益智对决')}</span>
          </div>
          <div class="kid-game-info">
            <h3>${esc(t.chessTitle || more().chess)}</h3>
            <p class="kid-game-desc">${esc(t.chessDesc || more().chessHint)}</p>
          </div>
          <a href="/arena.html?game=chess&lang=${getLocale()}" class="kid-game-enter-btn chess-btn" data-pr="open-chess">${esc(t.playChess || more().open)}</a>
        </article>
      </div>
    </section>`;
    const markup = `${profileHTML()}${catalog}${family ? familyHTML() : ''}<section class="panel public-panel"><div class="learn-top"><div class="lobby-title-group"><span class="kid-tag">👥 ${esc(t.onlineLobbyTitle || '在线大厅')}</span><h2>${esc(t.public)} (${directory.players.length})</h2></div>${b('refresh','refresh','class="kid-refresh-btn"')}</div><p class="muted">${esc(t.onlineLobbyDesc || t.privacy)}</p><div class="member-list">${directory.players.length?directory.players.map(p=>`<div class="member"><span class="avatar">${esc(p.avatar)}</span><div><strong>${esc(p.name)}</strong><small>${esc(statusLabel(p))}</small></div><div class="actions">${p.key!==self()&&p.status==='idle'&&i?.visible&&hasParentalAck()&&!family?b('invite','invite',`data-target="${esc(p.key)}"`):''}${p.key!==self()?`<button data-pr="report" data-target="${esc(p.key)}">${esc(t.report||'Report')}</button><button data-pr="block" data-target="${esc(p.key)}">${esc(t.block||'Block')}</button>`:''}</div></div>`).join(''):`<p class="kid-empty-notice">🌱 ${esc(t.empty)}</p>`}</div><div class="invitations">${directory.invites.map(v=>`<div class="invitation"><strong>${esc(v.from.name)}</strong> ${esc(t[v.accepted?'accepted':'incoming'])}${v.accepted?b('open-invite','openFamily',`data-family="${v.family}"`):v.incoming?`${b('accept','accept',`data-invite="${v.id}"`)} ${b('decline','decline',`data-invite="${v.id}"`)}`:''}</div>`).join('')}</div></section>`;
    // Presence updates must not erase a nickname or settings being edited.
    if(markup!==lastMarkup && !host.contains(document.activeElement?.closest('input,select'))) { host.innerHTML=markup;lastMarkup=markup; }
    if(pending)host.querySelectorAll('button').forEach(el=>el.disabled=true);
  }
  async function refresh() {
    if(polling||disposed||!getIdentity()?.configured)return;
    polling=true;
    try {
      const room=getRoom();
      directory=await api('presence',{tab,status:room&&['playing','scoring'].includes(room.phase)?'playing':room&&['waiting','ready'].includes(room.phase)?'waiting':'idle',game:room?.gameType||new URLSearchParams(location.search).get('game')||'go',private:!!familyId,parentalGateAck:hasParentalAck()});
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
        let visible=data.has('visible');
        let parentalGateAck=hasParentalAck();
        if(visible && !parentalGateAck){
          parentalGateAck=await requireParentalGate({purpose:'arena-public',locale:getLocale()});
          if(!parentalGateAck){notice(text().parentGateNeeded||text().privacy);visible=false;}
        }
        const profile=await api('profile',{name:data.get('nickname'),avatar:data.get('avatar'),visible,parentalGateAck:!!parentalGateAck});setIdentity({...getIdentity(),...profile});notice(text().saved);await refresh();
      }
      if(e.target.id==='family-join')await join(data.get('code'));
      if(e.target.id==='family-settings')await call('settings',{gameType:data.get('gameType'),size:Number(data.get('size')||family.size||9),rules:data.get('rules')||family.rules||'chinese',seats:[data.get('seat0'),data.get('seat1')]});
    });
  });
  host.addEventListener('click',e=>{
    const avatarChoice = e.target.closest('.avatar-choice-btn');
    if (avatarChoice) {
      const choice = avatarChoice.dataset.avatar;
      const select = host.querySelector('#playroom-profile select[name=avatar]');
      if (select) { select.value = choice; select.dispatchEvent(new Event('change', { bubbles: true })); }
      host.querySelectorAll('.avatar-choice-btn').forEach(btn => btn.classList.toggle('picked', btn.dataset.avatar === choice));
      return;
    }
    const gameCard = e.target.closest('.kid-game-card');
    if (gameCard && !e.target.closest('button, a, input, select')) {
      const target = gameCard.dataset.targetGame;
      if (target === 'go') {
        void (async () => {
          if(!getIdentity()?.configured) {
            try { const prof = await api('profile', { name: getGuestName(), avatar: '🌱', visible: false, parentalGateAck: false }); setIdentity({...getIdentity(), ...prof}); } catch {}
          }
          openGame('go');
        })();
        return;
      }
      if (target === 'chess') {
        void (async () => {
          if(!getIdentity()?.configured) {
            try { const prof = await api('profile', { name: getGuestName(), avatar: '🌱', visible: false, parentalGateAck: false }); setIdentity({...getIdentity(), ...prof}); } catch {}
          }
          openGame('chess');
        })();
        return;
      }
    }
    const el=e.target.closest('[data-pr]');if(!el)return;
    void run(async()=>{
      const action=el.dataset.pr;
      if(action==='open-go') {
        if(!getIdentity()?.configured) {
          try { const prof = await api('profile', { name: getGuestName(), avatar: '🌱', visible: false, parentalGateAck: false }); setIdentity({...getIdentity(), ...prof}); } catch {}
        }
        return openGame('go');
      }
      if(action==='open-chess') {
        if(!getIdentity()?.configured) {
          try { const prof = await api('profile', { name: getGuestName(), avatar: '🌱', visible: false, parentalGateAck: false }); setIdentity({...getIdentity(), ...prof}); } catch {}
        }
        return openGame('chess');
      }
      if(action==='refresh')await refresh();
      if(action==='family-create'){family=await api('families',{tab});rememberFamily(family.id);await refresh();}
      if(action==='family-copy'){const url=`${location.origin}/arena.html?family=${family.id}&lang=${getLocale()}`;try{await navigator.clipboard.writeText(url);notice(text().copied);}catch{notice(url);}}
      if(action==='family-leave'&&confirm(text().leaveAsk)){await call('leave');family=null;rememberFamily(null);await refresh();}
      if(action==='family-ready')await call('ready');
      if(action==='family-start'){await call('start');if(family.seats.includes(self()))openGame(family.gameType,family.game);}
      if(action==='family-game')openGame(family.gameType,family.game);
      if(action==='invite'||action==='accept'||action==='decline'){directory=await api('invitation',{type:action,target:el.dataset.target,invite:el.dataset.invite});}
      if(action==='report'){await api('report',{targetPublicId:el.dataset.target,reason:'other'});notice(t.reported||'Reported');}
      if(action==='block'){await api('block',{targetPublicId:el.dataset.target});notice(t.blocked||'Blocked');directory={...directory,players:directory.players.filter(p=>p.key!==el.dataset.target)};}
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
    async initialize(){if(!familyId)try{familyId=localStorage.getItem('piko-family');}catch{}if(familyId&&getIdentity()?.configured){try{const fromUrl=new URLSearchParams(location.search).get('family');family=await api(`families/${familyId}`,{type:fromUrl?'join':'get',tab});rememberFamily(familyId);}catch(e){if(e.message!=='NOT_MEMBER'&&e.message!=='FAMILY_NOT_FOUND')onError(e);}}render();await refresh();},
    async restoreFamily(id){navigationEpoch++;if(id){rememberFamily(id);try{await call('get');}catch(e){onError(e);}}await refresh();render();},
    dispose(){disposed=true;clearInterval(timer);clearInterval(familyTimer);document.removeEventListener('visibilitychange',onVisibility);lessonClose?.();}
  };
}
