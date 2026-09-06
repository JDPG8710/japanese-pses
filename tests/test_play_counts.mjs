import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import * as miniflare from 'miniflare';
import {formatPlayCount,japanesePlayKey,PLAY_KEYS,validPlayKey} from '../src/stats/PlayKeys.mjs';
for(const [n,s] of [[0,'0'],[999,'999'],[1000,'1K'],[1234,'1.2K'],[999999,'999.9K'],[1000000,'1M'],[1500000,'1.5M'],[1000000000,'1B'],[-1,'—'],[NaN,'—']])assert.equal(formatPlayCount(n),s);
assert.equal(new Set(PLAY_KEYS).size,PLAY_KEYS.length);
assert.equal(japanesePlayKey('KANJI_CHALLENGE'),japanesePlayKey('KOKUGO_CURRICULUM','KANJI_READING'));
assert.equal(validPlayKey('world:unknown'),false);
const compiled=await build({entryPoints:['worker/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const origin='http://localhost:4173',options={modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-08-24',d1Databases:['DB'],bindings:{APP_ORIGIN:origin,PLAY_COUNT_ORIGINS:'https://manabi-pop.pages.dev'},port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);
try{
 const db=await mf.getD1Database('DB'),sql=await readFile('migrations/0010_game_play_counts.sql','utf8');
 const trigger=sql.match(/CREATE TRIGGER[\s\S]*END;/)[0];
 for(const statement of sql.replace(trigger,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 await db.prepare(trigger).run();
 const post=async(body,headers={})=>{const r=await mf.dispatchFetch(`${origin}/api/play-counts`,{method:'POST',headers:{'content-type':'application/json',origin,...headers},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 const get=async(keys)=>{const r=await mf.dispatchFetch(`${origin}/api/play-counts?${new URLSearchParams({keys})}`);return {status:r.status,...await r.json()};};
 assert.equal((await get('world:robot')).counts['world:robot'],0);
 const event={key:'world:robot',eventId:crypto.randomUUID()};
 assert.equal((await post(event)).count,1,'guest included');
 assert.equal((await post(event)).count,1,'retry not a new click');
 assert.equal((await post({...event,eventId:crypto.randomUUID()},{cookie:'pses_session=irrelevant'})).count,2,'login does not change counting rule');
 const repeated=await Promise.all(Array.from({length:30},()=>post({key:event.key,eventId:crypto.randomUUID()})));
 assert.ok(repeated.every(r=>r.status===200));assert.equal((await get(event.key)).counts[event.key],32,'parallel clicks never lose increments');
 assert.equal((await post({...event,key:'world:water'})).status,409,'cannot move one event to another game');
 assert.equal((await get('world:water')).counts['world:water'],0);
 assert.equal((await post({...event,key:'fake'})).status,400);
 assert.equal((await post({...event,eventId:'x'})).status,400);
 assert.equal((await post(event,{origin:'https://evil.invalid'})).status,403);
 assert.equal((await post({...event,padding:'x'.repeat(2000)})).status,413);
 assert.equal((await get('world:robot,fake')).status,400);
 // イベントを期限切れにしても累計は消えない。
 await db.prepare('UPDATE game_play_events SET created_at=0').run();
 assert.equal((await post({key:event.key,eventId:crypto.randomUUID()})).count,33);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM game_play_events').first()).n,1);
 assert.equal((await post({key:'lesson:add20',eventId:crypto.randomUUID()})).count,1);
 assert.equal((await post({key:'jp:RADICAL_BUILDER',eventId:crypto.randomUUID()})).count,1);
 for(const [index,language] of ['zh','ja','en'].entries()){
  const r=await post({key:'world:robot',eventId:crypto.randomUUID()},{origin:index===1?'https://manabi-pop.pages.dev':origin,'accept-language':language});
  assert.equal(r.status,200);assert.equal(r.count,34+index,'all languages and supported site origins share one game total');
 }
 assert.equal((await get('world:robot')).counts['world:robot'],36);
 console.log('Play counts: compact boundaries, guest/member clicks, 30 concurrent events, replay, origin, validation and retention passed with real D1.');
}finally{await mf.dispose();}
