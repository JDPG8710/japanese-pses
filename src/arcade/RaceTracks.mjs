/** Closed-circuit track definitions for player-driven racing. */

function oval(cx, cz, rx, rz, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz});
  }
  return pts;
}

function harborLoop(cx, cz, scale = 1, n = 80) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2 - Math.PI / 2;
    // Broad waterfront bends; no self-intersection or pinched hairpins.
    pts.push({x: cx + Math.cos(t) * 32 * scale, z: cz + Math.sin(t) * (18 + 2 * Math.cos(t)) * scale});
  }
  return pts;
}

function mountain(cx, cz, scale = 1, n = 56) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.22 * Math.sin(3 * t) + 0.08 * Math.cos(5 * t);
    pts.push({
      x: cx + Math.cos(t) * 20 * scale * wobble,
      z: cz + Math.sin(t) * 14 * scale * wobble
    });
  }
  return pts;
}

function neonCity(cx, cz, scale = 1, n = 60) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 16 + 6 * Math.sin(2 * t) + 3 * Math.cos(4 * t);
    pts.push({
      x: cx + Math.cos(t) * r * scale,
      z: cz + Math.sin(t) * (r * 0.78) * scale
    });
  }
  return pts;
}

// Round authored corners, then sample by physical distance. Start halfway down the
// long first straight so the player has time to accelerate before the first bend.
function circuit(vertices, legacyLength) {
  const points=vertices.map(([x,z])=>({x,z})), raw=[];
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
  const corners=points.map((p,i)=>{
    const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
    const cut=Math.min(75,Math.hypot(p.x-prev.x,p.z-prev.z)*.27,Math.hypot(next.x-p.x,next.z-p.z)*.27);
    return {p,a:mix(p,prev,cut/Math.hypot(p.x-prev.x,p.z-prev.z)),b:mix(p,next,cut/Math.hypot(next.x-p.x,next.z-p.z))};
  });
  for(let i=0;i<corners.length;i++){
    const {a,p,b}=corners[i],next=corners[(i+1)%corners.length].a;
    for(let j=0;j<24;j++){const t=j/24;raw.push(mix(mix(a,p,t),mix(p,b,t),t));}
    const steps=Math.ceil(Math.hypot(next.x-b.x,next.z-b.z)/3);
    for(let j=0;j<steps;j++)raw.push(mix(b,next,j/steps));
  }
  const rawMetrics=buildPathMetrics(raw),scale=legacyLength*10/rawMetrics.total;
  const target=mix(points[0],points[1],.5);
  const start=projectOnPath(raw,rawMetrics,target.x,target.z).s;
  const count=Math.ceil(rawMetrics.total*scale/3);
  const path=Array.from({length:count},(_,i)=>{const p=pointAtProgress(raw,rawMetrics,start+i/count);return {x:p.x*scale,z:p.z*scale};});
  // Correct sub-millimetre resampling loss to preserve the requested 10x length.
  const correction=legacyLength*10/buildPathMetrics(path).total;
  return path.map(p=>({x:p.x*correction,z:p.z*correction}));
}

/** Sample item spawn progress (0–1) along the centerline. */
const ITEM_SLOTS = [0.06,0.12,0.2,0.28,0.36,0.45,0.54,0.62,0.7,0.78,0.86,0.94];

export const RACE_TRACKS = Object.freeze([
  {id:'sunrise', width:13.5, difficulty:1, legacyLength:buildPathMetrics(oval(0,0,28,18,48)).total,
   vertices:[[-240,-135],[240,-135],[240,135],[-240,135]],
   theme:{clear:0x87b8e8,fog:0xa8c8e8,asphalt:0x2a3140,shoulder:0xd4a574,accent:0xffc857,deco:'trees',banking:0.04}},
  {id:'harbor', width:14, difficulty:2, legacyLength:buildPathMetrics(harborLoop(0,0,1.05,80)).total,
   vertices:[[-290,-150],[290,-150],[290,5],[80,5],[80,190],[-290,190]],
   theme:{clear:0x1a3a52,fog:0x243e55,asphalt:0x243044,shoulder:0x6b8a9e,accent:0x57dfff,deco:'docks',banking:0.06}},
  {id:'mountain', width:12.5, difficulty:3, legacyLength:buildPathMetrics(mountain(0,0,1,56)).total,
   vertices:[[-265,-190],[230,-190],[275,-35],[100,25],[180,180],[-80,215],[-265,100],[-115,-25]],
   theme:{clear:0x6a8f7a,fog:0x7a9a88,asphalt:0x333840,shoulder:0x5a6b4a,accent:0xc4e09a,deco:'rocks',banking:0.12}},
  {id:'grandtour', width:17, difficulty:2, legacyLength:500, laps:1,
   vertices:[[-700,-450],[700,-450],[930,-80],[650,530],[100,690],[-750,450],[-900,-100]],
   theme:{clear:0x87b8e8,fog:0xa8c8e8,asphalt:0x2a3140,shoulder:0xd4a574,accent:0xffc857,deco:'trees',banking:.04}},
  {id:'offroad', width:19, difficulty:3, legacyLength:320, laps:2,
   vertices:[[-540,-300],[480,-300],[620,50],[320,380],[-30,420],[-510,300],[-640,0]],
   surfaces:[{s:.12,lateral:-4,width:10,length:40,kind:'grass'},{s:.24,lateral:4,width:10,length:45,kind:'water'},{s:.36,lateral:-3,width:11,length:50,kind:'mud'},{s:.48,lateral:4,width:10,length:40,kind:'grass'},{s:.61,lateral:-4,width:10,length:42,kind:'water'},{s:.73,lateral:3,width:12,length:50,kind:'mud'},{s:.86,lateral:-4,width:10,length:42,kind:'grass'}],
   obstacles:[{s:.17,lateral:4,radius:1.4,kind:'rock'},{s:.3,lateral:-4,radius:1.6,kind:'log'},{s:.41,lateral:4,radius:1.4,kind:'tires'},{s:.55,lateral:-4,radius:1.3,kind:'rock'},{s:.68,lateral:4,radius:1.6,kind:'log'},{s:.8,lateral:-4,radius:1.4,kind:'tires'}],
   theme:{clear:0xabcaba,fog:0xa8c9b6,asphalt:0x886644,shoulder:0x537b3c,accent:0xffbd66,deco:'rocks',banking:.06}},
  {id:'neon', width:13, difficulty:3, legacyLength:buildPathMetrics(neonCity(0,0,1.1,60)).total,
   vertices:[[-260,-170],[260,-170],[260,65],[95,65],[95,190],[-260,190],[-260,55],[-125,-40]],
   theme:{clear:0x0a0618,fog:0x120a28,asphalt:0x1a1430,shoulder:0x3a2060,accent:0xff4fd8,deco:'neon',banking:0.08}}
].map(({vertices,...t})=>Object.freeze({...t,laps:t.laps||3,itemSlots:t.id==='grandtour'?Array.from({length:42},(_,i)=>.04+i*.92/42):t.id==='offroad'?Array.from({length:28},(_,i)=>(i+.7)/28):ITEM_SLOTS,path:circuit(vertices,t.legacyLength),theme:Object.freeze(t.theme)})));

/** Shared shape for selection thumbnails and the live minimap. */
export function trackMap(track) {
 const xs=track.path.map(p=>p.x),zs=track.path.map(p=>p.z);
 const minX=Math.min(...xs),minZ=Math.min(...zs),w=Math.max(...xs)-minX,h=Math.max(...zs)-minZ;
 const scale=160/Math.max(w,h);
 const map=p=>({x:20+(160-w*scale)/2+(p.x-minX)*scale,y:20+(160-h*scale)/2+(p.z-minZ)*scale});
 const points=track.path.map(p=>{const q=map(p);return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;}).join(' ');
 return {points,map};
}

export function getRaceTrack(id) {
  return RACE_TRACKS.find(t => t.id === id) || RACE_TRACKS[0];
}

/** Cumulative lengths + total for progress along a closed path. */
export function buildPathMetrics(path) {
  const n = path.length;
  const seg = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    seg[i] = len;
    total += len;
  }
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + seg[i];
  return {seg, cum, total, n};
}

/** Closest point on closed polyline → {s (0–1), dist, nx, nz, tx, tz, x, z, heading}. */
export function projectOnPath(path, metrics, x, z) {
  const {seg, cum, total, n} = metrics;
  let bestD = Infinity;
  let best = {s: 0, dist: 0, nx: 0, nz: 1, tx: 1, tz: 0, x: path[0].x, z: path[0].z, heading: 0};
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1e-6;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestD) {
      bestD = d;
      const len = seg[i] || Math.sqrt(len2);
      const along = cum[i] + t * len;
      const tx = dx / (len || 1);
      const tz = dz / (len || 1);
      // Left normal (perpendicular)
      const nx = -tz;
      const nz = tx;
      best = {
        s: total > 0 ? along / total : 0,
        dist: d,
        nx, nz, tx, tz,
        x: px, z: pz,
        heading: Math.atan2(tx, tz)
      };
    }
  }
  return best;
}

export function pointAtProgress(path, metrics, s) {
  const {cum, total, n} = metrics;
  const target = ((s % 1) + 1) % 1 * total;
  let i = 0;
  while (i < n - 1 && cum[i + 1] < target) i++;
  const a = path[i];
  const b = path[(i + 1) % n];
  const segLen = cum[i + 1] - cum[i] || 1;
  const t = (target - cum[i]) / segLen;
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return {x, z, heading: Math.atan2(dx / len, dz / len), tx: dx / len, tz: dz / len, nx: -dz / len, nz: dx / len};
}
