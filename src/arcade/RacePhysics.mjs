/** Metre-scale contact helpers shared by simulation and regression tests. */
export function dimensions(car) {
 return car.profile==='kart'?{halfWidth:1.06,halfLength:1.25}:car.profile==='open'?{halfWidth:1.2,halfLength:2.35}:{halfWidth:1.2,halfLength:2.35};
}
export function support(car,heading,nx,nz) {
 const d=dimensions(car);
 return Math.abs(Math.cos(heading)*nx-Math.sin(heading)*nz)*d.halfWidth+Math.abs(Math.sin(heading)*nx+Math.cos(heading)*nz)*d.halfLength;
}
export function barrierContact(body,projection,width) {
 const dx=body.x-projection.x,dz=body.z-projection.z;
 const side=dx*projection.nx+dz*projection.nz>=0?1:-1;
 const nx=projection.nx*side,nz=projection.nz*side;
 const extent=support(body.car,body.heading,nx,nz),limit=width/2+1.7-extent;
 const depth=dx*nx+dz*nz-limit;
 if(depth<=0)return null;
 const normalSpeed=body.vx*nx+body.vz*nz,impact=Math.max(0,normalSpeed);
 return {x:body.x-nx*depth,z:body.z-nz*depth,nx,nz,impact,
   vx:body.vx-nx*impact*1.22,vz:body.vz-nz*impact*1.22,
   contactX:body.x+nx*extent,contactZ:body.z+nz*extent};
}
/** Oriented-box SAT: long noses and rear bumpers cannot pass through other cars. */
export function carContact(a,b) {
 const dx=b.x-a.x,dz=b.z-a.z;
 let depth=Infinity,nx=0,nz=0;
 for(const h of [a.heading,b.heading])for(const [x,z] of [[Math.sin(h),Math.cos(h)],[Math.cos(h),-Math.sin(h)]]){
   const overlap=support(a.car,a.heading,x,z)+support(b.car,b.heading,x,z)-Math.abs(dx*x+dz*z);
   if(overlap<=0)return null;
   if(overlap<depth){depth=overlap;const sign=dx*x+dz*z>=0?1:-1;nx=x*sign;nz=z*sign;}
 }
 const closing=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
 const impulse=Math.max(0,closing)*1.25/(1/a.car.mass+1/b.car.mass);
 return {nx,nz,depth,impact:Math.max(0,closing),impulse,
   avx:a.vx-impulse*nx/a.car.mass,avz:a.vz-impulse*nz/a.car.mass,
   bvx:b.vx+impulse*nx/b.car.mass,bvz:b.vz+impulse*nz/b.car.mass};
}
