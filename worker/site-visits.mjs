import {COUNTRY_CODES} from '../src/location/CountryCodes.mjs';
const countries=new Set(COUNTRY_CODES);
export async function siteVisitsRoute(request,env,{json,HttpError}){
 if(!env.DB)throw new HttpError(503,'DATABASE_UNAVAILABLE');
 if(!['GET','POST'].includes(request.method))throw new HttpError(405,'METHOD_NOT_ALLOWED');
 if(request.method==='POST'){
  const origin=request.headers.get('origin'),allowed=[env.APP_ORIGIN,...(env.PLAY_COUNT_ORIGINS||'').split(','),...(env.DEV_ORIGINS||'').split(',')].map(s=>s?.trim()).filter(Boolean);
  if(!origin||!allowed.includes(origin))throw new HttpError(403,'INVALID_ORIGIN');
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new HttpError(415,'JSON_REQUIRED');
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'INVALID_JSON');
  let bytes=0,source='';const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1024){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE');}source+=decoder.decode(value,{stream:true});}
  let event;try{event=JSON.parse(source+decoder.decode());}catch{throw new HttpError(400,'INVALID_JSON');}
  if(typeof event?.eventId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId))throw new HttpError(400,'INVALID_VISIT');
  // 接続元の国だけを集計する。利用者が送った国・言語やIP自体は保存しない。
  const country=countries.has(request.cf?.country)?request.cf.country:'XX',now=Date.now();
  await env.DB.batch([
   env.DB.prepare('DELETE FROM site_visit_events WHERE event_id IN (SELECT event_id FROM site_visit_events WHERE created_at<?1 LIMIT 256)').bind(now-86400000),
   env.DB.prepare('INSERT INTO site_visit_events(event_id,country,created_at) VALUES(?1,?2,?3) ON CONFLICT(event_id) DO NOTHING').bind(event.eventId,country,now)
  ]);
 }
 const {results}=await env.DB.prepare('SELECT country,visit_count AS count FROM site_visit_counts ORDER BY visit_count DESC,country ASC').all();
 return json({total:results.reduce((sum,row)=>sum+row.count,0),countries:results},200,request,env);
}
