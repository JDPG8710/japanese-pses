const COPY={
 zh:{stick:'滑动摇杆：上下前进后退，左右转向',carTip:'驾驶：摇杆上下油门、左右转向；进入建筑前选择步行',planeTip:'飞行：摇杆移动转向，按住 ↑ / ↓ 升降；选择步行可安全落地',ride:'交通工具',foot:'步行',car:'驾驶汽车',plane:'驾驶飞机',up:'爬升',down:'下降',tip:'左下摇杆移动与转向 · 拖动画面观察 · ↑ 跳跃 / 飞机爬升'},
 en:{stick:'Joystick: up/down to move, left/right to steer',carTip:'Drive with the stick; choose Walk before entering buildings.',planeTip:'Steer with the stick, hold ↑ / ↓ for altitude. Choose Walk to land safely.',ride:'Travel mode',foot:'Walk',car:'Drive car',plane:'Fly plane',up:'Climb',down:'Descend',tip:'Drag the left stick to move and steer · Drag the scene to look · ↑ Jump / climb'},
 ja:{stick:'スティック：上下で前後、左右で方向転換',carTip:'スティックで運転。建物に入る前に「歩く」を選ぼう。',planeTip:'スティックで飛行、↑ / ↓ を押して昇降。「歩く」で安全に着地。',ride:'のりもの',foot:'歩く',car:'車を運転',plane:'飛行機に乗る',up:'上昇',down:'下降',tip:'左のスティックで移動と方向転換 · 画面をドラッグで見回す · ↑ ジャンプ／上昇'}
};
export function setupTownControls({scene,overlay,getLocale,onChange}){
 const abort=new AbortController(),signal=abort.signal,w=()=>COPY[getLocale()]||COPY.en;
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
 const ride=document.createElement('select');ride.className='town-ride';ride.dataset.vehicle='select';overlay.append(ride);
 ride.addEventListener('change',()=>{reset();scene.setVehicle(ride.value);refresh();onChange();},{signal});
 const down=document.createElement('button');down.type='button';down.className='town-descend';down.textContent='↓';overlay.append(down);
 for(const [button,value]of [[overlay.querySelector('[data-camera="jump"]'),1],[down,-1]]){
  button.addEventListener('pointerdown',e=>{if(scene.vehicle!=='plane')return;e.preventDefault();button.setPointerCapture(e.pointerId);scene.lift=value;},{signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{scene.lift=0;},{signal});
 }
 const observer=new MutationObserver(()=>{reset();refresh();});observer.observe(scene.canvas,{attributes:true,attributeFilter:['data-mode']});
 function refresh(){const t=w();stick.setAttribute('aria-label',t.stick);stick.title=t.stick;ride.setAttribute('aria-label',t.ride);ride.innerHTML=['foot','car','plane'].map(id=>`<option value="${id}">${t[id]}</option>`).join('');ride.value=scene.vehicle||'foot';ride.hidden=!!scene.mode;down.hidden=scene.vehicle!=='plane'||!!scene.mode;down.setAttribute('aria-label',t.down);overlay.dataset.travel=scene.vehicle||'foot';document.getElementById('walk-tip').textContent=scene.vehicle==='car'?t.carTip:scene.vehicle==='plane'?t.planeTip:t.tip;}
 refresh();return {refresh,dispose(){reset();observer.disconnect();abort.abort();stick.remove();ride.remove();down.remove();}};
}
