import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {build} from 'esbuild';
import * as miniflare from 'miniflare';
const compiled=await build({entryPoints:['worker/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const secret='foundation-test-only-secret',options={modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-24',d1Databases:['DB'],bindings:{JWT_SECRET:secret,APP_ORIGIN:'http://localhost:4173'},port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);
let checks=0;const check=(v,message)=>{assert.ok(v,message);checks++;};
try{
 const db=await mf.getD1Database('DB');for(const file of ['0001_d1_data_platform.sql','0005_world_games.sql','0006_foundation_games.sql','0006_foundation_games.sql'])for(const sql of (await readFile(`migrations/${file}`,'utf8')).split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 const tokens={};for(const user of ['a','b']){const now=Date.now();await db.prepare('INSERT INTO users(user_id,display_name,email,primary_provider,created_at,updated_at,last_login_at) VALUES(?1,?2,?3,?4,?5,?5,?5)').bind(user,'PRIVATE NAME',`${user}@private.example`,'google',now).run();await db.prepare('INSERT INTO auth_sessions(jti,user_id,provider,created_at,expires_at) VALUES(?1,?2,?3,?4,?5)').bind(user,user,'google',now,now+3600000).run();const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({sub:user,jti:user,exp:Math.floor(now/1000)+3600})).toString('base64url');tokens[user]=`${head}.${body}.${createHmac('sha256',secret).update(`${head}.${body}`).digest('base64url')}`;}
 const route={profile:'CN63',year:'Y1',lesson:'add20',locale:'zh'};
 async function api(path,body,user,headers={}){const r=await mf.dispatchFetch(`http://localhost:4173/api/foundation/${path}`,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(user?{authorization:`Bearer ${tokens[user]}`} :{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};}
 const board=async(extra={})=>api(`leaderboard?${new URLSearchParams({...route,...extra})}`);
 check((await board()).entries.length===0,'anonymous leaderboard');check((await api('start',route)).status===401,'guest cannot write');check((await api('start',route,'a',{origin:'https://bad.example'})).status===403,'origin protection');check((await api('start',{...route,lesson:'percent'},'a')).status===400,'grade mismatch rejected');
 let run=await api('start',route,'a');check(run.status===200,'start');check(!('correct' in run.question)&&!('explanation' in run.question)&&!('hint' in run.question),'no answer leaked at start');
 const stored=await db.prepare('SELECT rounds_json FROM foundation_runs WHERE run_id=?1').bind(run.id).first();const rounds=JSON.parse(stored.rounds_json);
 const answer={id:run.id,revision:0,answer:rounds[0].correct,score:999999};
 check((await api('answer',answer,'b')).status===404,'ownership');const both=await Promise.all([api('answer',answer,'a'),api('answer',answer,'a')]);check(both.filter(x=>x.status===200).length===1&&both.filter(x=>x.status===409).length===1,'atomic revision');
 let state=both.find(x=>x.status===200);check(state.score===100,'forged score ignored');
 while(!state.complete)state=await api('answer',{id:run.id,revision:state.revision,answer:rounds[state.index].correct},'a');check(state.score===1000,'completed score');check((await board()).entries[0].score===1000,'public saved score');check(!JSON.stringify(await board()).includes('PRIVATE')&&!JSON.stringify(await board()).includes('@'),'privacy');
 check((await board({locale:'en'})).entries.length===0,'locale isolated');check((await board({profile:'CN54'})).entries.length===0,'curriculum isolated');check((await board({year:'Y2',lesson:'add100'})).entries.length===0,'grade isolated');check((await api('answer',{id:run.id,revision:state.revision,answer:'0'},'a')).status===409,'finished replay rejected');
 run=await api('start',route,'a');state=await api('answer',{id:run.id,revision:0,answer:'-999'},'a');check(!state.done&&!state.hint&&!state.explanation,'first gentle attempt');state=await api('answer',{id:run.id,revision:state.revision,answer:'-999'},'a');check(!!state.hint&&!state.explanation&&!('correct' in state.question),'second hint without answer');state=await api('answer',{id:run.id,revision:state.revision,answer:'-999'},'a');check(state.done&&state.score===0&&!!state.explanation,'third explains without points');
 for(let i=0;i<27;i++)state=await api('answer',{id:run.id,revision:state.revision,answer:'-999'},'a');check(state.complete&&state.score===0,'failed run');check((await board()).entries.length===1&&(await board()).entries[0].score===1000,'failure cannot overwrite best');
 run=await api('start',route,'b');await db.prepare('UPDATE foundation_runs SET expires_at=0 WHERE run_id=?1').bind(run.id).run();check((await api('answer',{id:run.id,revision:0,answer:'1'},'b')).status===410,'timeout rejected');
 run=await api('start',{profile:'US',year:'G2',lesson:'words2',locale:'en'},'b');check(run.question.choices.length===3&&run.question.lang==='en','native literacy');check((await api('answer',{id:run.id,revision:0,answer:'x'.repeat(5000)},'b')).status===413,'bounded body');
 await db.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE jti=?1').bind('b').run();check((await api('answer',{id:run.id,revision:0,answer:'a'},'b')).status===401,'revoked session rejected');
 console.log(`Foundation API: ${checks} checks passed using local D1 and production authentication.`);
}finally{await mf.dispose();}
