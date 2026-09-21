// Pure course geometry and landing physics shared by the renderer and tests.
// Every course is reproducible from the saved run, independently of the question RNG.
export const PHYSICS={gravity:22,jump:9,speed:7.2,radius:.16};
function rng(seed){let n=seed>>>0;return ()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const round=n=>Math.round(n*1000)/1000;
export function generateCourse(run){
 if(!run||!['obby','tower'].includes(run.mode))return null;
 const random=rng((run.seed^Math.imul(run.stage,0x9e3779b1)^(run.mode==='tower'?0x7135:0x2197))>>>0);
 const pick=(min,max)=>min+random()*(max-min),tier=Math.min(4,Math.floor((run.stage-1)/5)),pattern=Math.floor(random()*3),count=5+Math.floor(random()*3)+Math.floor(tier/2);
 const platforms=[{id:'start',x:0,y:0,z:7,w:4.4,d:4.2}],route=['start'];let angle=0;
 for(let i=0;i<count;i++){
  const previous=platforms.at(-1);
  angle=pattern===0?(i%2?1:-1)*pick(.25,.55):pattern===1?Math.sin(i*1.4+random())*.6:pick(-.45,.45);
  if(i===0)angle=Math.max(-.25,Math.min(.25,angle));
  const distance=i===0?pick(4.15,4.3):pick(3.8,4.25)+tier*.025;
  const rise=run.mode==='tower'?pick(.48,.88):pick(.12,.55);
  const p={id:`step-${i+1}`,x:round(previous.x+Math.sin(angle)*distance),z:round(previous.z-Math.cos(angle)*distance),y:round(previous.y+rise),w:round(pick(2.3,3.15)-tier*.11),d:round(pick(2.2,2.9)-tier*.1)};
  platforms.push(p);route.push(p.id);
 }
 const last=platforms.at(-1),targets=[];
 // Fan out the answer platforms. All three can be reached with the default jump.
 const spread=pick(.89,.98),distance=pick(4.05,4.3),rotation=pick(-.06,.06);
 for(let i=0;i<3;i++){
  const a=(i-1)*spread+rotation,p={id:`answer-${i}`,index:i,x:round(last.x+Math.sin(a)*distance),z:round(last.z-Math.cos(a)*distance),y:round(last.y+pick(.25,.55)),w:round(pick(2,2.5)-tier*.05),d:round(pick(2,2.5)-tier*.05)};
  platforms.push(p);targets.push(p);
 }
 return {version:1,pattern,tier,platforms,route,targets,spawn:{x:0,y:0,z:7}};
}
export function landingAt(position,previousY,velocity,platforms){
 if(velocity>0)return null;
 return platforms.filter(p=>Math.abs(position.x-p.x)<p.w/2-PHYSICS.radius&&Math.abs(position.z-p.z)<p.d/2-PHYSICS.radius&&previousY>=p.y-.001&&position.y<=p.y).sort((a,b)=>b.y-a.y)[0]||null;
}
export function advanceVertical(body,platforms,dt){
 const previousY=body.y;body.velocity-=PHYSICS.gravity*dt;body.y+=body.velocity*dt;const landing=landingAt(body,previousY,body.velocity,platforms);
 body.grounded=!!landing;body.platformId=landing?.id??null;if(landing){body.y=landing.y;body.velocity=0;}return landing;
}
export function standingOnTarget(body,target){return body.grounded&&Math.abs(body.y-target.y)<.05&&Math.abs(body.x-target.x)<target.w/2-PHYSICS.radius&&Math.abs(body.z-target.z)<target.d/2-PHYSICS.radius;}
