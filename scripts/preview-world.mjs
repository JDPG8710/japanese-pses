// Local-only preview: isolated in-memory D1, no fake login or seeded rankings.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import * as miniflare from 'miniflare';
const previewPort=Number(process.env.PIKO_PREVIEW_PORT||4173),previewOrigin=`http://127.0.0.1:${previewPort}`;
const built=await build({entryPoints:['worker/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const opts={modules:true,script:built.outputFiles[0].text,compatibilityDate:'2025-04-01',d1Databases:['DB'],bindings:{APP_ORIGIN:previewOrigin},port:0};
const mf=new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(opts):opts);
const db=await mf.getD1Database('DB');
const migrationFiles=(await readdir('migrations')).filter(file=>/^\d+.*\.sql$/i.test(file)).sort();
for(const name of migrationFiles){const file=path.join('migrations',name);for(const sql of (await readFile(file,'utf8')).split(/;(?=(?:[^']*'[^']*')*[^']*$)/).map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();}
const root=path.resolve('dist');
const dataRoot=path.resolve('data');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,previewOrigin);
    if(url.pathname.startsWith('/api/')){
      const response=await mf.dispatchFetch(url.toString(),{method:req.method,headers:req.headers});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(url.pathname.startsWith('/data/')){
      const name=decodeURIComponent(url.pathname.slice('/data/'.length));
      if(!/^[a-z0-9_-]+\.json$/i.test(name)){res.writeHead(403);res.end();return;}
      const file=path.resolve(dataRoot,name);
      if(path.dirname(file)!==dataRoot){res.writeHead(403);res.end();return;}
      const content=await readFile(file);res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(content);return;
    }
    const file=path.resolve(root,`.${decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)}`);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const content=await readFile(file);res.writeHead(200,{'content-type':`${types[path.extname(file)]||'application/octet-stream'}; charset=utf-8`,'cache-control':'no-store'});res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(previewPort,'127.0.0.1',()=>console.log(`World Play preview: ${previewOrigin}/world.html (isolated local D1)`));
process.on('SIGINT',async()=>{server.close();await mf.dispose();process.exit(0);});
