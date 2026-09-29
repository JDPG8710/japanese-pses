// Native fullscreen is optional. An in-page immersive view also works in embedded/mobile browsers.
export function setupTownFullscreen({button,scene,getLabel}){
 const root=document.documentElement,abort=new AbortController(),signal=abort.signal;
 let active=false,hadNative=false,scroll=0,previousOverflow='',generation=0;
 const native=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
 const sync=()=>{button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',getLabel(active));button.title=getLabel(active);button.textContent=active?'✕':'⛶';scene.size?.();};
 const size=()=>{root.style.setProperty('--town-view-height',`${window.visualViewport?.height||innerHeight}px`);sync();};
 function leave(){generation++;if(!active)return;active=false;root.classList.remove('town-immersive');document.body.style.overflow=previousOverflow;if(native()){try{(document.exitFullscreen||document.webkitExitFullscreen)?.call(document)?.catch?.(()=>{});}catch{}}hadNative=false;window.scrollTo(0,scroll);sync();}
 async function enter(){const token=++generation;scroll=scrollY;previousOverflow=document.body.style.overflow;active=true;root.classList.add('town-immersive');document.body.style.overflow='hidden';size();const request=root.requestFullscreen||root.webkitRequestFullscreen;if(request){try{await request.call(root);if(token!==generation){if(native())await document.exitFullscreen?.();return;}hadNative=native();}catch{ /* Keep the usable viewport-sized mode if native fullscreen is unavailable. */ }}sync();}
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();scene.stop();if(active)leave();else void enter();},{signal});
 const changed=()=>{if(hadNative&&!native())leave();else{hadNative=native();size();}};
 document.addEventListener('fullscreenchange',changed,{signal});document.addEventListener('webkitfullscreenchange',changed,{signal});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!document.querySelector('dialog[open]'))leave();},{signal});
 window.addEventListener('resize',size,{signal});window.visualViewport?.addEventListener('resize',size,{signal});
 size();return {refresh:sync,dispose(){leave();abort.abort();}};
}
