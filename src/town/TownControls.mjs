import {setupTownInteractionLock} from './TownInteractionLock.mjs';
const COPY={
 zh:{stick:'摇杆：上下前进后退，左右转弯',carTip:'开车：摇杆上下踩油门，左右转弯；进建筑前先换成步行',planeTip:'开飞机：摇杆控制方向，按住 ↑ / ↓ 升降；换成步行就能安全降落',ride:'交通工具',foot:'步行',car:'开汽车',plane:'开飞机',up:'上升',down:'下降',tip:'左下摇杆走路转弯 · 拖动画面看四周 · ↑ 跳跃 / 飞机上升'},
 en:{stick:'Stick: up/down to move, left/right to turn',carTip:'Drive with the stick. Switch to Walk before going into buildings.',planeTip:'Steer with the stick and hold ↑ / ↓ to go up or down. Switch to Walk to land safely.',ride:'Get around',foot:'Walk',car:'Drive',plane:'Fly',up:'Up',down:'Down',tip:'Left stick: move & turn · Drag to look around · ↑ Jump / fly up'},
 ja:{stick:'スティック：上下で前・うしろ、左右でまがる',carTip:'スティックでうんてん。たてものに入るまえに「歩く」にしてね。',planeTip:'スティックでとぶ。↑ / ↓ でのぼる・おりる。「歩く」にすると、ふわっとおりるよ！',ride:'のりもの',foot:'歩く',car:'くるま',plane:'ひこうき',up:'のぼる',down:'おりる',tip:'左のスティックで歩く・まがる · ドラッグで見まわす · ↑ ジャンプ／のぼる'}
};
export function setupTownControls({scene,overlay,getLocale,onChange}){
 const abort=new AbortController(),signal=abort.signal,w=()=>COPY[getLocale()]||COPY.en;
 const unlock=setupTownInteractionLock();
 overlay.querySelector('.dpad')?.remove();
 overlay.querySelectorAll('[data-camera="left"],[data-camera="right"]').forEach(el=>el.remove());
 const stick=document.createElement('div');stick.className='town-joystick';stick.tabIndex=0;stick.setAttribute('role','group');stick.innerHTML='<span class="stick-directions" aria-hidden="true">↕ ↔</span><span class="stick-thumb" aria-hidden="true"></span>';
 overlay.append(stick);let pointer=null;
 const reset=()=>{pointer=null;scene.setStick(0,0);stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');stick.classList.remove('is-held');};
 const move=e=>{if(e.pointerId!==pointer)return;const r=stick.getBoundingClientRect(),radius=r.width*.32,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,radius/Math.max(1,len));scene.setStick(dx*scale/radius,dy*scale/radius);stick.style.setProperty('--stick-x',`${dx*scale}px`);stick.style.setProperty('--stick-y',`${dy*scale}px`);};
 stick.addEventListener('pointerdown',e=>{if(pointer!==null||scene.isPaused())return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stick.classList.add('is-held');move(e);},{signal});
 stick.addEventListener('pointermove',move,{signal});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===pointer)reset();},{signal});
 stick.addEventListener('keydown',e=>{const v={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(v){e.preventDefault();e.stopPropagation();scene.setStick(...v);}},{signal});stick.addEventListener('keyup',reset,{signal});stick.addEventListener('blur',reset,{signal});
 window.addEventListener('blur',reset,{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();},{signal});
 const ride=document.createElement('div');ride.className='town-ride';ride.setAttribute('role','group');overlay.append(ride);
 const rideButtons=['foot','car','plane'].map(id=>{const button=document.createElement('button');button.type='button';button.dataset.vehicle=id;button.innerHTML='<span aria-hidden="true">'+({foot:'🚶',car:'🚗',plane:'✈️'}[id])+'</span><small></small>';ride.append(button);button.addEventListener('click',()=>{reset();scene.stop();scene.setVehicle(id);refresh();onChange();button.blur();scene.canvas.focus({preventScroll:true});},{signal});return button;});
 const down=document.createElement('button');down.type='button';down.className='town-descend';down.textContent='↓';overlay.append(down);
 for(const [button,value]of [[overlay.querySelector('[data-camera="jump"]'),1],[down,-1]]){
  button.addEventListener('pointerdown',e=>{if(scene.vehicle!=='plane')return;e.preventDefault();button.setPointerCapture(e.pointerId);scene.lift=value;},{signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{scene.lift=0;},{signal});
 }
 const observer=new MutationObserver(()=>{reset();refresh();});observer.observe(scene.canvas,{attributes:true,attributeFilter:['data-mode']});
 function refresh(){const t=w();stick.setAttribute('aria-label',t.stick);stick.title=t.stick;ride.setAttribute('aria-label',t.ride);for(const button of rideButtons){const id=button.dataset.vehicle;button.querySelector('small').textContent=t[id];button.setAttribute('aria-label',t[id]);button.setAttribute('aria-pressed',String(id===(scene.vehicle||'foot')));}ride.hidden=!!scene.mode;down.hidden=scene.vehicle!=='plane'||!!scene.mode;down.setAttribute('aria-label',t.down);overlay.dataset.travel=scene.vehicle||'foot';document.getElementById('walk-tip').textContent=scene.vehicle==='car'?t.carTip:scene.vehicle==='plane'?t.planeTip:t.tip;}
 refresh();return {refresh,dispose(){reset();observer.disconnect();abort.abort();unlock();stick.remove();ride.remove();down.remove();}};
}
