import {HOME_COPY,learningSections} from './HomeContent.mjs';
import {Globe} from './Globe.mjs';
import {readCountry,saveCountry,normalizeCountry,nativeRegionName} from './Country.mjs';
import {COUNTRY_CODES} from './CountryCodes.mjs';
import {initSiteVisits} from '../stats/SiteVisits.js';
const words={
  en:{kicker:'ONE PLANET. ENDLESS DISCOVERIES.',title:'Your adventure starts here.',intro:'Spin the globe. Choose a learning route. A world of little discoveries is waiting for you.',label:'Choose a country to explore',placeholder:'Choose on the globe or from this list',start:'Let’s play →',hint:'Drag to spin · tap a country to choose. Arrow keys rotate; Enter selects the centre.',detected:'Suggested from your connection. You can change it.',saved:'Your saved choice. You can change it anytime.',unknown:'Choose your country to get started.',selected:'Ready to explore!',language:'English',loading:'Finding your corner of the world…',mapError:'The map could not load. You can still use the country list.',left:'Rotate west',right:'Rotate east',reset:'Centre on selection',footer:'Explore any country. Interface language stays your choice. Japan courses use Japanese lessons.',privacy:'Your country choice is saved on this device.',privacyLink:'Privacy',termsLink:'Terms',japanese:'Japanese school courses',globe:'Interactive 3D country globe',source:'Map: Natural Earth'},
  zh:{kicker:'一个地球，无数发现。',title:'你的冒险，从这里开始。',intro:'转动地球，选择想探索的学习路线。世界各地的小小发现，正在等着你。',label:'选择想探索的国家或地区',placeholder:'点击地球，或从列表中选择',start:'开始探险 →',hint:'拖动旋转 · 点击国家选择。方向键可旋转，回车选择正中心的国家。',detected:'已根据网络位置推荐，你可以重新选择。',saved:'已恢复你保存的选择，可以随时更改。',unknown:'选择你的国家，开始探索吧。',selected:'准备好，一起探索！',language:'中文',loading:'正在寻找你的世界坐标…',mapError:'地图暂时无法加载，仍可使用国家列表。',left:'向西旋转',right:'向东旋转',reset:'回到所选国家',footer:'自由探索任何国家，界面语言由你选择。日本课程使用日语原文。',privacy:'国家选择会保存在这台设备上。',privacyLink:'隐私说明',termsLink:'使用条款',japanese:'日本小学课程',globe:'可交互的3D国家地球',source:'地图：Natural Earth'},
  ja:{kicker:'ひとつの ちきゅう。たくさんの はっけん。',title:'ぼうけんは、ここから。',intro:'ちきゅうを まわして、まなびたい くにを えらぼう。せかいの はっけんが まっているよ。',label:'まなびたい くに・ちいきを えらぼう',placeholder:'ちきゅうか リストから えらぼう',start:'たんけんに しゅっぱつ →',hint:'ドラッグで まわす · くにを タップして えらぶ。やじるしキーで まわし、Enterで まんなかを えらべるよ。',detected:'ネットの ばしょから えらんだよ。かえても だいじょうぶ。',saved:'まえに えらんだ くにだよ。いつでも かえられるよ。',unknown:'くにを えらんで はじめよう。',selected:'さあ、たんけんの じゅんび！',language:'日本語',loading:'きみの せかいを さがしているよ…',mapError:'ちずを よみこめません。リストから えらんでね。',left:'にしへ まわす',right:'ひがしへ まわす',reset:'えらんだ くにへ',footer:'どの国もえらべます。画面のことばは自由。日本コースは日本語の教材です。',privacy:'えらんだ くには このきかいに ほぞんするよ。',privacyLink:'プライバシー',termsLink:'利用規約',japanese:'にほんの がくねんべつコース',globe:'くにを えらべる3Dちきゅう',source:'ちず：Natural Earth'}
};
const townHomeCopy=HOME_COPY;
const townName={en:'Piko Town',zh:'Piko 小镇',ja:'Piko まなびタウン'};
const common=['JP','CN','US','GB','AU','NZ'];
function regionName(code,locale){try{return new Intl.DisplayNames([locale],{type:'region'}).of(code);}catch{return code;}}
const fallback=COUNTRY_CODES.map(code=>({code,names:{en:regionName(code,'en'),ja:regionName(code,'ja'),zh:regionName(code,'zh')},polygons:[],center:[0,0]}));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function showCountryHome(){
  if(new URLSearchParams(location.search).get('course')==='jp'){document.documentElement.lang='ja';document.title='Piko Game · 日本の小学コース';initSiteVisits(null);document.body.classList.remove('country-entry');return;}
  const host=document.querySelector('#country-home');
  const query=new URLSearchParams(location.search);
  let savedLanguage;try{savedLanguage=localStorage.getItem('world-locale');}catch{}
  const homeLocale=[query.get('locale'),savedLanguage,navigator.language?.slice(0,2),'en'].find(l=>townHomeCopy[l]);
  const homeCopy=townHomeCopy[homeLocale];
  const content=host?.querySelector('#global-home-content');if(content)content.innerHTML=learningSections(homeLocale);
  document.documentElement.lang=homeLocale;
  host?.querySelectorAll('[data-town-link]').forEach(link=>{link.href='/town?locale='+homeLocale;link.textContent=link.id==='home-town-entry'?homeCopy.enter+' →':townName[homeLocale];});
  const heading=host?.querySelector('[data-town-heading]');if(heading)heading.innerHTML=homeCopy.title;
  const intro=host?.querySelector('[data-town-intro]');if(intro)intro.textContent=homeCopy.intro;
  const learning=host?.querySelector('#country-home-play-now');if(learning)learning.textContent=homeCopy.path+' →';
  const labels={en:['LEARNING WITHOUT BORDERS','No download','Start without an account','Explore','Think','Try again'],zh:['学习没有国界','无需下载','无需账号即可开始','探索','思考','再试一次'],ja:['国境をこえる学び','ダウンロード不要','アカウントなしで開始','たんけん','考える','もう一度']}[homeLocale];
  const eyebrow=host?.querySelector('.about-eyebrow');if(eyebrow)eyebrow.textContent=labels[0];
  host?.querySelectorAll('.about-hero li').forEach((el,i)=>{if(i<2)el.textContent=labels[i+1];});
  host?.querySelectorAll('.about-orbit b,.about-orbit i,.about-orbit strong').forEach((el,i)=>el.textContent=labels[i+3]);
  host?.querySelectorAll('.about-play-actions a[href]').forEach(el=>{if(el.id==='country-home-play-now')return;const u=new URL(el.href);u.searchParams.set('lang',homeLocale);el.href=u.pathname+u.search;});
  if(homeLocale!=='en'){
    const featureCopy={zh:[['自由探索世界','界面语言与学习路线独立选择，从熟悉的课堂走向新的发现。'],['清晰的下一步','选择年级和科目，通过短小挑战逐步学习，并查看自己的进度。'],['温和的学习反馈','利用提示、解释和再次尝试，逐步形成自己的解题方法。']],ja:[['世界を自由にたんけん','画面のことばと学習コースを別々にえらんで、新しい学びを見つけよう。'],['次の一歩がわかる','学年と教科をえらび、短いちょうせんで少しずつ進もう。'],['やさしいフィードバック','ヒントや説明を見て、もう一度ためして自分の方法を見つけよう。']]}[homeLocale];
    host.querySelectorAll('.about-features article').forEach((el,i)=>{el.querySelector('h2').textContent=featureCopy[i][0];el.querySelector('p').textContent=featureCopy[i][1];});
    const demo=host.querySelector('.about-learning');
    demo.innerHTML=homeLocale==='zh'?'<h2 id="learning-title">先尝试，再探索</h2><p>同一道逻辑题，可以用不同语言思考。在 4 × 4 数独中，一行是 1 · 空格 · 3 · 空格；第一个空格所在的列已有 4。这里应该填什么？</p><details><summary>看看推理过程</summary><p>这一行还缺 2 和 4，但第一个空格的列已有 4，所以这里填 2。完整棋盘还需要检查 2 × 2 宫格。</p></details>':'<h2 id="learning-title">ためしてから、たんけんしよう</h2><p>4 × 4の数独で、よこの列は 1 · 空白 · 3 · 空白。最初の空白のたての列には4があります。何が入るかな？</p><details><summary>考え方を見る</summary><p>足りない数字は2と4。たての列に4があるので、最初の空白は2。盤面では2 × 2のブロックも確認しよう。</p></details>';
    demo.innerHTML+='<nav><a href="/'+homeLocale+'/guides/">'+homeCopy.library+' →</a><a href="/'+homeLocale+'/learning-guide">'+(homeLocale==='zh'?'学习指南':'学習ガイド')+' →</a></nav>';
  }
  // Keep the legacy globe selector optional; the homepage cards open courses directly.
  if(query.get('choose-country')!=='1'){await new Promise(()=>{});return;}
  let storage;try{storage=localStorage;}catch{}
  host.classList.add('country-picker');
  let chosen=readCountry(storage),locale=homeLocale,manual=!!chosen,status=chosen?'saved':'loading',countries=fallback,globe,alive=true,mapFailed=false;
  const current=()=>words[locale];
  const select=code=>{chosen=normalizeCountry(code);if(!chosen)return;manual=true;saveCountry(storage,chosen);try{storage?.setItem('world-locale',locale);}catch{};status='selected';renderText();globe?.select(chosen);};
  host.innerHTML=`<nav class="country-nav"><span class="country-brand">✳ Piko <b>Game</b></span><label class="language-badge">${HOME_COPY[locale].language} <select id="country-ui-language" aria-label="${HOME_COPY[locale].language}"><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option></select></label></nav><main class="country-layout"><section class="country-copy"><p class="country-kicker" data-home="kicker"></p><h1 data-home="title"></h1><p class="country-intro" data-home="intro"></p><div class="country-form"><label for="country-select" data-home="label"></label><select id="country-select"></select><p class="country-status" id="country-status" role="status"></p><a class="country-start" id="country-start" data-home="start" href="world.html" aria-disabled="true"></a><a class="country-start" id="country-town" href="/town?locale=en">Piko Town →</a><a class="country-japanese" id="country-arena" href="arena.html">Piko Playroom</a><a class="country-japanese" id="country-amc" href="/amc">AMC</a><a class="country-japanese" id="country-japanese" href="?course=jp" data-home="japanese" hidden></a></div></section><section class="country-globe"><canvas id="country-canvas" tabindex="0" role="img"></canvas><div class="globe-tools"><button type="button" id="globe-left">←</button><button type="button" id="globe-reset">◎</button><button type="button" id="globe-right">→</button></div><p class="globe-hint" data-home="hint"></p><div class="country-chiprow" id="country-chips"></div></section></main><footer class="country-footer"><div><span data-home="footer"></span><br><span data-home="privacy"></span></div><div><a href="/en/" lang="en">About</a> · <a href="/ja/" lang="ja">日本語</a> · <a href="/zh/" lang="zh-Hans">中文</a><br><a href="privacy.html" data-home="privacyLink"></a> · <a href="terms.html" data-home="termsLink"></a> · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener" data-home="source"></a></div></footer>`;
  initSiteVisits(host.querySelector('.country-nav'));
  function renderText(){
    const w=current();document.documentElement.lang=locale;document.title=`Piko Game · ${w.title}`;
    host.querySelectorAll('[data-home]').forEach(el=>{el.textContent=w[el.dataset.home];});
    host.querySelector('#country-ui-language').value=locale;
    const townLink=host.querySelector('#country-town');townLink.textContent=townHomeCopy[locale].enter+' →';townLink.href='/town?'+new URLSearchParams({locale,...(chosen?{country:chosen}:{})});
    const arenaLink=host.querySelector("#country-arena");arenaLink.textContent={zh:"Piko Playroom",ja:"Piko Playroom",en:"Piko Playroom"}[locale];arenaLink.href=`arena.html?lang=${locale}`;
    host.querySelector('#country-amc').href=`/amc?lang=${locale}`;
    host.querySelector('#country-status').textContent=mapFailed?w.mapError:w[status];
    const list=host.querySelector('#country-select');
    list.innerHTML=`<option value="">${escape(w.placeholder)}</option>`+[...countries].filter((c,i)=>c.code&&countries.findIndex(other=>other.code===c.code)===i).map(c=>({...c,nativeName:nativeRegionName(c.code)})).sort((a,b)=>a.nativeName.localeCompare(b.nativeName)).map(c=>`<option value="${c.code}">${escape(c.nativeName)}</option>`).join('');list.value=chosen||'';
   const start=host.querySelector('#country-start');start.setAttribute('aria-disabled',chosen?'false':'true');start.href=chosen?(chosen==='JP'?'?course=jp':`grades.html?country=${chosen}&locale=${locale}`):'grades.html';
    const gradeLink=host.querySelector('#country-japanese');
    gradeLink.hidden=!chosen;
    gradeLink.textContent=locale==='zh'?'自由选小游戏':locale==='ja'?'ゲームを じゆうに えらぶ':'Choose a game freely';
    gradeLink.href=chosen?`world.html?country=${chosen}&locale=${locale}`:'world.html';
    host.querySelector('#country-canvas').setAttribute('aria-label',w.globe);
    for(const [id,key]of [['left','left'],['right','right'],['reset','reset']])host.querySelector(`#globe-${id}`).setAttribute('aria-label',w[key]);
    host.querySelector('#country-chips').innerHTML=common.map(code=>`<button type="button" data-country="${code}" aria-pressed="${code===chosen}">${escape(nativeRegionName(code))}</button>`).join('');
  }
  host.querySelector('#country-ui-language').onchange=e=>{locale=e.target.value;try{storage?.setItem('world-locale',locale);}catch{};query.set('locale',locale);history.replaceState(null,'',location.pathname+'?'+query);renderText();};
  host.querySelector('#country-select').onchange=e=>select(e.target.value);
  host.querySelector('#country-chips').onclick=e=>{const code=e.target.closest('[data-country]')?.dataset.country;if(code)select(code);};
  host.querySelector('#globe-left').onclick=()=>globe?.rotate(-25);
  host.querySelector('#globe-right').onclick=()=>globe?.rotate(25);
  host.querySelector('#globe-reset').onclick=()=>globe?.select(chosen);
  renderText();
  const pending=[
    fetch('/api/location',{cache:'no-store',signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!alive||manual)return;chosen=normalizeCountry(data.country);status=chosen?'detected':'unknown';renderText();globe?.select(chosen);}).catch(()=>{if(alive&&!manual){status='unknown';renderText();}}),
    fetch('assets/maps/countries-50m.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!alive)return;countries=data.countries;globe=new Globe(host.querySelector('#country-canvas'),countries,select);if(chosen)globe.select(chosen);renderText();}).catch(()=>{if(alive){mapFailed=true;renderText();}})
  ];
  void Promise.allSettled(pending);
  const cleanup=()=>{alive=false;globe?.destroy();};
  window.addEventListener('pagehide',cleanup,{once:true});
  // Japan resumes the existing curriculum without reloading; other regions navigate to their grade maps.
  await new Promise(resolve=>{host.querySelector('#country-start').onclick=e=>{if(!chosen){e.preventDefault();return;}saveCountry(storage,chosen);try{storage?.setItem('world-locale',locale);}catch{};if(chosen!=='JP')return;e.preventDefault();cleanup();history.replaceState(null,'','?course=jp');document.body.classList.remove('country-entry');document.documentElement.lang='ja';resolve();};});
}
