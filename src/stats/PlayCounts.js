import {validPlayKey,formatPlayCount} from './PlayKeys.mjs';

const counts=new Map();
const words=locale=>locale==='zh'?['次游玩','暂时无法读取游玩次数']:locale==='en'?['plays','Play count unavailable']:['回プレイ','プレイ回数を読み込めません'];
function paint(root=document){
 root.querySelectorAll('[data-play-count]').forEach(el=>{
  const count=counts.get(el.dataset.playCount),[label,unavailable]=words(document.documentElement.lang);
  el.textContent=`▶ ${formatPlayCount(count)} ${label}`;
  el.title=Number.isSafeInteger(count)?`${count.toLocaleString('en-US')} ${label}`:unavailable;
  el.setAttribute('aria-label',el.title);
 });
}
export function countBadge(key){
 if(!validPlayKey(key))return '';
 return `<span data-play-count="${key}" style="display:block;width:fit-content;max-width:100%;margin-top:8px;padding:4px 9px;border-radius:10px;background:#e5f4ed;color:#174c3d;font-size:12px;font-weight:750;line-height:1.5;overflow-wrap:anywhere">▶ —</span>`;
}
export async function refreshPlayCounts(root=document){
 const keys=[...new Set([...root.querySelectorAll('[data-play-count]')].map(el=>el.dataset.playCount))].filter(validPlayKey);
 paint(root);if(!keys.length)return;
 try{
  for(let i=0;i<keys.length;i+=100){
   const response=await fetch(`/api/play-counts?${new URLSearchParams({keys:keys.slice(i,i+100).join(',')})}`,{cache:'no-store',signal:AbortSignal.timeout(6000)});
   if(!response.ok)throw new Error('COUNT_UNAVAILABLE');
   const data=await response.json();
   for(const key of keys.slice(i,i+100)){const n=data.counts?.[key];if(Number.isSafeInteger(n)&&n>=0)counts.set(key,Math.max(n,counts.get(key)||0));}
  }
 }catch{/* 未取得の数字は0ではなく「—」。ゲームは止めない。 */}
 paint(root);
}
export async function recordPlay(key){
 if(!validPlayKey(key)||typeof window==='undefined'||!globalThis.crypto?.getRandomValues)return;
 // Session単位では重複排除しない。通信再送だけ同じイベントIDを使う。
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
 const eventId=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 const body=JSON.stringify({key,eventId});
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch('/api/play-counts',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,body,signal:AbortSignal.timeout(6000)});
   if(!response.ok){if(response.status<500)return;throw new Error('COUNT_UNAVAILABLE');}
   const data=await response.json();if(Number.isSafeInteger(data.count)&&data.count>=0){counts.set(key,Math.max(counts.get(key)||0,data.count));paint();}return;
  }catch{/* 最大1回のみ再送。同じクリックを二重に数えない。 */}
 }
}

// 別の端末・言語で増えた累計も、タブや履歴へ戻ったときに取得する。
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'&&typeof document?.addEventListener==='function'){
 window.addEventListener('pageshow',()=>void refreshPlayCounts());
 window.addEventListener('focus',()=>void refreshPlayCounts());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshPlayCounts();});
}
