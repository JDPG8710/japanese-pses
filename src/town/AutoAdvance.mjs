// Count visible play time only; leaving the game cancels the pending transition.
export function scheduleAutoAdvance(advance,{delay=2200,isPaused=()=>document.hidden,request=requestAnimationFrame,cancel=cancelAnimationFrame}={}){
 let elapsed=0,last=null,frame=null,done=false;
 function tick(now){if(done)return;if(last!==null&&!isPaused())elapsed+=Math.min(100,Math.max(0,now-last));last=now;if(elapsed>=delay){done=true;advance();}else frame=request(tick);}
 frame=request(tick);return ()=>{done=true;cancel(frame);};
}
export const autoAdvanceText=locale=>({zh:'马上进入下一关…',ja:'つぎのレベルへ すすむよ…',en:'On to the next level…'}[locale]||'Continuing to the next level…');
