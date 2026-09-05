const RAD=Math.PI/180;
export function project(lon,lat,centerLon,centerLat) {
  const a=(lon-centerLon)*RAD,b=lat*RAD,c=centerLat*RAD;
  return [Math.cos(b)*Math.sin(a), Math.cos(c)*Math.sin(b)-Math.sin(c)*Math.cos(b)*Math.cos(a), Math.sin(c)*Math.sin(b)+Math.cos(c)*Math.cos(b)*Math.cos(a)];
}
export function unproject(x,y,lon,lat) {
  const r=x*x+y*y;if(r>1)return null;
  const z=Math.sqrt(1-r),c=lat*RAD;
  return [((lon+Math.atan2(x,z*Math.cos(c)-y*Math.sin(c))/RAD+540)%360)-180,Math.asin(Math.max(-1,Math.min(1,y*Math.cos(c)+z*Math.sin(c))))/RAD];
}
export function ringContains(ring,lon,lat) {
  const points=[];let last=ring[0][0];
  for(const p of ring){let x=p[0];while(x-last>180)x-=360;while(x-last< -180)x+=360;points.push([x,p[1]]);last=x;}
  lon+=360*Math.round((points.reduce((s,p)=>s+p[0],0)/points.length-lon)/360);
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function findCountry(countries,lon,lat){return countries.find(c=>c.code&&c.polygons.some(poly=>ringContains(poly[0],lon,lat)&&!poly.slice(1).some(r=>ringContains(r,lon,lat))))||null;}
function horizon(a,b){const t=a[2]/(a[2]-b[2]),x=a[0]+t*(b[0]-a[0]),y=a[1]+t*(b[1]-a[1]),n=Math.hypot(x,y);return [x/n,y/n,0];}
function clipRing(points){const out=[];for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i];if(a[2]<0&&b[2]>=0)out.push(horizon(a,b));if(a[2]>=0&&b[2]<0)out.push(horizon(a,b));if(b[2]>=0)out.push(b);}return out;}

export class Globe {
  constructor(canvas,countries,onPick){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.countries=countries;this.onPick=onPick;this.lon=115;this.lat=22;this.selected=null;this.frame=0;this.events=new AbortController();
    const opts={signal:this.events.signal};
    canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,lon:this.lon,lat:this.lat,moved:false};canvas.setPointerCapture(e.pointerId);},opts);
    canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>6)this.drag.moved=true;if(this.drag.moved){this.lon=this.drag.lon-dx/this.radius*70;this.lat=Math.max(-75,Math.min(75,this.drag.lat+dy/this.radius*60));this.drawSoon();}},opts);
    canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved){const r=canvas.getBoundingClientRect(),p=unproject((e.clientX-r.left-this.width/2)/this.radius,-(e.clientY-r.top-this.height/2)/this.radius,this.lon,this.lat);if(p){const found=findCountry(countries,...p);if(found)this.onPick(found.code);}}this.drag=null;},opts);
    canvas.addEventListener('pointercancel',()=>{this.drag=null;},opts);
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){e.preventDefault();if(e.key==='Enter'){const found=findCountry(countries,this.lon,this.lat);if(found)this.onPick(found.code);}else this.rotate(e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0,e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0);}},opts);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.radius=Math.min(r.width,r.height)*.43;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.ctx?.setTransform(dpr,0,0,dpr,0,0);this.drawSoon();}
  rotate(lon,lat=0){this.lon+=lon;this.lat=Math.max(-75,Math.min(75,this.lat+lat));this.drawSoon();}
  select(code){this.selected=code;const c=this.countries.find(c=>c.code===code);if(c){this.lon=c.center[0];this.lat=Math.max(-65,Math.min(65,c.center[1]));}this.drawSoon();}
  drawSoon(){if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
  draw(){
    const ctx=this.ctx;if(!ctx||!this.radius)return;
    const x=this.width/2,y=this.height/2,r=this.radius;
    ctx.clearRect(0,0,this.width,this.height);
    const halo=ctx.createRadialGradient(x,y,r*.95,x,y,r*1.13);halo.addColorStop(0,'#bcebdc66');halo.addColorStop(1,'#bcebdc00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*1.13,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
    const ocean=ctx.createRadialGradient(-r*.4,-r*.45,r*.05,0,0,r*1.1);ocean.addColorStop(0,'#75bec4');ocean.addColorStop(.6,'#387887');ocean.addColorStop(1,'#173b50');ctx.fillStyle=ocean;ctx.fillRect(-r,-r,2*r,2*r);
    ctx.strokeStyle='#c9f7e51b';ctx.lineWidth=.7;
    for(let lat=-60;lat<=60;lat+=30)this.line(Array.from({length:181},(_,i)=>[i*2-180,lat]));
    for(let lon=-180;lon<180;lon+=30)this.line(Array.from({length:91},(_,i)=>[lon,i*2-90]));
    for(const country of this.countries){
      ctx.beginPath();
      for(const polygon of country.polygons)for(const ring of polygon){
        const visible=clipRing(ring.map(p=>project(...p,this.lon,this.lat)));if(visible.length<3)continue;
        ctx.moveTo(visible[0][0]*r,-visible[0][1]*r);
        for(let i=1;i<=visible.length;i++){const a=visible[i-1],b=visible[i%visible.length];if(a[2]===0&&b[2]===0){const start=Math.atan2(-a[1],a[0]),end=Math.atan2(-b[1],b[0]);let delta=(end-start+Math.PI*3)%(Math.PI*2)-Math.PI;ctx.arc(0,0,r,start,start+delta,delta<0);}else ctx.lineTo(b[0]*r,-b[1]*r);}
        ctx.closePath();
      }
      ctx.fillStyle=country.code===this.selected?'#ffd580':'#b8cfac';ctx.strokeStyle=country.code===this.selected?'#fff1bb':'#3f737267';ctx.lineWidth=country.code===this.selected?1.6:.55;ctx.fill('evenodd');ctx.stroke();
    }
    const shade=ctx.createRadialGradient(-r*.35,-r*.4,r*.35,r*.15,r*.05,r*1.12);shade.addColorStop(0,'#ffffff00');shade.addColorStop(.7,'#05233215');shade.addColorStop(1,'#001827af');ctx.fillStyle=shade;ctx.fillRect(-r,-r,2*r,2*r);
    const selected=this.countries.find(c=>c.code===this.selected);
    if(selected){const p=project(...selected.center,this.lon,this.lat);if(p[2]>0){ctx.beginPath();ctx.arc(p[0]*r,-p[1]*r,6,0,Math.PI*2);ctx.fillStyle='#fff9dd';ctx.fill();ctx.strokeStyle='#a96b23';ctx.lineWidth=2;ctx.stroke();}}
    ctx.restore();
  }
  line(coords){const ctx=this.ctx,r=this.radius;ctx.beginPath();let pen=false;for(const p of coords){const q=project(...p,this.lon,this.lat);if(q[2]<0){pen=false;continue;}if(pen)ctx.lineTo(q[0]*r,-q[1]*r);else ctx.moveTo(q[0]*r,-q[1]*r);pen=true;}ctx.stroke();}
  destroy(){cancelAnimationFrame(this.frame);this.events.abort();this.observer.disconnect();}
}
