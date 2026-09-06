import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {build} from 'esbuild';
import * as miniflare from 'miniflare';
const compiled=await build({entryPoints:['worker/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const secret='tutorial-test-secret-only',origin='http://localhost:4173';
const options={modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-24',d1Databases:['DB'],bindings:{JWT_SECRET:secret,APP_ORIGIN:origin},port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
try {
 const db=await mf.getD1Database('DB');
 for(const file of ['0001_d1_data_platform.sql','0005_world_games.sql','0006_foundation_games.sql','0007_world_games_brain_arcade.sql','0008_world_games_logic_lab.sql','0009_tutorial_pause.sql']){
  for(const sql of (await readFile(`migrations/${file}`,'utf8')).split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 }
 const tokens={};
 for(const id of ['alice','bob']){
  const now=Date.now();
  await db.prepare("INSERT INTO users(user_id,display_name,primary_provider,created_at,updated_at,last_login_at) VALUES(?1,'Test','google',?2,?2,?2)").bind(id,now).run();
  await db.prepare("INSERT INTO auth_sessions(jti,user_id,provider,created_at,expires_at) VALUES(?1,?1,'google',?2,?3)").bind(id,now,now+3600000).run();
  const h=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),p=Buffer.from(JSON.stringify({sub:id,jti:id,exp:Math.floor(now/1000)+3600})).toString('base64url');
  tokens[id]=`${h}.${p}.${createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url')}`;
 }
 for(const family of ['world','foundation']){
  const table=`${family}_runs`;
  async function api(path,body,user='alice',requestOrigin=origin){const r=await mf.dispatchFetch(`${origin}/api/${family}/${path}`,{method:'POST',headers:{'content-type':'application/json',origin:requestOrigin,...(user?{authorization:`Bearer ${tokens[user]}`}:{})},body:JSON.stringify(body)});return {status:r.status,...await r.json()};}
  const run=await api('start',family==='world'?{game:'balance',level:1}:{profile:'CN63',year:'Y1',lesson:'add20',locale:'zh'});
  check(run.status===200,`${family}: start`);
  const pause={id:run.id,revision:0,action:'pause'};
  check((await api('tutorial',pause,null)).status===401,'anonymous cannot pause ranked run');
  check((await api('tutorial',pause,'bob')).status===404,'ownership');
  check((await api('tutorial',pause,'alice','https://evil.invalid')).status===403,'origin');
  check((await api('tutorial',{...pause,revision:900})).status===409,'revision');
  const both=await Promise.all([api('tutorial',pause),api('tutorial',pause)]);
  check(both.every(r=>r.status===200&&r.paused),'pause retry is idempotent');
  const row=await db.prepare(`SELECT * FROM ${table} WHERE run_id=?1`).bind(run.id).first();
  check(row.score===0&&row.round_index===0,'pause cannot award progress');
  check((await api('answer',{id:run.id,revision:0,answer:family==='world'?[999]:'999'})).error==='TUTORIAL_OPEN','answers blocked during tutorial');
  // 時計を待たず、説明を5分間読んだ状況をD1で再現する。
  await db.prepare(`UPDATE ${table} SET tutorial_paused_at=?1,expires_at=?2 WHERE run_id=?3`).bind(Date.now()-300000,Date.now()-150000,run.id).run();
  const resumed=await api('tutorial',{...pause,action:'resume'});
  check(resumed.status===200&&!resumed.paused&&resumed.expiresAt>Date.now()+149000,'reading does not consume remaining 150 seconds');
  const again=await api('tutorial',{...pause,action:'resume'});
  check(again.expiresAt===resumed.expiresAt,'repeat resume cannot inflate time');
  const answer=await api('answer',{id:run.id,revision:0,answer:family==='world'?[999]:'999'});
  check(answer.status===200&&answer.revision===1,'answer resumes normally');
  await db.prepare(`UPDATE ${table} SET expires_at=0 WHERE run_id=?1`).bind(run.id).run();
  check((await api('tutorial',{...pause,revision:1})).status===410,'expired run cannot be revived');
 }
 console.log(`Tutorial API: ${checks} checks passed with real local D1.`);
} finally {await mf.dispose();}
