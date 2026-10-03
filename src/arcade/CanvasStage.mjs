export function canvasStage(canvas,tick,draw){
 const ctx=canvas.getContext('2d');let running=false,dead=false,raf=0,last=0;
 function render(){ctx.save();ctx.scale(canvas.width/960,canvas.height/540);draw(ctx);ctx.restore();}
 function loop(ts){if(!running||dead)return;tick(Math.min(.05,Math.max(0,(ts-last)/1000)));last=ts;render();if(running)raf=requestAnimationFrame(loop);}
 function pause(){running=false;globalThis.cancelAnimationFrame?.(raf);}
 function resume(){if(dead||running)return;running=true;last=performance.now();if(globalThis.requestAnimationFrame)raf=requestAnimationFrame(loop);}
 canvas.style.touchAction='none';canvas.addEventListener('arcade-resize',render);
 return {render,pause,resume,get running(){return running;},destroy(){dead=true;pause();canvas.removeEventListener('arcade-resize',render);},point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*960/r.width,y:(e.clientY-r.top)*540/r.height};}};
}
export function controls(canvas,html,click){const doc=canvas.ownerDocument;if(!doc)return null;const ui=doc.createElement('div');ui.className='creative-controls';ui.innerHTML=html;canvas.parentElement.append(ui);ui.addEventListener('click',click);return ui;}
export function canvasLabel(c,text,x,y){
 if(!c.getTransform||!c.canvas){c.fillText(text,x,y);return;}
 const t=c.getTransform(),rect=c.canvas.getBoundingClientRect(),dpr=c.canvas.width/Math.max(1,rect.width),size=Number(c.font.match(/([\d.]+)px/)?.[1]||16),px=Math.max(size>=22?18:12,Math.min(size,size*rect.width/960));
 c.save();c.setTransform(1,0,0,1,0,0);c.font=c.font.replace(/[\d.]+px/,`${px*dpr}px`);c.fillText(text,t.a*x+t.c*y+t.e,t.b*x+t.d*y+t.f,c.canvas.width-24*dpr);c.restore();
}
