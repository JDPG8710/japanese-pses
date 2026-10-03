// Real local Workers + Durable Objects + WebSockets. No production credentials,
// cloud databases, synthetic players or browser-only message buses are used.
import {createServer,request as httpRequest} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function startTownOnlinePreview(port=0,{built=false}={}){
 const base=built?path.join(root,'dist'):root;
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav'};
 let upstream,mf;const tunnels=new Set();
 const server=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){
   if(!upstream){res.writeHead(503);res.end();return;}
   const proxy=httpRequest(new URL(req.url,upstream),{method:req.method,headers:req.headers},answer=>{res.writeHead(answer.statusCode,answer.headers);answer.pipe(res);});
   proxy.on('error',()=>{res.writeHead(502);res.end();});req.pipe(proxy);return;
  }
  try{
   let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/')pathname='/town.html';if(!path.extname(pathname))pathname+='.html';
   if(!/^\/(?:src\/|assets\/|css\/|js\/|(?:town|world|grades|learn|index|arena|privacy|terms)\.html$|[A-Za-z0-9_-]+\.js$|favicon\.svg$)/.test(pathname))throw Error('Not public');
   const file=path.resolve(base,'.'+pathname);if(!file.startsWith(base+path.sep))throw Error('Not public');
   const bytes=await readFile(file);res.writeHead(200,{'content-type':`${types[path.extname(file)]||'application/octet-stream'}; charset=utf-8`,'cache-control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 server.on('upgrade',(req,socket,head)=>{
  if(!upstream||!req.url.startsWith('/api/town/rooms/')){socket.destroy();return;}
  const proxy=httpRequest(new URL(req.url,upstream),{headers:req.headers});
  proxy.on('upgrade',(answer,remote,remoteHead)=>{
   socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(answer.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
   if(remoteHead.length)socket.write(remoteHead);if(head.length)remote.write(head);socket.pipe(remote);remote.pipe(socket);
   tunnels.add(socket);tunnels.add(remote);socket.on('close',()=>{tunnels.delete(socket);remote.destroy();});remote.on('close',()=>{tunnels.delete(remote);socket.destroy();});socket.on('error',()=>remote.destroy());remote.on('error',()=>socket.destroy());
  });
  proxy.on('response',answer=>{socket.end(`HTTP/1.1 ${answer.statusCode} Rejected\r\nConnection: close\r\n\r\n`);answer.resume();});proxy.on('error',()=>socket.destroy());proxy.end();
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const bundle=await build({entryPoints:[path.join(root,'worker/arena-entry.mjs')],bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:*']});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-24',compatibilityFlags:['nodejs_compat'],port:0,host:'127.0.0.1',bindings:{APP_ORIGIN:origin},durableObjects:{TOWN_ROOMS:{className:'TownRoom',useSQLite:true}},durableObjectsPersist:false}));
  upstream=await mf.ready;
 }catch(error){server.close();if(mf)await mf.dispose();throw error;}
 return {origin,mf,close:async()=>{for(const socket of tunnels)socket.destroy();await new Promise(resolve=>server.close(resolve));await mf.dispose();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const preview=await startTownOnlinePreview(Number(process.argv.find(a=>a.startsWith('--port='))?.split('=')[1]||4191),{built:process.argv.includes('--built')});console.log(`${preview.origin}/town.html?locale=zh`);process.on('SIGINT',async()=>{await preview.close();process.exit(0);});}
