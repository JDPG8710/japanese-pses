import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base='https://piko-game.com';
const route=new URLSearchParams({profile:'CN63',year:'Y1',lesson:'add20',locale:'zh'});
const builtHome=await readFile('dist/index.html','utf8');
const consentAsset=builtHome.match(/\/src\/privacy\/ConsentManager\.mjs\?v=[A-Za-z0-9._-]+/)?.[0];
assert.ok(consentAsset,'Built home must contain a versioned consent asset');
const paths=['/','/grades.html','/learn.html','/world.html','/privacy.html','/terms.html',consentAsset,'/src/world/FoundationPlay.mjs','/src/world/FoundationWords.mjs','/src/location/Globe.mjs','/assets/maps/countries-50m.json','/api/health','/api/location','/api/game-data/manifest.json',`/api/foundation/leaderboard?${route}`,'/api/world/leaderboard?game=circuit&level=1'];
const results=await Promise.all(paths.map(async path=>{
 const r=await fetch(base+path,{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}});assert.equal(r.status,200,path);const text=await r.text();
 const pathname=new URL(path,base).pathname;
 if(pathname.endsWith('.mjs')){assert.match(r.headers.get('content-type'),/javascript/);assert.equal(text,await readFile(`dist${pathname}`,'utf8'),`Published bytes differ: ${path}`);}
 if(path==='/'){assert.ok(text.includes('/src/privacy/ConsentManager.mjs'));assert.ok(!/<script[^>]+pagead2\.googlesyndication\.com/i.test(text),'Production home must not load ads before consent');}
 if(path==='/privacy.html'){assert.ok(hasContactEmail(text));assert.ok(text.includes('Cookies, local storage and your choice'));}
 if(path==='/terms.html')assert.ok(hasContactEmail(text));
 if(path==='/api/health')assert.equal(JSON.parse(text).ok,true);
 if(path.includes('leaderboard')){const data=JSON.parse(text);assert.ok(Array.isArray(data.entries));assert.ok(data.entries.every(x=>Object.keys(x).every(k=>['rank','name','score'].includes(k))));}
 return `${path}: 200`;
}));
const denied=await fetch(`${base}/api/foundation/start`,{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(Object.fromEntries(route)),signal:AbortSignal.timeout(15000)});assert.equal(denied.status,401,'Unauthenticated score writes must be rejected');
console.log(results.join('\n'));console.log('Production assets match the build; API and anonymous access checks passed. No test scores were written.');

function hasContactEmail(html){
 if(html.includes('mailto:j565718319@gmail.com'))return true;
 return [...html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)].some(match=>decodeCloudflareEmail(match[1])==='j565718319@gmail.com');
}
function decodeCloudflareEmail(hex){
 const key=parseInt(hex.slice(0,2),16);let value='';
 for(let index=2;index<hex.length;index+=2)value+=String.fromCharCode(parseInt(hex.slice(index,index+2),16)^key);
 return value;
}
