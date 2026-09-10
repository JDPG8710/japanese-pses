import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { goHarness } from '../tests/go-harness.mjs';
export async function startGoPreview(port=4175) {
  const root=process.cwd();
  const server=createServer(async(req,res)=>{
    try {
      let pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname==='/')pathname='/index.html';
      if(!path.extname(pathname))pathname+='.html';
      const file=path.resolve(root,'.'+decodeURIComponent(pathname));
      if(!file.startsWith(root+path.sep)||!/^\/(src\/|assets\/|css\/|js\/|(?:arena|updates|index|privacy|terms|world|grades)\.html)/.test(pathname))throw new Error('Not public');
      const content=await readFile(file),type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'content-type':`${type}; charset=utf-8`,'cache-control':'no-store'});res.end(content);
    }catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${port}`;
  try {
    const {mf,db}=await goHarness({port,origin,staticOrigin:`http://127.0.0.1:${server.address().port}`});
    return {origin,mf,db,close:async()=>{await mf.dispose();await new Promise(resolve=>server.close(resolve));}};
  }catch(e){server.close();throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const preview=await startGoPreview(Number(process.env.PIKO_GO_PORT||4175));
  console.log(`Go preview: ${preview.origin}/arena.html?lang=zh (isolated local database and real room server)`);
  process.on('SIGINT',async()=>{await preview.close();process.exit(0);});
}
