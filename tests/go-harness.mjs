import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import * as miniflare from 'miniflare';
export async function goHarness({ port = 0, origin = 'http://localhost:4173', staticOrigin } = {}) {
  const built = await build({entryPoints:['worker/arena-entry.mjs'],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
  const backend = {name:'go-backend',modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-08-24',d1Databases:['DB'],
    durableObjects:{GO_ROOMS:{className:'GoRoom',useSQLite:true},GO_LOBBY:{className:'GoLobby',useSQLite:true},PLAYROOMS:{className:'PlayroomSpace',useSQLite:true},CHESS_ROOMS:{className:'ChessRoom',useSQLite:true}},
    bindings:{APP_ORIGIN:origin,DEV_ORIGINS:origin,JWT_SECRET:'go-local-development-only-secret'}};
  const options = staticOrigin ? {port,workers:[{name:'go-preview',modules:true,compatibilityDate:'2026-08-24',serviceBindings:{API:'go-backend'},bindings:{STATIC_ORIGIN:staticOrigin},script:`export default {fetch(req,env) { const url=new URL(req.url); if(url.pathname.startsWith('/api/'))return env.API.fetch(req); return fetch(env.STATIC_ORIGIN+url.pathname+url.search); }}`},backend]} : {port,unsafeInspectDurableObjects:true,...backend};
  const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);
  await mf.ready;
  const db=await mf.getD1Database('DB',staticOrigin?'go-backend':undefined);
  for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort()) {
    const source=(await readFile(`migrations/${name}`,'utf8')).replace(/--[^\n]*/g,'');
    // A trigger body contains semicolons that are not statement boundaries.
    const protectedSql=source.replace(/CREATE TRIGGER[\s\S]*?END;/gi,sql=>sql.slice(0,-1).replaceAll(';','\u0001')+';');
    for(const sql of protectedSql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.replaceAll('\u0001',';').trim()).filter(Boolean))await db.prepare(sql).run();
  }
  return {mf,db};
}
