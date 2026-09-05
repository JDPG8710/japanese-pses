import {Globe} from './Globe.mjs';
import {readCountry,saveCountry,normalizeCountry,languageForCountry,nativeRegionName} from './Country.mjs';
import {COUNTRY_CODES} from './CountryCodes.mjs';
const words={
  en:{kicker:'ONE PLANET. ENDLESS DISCOVERIES.',title:'Your adventure starts here.',intro:'Spin the globe. Find your home. A world of little discoveries is waiting for you.',label:'Choose your country or region',placeholder:'Choose on the globe or from this list',start:'Let’s play →',hint:'Drag to spin · tap a country to choose. Arrow keys rotate; Enter selects the centre.',detected:'Suggested from your connection. You can change it.',saved:'Your saved choice. You can change it anytime.',unknown:'Choose your country to get started.',selected:'Ready to explore!',language:'English',loading:'Finding your corner of the world…',mapError:'The map could not load. You can still use the country list.',left:'Rotate west',right:'Rotate east',reset:'Centre on selection',footer:'Japan → 日本語 · China → 中文 · Everywhere else → English',privacy:'Your country choice is saved on this device.',privacyLink:'Privacy',termsLink:'Terms',japanese:'Japanese school courses',globe:'Interactive 3D country globe',source:'Map: Natural Earth'},
  zh:{kicker:'一个地球，无数发现。',title:'你的冒险，从这里开始。',intro:'转动地球，找到你的国家。世界各地的小小发现，正在等着你。',label:'选择国家或地区',placeholder:'点击地球，或从列表中选择',start:'开始探险 →',hint:'拖动旋转 · 点击国家选择。方向键可旋转，回车选择正中心的国家。',detected:'已根据网络位置推荐，你可以重新选择。',saved:'已恢复你保存的选择，可以随时更改。',unknown:'选择你的国家，开始探索吧。',selected:'准备好，一起探索！',language:'中文',loading:'正在寻找你的世界坐标…',mapError:'地图暂时无法加载，仍可使用国家列表。',left:'向西旋转',right:'向东旋转',reset:'回到所选国家',footer:'日本 → 日本語 · 中国 → 中文 · 其他国家 → English',privacy:'国家选择会保存在这台设备上。',privacyLink:'隐私说明',termsLink:'使用条款',japanese:'日本小学课程',globe:'可交互的3D国家地球',source:'地图：Natural Earth'},
  ja:{kicker:'ひとつの ちきゅう。たくさんの はっけん。',title:'ぼうけんは、ここから。',intro:'ちきゅうを まわして、じぶんの くにを みつけよう。せかいの はっけんが まっているよ。',label:'くに・ちいきを えらぼう',placeholder:'ちきゅうか リストから えらぼう',start:'たんけんに しゅっぱつ →',hint:'ドラッグで まわす · くにを タップして えらぶ。やじるしキーで まわし、Enterで まんなかを えらべるよ。',detected:'ネットの ばしょから えらんだよ。かえても だいじょうぶ。',saved:'まえに えらんだ くにだよ。いつでも かえられるよ。',unknown:'くにを えらんで はじめよう。',selected:'さあ、たんけんの じゅんび！',language:'日本語',loading:'きみの せかいを さがしているよ…',mapError:'ちずを よみこめません。リストから えらんでね。',left:'にしへ まわす',right:'ひがしへ まわす',reset:'えらんだ くにへ',footer:'日本 → 日本語 · 中国 → 中文 · ほかのくに → English',privacy:'えらんだ くには このきかいに ほぞんするよ。',privacyLink:'プライバシー',termsLink:'利用規約',japanese:'にほんの がくねんべつコース',globe:'くにを えらべる3Dちきゅう',source:'ちず：Natural Earth'}
};
const common=['JP','CN','US','GB','AU','NZ'];
function regionName(code,locale){try{return new Intl.DisplayNames([locale],{type:'region'}).of(code);}catch{return code;}}
const fallback=COUNTRY_CODES.map(code=>({code,names:{en:regionName(code,'en'),ja:regionName(code,'ja'),zh:regionName(code,'zh')},polygons:[],center:[0,0]}));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function showCountryHome(){
  if(new URLSearchParams(location.search).get('course')==='jp'){document.body.classList.remove('country-entry');return;}
  const host=document.querySelector('#country-home');
  let storage;try{storage=localStorage;}catch{}
  let chosen=readCountry(storage),locale=languageForCountry(chosen),manual=!!chosen,status=chosen?'saved':'loading',countries=fallback,globe,alive=true,mapFailed=false;
  const current=()=>words[locale];
  const select=code=>{chosen=normalizeCountry(code);if(!chosen)return;manual=true;saveCountry(storage,chosen);locale=languageForCountry(chosen);status='selected';renderText();globe?.select(chosen);};
  host.innerHTML=`<nav class="country-nav"><span class="country-brand">✳ Piko <b>Play</b></span><span class="language-badge" id="country-language"></span></nav><main class="country-layout"><section class="country-copy"><p class="country-kicker" data-home="kicker"></p><h1 data-home="title"></h1><p class="country-intro" data-home="intro"></p><div class="country-form"><label for="country-select" data-home="label"></label><select id="country-select"></select><p class="country-status" id="country-status" role="status"></p><a class="country-start" id="country-start" data-home="start" href="world.html" aria-disabled="true"></a><a class="country-japanese" id="country-japanese" href="?course=jp" data-home="japanese" hidden></a></div></section><section class="country-globe"><canvas id="country-canvas" tabindex="0" role="img"></canvas><div class="globe-tools"><button type="button" id="globe-left">←</button><button type="button" id="globe-reset">◎</button><button type="button" id="globe-right">→</button></div><p class="globe-hint" data-home="hint"></p><div class="country-chiprow" id="country-chips"></div></section></main><footer class="country-footer"><div><span data-home="footer"></span><br><span data-home="privacy"></span></div><div><a href="privacy.html" data-home="privacyLink"></a> · <a href="terms.html" data-home="termsLink"></a> · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener" data-home="source"></a></div></footer>`;
  function renderText(){
    const w=current();document.documentElement.lang=locale;document.title=`Piko Play · ${w.title}`;
    host.querySelectorAll('[data-home]').forEach(el=>{el.textContent=w[el.dataset.home];});
    host.querySelector('#country-language').textContent=w.language;
    host.querySelector('#country-status').textContent=mapFailed?w.mapError:w[status];
    const list=host.querySelector('#country-select');
    list.innerHTML=`<option value="">${escape(w.placeholder)}</option>`+[...countries].filter((c,i)=>c.code&&countries.findIndex(other=>other.code===c.code)===i).map(c=>({...c,nativeName:nativeRegionName(c.code)})).sort((a,b)=>a.nativeName.localeCompare(b.nativeName)).map(c=>`<option value="${c.code}">${escape(c.nativeName)}</option>`).join('');list.value=chosen||'';
   const start=host.querySelector('#country-start');start.setAttribute('aria-disabled',chosen?'false':'true');start.href=chosen?(chosen==='JP'?'?course=jp':`grades.html?country=${chosen}`):'grades.html';
    const gradeLink=host.querySelector('#country-japanese');
    gradeLink.hidden=!chosen;
    gradeLink.textContent=locale==='zh'?'自由选小游戏':locale==='ja'?'ゲームを じゆうに えらぶ':'Choose a game freely';
    gradeLink.href=chosen?`world.html?country=${chosen}`:'world.html';
    host.querySelector('#country-canvas').setAttribute('aria-label',w.globe);
    for(const [id,key]of [['left','left'],['right','right'],['reset','reset']])host.querySelector(`#globe-${id}`).setAttribute('aria-label',w[key]);
    host.querySelector('#country-chips').innerHTML=common.map(code=>`<button type="button" data-country="${code}" aria-pressed="${code===chosen}">${escape(nativeRegionName(code))}</button>`).join('');
  }
  host.querySelector('#country-select').onchange=e=>select(e.target.value);
  host.querySelector('#country-chips').onclick=e=>{const code=e.target.closest('[data-country]')?.dataset.country;if(code)select(code);};
  host.querySelector('#globe-left').onclick=()=>globe?.rotate(-25);
  host.querySelector('#globe-right').onclick=()=>globe?.rotate(25);
  host.querySelector('#globe-reset').onclick=()=>globe?.select(chosen);
  renderText();
  const pending=[
    fetch('/api/location',{cache:'no-store',signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!alive||manual)return;chosen=normalizeCountry(data.country);locale=languageForCountry(chosen);status=chosen?'detected':'unknown';renderText();globe?.select(chosen);}).catch(()=>{if(alive&&!manual){status='unknown';renderText();}}),
    fetch('assets/maps/countries-50m.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!alive)return;countries=data.countries;globe=new Globe(host.querySelector('#country-canvas'),countries,select);if(chosen)globe.select(chosen);renderText();}).catch(()=>{if(alive){mapFailed=true;renderText();}})
  ];
  void Promise.allSettled(pending);
  const cleanup=()=>{alive=false;globe?.destroy();};
  window.addEventListener('pagehide',cleanup,{once:true});
  // Japan resumes the existing curriculum without reloading; other regions navigate to their grade maps.
  await new Promise(resolve=>{host.querySelector('#country-start').onclick=e=>{if(!chosen){e.preventDefault();return;}saveCountry(storage,chosen);if(chosen!=='JP')return;e.preventDefault();cleanup();history.replaceState(null,'','?course=jp');document.body.classList.remove('country-entry');document.documentElement.lang='ja';resolve();};});
}
