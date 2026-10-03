import {TOWN_ROOM_CODE} from '../src/town/TownNetworkProtocol.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
async function readBody(request){
  const reader=request.body?.getReader();if(!reader)return null;const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  try{const body=JSON.parse(new TextDecoder().decode(bytes));return body&&typeof body==='object'&&!Array.isArray(body)?body:null;}catch{return null;}
}
export async function townRoute(request,env){
  if(!env.TOWN_ROOMS)return reply({error:'TOWN_UNAVAILABLE'},503);
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const allowed=[env.APP_ORIGIN,...String(env.DEV_ORIGINS||'').split(',')].filter(Boolean);
  if(!origin||!allowed.includes(origin))return reply({error:'INVALID_ORIGIN'},403);
  const ip=request.headers.get('cf-connecting-ip')||'local';
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(!await env.TOWN_ROOMS.getByName(`limit:${hash}`).rateLimit())return reply({error:'TRY_LATER'},429);
  const match=url.pathname.match(/^\/api\/town\/rooms\/([^/]+)\/socket$/);
  if(match&&request.method==='GET'){
    if(!TOWN_ROOM_CODE.test(match[1]))return reply({error:'INVALID_ROOM'},400);
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply({error:'UPGRADE_REQUIRED'},426);
    if(!/^[a-f0-9]{64}$/.test(url.searchParams.get('ticket')||''))return reply({error:'INVALID_TICKET'},403);
    return env.TOWN_ROOMS.getByName(`room:${match[1]}`).fetch(new Request(url,{headers:{Upgrade:'websocket'}}));
  }
  if(url.pathname!=='/api/town/rooms'||request.method!=='POST')return reply({error:'NOT_FOUND'},404);
  let body;try{body=await readBody(request);}catch{return reply({error:'BODY_TOO_LARGE'},413);}
  if(!body)return reply({error:'INVALID_JSON'},400);
  const mode=body.mode==='public'?'public':'invite';
  if(mode==='public'&&body.parentalGateAck!==true)return reply({error:'PARENTAL_GATE_REQUIRED'},403);
  if(body.room!==undefined&&(!TOWN_ROOM_CODE.test(body.room)||body.room.startsWith('public-')!==(mode==='public')))return reply({error:'INVALID_ROOM'},400);
  if(body.resume!==undefined&&!/^[a-f0-9]{64}$/.test(body.resume))return reply({error:'INVALID_RESUME'},400);
  const create=!body.room;let result;const offset=crypto.getRandomValues(new Uint8Array(1))[0]%8;
  // Public rooms are bounded; admission and capacity are checked atomically by each room.
  for(let i=0;i<(mode==='public'&&!body.room?8:1);i++){
    const room=body.room||(mode==='public'?`public-${(offset+i)%8+1}`:crypto.randomUUID().replaceAll('-',''));
    result=await env.TOWN_ROOMS.getByName(`room:${room}`).register({room,mode,create,resume:body.resume});if(result.error!=='ROOM_FULL')break;
  }
  return reply(result,result.error?409:200);
}
