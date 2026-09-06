import {formatPlayCount} from './PlayKeys.mjs';
const labels={zh:['站点访问','按访问次数排序','尚无访问记录','暂时无法读取','未知地区'],ja:['サイトアクセス','アクセス順','まだ記録がありません','読み込めません','地域不明'],en:['Site visits','Most visits first','No visits yet','Unavailable','Unknown region']};
let started=false,data=null,panel=null;
function paint(){
 if(!panel)return;
 const locale=Object.hasOwn(labels,document.documentElement.lang)?document.documentElement.lang:'en',w=labels[locale];
 panel.querySelector('.visits-title').textContent=w[0];
 panel.querySelector('.visits-total').textContent=formatPlayCount(data?.total);
 panel.querySelector('.visits-total').title=data?data.total.toLocaleString(locale):w[3];
 const list=panel.querySelector('.visits-countries');list.replaceChildren();
 const preview=panel.querySelector('.visits-preview');preview.replaceChildren();
 panel.querySelector('summary').setAttribute('aria-label',`${w[0]} · ${w[1]}`);
 if(!data?.countries?.length){list.textContent=data?w[2]:w[3];return;}
 for(const row of [...data.countries].sort((a,b)=>b.count-a.count||a.country.localeCompare(b.country))){
  const item=document.createElement('li'),flag=document.createElement('span'),count=document.createElement('span');
  const code=row.country;let name=w[4];try{if(code!=='XX')name=new Intl.DisplayNames([locale],{type:'region'}).of(code);}catch{}
  flag.className='visits-flag';flag.setAttribute('aria-hidden','true');
  if(code==='XX')flag.textContent='🌐';else{const img=document.createElement('img');img.src=`/assets/flags/${code.toLowerCase()}.svg`;img.alt='';img.width=28;img.height=21;flag.append(img);}
  count.textContent=formatPlayCount(row.count);item.title=`${name}: ${row.count.toLocaleString(locale)}`;item.setAttribute('aria-label',item.title);item.append(flag,count);list.append(item);
  if(preview.children.length<3){const chip=document.createElement('span');chip.className='visits-chip';chip.title=item.title;chip.setAttribute('aria-label',item.title);chip.append(flag.cloneNode(true),count.cloneNode(true));preview.append(chip);}
 }
}
export function initSiteVisits(host){
 if(started)return;started=true;
 if(host){
  const link=document.createElement('link');link.rel='stylesheet';link.href='/src/stats/site-visits.css';document.head.append(link);
  panel=document.createElement('details');panel.className='site-visits';panel.innerHTML='<summary><span class="visits-title"></span><b class="visits-total">—</b><span class="visits-preview"></span></summary><ol class="visits-countries"></ol>';host.append(panel);paint();
  new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 void load();
}
async function load(){
 // ページを開く・更新するたびに1回。言語変更やパネル開閉では増えない。
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join(''),eventId=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 for(let attempt=0;attempt<2;attempt++)try{
  const response=await fetch('/api/site-visits',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId}),keepalive:true,signal:AbortSignal.timeout(6000)});
  if(response.ok){const result=await response.json();if(Number.isSafeInteger(result.total)&&Array.isArray(result.countries)){data=result;paint();}return;}
  if(response.status<500)break;
 }catch{/* 同一イベントIDで1回だけ再送する。 */}
 try{const response=await fetch('/api/site-visits',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(response.ok){data=await response.json();paint();}}catch{/* 未取得は「—」で示す。 */}
}
