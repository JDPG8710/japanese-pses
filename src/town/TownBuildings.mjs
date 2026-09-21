// World coordinates; open-front buildings are entered from the north promenade (approach from south).
const EDU=['obby','tower','runner','memory','garden','gear'];
const EDU_COLORS=[0xe9b862,0xab95d8,0x77bddd,0xe799ac,0x94bd68,0x73baaf];
const CASUAL=[
 {id:'fruit',x:-28,z:8,color:0xffd45e},
 {id:'ninja',x:22,z:-8,color:0xc791ff},
 {id:'breakout',x:18,z:18,color:0x57dfff},
 {id:'race',x:-22,z:-12,color:0xff6b4a}
];
export const CASUAL_ARCADE_IDS=Object.freeze(CASUAL.map(b=>b.id));
export const TOWN_BUILDINGS=[
 ...EDU.map((id,i)=>({id,x:-17+i*7,z:22,color:EDU_COLORS[i]})),
 ...CASUAL
];
export const buildingAt=(x,z)=>TOWN_BUILDINGS.find(b=>Math.abs(x-b.x)<1.35&&z>b.z-2.2&&z<b.z+.5);
export function buildingBlocks(x,z){return TOWN_BUILDINGS.some(b=>Math.abs(x-b.x)<3&&Math.abs(z-b.z)<3&&(Math.abs(x-b.x)>2.3||z>b.z+2.3));}
export const frameSeconds=(now,last)=>Number.isFinite(now-last)?Math.max(0,Math.min((now-last)/1000,.04)):0;
