// World coordinates; open-front buildings are entered from the north promenade.
export const TOWN_BUILDINGS=['obby','tower','runner','memory','garden','gear'].map((id,i)=>({id,x:-17+i*7,z:22,color:[0xe9b862,0xab95d8,0x77bddd,0xe799ac,0x94bd68,0x73baaf][i]}));
export const buildingAt=(x,z)=>TOWN_BUILDINGS.find(b=>Math.abs(x-b.x)<1.35&&z>b.z-2.2&&z<b.z+.5);
export function buildingBlocks(x,z){return TOWN_BUILDINGS.some(b=>Math.abs(x-b.x)<3&&Math.abs(z-b.z)<3&&(Math.abs(x-b.x)>2.3||z>b.z+2.3));}
export const frameSeconds=(now,last)=>Number.isFinite(now-last)?Math.max(0,Math.min((now-last)/1000,.04)):0;
