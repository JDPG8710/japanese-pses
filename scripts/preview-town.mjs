// ローカル静的プレビュー。公開成果物だけを配信し、本番APIには接続しない。
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function startTownPreview(port=0,{built=false}={}){
  const base=built?path.join(root,'dist'):root;
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json'};
  const server=createServer(async(req,res)=>{
    try{
      let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.startsWith('/api/')){res.writeHead(503,{'content-type':'application/json'});res.end('{"error":"LOCAL_STATIC_PREVIEW"}');return;}
      if(pathname==='/')pathname='/index.html';if(!path.extname(pathname))pathname+='.html';
      if(!/^\/(?:src\/|assets\/|css\/|js\/|(?:town|world|grades|learn|index|arena|privacy|terms)\.html$|[A-Za-z0-9_-]+\.js$|favicon\.svg$)/.test(pathname))throw Error('Not public');
      const file=path.resolve(base,'.'+pathname);if(!file.startsWith(base+path.sep))throw Error('Not public');
      const bytes=await readFile(file);res.writeHead(200,{'content-type':`${types[path.extname(file)]||'application/octet-stream'}; charset=utf-8`,'cache-control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
    }catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const preview=await startTownPreview(Number(process.argv.find(a=>a.startsWith('--port='))?.split('=')[1]||process.env.PIKO_TOWN_PORT||4187),{built:process.argv.includes('--built')});console.log(`${preview.origin}/town.html?locale=zh`);process.on('SIGINT',async()=>{await preview.close();process.exit(0);});}
