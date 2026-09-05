import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {build} from 'esbuild';
import * as miniflare from 'miniflare';
import {GAMES,makeRounds,checkAnswer,solution,evaluate,isSet} from '../src/world/WorldRules.mjs';

let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const oldGames=['cafe','robot','garden','rhythm','data','matrix','memory','switch'];
assert.deepEqual(GAMES,['circuit','sudoku','code','set','balance','order','water','network']);
const bannedKeys=new Set(['answer','solution','secret','path','route','weights','hidden','correct','targetMasks']);
function noAnswerFields(value){if(!value||typeof value!=='object')return true;if(Array.isArray(value))return value.every(noAnswerFields);return Object.entries(value).every(([key,item])=>!bannedKeys.has(key)&&noAnswerFields(item));}
function wrongAnswer(game,q,good){
 if(game==='circuit'){for(let i=0;i<good.length;i++)for(let turn=1;turn<4;turn++){const bad=[...good];bad[i]=(bad[i]+turn)%4;if(!checkAnswer(game,q,bad))return bad;}}
 if(game==='sudoku'){const bad=[...good],i=q.givens.findIndex(Boolean);bad[i]=bad[i]%q.size+1;return bad;}
 if(game==='code'){const bad=[...good];bad[0]=(bad[0]+1)%q.symbols;return bad;}
 if(game==='set'){for(let a=0;a<q.cards.length-2;a++)for(let b=a+1;b<q.cards.length-1;b++)for(let c=b+1;c<q.cards.length;c++)if(!isSet([q.cards[a],q.cards[b],q.cards[c]]))return[a,b,c];return[good[0],good[0],good[1]];}
 if(game==='balance')return[good[0]===q.max?1:good[0]+1];
 if(game==='order')return[...good].reverse();
 if(game==='water'||game==='network')return good.slice(0,-1);
 return[999];
}

for(const game of GAMES)for(const level of [1,2])for(let seed=0;seed<100;seed++){
 const rounds=makeRounds(game,level,seed),again=makeRounds(game,level,seed);
 check(JSON.stringify(rounds)===JSON.stringify(again),`${game}: deterministic seed ${seed}`);
 check(rounds.length===10&&new Set(rounds.map(JSON.stringify)).size===10,`${game}: ten unique puzzles`);
 for(const q of rounds){
  const good=solution(game,q);check(noAnswerFields(q),`${game}: no answer-bearing fields`);check(Array.isArray(good)&&checkAnswer(game,q,good),`${game}: generated puzzle is solvable`);check(!checkAnswer(game,q,wrongAnswer(game,q,good)),`${game}: plausible wrong solution rejected`);check(!checkAnswer(game,q,[NaN]),`${game}: malformed answer rejected`);
  if(game==='sudoku')check(new Set(q.givens.filter(Boolean)).size>1,'sudoku has meaningful givens');
  if(game==='code')check(q.clues.every(clue=>clue.exact<q.length),'code never displays the hidden code as a clue');
  if(game==='water')check(good.length===q.limit,'water requires an optimal-length plan');
  if(game==='network')check(good.length===q.count-1,'network uses a spanning tree');
 }
}
for(const old of oldGames)check(!GAMES.includes(old),`${old} retired`);
const scoreQ=makeRounds('balance',1,7)[0],scoreAnswer=solution('balance',scoreQ),scoreWrong=wrongAnswer('balance',scoreQ,scoreAnswer);
check(evaluate('balance',scoreQ,scoreAnswer,0).points===100,'first attempt score');check(evaluate('balance',scoreQ,scoreAnswer,1).points===70,'second attempt score');check(evaluate('balance',scoreQ,scoreAnswer,2).points===40,'third attempt score');check(evaluate('balance',scoreQ,scoreWrong,2).done,'third failure advances without points');

const bundled=await build({entryPoints:['worker/index.js'],bundle:true,write:false,format:'esm',platform:'browser'}),secret='local-test-secret-not-a-production-credential';
const options={modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2025-04-01',d1Databases:['DB'],bindings:{JWT_SECRET:secret,APP_ORIGIN:'http://localhost:4173',DEV_ORIGINS:'http://localhost:4173'},port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);
async function statements(db,file){const sql=await readFile(file,'utf8');for(const statement of sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(x=>x.trim()).filter(Boolean))await db.prepare(statement).run();}
try{
 const db=await mf.getD1Database('DB');for(const file of ['migrations/0001_d1_data_platform.sql','migrations/0005_world_games.sql','migrations/0007_world_games_brain_arcade.sql'])await statements(db,file);
 const legacyNow=Date.now();await db.prepare('INSERT INTO users(user_id,display_name,email,primary_provider,created_at,updated_at,last_login_at) VALUES(?1,?2,?3,?4,?5,?5,?5)').bind('legacy','Legacy','legacy@example.test','google',legacyNow).run();
 await db.prepare("INSERT INTO world_runs(run_id,user_id,game,level,version,rounds_json,round_index,score,started_at,expires_at,completed_at) VALUES('legacy-run','legacy','cafe',1,2,'[]',10,900,?1,?2,?1)").bind(legacyNow,legacyNow+1000).run();
 await statements(db,'migrations/0008_world_games_logic_lab.sql');check((await db.prepare("SELECT score FROM world_runs WHERE run_id='legacy-run'").first()).score===900,'migration preserves retired-game history');
 const tokens={};for(const user of ['a','b']){const now=Date.now();await db.prepare('INSERT INTO users(user_id,display_name,email,primary_provider,created_at,updated_at,last_login_at) VALUES(?1,?2,?3,?4,?5,?5,?5)').bind(user,'PRIVATE REAL NAME',`${user}@private.example`,'google',now).run();await db.prepare('INSERT INTO auth_sessions(jti,user_id,provider,created_at,expires_at) VALUES(?1,?2,?3,?4,?5)').bind(user,user,'google',now,now+3600000).run();const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({sub:user,jti:user,exp:Math.floor(now/1000)+3600})).toString('base64url');tokens[user]=`${head}.${body}.${createHmac('sha256',secret).update(`${head}.${body}`).digest('base64url')}`;}
 async function api(path,body,user,extra={}){const response=await mf.dispatchFetch(`http://localhost:4173/api/world/${path}`,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(user?{authorization:`Bearer ${tokens[user]}`} : {}),...extra},body:body?JSON.stringify(body):undefined});return{status:response.status,...await response.json()};}
 check((await api('leaderboard?game=circuit&level=1')).entries.length===0,'guest reads leaderboard');check((await api('start',{game:'circuit',level:1})).status===401,'guest cannot create ranked run');check((await api('start',{game:'circuit',level:1},'a',{origin:'https://wrong.example'})).status===403,'cross-origin write rejected');
 for(const old of oldGames)check((await api('start',{game:old,level:1},'a')).status===400,`${old} rejected by API`);
 let run=await api('start',{game:'circuit',level:1},'a');check(run.status===200,'authenticated circuit start');const first={id:run.id,revision:0,answer:solution('circuit',run.question),score:999999,userId:'b'};check((await api('answer',first,'b')).status===404,'cross-user answer rejected');const concurrent=await Promise.all([api('answer',first,'a'),api('answer',first,'a')]);check(concurrent.filter(r=>r.status===200).length===1&&concurrent.filter(r=>r.status===409).length===1,'atomic replay protection');let state=concurrent.find(r=>r.status===200);check(state.score===100,'forged score ignored');while(!state.complete)state=await api('answer',{id:run.id,revision:state.revision,answer:solution('circuit',state.question)},'a');check(state.score===1000,'ten server-checked solutions score 1000');
 let board=await api('leaderboard?game=circuit&level=1');check(board.entries.length===1&&board.entries[0].score===1000,'completed circuit enters board');check(!JSON.stringify(board).includes('PRIVATE')&&!JSON.stringify(board).includes('@')&&!JSON.stringify(board).includes('user_id'),'leaderboard hides private data');
 for(const id of GAMES.slice(1)){await db.prepare('UPDATE world_runs SET started_at=0 WHERE user_id=?1').bind('a').run();const fresh=await api('start',{game:id,level:2},'a');check(fresh.status===200&&checkAnswer(id,fresh.question,solution(id,fresh.question)),`${id} ranked flow uses solvable server question`);check((await api(`leaderboard?game=${id}&level=2`)).entries.length===0,`${id} leaderboard isolated`);}
 await db.prepare('UPDATE world_runs SET started_at=0 WHERE user_id=?1').bind('a').run();run=await api('start',{game:'water',level:2},'a');await db.prepare('UPDATE world_runs SET expires_at=0 WHERE run_id=?1').bind(run.id).run();check((await api('answer',{id:run.id,revision:0,answer:solution('water',run.question)},'a')).status===410,'expired puzzle cannot score');
 await db.prepare('UPDATE world_runs SET started_at=0 WHERE user_id=?1').bind('a').run();run=await api('start',{game:'balance',level:1},'a');state=run;for(let i=0;i<30;i++)state=await api('answer',{id:run.id,revision:state.revision,answer:[999]},'a');check(state.complete&&state.score===0,'failed run completes with zero score');check((await api('leaderboard?game=balance&level=1')).entries.length===0,'failed run excluded from board');
 run=await api('start',{game:'code',level:1},'b');check((await api('answer',{id:run.id,revision:0,answer:Array(5000).fill(1)},'b')).status===413,'request body remains bounded');await db.prepare('UPDATE auth_sessions SET revoked_at=1 WHERE jti=?1').bind('b').run();check((await api('answer',{id:run.id,revision:0,answer:[1]},'b')).status===401,'revoked login rejected');
 console.log(`Logic Lab: ${checks} strict checks passed (1,600 generated sessions / 16,000 hidden-answer puzzles, real D1 migration and ranked API).`);
}finally{await mf.dispose();}
