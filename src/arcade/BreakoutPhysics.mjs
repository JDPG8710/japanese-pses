export const BREAKOUT_BACK_Z=-6-BREAKOUT_FIELD_EXTENSION;
import {breakoutLayoutFor,BREAKOUT_FIELD_EXTENSION} from './BreakoutLayouts.mjs';
export function breakoutBrickLayout(D){
 return breakoutLayoutFor(D).bricks;
}
export function stabilizeBreakoutBall(ball,maxSpeed=Infinity){
 const speed=Math.min(maxSpeed,Math.max(.1,Math.hypot(ball.vx,ball.vz)));
 // At least 24 degrees toward the bricks/paddle, even after a corner hit.
 const z=Math.max(.4,Math.min(.985,Math.abs(ball.vz)/Math.max(.1,Math.hypot(ball.vx,ball.vz))));
 ball.vz=(ball.vz<0?-1:1)*speed*z;ball.vx=(ball.vx<0?-1:1)*speed*Math.sqrt(1-z*z);
}
function sweepBox(x,z,dx,dz,b,r){
 let enter=-Infinity,exit=Infinity,normal=null;
 for(const [p,v,lo,hi,axis]of [[x,dx,b.x-b.w/2-r,b.x+b.w/2+r,'x'],[z,dz,b.z-b.d/2-r,b.z+b.d/2+r,'z']]){
  if(Math.abs(v)<1e-10){if(p<lo||p>hi)return null;continue;}
  const a=(lo-p)/v,c=(hi-p)/v,near=Math.min(a,c),far=Math.max(a,c);
  if(near>enter){enter=near;normal={axis,sign:v>0?-1:1};}exit=Math.min(exit,far);
 }
 if(enter>exit||enter<-.000001||enter>1||exit<0)return null;
 return {t:Math.max(0,enter),...normal};
}
export function advanceBreakoutBall(ball,dt,{D,paddleX,paddleW,bricks,walls=[],onBrick,onPaddle,onWall}){
 let remaining=dt;stabilizeBreakoutBall(ball,D.ballSpeedMax);
 for(let iteration=0;iteration<10&&remaining>1e-7;iteration++){
  const dx=ball.vx*remaining,dz=ball.vz*remaining,half=D.playWidth/2-D.ballRadius,back=BREAKOUT_BACK_Z+D.ballRadius;
  let hit=null;
  function consider(h){if(h&&h.t>=0&&h.t<=1&&(!hit||h.t<hit.t))hit=h;}
  if(dx<0)consider({t:(-half-ball.x)/dx,axis:'x',sign:1});
  if(dx>0)consider({t:(half-ball.x)/dx,axis:'x',sign:-1});
  if(dz<0)consider({t:(back-ball.z)/dz,axis:'z',sign:1});
  if(dz>0)consider((()=>{const h=sweepBox(ball.x,ball.z,dx,dz,{x:paddleX,z:6.2,w:paddleW,d:.7},D.ballRadius);return h?.axis==='z'&&h.sign===-1?{...h,paddle:true}:null;})());
  for(const brick of bricks)if(brick.hits>0){const h=sweepBox(ball.x,ball.z,dx,dz,brick,D.ballRadius);if(h)consider({...h,brick});}
  for(const wall of walls){const h=sweepBox(ball.x,ball.z,dx,dz,wall,D.ballRadius);if(h)consider({...h,wall});}
  if(!hit){ball.x+=dx;ball.z+=dz;break;}
  ball.x+=dx*hit.t;ball.z+=dz*hit.t;ball[hit.axis]+=hit.sign*.0001;remaining*=1-hit.t;
  if(hit.paddle){const speed=Math.min(D.ballSpeedMax,Math.hypot(ball.vx,ball.vz)*1.03),offset=Math.max(-1,Math.min(1,(ball.x-paddleX)/(paddleW/2))),angle=offset*Math.PI/3;
   ball.vx=Math.sin(angle)*speed;ball.vz=-Math.cos(angle)*speed;onPaddle?.(ball);
  }else {ball[hit.axis==='x'?'vx':'vz']*= -1;if(hit.brick)onBrick?.(hit.brick);if(hit.wall)onWall?.(hit.wall);}
  stabilizeBreakoutBall(ball,D.ballSpeedMax);
 }
}
