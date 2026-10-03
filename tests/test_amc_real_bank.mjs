// Validates every real-style AMC problem: format (5 unique A–E options, answer
// index, three languages, citation + AoPS link) and correctness (each answer is
// re-computed independently below, mostly by brute force).
import assert from 'node:assert/strict';
import {AMC8_REAL_BANK,AMC8_AREAS} from '../src/competitions/AmcBank8.mjs';
import {AMC10_BANK,AMC10_AREAS} from '../src/competitions/AmcBank10.mjs';
import {AMC12_BANK,AMC12_AREAS} from '../src/competitions/AmcBank12.mjs';
import {citation} from '../src/competitions/AmcRealCore.mjs';

const BANKS={8:[AMC8_REAL_BANK,AMC8_AREAS],10:[AMC10_BANK,AMC10_AREAS],12:[AMC12_BANK,AMC12_AREAS]};
const CJK=/[\u4e00-\u9fff]/,KANA=/[\u3040-\u30ff]/;

// ---------- numeric evaluation of option strings ----------
function num(text){
  let s=String(text).replace(/−/g,'-').replace(/\s+/g,'');
  if(/[a-hj-zA-Z]/.test(s.replace(/i/g,'')))return NaN;
  if(/i/.test(s))return NaN;
  if(/^\d+$/.test(s))return Number(s);
  s=s.replace(/π/g,'(Math.PI)').replace(/√\(/g,'Math.sqrt(').replace(/√(\d+)/g,'Math.sqrt($1)');
  s=s.replace(/([0-9)])(?=[M(])/g,'$1*');
  // eslint-disable-next-line no-new-func
  return Function(`"use strict";return (${s});`)();
}
// complex numbers: [re, im]
const C=(re,im=0)=>[re,im],cadd=(a,b)=>[a[0]+b[0],a[1]+b[1]],cmul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const cpow=(z,n)=>{let r=C(1);for(let k=0;k<n;k++)r=cmul(r,z);return r;};
const cabs=z=>Math.hypot(z[0],z[1]);
const r2=Math.SQRT2,r3=Math.sqrt(3),r6=Math.sqrt(6);
// ---------- helpers ----------
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;};
const lcm=(a,b)=>a/gcd(a,b)*b;
const isPrime=n=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true;};
const divisors=n=>range(1,n).filter(d=>n%d===0);
const tau=n=>divisors(n).length;
const isSquare=n=>n>=0&&Number.isInteger(Math.sqrt(n));
const digits=n=>String(n).split('').map(Number);
const dsum=n=>digits(n).reduce((a,b)=>a+b,0);
const modpow=(b,e,m)=>{let r=1n,x=BigInt(b)%BigInt(m),k=BigInt(e);const M=BigInt(m);while(k>0n){if(k&1n)r=r*x%M;x=x*x%M;k>>=1n;}return Number(r);};
const fact=n=>{let r=1n;for(let k=2n;k<=BigInt(n);k++)r*=k;return r;};
const choose=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r);};
function* product(lists){if(!lists.length){yield [];return;}for(const x of lists[0])for(const rest of product(lists.slice(1)))yield [x,...rest];}
const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
function* subsets(a,k,start=0,cur=[]){if(cur.length===k){yield [...cur];return;}for(let i=start;i<a.length;i++){cur.push(a[i]);yield* subsets(a,k,i+1,cur);cur.pop();}}
const area=(P)=>Math.abs(P.reduce((s,[x,y],i)=>{const [u,v]=P[(i+1)%P.length];return s+x*v-u*y;},0))/2;
const countSignChanges=(f,a,b,n=200000)=>{let c=0,prev=f(a+1e-9);for(let i=1;i<=n;i++){const x=a+(b-a)*i/n,v=f(x);if(prev*v<0)c++;if(v!==0)prev=v;}return c;};
const dice=range(1,6);

// Each entry returns the expected numeric value, or a function (problem)=>index.
const EXPECTED={
// ---------------- AMC 10 ----------------
'a10-alg-01':()=>{const x=(120-30)/6;return x+30;},
'a10-alg-02':()=>12/(6/12+6/6),
'a10-alg-03':()=>60*(1+(1-1/6)/(1/6+1/3)),
'a10-alg-04':()=>(5*12-4-9-11)/2,
'a10-alg-05':()=>(150*0.6-150/25*3)/3,
'a10-alg-06':()=>{let s=0;for(const c of [16,24]){const D=100-4*c;if(D>=0){s+=(10+Math.sqrt(D))/2+(10-Math.sqrt(D))/2;}}return s;},
'a10-alg-07':()=>{const d=Math.sqrt(25-12),x=(5+d)/2,y=(5-d)/2;return x**3+y**3;},
'a10-alg-08':()=>{const a=(17-8)-(6-1),b=6-1-a;return 27+3*a+b;},
'a10-alg-09':()=>{const b=(2300-1100)/6,a=1100-4*b;return a+7*b;},
'a10-alg-10':()=>{const f=x=>x**3-3*x*x+2*x;let c=0;for(let a=-20;a<=20;a++)if(f(4-a)===0)c++;return c;},
'a10-alg-11':()=>{const s='1234567'.repeat(50);return +s[99]+ +s[199]+ +s[299];},
'a10-alg-12':p=>{const bad=p.options.map(Number).map(n=>n%2===1&&!isPrime(n*n+2));assert.equal(bad.filter(Boolean).length,1);return bad.indexOf(true);},
'a10-alg-13':()=>{let a=0.5;for(let n=1;n<2025;n++)a=a/(1+a);return a;},
'a10-alg-14':()=>{const x=(3+Math.sqrt(5))/2;return x**5+x**-5;},
'a10-cp-01':()=>new Set(perms([...'LEVEL']).map(p=>p.join(''))).size,
'a10-cp-02':()=>[...product([range(1,5),range(1,5),range(1,5),range(1,5)])].filter(c=>c.every((v,i)=>i===0||v!==c[i-1])).length,
'a10-cp-03':()=>[...product(Array(5).fill([0,1,2]))].filter(c=>c.every((v,i)=>i===0||v!==c[i-1])&&c[0]===c[4]).length,
'a10-cp-04':()=>{let n=0;for(const team of subsets(range(0,7),4)){const boys=team.filter(x=>x<4).length;if(boys===2&&team.includes(0))n++;}return n;},
'a10-cp-05':()=>{let n=0;for(let m=0;m<1024;m++)if((m&(m>>1))===0)n++;return n;},
'a10-cp-06':()=>{const all=[...subsets(range(1,6),3)];let good=0;for(const a of all)for(const b of all)if(a.filter(x=>b.includes(x)).length===1)good++;return good/all.length**2;},
'a10-cp-07':()=>{const d=divisors(720);return d.filter(isSquare).length/d.length;},
'a10-cp-08':()=>{let s=0,n=0;for(const c of product(Array(4).fill([0,1,2]))){const k=[0,1,2].map(j=>c.filter(x=>x===j).length);s+=Math.max(...k);n++;}return s/n;},
'a10-cp-09':()=>Math.PI/4,
'a10-cp-10':()=>{let g=0;for(const a of dice)for(const b of dice)if(isPrime(a+b))g++;return g/36;},
'a10-nt-01':()=>{const s=range(1,1000).filter(n=>lcm(n,12)===60&&gcd(n,18)===3);assert.equal(s.length,1);return s[0];},
'a10-nt-02':p=>{const bad=p.options.map(Number).map(b=>(b**3+b+2-(b*b+2))%4!==0);assert.equal(bad.filter(Boolean).length,1);return bad.indexOf(true);},
'a10-nt-03':()=>{const s=range(1,100).filter(n=>fact(n+1)+fact(n+2)===360n*fact(n));assert.equal(s.length,1);return s[0];},
'a10-nt-04':()=>range(100,999).filter(n=>digits(n).every(d=>d%2)&&n%5===0).length,
'a10-nt-05':()=>Math.max(...range(1,999).map(n=>n.toString(5).split('').reduce((a,b)=>a+ +b,0))),
'a10-nt-06':()=>modpow(3,2026,7),
'a10-nt-07':()=>{let n=101;while(!(gcd(n+7,30)===15&&gcd(n,20)===4))n++;return dsum(n);},
'a10-nt-08':()=>range(10,99).filter(n=>digits(n).filter(d=>d%2===0).length===1).length,
'a10-nt-09':()=>{const s=fact(15).toString();assert.equal(s.length,13);assert.equal(s.slice(0,8),'13076743');assert.equal(s.slice(9),'8000');return +s[8];},
'a10-nt-10':()=>Math.max(...range(1,150).filter(N=>100%N===4&&150%N===6)),
'a10-nt-11':()=>{let best=-Infinity;for(let M=-100;M<=100000;M++)if(isSquare(M+100)&&isSquare(M+168))best=M;return best;},
'a10-geo-01':()=>1/(1+Math.SQRT2),
'a10-geo-02':()=>area([[0,0],[6,6],[-6,6]]),
'a10-geo-03':()=>{const A=[6,0],B=[0,8],D=[-3,0],Cc=[2*D[0]-B[0],2*D[1]-B[1]];assert.equal(Math.hypot(A[0]-D[0],A[1]-D[1]),9);const E=[(A[0]+Cc[0])/2,(A[1]+Cc[1])/2];assert.equal(Math.hypot(B[0]-E[0],B[1]-E[1]),12);return area([A,B,Cc]);},
'a10-geo-04':()=>{const d=Math.sqrt(2*25-49),a=(7-d)/2,b=(7+d)/2;assert.ok(Math.abs(a*a+b*b-25)<1e-9);return a*b;},
'a10-geo-05':()=>{const A=[2,5],B=[A[1],A[0]],Cc=[B[0],-B[1]];return area([A,B,Cc]);},
'a10-geo-06':()=>{const r=6*Math.PI/(2*Math.PI),h=Math.sqrt(36-r*r);return Math.PI*r*r*h/3;},
'a10-geo-07':()=>(Math.PI*36*12/3)/(Math.PI*16),
'a10-geo-08':()=>Math.PI*9-7*Math.PI,
'a10-geo-09':()=>Math.sqrt(13**2-5**2),
'a10-geo-10':()=>{// A(0,0) B(4,0) C(4,4) D(0,4) M(2,4); AM: t(2,4); BD: (4-4s,4s)
  const t=2/3;assert.ok(Math.abs(2*t-(4-4*t))<1e-12);return area([[0,0],[4,0],[2*t,4*t]]);},
// ---------------- AMC 12 ----------------
'a12-alg-01':()=>{const ks=new Set();for(let r=-30;r<=30;r++)for(let s=r+1;s<=30;s++)if(r*s===24)ks.add(-(r+s));return ks.size;},
'a12-alg-02':()=>{const sols=[];for(const c of product(Array(4).fill(range(1,16))))if(c[0]<=c[1]&&c[1]<=c[2]&&c[2]<=c[3]&&c.reduce((a,b)=>a+b)===10&&c.reduce((a,b)=>a*b)===16)sols.push(c);assert.equal(sols.length,1);const r=sols[0];let e2=0;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)e2+=r[i]*r[j];return e2;},
'a12-alg-03':()=>{const P=x=>x**3-4*x*x+x+6;const roots=range(-10,10).filter(x=>P(x)===0);assert.equal(roots.length,3);return roots.reduce((s,x)=>s+x**3,0);},
'a12-alg-04':()=>{const P=x=>2*x**3-9*x*x+10*x-3;const roots=[1,0.5,3];roots.forEach(x=>assert.ok(Math.abs(P(x))<1e-12));return roots.reduce((s,x)=>s+1/x,0);},
'a12-alg-05':()=>range(2,63).reduce((p,k)=>p*Math.log(k+1)/Math.log(k),1),
'a12-alg-06':()=>{const l=(b,x)=>Math.log(x)/Math.log(b);const s=range(4,100000).filter(n=>{const u=l(9,n),v=l(3,n);return u>0&&v>0&&Math.abs(l(3,u)-l(9,v))<1e-9;});assert.equal(s.length,1);return dsum(s[0]);},
'a12-alg-07':()=>Math.sqrt(20**2-4*81),
'a12-alg-08':()=>{const L=[(1+3)/2,(1-3)/2];L.forEach(x=>assert.ok(Math.abs(x*x-x-2)<1e-12));const xs=L.map(v=>10**v);xs.forEach(x=>assert.ok(Math.abs(x**Math.log10(x)-100*x)<1e-6*x));return xs[0]*xs[1];},
'a12-alg-09':()=>{// a+2b=6, 2a+b=1.5
  const a=(2*1.5-6)/3,b=(6-a)/2;assert.ok(Math.abs(b+2*a-1.5)<1e-12);return a;},
'a12-alg-10':()=>{let n=0;for(let r=-12;r<=12;r++)for(let s=r+1;s<=12;s++)for(let t=s+1;t<=12;t++)if(r*s*t===-12)n++;return n;},
'a12-tc-01':()=>countSignChanges(t=>2*Math.sin(3*t)-1,0,2*Math.PI),
'a12-tc-02':()=>countSignChanges(x=>Math.sin(2*x)-Math.cos(x),0,2*Math.PI),
'a12-tc-03':()=>{const a=Math.sqrt(25+64-2*5*8*0.5);return a/(2*Math.sin(Math.PI/3));},
'a12-tc-04':()=>Math.sin(2*Math.atan(2)),
'a12-tc-05':()=>{// bisection on the law of cosines with a 120° angle opposite the longest side
  const f=d=>(3+2*d)**2-(9+(3+d)**2+3*(3+d));let lo=0.01,hi=20;assert.ok(f(lo)<0&&f(hi)>0);for(let k=0;k<200;k++){const m=(lo+hi)/2;if(f(m)<0)lo=m;else hi=m;}return 9+3*lo;},
'a12-tc-06':()=>180-(Math.atan(1/2)+Math.atan(1/3))*180/Math.PI,
'a12-tc-07':()=>{const z=[C(-2),C(-r3,1),C(-r2,r2),C(-1,r3),C(0,2)];const re=z.map(w=>cpow(w,3)[0]);const best=Math.max(...re);assert.equal(re.filter(v=>Math.abs(v-best)<1e-9).length,1);return {index:re.indexOf(best)};},
'a12-tc-08':()=>{const A=[C(2),C(-1,r3),C(-1,-r3)],B=[C(0,2),C(0,-2)];let m=0;for(const a of A)for(const b of B)m=Math.max(m,cabs(cadd(a,[-b[0],-b[1]])));return m;},
'a12-tc-09':()=>{const z=C(1/r2,1/r2);let s=C(0);for(let k=1;k<=20;k++)s=cadd(s,cpow(z,k));const opts=[C(0),C(-1,1),C(-1,1+r2),C(1,r2),C(0,1+r2)];const i=opts.findIndex(o=>cabs(cadd(o,[-s[0],-s[1]]))<1e-9);return {index:i};},
'a12-tc-10':()=>{const v=cpow(C(1,1),10);const opts=[C(32),C(-32),C(0,32),C(0,-32),C(0,1024)];return {index:opts.findIndex(o=>cabs(cadd(o,[-v[0],-v[1]]))<1e-9)};},
'a12-sn-01':()=>range(1,12).reduce((s,k)=>s+(k*k*Math.log(4))/(k*Math.log(2)),0),
'a12-sn-02':()=>{let a=1;for(let n=1;n<20;n++)a=a/(1+3*a);return a;},
'a12-sn-03':()=>{const x=-4;assert.ok(Math.abs((2*x+2)**2-x*(3*x+3))<1e-12);const r=(2*x+2)/x;return (3*x+3)*r;},
'a12-sn-04':()=>{const a=[0,2,3];for(let n=3;n<=2026;n++)a[n]=a[n-1]/a[n-2];return a[2026];},
'a12-sn-05':()=>range(1,30).filter(n=>n**3<10000&&n**3%6===0).length,
'a12-sn-06':()=>{const f=[n=>(n+2n)**2n,n=>n*n+1n,n=>(n+1n)**2n,n=>n**3n,n=>2n*n+3n];const ok=f.map(g=>range(4,25).every(k=>{const n=BigInt(k);return (fact(k+2)-fact(k+1))%g(n)===0n;}));assert.equal(ok.filter(Boolean).length,1);return {index:ok.indexOf(true)};},
'a12-sn-07':()=>range(1000,9999).filter(n=>digits(n).every(d=>d%2===0)&&n%4===0).length,
'a12-sn-08':()=>modpow(7,2026,100),
'a12-sn-09':()=>{const d=divisors(72);let n=0;for(const a of d)for(const b of d)if(lcm(a,b)===72)n++;return n;},
'a12-sn-10':()=>{let best=-Infinity;for(let a=0;a<=1000;a++){const M=a*a-300;if(isSquare(M+1200))best=Math.max(best,M);}return dsum(best);},
'a12-cp-01':()=>{const V=[...product([[0,1],[0,1],[0,1]])];let right=0,all=0;for(const [a,b,c] of subsets(V,3)){all++;const d=(p,q)=>p.reduce((s,_,i)=>s+(p[i]-q[i])**2,0);const s=[d(a,b),d(b,c),d(a,c)].sort((x,y)=>x-y);if(s[0]+s[1]===s[2])right++;}return right/all;},
'a12-cp-02':()=>{let g=0;for(const r of product([dice,dice,dice]))if(r.includes(6)&&r.includes(1))g++;return g/216;},
'a12-cp-03':()=>{// P(first HH at flip n) via DP on states
  let s0=1,s1=0,E=0;for(let n=1;n<=400;n++){const done=s1*0.5;E+=n*done;const n0=(s0+s1)*0.5,n1=s0*0.5;s0=n0;s1=n1;}return E;},
'a12-cp-04':()=>{let g=0;for(const a of dice)for(const b of range(1,4))if(a+b===7)g++;return g/24;},
'a12-cp-05':()=>{// trapezoid rule on the piecewise-linear slice length (exact: breakpoints are grid nodes)
  const N=300,len=x=>Math.min(3,x+1)-Math.max(0,x-1);let s=0;for(let i=0;i<N;i++){const a=3*i/N,b=3*(i+1)/N;s+=(len(a)+len(b))/2*(b-a);}return s/9;},
'a12-cp-06':()=>{let g=0;for(const r of product([dice,dice,dice])){let t=0,hit=false;for(const v of r){t+=v;if(t===4)hit=true;}if(hit)g++;}return g/216;},
'a12-cp-07':()=>{const W=Array.from({length:6},()=>Array(6).fill(0));for(let x=0;x<=5;x++)for(let y=0;y<=5;y++){if(x===2&&y===2){W[x][y]=0;continue;}W[x][y]=x===0&&y===0?1:(x?W[x-1][y]:0)+(y?W[x][y-1]:0);}return W[5][5];},
'a12-cp-08':()=>[...subsets(range(1,15),3)].filter(s=>(s[0]+s[1]+s[2])%3===0).length,
'a12-geo-01':()=>{const u=[1,1,1],v=[1,1,-1];return (u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/3;},
'a12-geo-02':()=>{const c=40/8;assert.equal((2*(2-c)+6*(6-c)),0);return Math.PI*((2-c)**2+(6-c)**2);},
'a12-geo-03':()=>{const h=Math.sqrt(25-18);return 36*h/3;},
'a12-geo-04':()=>{const xs=[3,-1];xs.forEach(x=>assert.equal(x*x,2*x+3));return area([[0,0],[3,9],[-1,1]]);},
'a12-geo-05':()=>{const d=Math.sqrt(2*5-9),a=(3-d)/2,b=(3+d)/2;return a/b;},
'a12-geo-06':()=>{const B=[0,0],Cc=[10,0],x=(36-81+100)/20,A=[x,Math.sqrt(36-x*x)];assert.ok(Math.abs(Math.hypot(A[0]-10,A[1])-9)<1e-9);const D=[4,0];return (A[0]-D[0])**2+(A[1]-D[1])**2;},
'a12-geo-07':()=>Math.round(100*(25/16-1)),
'a12-geo-08':()=>(6*r3/4*4)/(Math.PI*4),
// ---------------- AMC 8 ----------------
'a8-number-01':()=>range(1,10).reduce((a,b)=>a+b)-range(1,10).reduce((s,k)=>s+(k%2?k:-k),0),
'a8-number-02':()=>{let n=200;while(n>=50)n-=6;return n;},
'a8-number-03':p=>{const ok=p.options.map(Number).map(x=>(78-x)%7===0);assert.equal(ok.filter(Boolean).length,1);return ok.indexOf(true);},
'a8-number-04':()=>range(1,40).reduce((s,n)=>s+n%6,0),
'a8-number-05':()=>divisors(360).filter(d=>tau(d)>3).length,
'a8-number-06':()=>modpow(7,2026,10),
'a8-number-07':()=>{const p=range(10000,99999).filter(n=>String(n)===String(n).split('').reverse().join('')&&n%6===0);return dsum(Math.max(...p));},
'a8-number-08':()=>range(100,999).filter(n=>digits(n).reduce((a,b)=>a*b)===12).length,
'a8-fraction-01':()=>(1/2+1/3)/(1/2-1/3),
'a8-fraction-02':()=>100*1.2*0.8,
'a8-fraction-03':()=>{for(let x=1;;x++)if(5*x-3*x===6)return 8*x;},
'a8-fraction-04':()=>30/((2/3)*(3/4)),
'a8-fraction-05':()=>21*5/7,
'a8-fraction-06':()=>6*86-5*84,
'a8-fraction-07':()=>{for(let d=0;d<=100;d+=0.5)if(Math.abs((12+d)/(12/16+d/24)-20)<1e-9)return d;return NaN;},
'a8-fraction-08':()=>100*0.75*0.8*0.9,
'a8-geometry-01':()=>{const w=36/6;return w*2*w;},
'a8-geometry-02':()=>{const h=Math.sqrt(100-36);return 12*(2*h)/2;},
'a8-geometry-03':()=>{for(let y=3;y<20;y++)if(area([[1,2],[9,2],[4,y]])===20)return y;return NaN;},
'a8-geometry-04':()=>area([[0,0],[2,4],[-2,4]]),
'a8-geometry-05':()=>Math.PI*4-(4*4/2),
'a8-geometry-06':()=>{let n=0;for(const [x,y,z] of product(Array(3).fill(range(0,4)))){const f=[x,y,z].filter(v=>v===0||v===4).length;if(f===2)n++;}return n;},
'a8-geometry-07':()=>{const m=[[1,0],[4,0],[2,3]];// vertices: A=m1+m3-m2 etc.
  const V=[[m[0][0]+m[2][0]-m[1][0],m[0][1]+m[2][1]-m[1][1]],[m[0][0]+m[1][0]-m[2][0],m[0][1]+m[1][1]-m[2][1]],[m[1][0]+m[2][0]-m[0][0],m[1][1]+m[2][1]-m[0][1]]];return area(V);},
'a8-geometry-08':p=>{const metres=Math.PI*(25-4)/0.01/100;const d=p.options.map(o=>Math.abs(Number(o)-metres));return d.indexOf(Math.min(...d));},
'a8-counting-01':()=>perms([0,1,2,3,4]).filter(p=>Math.abs(p.indexOf(0)-p.indexOf(1))!==1).length,
'a8-counting-02':()=>{const f=[1,3,4,5,7,9];let g=0;for(const a of f)for(const b of f)if((a+b)%2)g++;return g/36;},
'a8-counting-03':()=>[...subsets(range(1,8),2)].length,
'a8-counting-04':()=>{let g=0;for(const a of dice)for(const b of dice)if(a*b%2===0)g++;return g/36;},
'a8-counting-05':()=>range(101,499).filter(n=>{const d=digits(n);return d[0]<d[1]&&d[1]<d[2];}).length,
'a8-counting-06':()=>[...product(Array(4).fill([0,1,2]))].filter(c=>new Set(c).size===3).length,
'a8-counting-07':()=>{let g=0;for(const a of [1,2,3,4])for(const b of [1,3,7,9])if(isPrime(10*a+b))g++;return g/16;},
'a8-counting-08':()=>{const W=Array.from({length:5},()=>Array(4).fill(0));for(let x=0;x<=4;x++)for(let y=0;y<=3;y++)W[x][y]=x===0&&y===0?1:(x?W[x-1][y]:0)+(y?W[x][y-1]:0);return W[4][3];},
'a8-logic-01':()=>{for(let b=0;b<100;b++)if((b+3+5)+(b+5)===41)return b;return NaN;},
'a8-logic-02':()=>3*50+1,
'a8-logic-03':()=>{const t={A:0};t.B=t.A+3;t.C=t.B-5;t.D=t.C+4;t.E=t.A-1;const v=Object.values(t);return Math.max(...v)-Math.min(...v);},
'a8-logic-04':()=>{const t=[];t[5]=21;t[7]=55;t[6]=t[7]-t[5];for(let k=4;k>=1;k--)t[k]=t[k+2]-t[k+1];return t[1];},
'a8-logic-05':()=>{for(let b=0;b<=30;b++)if(5*(30-b)+10*b===230)return b;return NaN;},
'a8-logic-06':()=>range(1,6).reduce((s,k)=>s+k*(k+6),0),
'a8-logic-07':()=>{const ks=new Set();for(let b=1;b<41;b++){const a=41-b,k=a-3*b;if(k>0)ks.add(k);}return ks.size;},
'a8-logic-08':()=>{let n=0;for(let A=1;A<=9;A++)for(let B=1;B<=9;B++)if(A>B&&(10*A+B)+(10*B+A)===121)n++;return n;}
};

let total=0;const ids=new Set();
for(const [level,[bank,areas]] of Object.entries(BANKS)){
  assert.ok(bank.length>=40,`AMC ${level} has at least 40 problems (${bank.length})`);
  const areaIds=areas.map(a=>a.id);
  for(const a of areas){
    for(const loc of ['zh','en','ja'])assert.ok(a.title[loc]&&a.goal[loc],`${level}/${a.id} area text ${loc}`);
    const n=bank.filter(p=>p.area===a.id).length;assert.ok(n>=8,`AMC ${level} area ${a.id} has ≥8 problems (${n})`);
  }
  for(const band of [1,2,3])assert.ok(bank.some(p=>p.band===band),`AMC ${level} has band ${band}`);
  for(const p of bank){
    const where=`${p.id}`;
    assert.ok(!ids.has(p.id),`unique id ${p.id}`);ids.add(p.id);
    assert.equal(p.level,Number(level),`${where} level`);
    assert.ok(areaIds.includes(p.area),`${where} area`);
    assert.ok([1,2,3].includes(p.band),`${where} band`);
    // five unique options, answer in range
    assert.equal(p.options.length,5,`${where} has 5 options`);
    assert.equal(new Set(p.options).size,5,`${where} options unique`);
    assert.ok(Number.isInteger(p.answer)&&p.answer>=0&&p.answer<5,`${where} answer index`);
    // numerically distinct when numeric
    const vals=p.options.map(num);
    if(vals.every(Number.isFinite)){
      for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.abs(vals[i]-vals[j])>1e-9,`${where} options ${i},${j} numerically distinct`);
    }
    // three languages
    assert.ok(CJK.test(p.prompt.zh)&&!KANA.test(p.prompt.zh),`${where} zh prompt`);
    assert.ok(KANA.test(p.prompt.ja),`${where} ja prompt has kana`);
    assert.ok(p.prompt.en&&!CJK.test(p.prompt.en)&&!KANA.test(p.prompt.en),`${where} en prompt`);
    assert.ok(p.steps.length>=2,`${where} has a worked solution`);
    for(const s of p.steps){
      assert.ok(s.zh&&s.en&&s.ja,`${where} step in all languages`);
      assert.ok(!CJK.test(s.en)&&!KANA.test(s.en),`${where} en step is English`);
    }
    // citation
    const m=p.model;
    assert.match(m.contest,new RegExp(`^20(19|2[0-6]) AMC ${level}${level==='8'?'':'[AB]'}$`),`${where} contest matches level`);
    assert.ok(Number.isInteger(m.number)&&m.number>=1&&m.number<=25,`${where} problem number`);
    assert.equal(m.url,`https://artofproblemsolving.com/wiki/index.php/${m.contest.replace(/ /g,'_')}_Problems/Problem_${m.number}`,`${where} AoPS url`);
    assert.match(citation(m,'zh'),/^仿照 20\d\d AMC \d+[AB]? 第\d+题$/);
    assert.match(citation(m,'en'),/^Modeled on 20\d\d AMC/);
    assert.match(citation(m,'ja'),/第\d+問/);
    // correctness
    const check=EXPECTED[p.id];assert.ok(check,`${where} has an independent answer check`);
    const expected=check(p);
    if(typeof expected==='number'&&Number.isInteger(expected)&&expected>=0&&expected<5&&(check.length===1)){assert.equal(expected,p.answer,`${where} answer index`);}
    else if(expected&&typeof expected==='object'){assert.equal(expected.index,p.answer,`${where} answer index`);}
    else{
      const got=num(p.options[p.answer]),tol=1e-9*Math.max(Math.abs(expected),1e-3);
      assert.ok(Number.isFinite(expected),`${where} expected value computed`);
      assert.ok(Math.abs(got-expected)<tol,`${where}: key ${p.options[p.answer]} (${got}) vs computed ${expected}`);
      const matches=vals.filter(v=>Math.abs(v-expected)<tol).length;
      assert.equal(matches,1,`${where}: exactly one option matches`);
    }
    total++;
  }
}
assert.equal(Object.keys(EXPECTED).length,total,'every check maps to a problem');
console.log(`AMC real-style banks OK: ${total} problems (AMC 8 ${AMC8_REAL_BANK.length}, AMC 10 ${AMC10_BANK.length}, AMC 12 ${AMC12_BANK.length})`);
