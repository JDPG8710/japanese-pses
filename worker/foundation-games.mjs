import {validateFoundation} from '../src/world/FoundationCatalog.mjs';
import {CONTENT_VERSION,makeFoundationRounds,publicQuestion,markFoundation} from '../src/world/FoundationRules.mjs';
export async function foundationRoute(request,env,{authenticate,json,HttpError}){
 const db=env.DB;if(!db)throw new HttpError(503,'DATABASE_UNAVAILABLE');
 const url=new URL(request.url),reply=(body,status=200)=>json(body,status,request,env);
 if(url.pathname==='/api/foundation/leaderboard'&&request.method==='GET'){
  const route=validateFoundation(Object.fromEntries(url.searchParams));if(!route)throw new HttpError(400,'INVALID_LESSON');
  const result=await db.prepare(`SELECT p.public_name AS name,MAX(r.score) AS score FROM foundation_runs r JOIN world_players p ON p.user_id=r.user_id WHERE r.profile=?1 AND r.school_year=?2 AND r.lesson=?3 AND r.locale=?4 AND r.learning_language=?5 AND r.version=?6 AND r.completed_at IS NOT NULL AND r.score>=800 GROUP BY r.user_id,p.public_name ORDER BY score DESC,p.public_name LIMIT 50`).bind(route.profile,route.year,route.lesson,route.locale,route.learningLanguage,CONTENT_VERSION).all();
  let rank=0,prior=-1;return reply({entries:result.results.map((r,i)=>{if(prior!==r.score)rank=i+1;prior=r.score;return {rank,name:r.name,score:r.score};})});
 }
 if(request.method!=='POST'||!['/api/foundation/start','/api/foundation/answer'].includes(url.pathname))throw new HttpError(404,'NOT_FOUND');
 const origin=request.headers.get('Origin');if(origin&&![env.APP_ORIGIN,...(env.DEV_ORIGINS||'').split(',')].includes(origin))throw new HttpError(403,'INVALID_ORIGIN');
 const session=await authenticate(request,env);if(!session)throw new HttpError(401,'LOGIN_REQUIRED');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'INVALID_JSON');
 const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE');}chunks.push(value);}
 const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'INVALID_JSON');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'INVALID_JSON');
 const now=Date.now();
 if(url.pathname==='/api/foundation/start'){
  const route=validateFoundation(body);if(!route)throw new HttpError(400,'INVALID_LESSON');
  const recent=await db.prepare('SELECT COUNT(*) AS count FROM foundation_runs WHERE user_id=?1 AND started_at>?2').bind(session.sub,now-60000).first();if(recent.count>=6)throw new HttpError(429,'TRY_LATER');
  const id=crypto.randomUUID(),rounds=makeFoundationRounds(route,crypto.getRandomValues(new Uint32Array(1))[0]),expiresAt=now+180000;
  await db.batch([
   db.prepare('INSERT INTO world_players(user_id,public_name) VALUES(?1,?2) ON CONFLICT(user_id) DO NOTHING').bind(session.sub,`Explorer-${crypto.randomUUID().replaceAll('-','').slice(0,12)}`),
   db.prepare('INSERT INTO foundation_runs(run_id,user_id,profile,school_year,lesson,locale,learning_language,version,rounds_json,started_at,expires_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)').bind(id,session.sub,route.profile,route.year,route.lesson,route.locale,route.learningLanguage,CONTENT_VERSION,JSON.stringify(rounds),now,expiresAt)
  ]);
  return reply({id,index:0,revision:0,score:0,expiresAt,question:publicQuestion(rounds[0])});
 }
 if(typeof body.id!=='string'||body.id.length>50||!Number.isInteger(body.revision)||typeof body.answer!=='string'||body.answer.length>240)throw new HttpError(400,'INVALID_ANSWER');
 const run=await db.prepare('SELECT * FROM foundation_runs WHERE run_id=?1 AND user_id=?2').bind(body.id,session.sub).first();if(!run)throw new HttpError(404,'RUN_NOT_FOUND');
 if(run.expires_at<=now)throw new HttpError(410,'RUN_EXPIRED');if(run.completed_at||run.revision!==body.revision)throw new HttpError(409,'STALE_ROUND');
 const rounds=JSON.parse(run.rounds_json),q=rounds[run.round_index],verdict=markFoundation(q,body.answer,run.tries),index=run.round_index+(verdict.done?1:0),score=run.score+verdict.points;
 const changed=await db.prepare('UPDATE foundation_runs SET round_index=?1,tries=?2,score=?3,revision=revision+1,completed_at=?4 WHERE run_id=?5 AND user_id=?6 AND revision=?7 AND completed_at IS NULL AND expires_at>?8').bind(index,verdict.tries,score,index===10?now:null,run.run_id,session.sub,body.revision,now).run();
 if(changed.meta.changes!==1)throw new HttpError(409,'STALE_ROUND');
 return reply({...verdict,index,score,revision:run.revision+1,complete:index===10,question:publicQuestion(rounds[index],verdict.tries)});
}
