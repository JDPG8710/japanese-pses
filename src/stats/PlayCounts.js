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
 if(!validPlayKey(key)||typeof window==='undefined'||!globalThis.crypto?.randomUUID)return;
 // Session単位では重複排除しない。通信再送だけ同じイベントIDを使う。
 const body=JSON.stringify({key,eventId:crypto.randomUUID()});
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch('/api/play-counts',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,body,signal:AbortSignal.timeout(6000)});
   if(!response.ok){if(response.status<500)return;throw new Error('COUNT_UNAVAILABLE');}
   const data=await response.json();if(Number.isSafeInteger(data.count)&&data.count>=0){counts.set(key,Math.max(counts.get(key)||0,data.count));paint();}return;
  }catch{/* 最大1回のみ再送。同じクリックを二重に数えない。 */}
 }
}
