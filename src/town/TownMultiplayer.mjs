import {requireParentalGate} from '../privacy/ParentalGate.mjs';
import {TOWN_ROOM_CODE,TOWN_EMOTES,cleanPresence} from './TownNetworkProtocol.mjs';

const COPY={
 zh:{title:'和朋友一起逛',offline:'一个人玩',connecting:'连接中…',online:'位小伙伴在线',retry:'断线了，正在重新连接…',create:'建一个邀请小镇',join:'加入朋友的小镇',public:'公开小镇',code:'朋友发来的邀请链接或房间码',share:'邀请链接',copy:'复制邀请链接',copied:'邀请链接复制好啦',leave:'退出联机',note:'发邀请链接就能和朋友见面；公开小镇要先让家长确认。只能用固定表情打招呼。',invite:'邀请一起挑战',accept:'一起玩！',challenge:'邀请你一起玩',failure:'现在连不上，等一会儿再试试吧。',full:'这个小镇人满啦，换一个吧。',bad:'这个邀请链接或房间码好像不对哦。',expired:'邀请过期啦，请再发一次。',level:'挑战等级',games:['数学跳跳岛','算术高塔','英语传送门','记忆地板','双语小农场','皮可赛道','砖块大作战','水果风暴','忍者打字','小小设计师','节奏鼓队'],emotes:['挥手','大笑','加油','爱心']},
 en:{title:'Play together',offline:'Playing solo',connecting:'Connecting…',online:'friends in town',retry:'Reconnecting…',create:'Make a private town',join:'Join a town',public:'Public town',code:'Friend\'s invite link or room code',share:'Invite link',copy:'Copy invite link',copied:'Link copied!',leave:'Leave online play',note:'Share an invite link to meet friends. Public towns need a grown-up\'s OK. You can only use set emotes.',invite:'Invite to play',accept:'Let\'s play!',challenge:'wants to play',failure:'Can\'t go online right now. Try again in a bit.',full:'This town is full. Try another one!',bad:'That invite link or room code doesn\'t look right.',expired:'That invite has expired. Send a new one!',level:'Level',games:['Sky Islands','Number Tower','English Portals','Memory Floor','Word & Number Farm','Piko Circuit','Brick Blitz','Fruit Storm','Ninja Typing','Little Designer','Rhythm Parade'],emotes:['Wave','Laugh','Go go!','Heart']},
 ja:{title:'いっしょにおさんぽ',offline:'ひとりであそぶ',connecting:'つないでいるよ…',online:'人がまちにいるよ',retry:'つなぎなおしているよ…',create:'ともだちのまちをつくる',join:'まちに入る',public:'みんなのまち',code:'ともだちのしょうたいリンクか ルームコード',share:'しょうたいリンク',copy:'リンクをコピー',copied:'コピーしたよ！',leave:'オンラインをやめる',note:'しょうたいリンクで ともだちと会おう。みんなのまちは おうちの人のOKがいるよ。あいさつは きまったスタンプだけ。',invite:'いっしょにチャレンジ',accept:'いっしょにあそぶ！',challenge:'から あそびのおさそい',failure:'いまはつながらないよ。あとでためしてね。',full:'このまちはいっぱい！ほかのまちをえらんでね。',bad:'しょうたいリンクか ルームコードを たしかめてね。',expired:'おさそいのじかんがすぎたよ。もういちどさそってね。',level:'レベル',games:['スカイアイランド','すうじタワー','えいごゲート','メモリーフロア','まなびのはたけ','ピコサーキット','ブロックくずし','フルーツストーム','にんじゃタイピング','ちいさなデザイナー','リズムたいこ'],emotes:['てをふる','わらう','がんばれ','ハート']}
};
const GAMES=['obby','tower','runner','memory','garden','race','breakout','fruit','ninja','bubble','rhythm'];
const EMOJI=['👋','😄','🎉','❤️'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTownMultiplayer({mount,getLocale=()=> 'en',getPresence,onPeers=()=>{},onChallenge=()=>{},getLevel=()=>1}){
 const panel=document.createElement('details');panel.className='town-online';mount.append(panel);
 let room=null,self=null,socket=null,mode='invite',resume=null,disposed=false,wanted=false,generation=0,attempt=0,retryTimer=null,beat=null,lastPresence='',lastSent=0,status='offline',notice='',challenge=null,game=null,connecting=false;
 const peers=new Map(),w=()=>COPY[getLocale()]||COPY.en;
 const emit=()=>{onPeers([...peers.values()]);const count=panel.querySelector('[data-online-count]');if(count)count.textContent=status==='online'?`${peers.size+1} / 12 ${w().online}`:w()[status]||w().offline;panel.dataset.status=status;panel.dataset.peers=String(peers.size);};
 const send=data=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(data));};
 function storageGet(key){try{return sessionStorage.getItem(key);}catch{return null;}}
 function storageSet(key,value){try{if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,value);}catch{}}
 function sharedLink(){const url=new URL(location.href);url.hash=`town=${room}`;return url.href;}
 function parseCode(raw){const text=raw.trim();if(TOWN_ROOM_CODE.test(text))return text;try{return new URLSearchParams(new URL(text).hash.slice(1)).get('town');}catch{return null;}}
 function render(){
  const expanded=panel.open,words=w(),input=panel.querySelector('[data-room-code]')?.value||new URLSearchParams(location.hash.slice(1)).get('town')||'',selection=panel.querySelector('[data-challenge-game]')?.value||'obby';
  panel.innerHTML=`<summary>🌐 ${esc(words.title)} <small data-online-count></small></summary><div class="town-online-body"><p>${esc(words.note)}</p><p class="town-online-notice" role="status">${esc(notice)}</p>${wanted?`<div class="town-online-session"><label>${esc(words.share)}<input data-invitation readonly value="${esc(room?sharedLink():'')}" aria-label="${esc(words.share)}"></label><div class="town-online-actions"><button type="button" data-online="copy" ${!room?'disabled':''}>${esc(words.copy)}</button><button type="button" data-online="leave">${esc(words.leave)}</button></div><div class="town-emotes">${TOWN_EMOTES.map((id,i)=>`<button type="button" data-emote="${id}" aria-label="${esc(words.emotes[i])}" ${status!=='online'?'disabled':''}>${EMOJI[i]}</button>`).join('')}</div><div class="town-challenge-tools"><select data-challenge-game aria-label="${esc(words.invite)}">${GAMES.map((id,i)=>`<option value="${id}" ${id===selection?'selected':''}>${esc(words.games[i])}</option>`).join('')}</select><button type="button" data-online="invite" ${status!=='online'?'disabled':''}>${esc(words.invite)}</button></div><div data-challenge-card></div></div>`:`<div class="town-online-actions"><button type="button" data-online="create">${esc(words.create)}</button><button type="button" data-online="public">${esc(words.public)}</button></div><label>${esc(words.code)}<input data-room-code maxlength="300" autocomplete="off" value="${esc(input)}"></label><button type="button" data-online="join">${esc(words.join)}</button>`}</div>`;
  panel.open=expanded;emit();renderChallenge();
 }
 function renderChallenge(){const card=panel.querySelector('[data-challenge-card]');if(!card)return;if(!challenge||challenge.until<Date.now()||challenge.from===self){card.replaceChildren();return;}const i=GAMES.indexOf(challenge.game);card.innerHTML=`<div class="town-challenge-card"><p>${esc(challenge.name)} ${esc(w().challenge)} · ${esc(w().games[i]||challenge.game)} · ${esc(w().level)} ${challenge.level}</p><button type="button" data-online="accept">${esc(w().accept)}</button></div>`;}
 function clearTransport(){clearInterval(beat);beat=null;clearTimeout(retryTimer);retryTimer=null;if(socket){socket.onclose=null;socket.close(1000,'Leaving');socket=null;}peers.clear();emit();}
 function leave(){wanted=false;generation++;send({type:'leave'});clearTransport();if(room)storageSet(`piko-town-resume:${room}`,null);room=self=resume=challenge=null;status='offline';notice='';connecting=false;render();}
 function reconnect(){if(!wanted||disposed)return;status='retry';peers.clear();emit();if(attempt>=6){wanted=false;status='offline';notice=w().failure;render();return;}clearTimeout(retryTimer);retryTimer=setTimeout(()=>{attempt++;void connect(false);},Math.min(15000,1000*2**attempt));render();}
 async function connect(first=true){
  const current=++generation;connecting=true;status=first?'connecting':'retry';render();
  try{
   const body={mode,...(room?{room}:{}),...(resume?{resume}:{}),...(mode==='public'?{parentalGateAck:true}:{})};
   const response=await fetch('/api/town/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});
   const data=await response.json();if(current!==generation||!wanted||disposed)return;
   if(!response.ok)throw Object.assign(new Error(data.error),{code:data.error});
   room=data.room;resume=data.resume;self=data.self;storageSet(`piko-town-resume:${room}`,resume);
   const url=new URL(`/api/town/rooms/${room}/socket`,location.origin);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',data.ticket);
   socket=new WebSocket(url);const transport=socket;lastPresence='';lastSent=0;
   socket.onmessage=e=>{
    if(transport!==socket||current!==generation)return;let data;try{data=JSON.parse(e.data);}catch{return;}
    if(data.type==='welcome'){self=data.self;peers.clear();for(const p of data.peers)if(p.id!==self)peers.set(p.id,p);status='online';attempt=0;connecting=false;notice='';render();}
    if(data.type==='peer'&&data.peer.id!==self){peers.set(data.peer.id,data.peer);emit();}
    if(data.type==='left'){peers.delete(data.id);emit();}
    if(data.type==='challenge'){challenge=data.challenge;renderChallenge();if(challenge.from===self)send({type:'accept',id:challenge.id});}
    if(data.type==='start'){challenge=null;renderChallenge();try{const accepted=onChallenge(data.challenge);if(accepted===false){notice={zh:'你们的挑战等级不一样，升到同一级再邀请吧。',ja:'レベルがちがうよ。おなじレベルになったら、またさそってね。',en:'You\'re on different levels. Reach the same level, then invite again.'}[getLocale()]||w().failure;render();}else game=data.challenge.game;}catch{notice=w().failure;render();}}
    if(data.type==='error'){notice=data.error==='CHALLENGE_EXPIRED'?w().expired:w().failure;render();}
   };
   socket.onopen=()=>{clearInterval(beat);beat=setInterval(()=>{
    const raw=getPresence?.();if(!raw)return;const presence=cleanPresence({...raw,game:raw.game===undefined?game:raw.game});if(!presence)return;
    const next=JSON.stringify(presence),now=Date.now();if(next!==lastPresence){send({type:'presence',presence});lastPresence=next;lastSent=now;}else if(now-lastSent>=15000){send({type:'ping'});lastSent=now;}
    if(challenge?.until<Date.now()){challenge=null;renderChallenge();}
   },100);};
   socket.onclose=e=>{if(transport!==socket||current!==generation)return;clearInterval(beat);socket=null;connecting=false;if(e.code===4001||e.code===1008||e.code===1009){wanted=false;status='offline';notice=w().failure;peers.clear();render();}else reconnect();};
   socket.onerror=()=>{/* close drives bounded reconnect; no duplicate retry loops. */};
  }catch(error){if(current!==generation||!wanted||disposed)return;connecting=false;if(!first&&!['ROOM_FULL','ROOM_NOT_FOUND','PARENTAL_GATE_REQUIRED'].includes(error.code)){reconnect();return;}wanted=false;status='offline';notice=error.code==='ROOM_FULL'?w().full:w().failure;render();}
 }
 async function join(nextMode,code){
  if(connecting)return;
  if(nextMode==='public'&&!await requireParentalGate({purpose:'town-public-multiplayer',locale:getLocale()}))return;
  wanted=true;mode=nextMode;room=code||null;resume=room?storageGet(`piko-town-resume:${room}`):null;notice='';attempt=0;await connect();
 }
 panel.addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.emote){send({type:'emote',emote:button.dataset.emote});return;}
  const action=button.dataset.online;
  if(action==='create')await join('invite');
  if(action==='public')await join('public');
  if(action==='join'){const code=parseCode(panel.querySelector('[data-room-code]').value);if(!TOWN_ROOM_CODE.test(code||'')){notice=w().bad;render();return;}await join(code.startsWith('public-')?'public':'invite',code);}
  if(action==='leave')leave();
  if(action==='copy'&&room){try{await navigator.clipboard.writeText(sharedLink());notice=w().copied;render();}catch{panel.querySelector('[data-invitation]')?.select();}}
  if(action==='invite'){const p=getPresence?.()||{};send({type:'invite',game:panel.querySelector('[data-challenge-game]').value,level:Math.max(1,Math.min(20,Math.trunc(p.level??getLevel())||1)),infiniteRound:p.infiniteRound||0});}
  if(action==='accept'&&challenge){send({type:'accept',id:challenge.id});challenge=null;renderChallenge();}
 });
 const onPageHide=()=>{wanted=false;send({type:'leave'});clearTransport();};window.addEventListener('pagehide',onPageHide);
 render();if(new URLSearchParams(location.hash.slice(1)).has('town'))panel.open=true;
 return {setGame(value){game=value;},inviteGame(value,level=1,infiniteRound=0){send({type:'invite',game:value,level:Math.max(1,Math.min(20,level)),infiniteRound});},refreshLocale:render,leave,get connected(){return status==='online';},get room(){return room;},destroy(){disposed=true;leave();window.removeEventListener('pagehide',onPageHide);panel.remove();}};
}
