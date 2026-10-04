/** Combat state is independent of meshes, so offscreen and headless rivals behave identically. */
export function segmentDistance(ax,az,bx,bz,x,z){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*t,z-az-dz*t);}
export function hitRival(rival,kind){
 if(rival.shieldT>0){rival.shieldT=0;return false;}
 rival.hitCount=(rival.hitCount||0)+1;rival.lastHit=kind;
 rival.slowT=Math.max(rival.slowT||0,kind==='rocket'?3:4);
 rival.stunT=Math.max(rival.stunT||0,kind==='rocket'?1.5:kind==='pulse'?1.1:0);
 rival.slipT=Math.max(rival.slipT||0,['banana','splash','oil'].includes(kind)?2.3:0);
 rival.speed*=kind==='rocket'||kind==='pulse'?0:kind==='banana'?.28:.45;
 return true;
}
export function advanceRivalStatus(rival,dt){for(const key of ['slowT','stunT','slipT','shieldT'])rival[key]=Math.max(0,(rival[key]||0)-dt);}
export function surfaceAt(track,metrics,projection,x,z){
 const lateral=(x-projection.x)*projection.nx+(z-projection.z)*projection.nz;
 for(const area of track.surfaces||[]){let delta=Math.abs(projection.s-area.s);delta=Math.min(delta,1-delta);if(delta*metrics.total<area.length/2&&Math.abs(lateral-area.lateral)<area.width/2)return area.kind;}
 return 'road';
}
export const SURFACE_FACTOR={road:1,grass:.7,mud:.48,water:.32};
