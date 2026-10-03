import {createArcadeRenderer,resizeArcade3D,disposeArcade3D,THREE} from './Arcade3D.mjs';

export const KID_COLORS=[0xff747d,0x65b9ff,0xffce58,0x79d9ae,0xb18aea,0xffaa67];
export const KID_SYMBOLS=['★','◆','●','▲','♥','☀'];
export function seeded(seed=1){let a=Number(seed)>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function kidScale(difficulty){return Math.max(0,Math.min(1.35,Number(difficulty?.scale)||0));}

/** Shared accessible controls and lifecycle for the two children's arcades. */
export function createKidsStage({canvas,count,locale,onPress,tick,draw,clear=0x16364b}){
 const gl=createArcadeRenderer(canvas,{clear});let running=false,disposed=false,raf=0,last=0;
 const parent=canvas?.parentElement,doc=canvas?.ownerDocument;
 let ui,message,buttons=[];
 if(doc&&parent){
  ui=doc.createElement('div');ui.className='kids-controls';
  Object.assign(ui.style,{position:'absolute',inset:'auto 12px 12px',display:'grid',gap:'8px',zIndex:'2'});
  message=doc.createElement('p');message.setAttribute('role','status');message.className='kids-message';Object.assign(message.style,{margin:'0',padding:'8px',color:'white',background:'#102a40e8',textAlign:'center',borderRadius:'12px',fontWeight:'800'});ui.append(message);
  const row=doc.createElement('div');Object.assign(row.style,{display:'grid',gridTemplateColumns:`repeat(${count===6?3:4},1fr)`,gap:'8px'});
  buttons=Array.from({length:count},(_,i)=>{const b=doc.createElement('button');b.type='button';b.dataset.kidsPad=String(i);b.textContent=`${i+1} ${KID_SYMBOLS[i]}`;b.setAttribute('aria-label',`${locale==='ja'?'ボタン':locale==='zh'?'按钮':'Button'} ${i+1} ${KID_SYMBOLS[i]}`);Object.assign(b.style,{minHeight:'56px',fontSize:'24px',fontWeight:'900',color:'#102a40',background:'#'+KID_COLORS[i].toString(16),border:'3px solid white',borderRadius:'18px',touchAction:'manipulation',cursor:'pointer'});b.onclick=()=>{if(running&&!disposed)onPress(i);};row.append(b);return b;});
  ui.append(row);parent.append(ui);
 }
 if(gl.ok){gl.camera=new THREE.OrthographicCamera(-7,7,5,-5,.1,100);gl.camera.position.set(0,2,15);gl.camera.lookAt(0,2,0);}
 function resize(){resizeArcade3D(gl,canvas);if(gl.ok){const rect=canvas.getBoundingClientRect();gl.camera.left=-7;gl.camera.right=7;const half=7*Math.max(.6,rect.height/Math.max(1,rect.width));gl.camera.top=half;gl.camera.bottom=-half;gl.camera.updateProjectionMatrix();}}
 function render(){draw?.(gl);if(gl.ok)gl.renderer.render(gl.scene,gl.camera);}
 function loop(ts){if(!running||disposed)return;const dt=Math.max(0,Math.min(.05,(ts-last)/1000));last=ts;tick(dt);render();if(running)raf=requestAnimationFrame(loop);}
 function pause(){running=false;buttons.forEach(b=>b.disabled=true);if(ui)ui.style.display='none';if(raf)globalThis.cancelAnimationFrame?.(raf);raf=0;}
 function resume(){if(disposed||running)return;running=true;buttons.forEach(b=>b.disabled=false);if(ui)ui.style.display='grid';last=globalThis.performance?.now?.()||0;if(globalThis.requestAnimationFrame)raf=requestAnimationFrame(loop);}
 function key(e){if(!running||disposed||e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;const i=Number(e.key)-1;if(Number.isInteger(i)&&i>=0&&i<count){e.preventDefault();onPress(i);}}
 globalThis.window?.addEventListener('keydown',key);globalThis.window?.addEventListener('resize',resize);canvas?.addEventListener?.('arcade-resize',resize);resize();
 return {gl,render,pause,resume,get running(){return running;},playY(fraction){if(!gl.ok)return 0;const height=Math.max(1,canvas.getBoundingClientRect().height),usable=Math.max(56,height-(ui?.offsetHeight||0)-28);return gl.camera.position.y+gl.camera.top-2*gl.camera.top*(usable/height)*fraction;},message(text){if(message&&message.textContent!==text)message.textContent=text;},highlight(index){buttons.forEach((b,i)=>{b.style.boxShadow=i===index?'0 0 0 4px #fff,0 0 28px #fff':'none';b.setAttribute('aria-pressed',String(i===index));});},destroy(){if(disposed)return;disposed=true;pause();globalThis.window?.removeEventListener('keydown',key);globalThis.window?.removeEventListener('resize',resize);canvas?.removeEventListener?.('arcade-resize',resize);ui?.remove();disposeArcade3D(gl);}};
}
