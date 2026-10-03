const GAMES=['race','breakout','fruit','ninja','bubble','rhythm','obby','tower','runner','memory','garden'];
const version=game=>game==='bubble'||game==='rhythm'?2:1;
const valid=(game,level)=>GAMES.includes(game)&&Number.isInteger(level)&&level>=1&&level<=20;
export async function arcadeRoute(request,env,{authenticate,json,HttpError}){
 const url=new URL(request.url),db=env.DB,reply=body=>json(body,200,request,env);
 if(!db)throw new HttpError(503,'DATABASE_UNAVAILABLE');
 if(url.pathname==='/api/arcade/leaderboard'&&request.method==='GET'){
  const game=url.searchParams.get('game'),level=Number(url.searchParams.get('level'));if(!valid(game,level))throw new HttpError(400,'INVALID_GAME');
  const rows=await db.prepare(`SELECT p.public_name AS name,MAX(r.score) AS score FROM arcade_runs r JOIN arcade_players p ON p.user_id=r.user_id WHERE r.game=?1 AND r.level=?2 AND r.version=?3 AND r.completed_at IS NOT NULL AND r.score>0 GROUP BY r.user_id,p.public_name ORDER BY score DESC,p.public_name ASC LIMIT 50`).bind(game,level,version(game)).all();let rank=0,prior=-1;
  return reply({entries:rows.results.map((r,i)=>{if(prior!==r.score)rank=i+1;prior=r.score;return {rank,name:r.name,score:r.score};})});
 }
 if(request.method!=='POST'||!['/api/arcade/start','/api/arcade/finish'].includes(url.pathname))throw new HttpError(404,'NOT_FOUND');
 const origin=request.headers.get('Origin');if(origin&&![env.APP_ORIGIN,...(env.DEV_ORIGINS||'').split(',')].includes(origin))throw new HttpError(403,'INVALID_ORIGIN');
 const session=await authenticate(request,env);if(!session)throw new HttpError(401,'LOGIN_REQUIRED');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'INVALID_JSON');let length=0,chunks=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'INVALID_JSON');}if(!body||typeof body!=='object')throw new HttpError(400,'INVALID_JSON');const now=Date.now();
 if(url.pathname.endsWith('/start')){
  if(!valid(body.game,body.level))throw new HttpError(400,'INVALID_GAME');const recent=await db.prepare('SELECT COUNT(*) AS count FROM arcade_runs WHERE user_id=?1 AND started_at>?2').bind(session.sub,now-60000).first();if(recent.count>=10)throw new HttpError(429,'TRY_LATER');
  const id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO arcade_players(user_id,public_name) VALUES(?1,?2) ON CONFLICT(user_id) DO NOTHING').bind(session.sub,'Player-'+crypto.randomUUID().replaceAll('-','').slice(0,10)),db.prepare('INSERT INTO arcade_runs(run_id,user_id,game,level,version,started_at) VALUES(?1,?2,?3,?4,?5,?6)').bind(id,session.sub,body.game,body.level,version(body.game),now)]);return reply({id});
 }
 if(typeof body.id!=='string'||body.id.length>50||!Number.isSafeInteger(body.score)||body.score<0||body.score>1000000)throw new HttpError(400,'INVALID_SCORE');
 const run=await db.prepare('SELECT * FROM arcade_runs WHERE run_id=?1 AND user_id=?2').bind(body.id,session.sub).first();if(!run)throw new HttpError(404,'RUN_NOT_FOUND');if(run.completed_at!=null)throw new HttpError(409,'ALREADY_FINISHED');if(now-run.started_at<1000||now-run.started_at>3600000)throw new HttpError(400,'INVALID_DURATION');if(run.game==='bubble'&&body.score>600||run.game==='rhythm'&&body.score>9600)throw new HttpError(400,'INVALID_SCORE');
 const result=await db.prepare('UPDATE arcade_runs SET score=?1,completed_at=?2 WHERE run_id=?3 AND user_id=?4 AND completed_at IS NULL').bind(body.score,now,run.run_id,session.sub).run();if(result.meta.changes!==1)throw new HttpError(409,'ALREADY_FINISHED');return reply({saved:true});
}
