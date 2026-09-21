// Browser tests use the same keyboard / pointer inputs available to a player.
// No teleport, game-state mutation, answer submission hook, or production autoplay.
import assert from 'node:assert/strict';
import {generateCourse} from '../src/town/PlatformCourse.mjs';
import {questionFor} from '../src/town/ArcadeRules.mjs';
export const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('piko-town-v1')));
export async function position(page){return (await page.locator('#town-canvas').getAttribute('data-position')).split(',').map(Number);}
export async function face(page,target){
 const [x,,z]=await position(page),desired=Math.atan2(x-target.x,z-target.z),yaw=Number(await page.locator('#town-canvas').getAttribute('data-camera-yaw'));let delta=desired-yaw;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;
 const canvas=page.locator('#town-canvas');await canvas.scrollIntoViewIfNeeded();const rect=await canvas.boundingBox();let remaining=-delta/.006;
 while(Math.abs(remaining)>.1){const pixels=Math.sign(remaining)*Math.min(Math.abs(remaining),Math.max(40,rect.width*.3));const startX=rect.x+rect.width/2,startY=rect.y+rect.height*.55;await page.mouse.move(startX,startY);await page.mouse.down();await page.mouse.move(startX+pixels,startY,{steps:4});await page.mouse.up();remaining-=pixels;}
 await canvas.focus();
}
export async function moveTo(page,target,{jump=false,tolerance=.15,finishWhenResult=false}={}){
 await face(page,target);const [x,,z]=await position(page),distance=Math.hypot(target.x-x,target.z-z);if(distance<tolerance)return;
 // Space is an explicit player input for each jump, never an internal game call.
 const mode=await page.locator('#town-canvas').getAttribute('data-mode'),run=(await readSave(page)).expansion.runs[mode],signature=JSON.stringify([run?.solved,run?.hearts,run?.memoryIndex]);
 if(jump)await page.keyboard.press('Space');await page.keyboard.down('w');
 try{await page.waitForFunction(({x,z,tx,tz,d,tolerance,mode,signature,finishWhenResult})=>{const r=JSON.parse(localStorage.getItem('piko-town-v1')).expansion.runs[mode];if(finishWhenResult&&JSON.stringify([r?.solved,r?.hearts,r?.memoryIndex])!==signature)return true;const p=document.querySelector('#town-canvas').dataset.position.split(',').map(Number);return ((p[0]-x)*(tx-x)+(p[2]-z)*(tz-z))/d>=d-tolerance;},{x,z,tx:target.x,tz:target.z,d:distance,tolerance,mode,signature,finishWhenResult},{timeout:14000});}finally{await page.keyboard.up('w');}
 if(jump&&!finishWhenResult){await page.waitForFunction(y=>{const c=document.querySelector('#town-canvas');return c.dataset.grounded==='true'&&Math.abs(Number(c.dataset.position.split(',')[1])-y)<.06;},target.y,{timeout:10000});}
}
export async function reachSkyTarget(page,mode,index){
 const r=(await readSave(page)).expansion.runs[mode],course=generateCourse(r);
 for(const id of course.route.slice(1)){const target=course.platforms.find(p=>p.id===id);await moveTo(page,target,{jump:true});assert.equal(await page.locator('#town-canvas').getAttribute('data-platform'),id);}
 await moveTo(page,course.targets[index],{jump:true,finishWhenResult:true});
}
export async function solve(page,mode){
 let r=(await readSave(page)).expansion.runs[mode];
 if(mode==='obby'||mode==='tower'){await reachSkyTarget(page,mode,questionFor(r).answer);}
 else if(mode==='runner'){const answer=questionFor(r).answer;await moveTo(page,{x:8.4,z:8});await moveTo(page,{x:8.4,z:-11});await moveTo(page,{x:(answer-1)*6,z:-11});await moveTo(page,{x:(answer-1)*6,z:-8},{finishWhenResult:true});}
 else if(mode==='garden'){await moveTo(page,{x:(questionFor(r).answer-1)*7,z:-5},{finishWhenResult:true});}
 else{
  while(!r.solved){await page.waitForFunction(()=>document.querySelector('[data-memory-replay]')?.disabled===false);const q=questionFor(r),before=r.memoryIndex;await moveTo(page,{x:(q.answer%2?1:-1)*4,z:q.answer<2?-3:3},{finishWhenResult:true});await page.waitForFunction(before=>{const r=JSON.parse(localStorage.getItem('piko-town-v1')).expansion.runs.memory;return r.solved||r.memoryIndex!==before;},before);r=(await readSave(page)).expansion.runs.memory;}
 }
 await page.waitForFunction(mode=>JSON.parse(localStorage.getItem('piko-town-v1')).expansion.runs[mode].solved,mode);
}
