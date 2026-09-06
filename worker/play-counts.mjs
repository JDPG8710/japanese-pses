import {validPlayKey} from '../src/stats/PlayKeys.mjs';

export async function playCountsRoute(request,env,{json,HttpError}){
 const url=new URL(request.url),reply=(value,status=200)=>json(value,status,request,env);
 if(!env.DB)throw new HttpError(503,'DATABASE_UNAVAILABLE');
 if(request.method==='GET'){
  const raw=url.searchParams.get('keys')||'';
  if(raw.length>6000)throw new HttpError(400,'INVALID_GAME_KEYS');
  const keys=[...new Set(raw.split(','))];
  if(keys.length>100||!keys.every(validPlayKey))throw new HttpError(400,'INVALID_GAME_KEYS');
  const result=await env.DB.prepare(`SELECT game_key,play_count FROM game_play_counts WHERE game_key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all();
  const counts=Object.fromEntries(keys.map(key=>[key,0]));for(const row of result.results)counts[row.game_key]=row.play_count;
  return reply({counts});
 }
 if(request.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED');
 const origin=request.headers.get('Origin');
 const allowedOrigins=[env.APP_ORIGIN,...(env.PLAY_COUNT_ORIGINS||'').split(','),...(env.DEV_ORIGINS||'').split(',')].map(value=>value?.trim()).filter(Boolean);
 if(!origin||!allowedOrigins.includes(origin))throw new HttpError(403,'INVALID_ORIGIN');
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new HttpError(415,'JSON_REQUIRED');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'INVALID_JSON');
 let size=0,text='';const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE');}text+=decoder.decode(value,{stream:true});}
 let body;try{body=JSON.parse(text+decoder.decode());}catch{throw new HttpError(400,'INVALID_JSON');}
 if(!body||!validPlayKey(body.key)||typeof body.eventId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.eventId))throw new HttpError(400,'INVALID_PLAY_EVENT');
 // 一連の挿入・トリガー・読取を同一トランザクションで実行する。
 const now=Date.now();
 const result=await env.DB.batch([
  env.DB.prepare('DELETE FROM game_play_events WHERE event_id IN (SELECT event_id FROM game_play_events WHERE created_at<?1 LIMIT 256)').bind(now-86400000),
  env.DB.prepare('INSERT INTO game_play_events(event_id,game_key,created_at) VALUES(?1,?2,?3) ON CONFLICT(event_id) DO NOTHING').bind(body.eventId,body.key,now),
  env.DB.prepare('SELECT game_key FROM game_play_events WHERE event_id=?1').bind(body.eventId),
  env.DB.prepare('SELECT play_count FROM game_play_counts WHERE game_key=?1').bind(body.key)
 ]);
 if(result[2].results[0]?.game_key!==body.key)throw new HttpError(409,'EVENT_KEY_CONFLICT');
 return reply({key:body.key,count:result[3].results[0]?.play_count||0});
}
