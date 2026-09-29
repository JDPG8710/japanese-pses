import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateCourse,advanceVertical,standingOnTarget,PHYSICS} from '../src/town/PlatformCourse.mjs';
import {restoreExpansion} from '../src/town/ArcadeRules.mjs';
let courses=0,jumps=0;const patterns=new Set(),widths=new Set();
function jump(from,to,speed,impulse,dt){
 const body={x:from.x,y:from.y,z:from.z,velocity:impulse,grounded:false};const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);let travelled=0;
 for(let n=0;n<180;n++){const move=Math.min(speed*dt,d-travelled);travelled+=move;body.x+=dx/d*move;body.z+=dz/d*move;const hit=advanceVertical(body,[from,to],dt);if(hit?.id===to.id)return true;if(body.y<from.y-2)return false;}
 return false;
}
for(const mode of ['obby','tower'])for(let seed=0;seed<180;seed++)for(const stage of [1,5,20,100]){
 const r={mode,seed,stage},c=generateCourse(r);courses++;assert.deepEqual(c,generateCourse({...r}));assert.notDeepEqual(c,generateCourse({...r,stage:stage+1}));patterns.add(c.pattern);
 for(const p of c.platforms){assert.ok(p.w>=1.8&&p.d>=1.8);widths.add(p.w);assert.ok(Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite));}
 for(let i=0;i<c.platforms.length;i++)for(let j=i+1;j<c.platforms.length;j++){const a=c.platforms[i],b=c.platforms[j];assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2,'platform footprints must have an actual gap');}
 const path=c.route.map(id=>c.platforms.find(p=>p.id===id)),pairs=path.slice(1).map((p,i)=>[path[i],p]);for(const target of c.targets)pairs.push([path.at(-1),target]);
 for(const [a,b]of pairs)for(const [speed,impulse]of [[7.2,9],[8.5,9],[7.2,10.5],[8.5,10.5]])for(const dt of [1/60,.04]){assert.equal(jump(a,b,speed,impulse,dt),true,`${mode} seed ${seed} stage ${stage}: ${a.id} -> ${b.id} at ${dt}`);jumps++;}
}
assert.equal(patterns.size,3);assert.ok(widths.size>500);console.log(`ok - ${courses} reproducible courses, ${jumps} successful simulated jumps, 3 patterns and ${widths.size} distinct widths`);
const target={x:0,z:0,y:2,w:2,d:2};assert.equal(standingOnTarget({x:0,z:0,y:2,grounded:false},target),false);assert.equal(standingOnTarget({x:0,z:0,y:1,grounded:true},target),false);assert.equal(standingOnTarget({x:0,z:0,y:2,grounded:true},target),true);
const below={x:0,z:0,y:1,velocity:0};advanceVertical(below,[target],.04);assert.equal(below.grounded,false);console.log('ok - airborne / below-platform positions cannot complete a landing');
assert.equal(restoreExpansion({version:2,cameraMode:'first'}).cameraMode,'first');assert.equal(restoreExpansion({version:2,cameraMode:'invalid'}).cameraMode,'third');
const scene=await readFile(new URL('../src/town/TownScene3D.mjs',import.meta.url),'utf8'),ui=await readFile(new URL('../src/town/TownExpansion.mjs',import.meta.url),'utf8');assert.doesNotMatch(scene,/travelChoice|autoJump/);assert.doesNotMatch(ui,/data-answer-platform|travelChoice/);assert.equal((scene.match(/this\.jump\(\)/g)||[]).length,1,'the only jump invocation is the keyboard handler');console.log('ok - camera preference migrates, removed automatic routes cannot regress');
