import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const harness=`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg"><title>皮可环道 · 本地预览</title><link rel="stylesheet" href="/src/arcade/arcade.css"><style>*{box-sizing:border-box}body{margin:0;background:#0b1528;color:#ecf4ff;font-family:system-ui}button{font:inherit;cursor:pointer}.primary{background:#8bedd0;color:#102c35;border:0;border-radius:12px;font-weight:800}</style><script type="module">
import {openArcadeShell} from '/src/arcade/ArcadeShell.mjs';
import {createRaceGame} from '/src/arcade/RaceGame.mjs';
import {getTownAudio} from '/src/town/TownAudio.mjs';
const params=new URLSearchParams(location.search);
window.shell=openArcadeShell({gameId:'race',locale:'zh',onExit:()=>{window.game.destroy();shell.destroy()},onRetry:()=>window.game.start()});
window.game=createRaceGame({canvas:shell.canvas,locale:'zh',audio:getTownAudio(),onHud:s=>shell.setHud(s),onEnd:r=>shell.showResult(r)});
shell.root.addEventListener('click',e=>{if(e.target.closest('[data-shell="pause"]'))queueMicrotask(()=>shell.paused?game.pause():game.resume())});
</script></html>`;
export async function startRacePreview(port=0) {
 const server=createServer(async(req,res)=>{
  try {
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(harness);return;}
   const file=path.resolve(root,'.'+decodeURIComponent(pathname));
   if(!file.startsWith(root+path.sep))throw Error('Invalid path');
   const data=await readFile(file);
   const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'};
   res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
  }catch {res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const preview=await startRacePreview(Number(process.env.RACE_PORT||4193));console.log(preview.origin);
 process.on('SIGINT',async()=>{await preview.close();process.exit(0)});
}
