import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {unstable_generateASSETSBinding} from 'wrangler';

// Use Wrangler's Pages asset handler so clean URLs, redirects and 404 status
// match Pages rather than the fallback behaviour of a generic static server.
export async function startContentPreview(port=0){
  const controller=new AbortController();
  const log={log(){},info(){},debug(){},warn:console.warn,error:console.error};
  const assets=await unstable_generateASSETSBinding({directory:path.resolve('dist'),log,signal:controller.signal});
  const server=createServer(async(req,res)=>{
    try{
      const response=await assets(new Request(`http://127.0.0.1:${server.address().port}${req.url}`,{method:req.method,headers:req.headers}));
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500);res.end('Preview error');console.error(error);}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return{origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{controller.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const preview=await startContentPreview(Number(process.env.PIKO_CONTENT_PORT||4195));
  console.log(`Content preview: ${preview.origin}/about`);
  process.on('SIGINT',async()=>{await preview.close();process.exit(0);});
}
