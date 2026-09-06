import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as miniflare from 'miniflare';
import {siteVisitsRoute} from '../worker/site-visits.mjs';
const opts={modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-08-24',d1Databases:['DB'],port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(opts):opts);
try{
 const DB=await mf.getD1Database('DB'),sql=await readFile('migrations/0011_site_visits.sql','utf8'),trigger=sql.match(/CREATE TRIGGER[\s\S]*END;/)[0];
 for(const s of sql.replace(trigger,'').split(';').map(x=>x.trim()).filter(Boolean))await DB.prepare(s).run();await DB.prepare(trigger).run();
 class HttpError extends Error{constructor(status,code){super(code);this.status=status;}}
 const env={DB,APP_ORIGIN:'https://piko-game.com',PLAY_COUNT_ORIGINS:'https://manabi-pop.pages.dev'},deps={HttpError,json:(body,status)=>Response.json(body,{status})};
 const call=async(country,body,origin=env.APP_ORIGIN)=>{
  const r=new Request(`${origin}/api/site-visits`,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});Object.defineProperty(r,'cf',{value:{country}});
  return (await siteVisitsRoute(r,env,deps)).json();
 };
 assert.equal((await call()).total,0);
 const event={eventId:crypto.randomUUID(),country:'US',locale:'en'};
 let data=await call('CN',event);assert.deepEqual(data,{total:1,countries:[{country:'CN',count:1}]});
 assert.equal((await call('JP',event)).total,1,'retry cannot recount or move countries');
 await call('CN',{eventId:crypto.randomUUID(),locale:'ja'},'https://manabi-pop.pages.dev');
 await Promise.all(Array.from({length:20},()=>call('JP',{eventId:crypto.randomUUID()})));
 data=await call(undefined,{eventId:crypto.randomUUID(),country:'US'});
 assert.deepEqual(data,{total:23,countries:[{country:'JP',count:20},{country:'CN',count:2},{country:'XX',count:1}]});
 assert.equal((await call()).total,23,'reads never add visits');
 await assert.rejects(()=>call('US',{eventId:crypto.randomUUID()},'https://evil.invalid'),e=>e.status===403);
 await assert.rejects(()=>call('US',{eventId:'bad'}),e=>e.status===400);
 await assert.rejects(()=>call('US',{eventId:crypto.randomUUID(),padding:'x'.repeat(2000)}),e=>e.status===413);
 await DB.prepare('UPDATE site_visit_events SET created_at=0').run();
 assert.equal((await call('JP',{eventId:crypto.randomUUID()})).total,24);
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM site_visit_events').first()).n,1);
 console.log('Site visits: actual D1 atomic totals, country sorting, trusted edge country, unknown region, multi-origin, replay and retention passed.');
}finally{await mf.dispose();}
