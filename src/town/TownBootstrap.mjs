/** Small entry module: the HTML loading screen paints before the 3D dependency graph. */
const copy={zh:{eyebrow:'Piko 学习小镇',title:'Piko 学习小镇准备中',modules:'正在加载小镇和游戏',gallery:'正在准备设计零件',scene:'正在布置小镇',ready:'小镇准备好啦！',games:'正在悄悄准备设计素材',error:'加载中断了，再试一次吧。',retry:'重新加载'},en:{eyebrow:'PIKO TOWN',title:'Getting Piko Town ready',modules:'Loading the town and games',gallery:'Getting design parts ready',scene:'Building the town',ready:'The town is ready!',games:'Getting design parts ready',error:'Loading stopped – let\'s try again.',retry:'Reload'},ja:{eyebrow:'ピコタウン',title:'ピコタウンをじゅんび中',modules:'まちとゲームをよみこみ中',gallery:'デザインのパーツをじゅんび中',scene:'まちをつくっているよ',ready:'まちのじゅんびができたよ！',games:'デザインのパーツをじゅんび中',error:'よみこめなかったよ。もういちどためしてね。',retry:'もういちどよみこむ'}};
let saved;try{saved=localStorage.getItem('world-locale');}catch{}
const locale=[new URLSearchParams(location.search).get('locale'),saved,navigator.language?.slice(0,2),'en'].find(l=>copy[l]),t=copy[locale];
const screen=document.querySelector('[data-town-loading]'),bar=screen.querySelector('progress'),status=screen.querySelector('[data-load-status]'),percent=screen.querySelector('[data-load-percent]'),retry=screen.querySelector('button'),background=document.querySelector('[data-game-preload]'),controller=new AbortController();
screen.querySelector('small').textContent=t.eyebrow;screen.querySelector('h2').textContent=t.title;bar.setAttribute('aria-label',t.title);screen.setAttribute('aria-label',t.title);retry.textContent=t.retry;retry.onclick=()=>location.reload();
function progress(value,text){bar.value=value;percent.textContent=Math.floor(value)+'%';status.textContent=text;screen.dataset.progress=String(Math.floor(value));}
const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
window.addEventListener('pagehide',()=>controller.abort(),{once:true});
try{
 let completed=0,arcade;progress(0,t.modules);await paint();
 const jobs=[()=>import('./TownRules.mjs'),()=>import('./TownScene3D.mjs'),()=>import('./TownExpansion.mjs'),()=>import('../arcade/ArcadeHub.mjs').then(m=>arcade=m),()=>import('./TownMultiplayer.mjs'),()=>import('./TownAudio.mjs')];
 await Promise.all(jobs.map(async load=>{await load();progress(++completed/jobs.length*70,t.modules+` · ${completed}/${jobs.length}`);}));
 await arcade.preloadArcadeAssets({initialOnly:true,signal:controller.signal,onProgress:(done,total)=>progress(70+done/total*20,t.gallery+` · ${done}/${total}`)});
 progress(90,t.scene);await paint();await import('./TownApp.mjs');await paint();progress(100,t.ready);await paint();screen.hidden=true;document.body.setAttribute('aria-busy','false');window.dispatchEvent(new CustomEvent('town-loaded'));
 background.hidden=false;let last=-1;
 await arcade.preloadArcadeAssets({signal:controller.signal,onProgress:(done,total)=>{const value=Math.floor(done/total*100);if(value!==last){background.textContent=t.games+' · '+value+'%';last=value;}background.dataset.progress=String(value);}});
 background.hidden=true;background.dataset.ready='true';window.dispatchEvent(new CustomEvent('town-games-preloaded'));
}catch(error){if(controller.signal.aborted){}else if(!screen.hidden){progress(Number(bar.value),t.error);retry.hidden=false;screen.dataset.error='true';console.error('Town loading failed',error);}else{background.hidden=true;console.warn('Background design assets will be generated on demand',error);}}
