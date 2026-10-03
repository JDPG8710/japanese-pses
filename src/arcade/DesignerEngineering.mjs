/** Educational cutaway assemblies; each physical component remains independently editable. */
export const ENGINE_COUNTS=[3,4,6,8,12];
const localized=(zh,en,ja)=>({zh,en,ja});
/** Vehicle / engine identities verified against the manufacturers' references. */
export const ENGINE_PROFILES=Object.freeze({
 3:{code:'G16E-GTS',vehicle:'Toyota GR Yaris',name:localized('丰田 G16E-GTS','Toyota G16E-GTS','トヨタ G16E-GTS'),spec:localized('GR Yaris · 1.6L 涡轮 · 直列 3 缸','GR Yaris · 1.6L turbo · Inline 3','GR Yaris・1.6L ターボ・直列3気筒'),lesson:localized('小小拉力之心：找到一排三个气缸，观察活塞怎样带动曲轴。','A compact rally heart: find three cylinders in one row and watch the pistons drive the crankshaft.','ラリーカーのちいさなしんぞう。3つのシリンダーとピストンのうごきを見よう。'),source:'https://media.toyota.co.uk/rallye-monte-carlo-showcase-for-new-gr-yaris-aero-performance-and-special-editions/'},
 4:{code:'K20C1',vehicle:'Honda Civic Type R',name:localized('本田 K20C1','Honda K20C1','ホンダ K20C1'),spec:localized('Civic Type R · 2.0L 涡轮 · 直列 4 缸','Civic Type R · 2.0L turbo · Inline 4','Civic Type R・2.0L ターボ・直列4気筒'),lesson:localized('性能掀背之心：沿着四个气缸，追踪活塞、连杆和曲轴的连接。','A performance hatchback heart: trace the four pistons, connecting rods and crankshaft.','スポーツカーのしんぞう。4つのピストンからクランクまでたどろう。'),source:'https://hondanews.com/en-US/honda-automobiles/releases/release-1503019bd8a757ea08267d79440f2de3-hottest-hot-hatch-brings-more-heat-all-new-honda-civic-type-r-adds-power-performance-and-swagger'},
 6:{code:'VR38DETT',vehicle:'Nissan GT-R',name:localized('日产 VR38DETT','Nissan VR38DETT','日産 VR38DETT'),spec:localized('GT-R · 3.8L 双涡轮 · V6','GT-R · 3.8L twin turbo · V6','GT-R・3.8L ツインターボ・V6'),lesson:localized('GT-R 之心：两列各三个气缸，共同驱动一根曲轴。','The GT-R heart: two banks of three cylinders drive a shared crankshaft.','GT-Rのしんぞう。3つずつ2れつのシリンダーが、1本のクランクをうごかすよ。'),source:'https://www.nissan-global.com/EN/HERITAGE_COLLECTION/418_nissan_gt-r.html'},
 8:{code:'Coyote',vehicle:'Ford Mustang GT',name:localized('福特 Coyote V8','Ford Coyote V8','フォード Coyote V8'),spec:localized('Mustang GT · 5.0L 自然吸气 · V8','Mustang GT · 5.0L naturally aspirated · V8','Mustang GT・5.0L 自然吸気・V8'),lesson:localized('野马之心：找齐两列各四个活塞，让八缸发动机运转起来。','The Mustang heart: assemble two banks of four pistons and bring the V8 to life.','マスタングのしんぞう。4つずつ2れつのピストンをそろえて、V8をうごかそう。'),source:'https://www.ford.com/cars/mustang/models/'},
 12:{code:'L539',vehicle:'Lamborghini Aventador',name:localized('兰博基尼 L539 V12','Lamborghini L539 V12','ランボルギーニ L539 V12'),spec:localized('Aventador · 6.5L 自然吸气 · V12','Aventador · 6.5L naturally aspirated · V12','Aventador・6.5L 自然吸気・V12'),lesson:localized('超级跑车之心：挑战两列各六个气缸，观察十二个活塞协同运动。','A supercar heart: build two banks of six cylinders and watch twelve pistons work together.','スーパーカーのしんぞう。6つずつ2れつのシリンダーをくみたてて、12このピストンをうごかそう。'),source:'https://www.lamborghini.com/en-en/models/aventador/aventador-s-roadster',codeSource:'https://www.lamborghini.com/original/DAM/lamborghini/service/accordion_cinese/Aventador%20SV-CN%20QQ%20G5%20Z2%200610000036%20000001.pdf'}
});
export function engineComponents(count,{prefix='engine',x=450,y=315}={}){
 if(!ENGINE_COUNTS.includes(count))throw new Error('Unsupported cylinder count');
 let bankAngle=0;const out=[],v=count>=6,rows=v?2:1,columns=count/rows,width=columns*36+28;
 const add=(id,zh,en,ja,kind,dx,dy,w,h,color,depthPosition=0,mechanic=null)=>out.push({id:prefix+'-'+id,names:{zh,en,ja},kind,x:x+dx,y:y+dy,tx:x+dx,ty:y+dy,w,h,z:8,required:false,placed:true,color,rotation:0,scale:1,depthPosition,symmetric:false,mechanic,engineering:true,bankAngle});
 add('block',`${count} 缸发动机缸体`,`${v?'V':'Inline '}${count} cylinder block`,`${count} シリンダーブロック`,'round',0,0,width,86,'#637f92',0,{shape:'block',depth:.9,cutaway:true});
 add('crankshaft','曲轴','Crankshaft','クランクシャフト','round',0,33,width+30,12,'#9eacb6',.1,{shape:'shaft',depth:.11});
 add('oil-pan','润滑油底壳','Oil sump','オイルパン','round',0,63,width+8,30,'#344d62',0,{shape:'block',depth:.92});
 add('timing','正时链轮','Timing sprocket','タイミングギア','wheel',-width/2-13,5,42,42,'#b8c4cc',.15,{shape:'gear',depth:.09});
 add('belt','正时皮带','Timing belt','タイミングベルト','round',-width/2-24,-25,13,72,'#293744',.16,{shape:'block',depth:.035});
 for(let bank=0;bank<rows;bank++){
  bankAngle=v?(bank===0?Math.PI/6:-Math.PI/6):0;const z=v?(bank===0?.27:-.27):0;
  add('head-'+bank,`气缸盖 ${bank+1}`,`Cylinder head ${bank+1}`,`シリンダーヘッド ${bank+1}`,'round',0,-57,width,20,'#b8c5ce',z,{shape:'block',depth:rows===1?.65:.38});
  add('cam-'+bank,`凸轮轴 ${bank+1}`,`Camshaft ${bank+1}`,`カムシャフト ${bank+1}`,'round',0,-75,width+12,8,'#7f9bae',z,{shape:'shaft',depth:.08});
  for(let i=0;i<columns;i++){
   const n=bank*columns+i+1,dx=(i-(columns-1)/2)*36;
   add('liner-'+n,`缸套 ${n}`,`Cylinder liner ${n}`,`シリンダー ${n}`,'round',dx,-7,29,62,'#9baebd',z,{shape:'liner',depth:.25});
   add('piston-'+n,`活塞 ${n}`,`Piston ${n}`,`ピストン ${n}`,'round',dx,-15+(i%2)*13,23,24,'#d3dde4',z+.025,{shape:'piston',depth:.23});
   add('rings-'+n,`活塞环 ${n}`,`Piston rings ${n}`,`ピストンリング ${n}`,'round',dx,-21+(i%2)*13,25,6,'#41576a',z+.028,{shape:'rings',depth:.25});
   add('rod-'+n,`连杆 ${n}`,`Connecting rod ${n}`,`コンロッド ${n}`,'round',dx,17,8,33,'#b6c7d2',z,{shape:'block',depth:.08});
   add('bearing-'+n,`曲轴轴承 ${n}`,`Crank bearing ${n}`,`ベアリング ${n}`,'lens',dx,34,14,14,'#d4b177',z,{shape:'gear',depth:.09});
   add('spark-'+n,`火花塞 ${n}`,`Spark plug ${n}`,`スパークプラグ ${n}`,'round',dx,-91,8,22,'#e9e5d8',z,{shape:'piston',depth:.07});
   for(const [side,label]of [[-1,'进气'],[1,'排气']])add('valve-'+n+'-'+side,`${label}气门 ${n}`,`${side<0?'Intake':'Exhaust'} valve ${n}`,`バルブ ${n}`,'round',dx+side*9,-48,5,25,'#a8becd',z+.03,{shape:'valve',depth:.05});
   for(const side of [-1,1])add('bolt-'+n+'-'+side,`缸盖螺栓 ${n}-${side<0?'A':'B'}`,`Head bolt ${n}-${side}`,`ボルト ${n}`,'lens',dx+side*12,-63,5,5,'#bac8d2',z+.22,{shape:'bolt',depth:.045});
  }
 }
 bankAngle=0;add('intake','进气歧管','Intake manifold','インテーク','round',0,-40,width+18,13,'#477b9b',.57,{shape:'shaft',depth:.14});
 add('exhaust','排气歧管','Exhaust manifold','エキゾースト','round',0,-28,width+18,13,'#b59178',-.57,{shape:'shaft',depth:.14});
 add('alternator','发电机','Alternator','オルタネーター','engine',width/2+34,26,40,40,'#8ea6b8',.22,{shape:'piston',depth:.4});
 add('filter','机油滤清器','Oil filter','オイルフィルター','round',width/2+19,65,22,32,'#e6bb61',.35,{shape:'piston',depth:.23});
 add('pump','冷却水泵','Coolant pump','ウォーターポンプ','lens',-width/2-18,44,25,25,'#7598ad',.3,{shape:'gear',depth:.17});
 return out;
}

export function drawingComponent(strokes,{id='drawing'}={}){
 const ink=[];
 const distance=(q,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy);};
 for(let index=0;index<strokes.length;index++){
  const s=strokes[index];if(s.erase||s.points.length<2)continue;
  const erasers=strokes.slice(index+1).filter(e=>e.erase&&e.points.length>1);
  if(!erasers.length){ink.push(s);continue;}
  let run=[];const flush=()=>{if(run.length===1)run.push({x:run[0].x+.01,y:run[0].y});if(run.length>1)ink.push({...s,points:run});run=[];};
  for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,s.size/3)));
   for(let j=i===1?0:1;j<=steps;j++){const q={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps},erased=erasers.some(e=>e.points.some((p,k)=>k&&distance(q,e.points[k-1],p)<(s.size+e.size)/2));if(erased)flush();else run.push(q);}
  }flush();
 }
 if(!ink.length)return null;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const s of ink)for(const p of s.points){minX=Math.min(minX,p.x-s.size);maxX=Math.max(maxX,p.x+s.size);minY=Math.min(minY,p.y-s.size);maxY=Math.max(maxY,p.y+s.size);}
 const x=(minX+maxX)/2,y=(minY+maxY)/2;
 return {id,names:{zh:'自绘零件',en:'Drawn part',ja:'じぶんのパーツ'},kind:'drawing',x,y,tx:x,ty:y,w:Math.max(4,maxX-minX),h:Math.max(4,maxY-minY),z:12,required:false,placed:true,color:ink[0].color,rotation:0,scale:1,symmetric:true,ink:ink.map(s=>({...s,points:s.points.map(p=>({x:p.x-x,y:p.y-y}))}))};
}

export function watermark(canvas){
 const c=canvas.getContext('2d'),size=Math.max(14,Math.round(Math.min(canvas.width,canvas.height)*.027)),pad=size*.75,text='piko-game.com';c.save();c.setTransform(1,0,0,1,0,0);c.font=`600 ${size}px system-ui`;const w=c.measureText(text).width+pad*2,h=size+pad*1.4,x=canvas.width-w-pad,y=canvas.height-h-pad;c.fillStyle='#ffffffdf';c.beginPath();c.roundRect(x,y,w,h,size*.3);c.fill();c.fillStyle='#294b66';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x+w/2,y+h/2);c.restore();return canvas;
}
