import { DurableObject } from 'cloudflare:workers';
import {TOWN_CAPACITY,TOWN_GAMES,TOWN_EMOTES,cleanPresence} from '../src/town/TownNetworkProtocol.mjs';
const RESUME_MS=120000, IDLE_MS=75000, TICKET_MS=30000;
const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const visible=a=>({...a.peer});
// One DO per room. Attachments survive hibernation; admission/reconnect leases
// live in SQLite storage. No account information or free-text chat is published.
export class TownRoom extends DurableObject {
  constructor(ctx,env) {super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS town_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');}
  read(key){return JSON.parse(this.ctx.storage.sql.exec('SELECT value FROM town_state WHERE key=?',key).toArray()[0]?.value||'null');}
  save(key,value){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO town_state VALUES (?,?)',key,JSON.stringify(value));}
  sockets(){return this.ctx.getWebSockets().filter(ws=>{try{return !ws.deserializeAttachment()?.closed;}catch{return false;}});}
  async rateLimit(){const now=Date.now(),rate=this.read('rate')||{since:now,count:0};if(now-rate.since>=60000){rate.since=now;rate.count=0;}rate.count++;this.save('rate',rate);await this.ctx.storage.setAlarm(now+65000);return rate.count<=50;}
  async register({room,mode,create=false,resume=null}) {
    const now=Date.now();let meta=this.read('meta');
    if(!meta){if(!create&&mode!=='public')return {error:'ROOM_NOT_FOUND'};meta={room,mode,touched:now};}
    if(meta.mode!==mode)return {error:'INVALID_ROOM'};
    const sessions=(this.read('sessions')||[]).filter(s=>s.until>now);
    let session=typeof resume==='string'?sessions.find(s=>s.resume===resume):null;
    const peers=this.sockets().map(ws=>ws.deserializeAttachment());
    if(!session && new Set([...sessions.map(s=>s.id),...peers.map(a=>a.peer.id)]).size>=TOWN_CAPACITY)return {error:'ROOM_FULL'};
    if(!session){const id=crypto.randomUUID();session={id,name:`Piko-${id.slice(0,4).toUpperCase()}`,resume:secret(),until:now+RESUME_MS};sessions.push(session);}
    session.ticket=secret();session.ticketUntil=now+TICKET_MS;session.until=now+RESUME_MS;
    meta.touched=now;this.save('meta',meta);this.save('sessions',sessions);await this.ctx.storage.setAlarm(now+30000);
    return {room,mode,self:session.id,name:session.name,ticket:session.ticket,resume:session.resume,capacity:TOWN_CAPACITY};
  }
  async fetch(request) {
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'UPGRADE_REQUIRED'},426);
    const ticket=new URL(request.url).searchParams.get('ticket'),now=Date.now();
    const sessions=this.read('sessions')||[],session=sessions.find(s=>s.ticket===ticket&&s.ticketUntil>now);
    if(!session)return json({error:'INVALID_TICKET'},403);
    delete session.ticket;delete session.ticketUntil;session.until=now+RESUME_MS;this.save('sessions',sessions);
    for(const ws of this.sockets())if(ws.deserializeAttachment().peer.id===session.id)this.drop(ws,4001,'Reconnected',false);
    const [client,server]=Object.values(new WebSocketPair());
    const peer={id:session.id,name:session.name,x:0,y:0,z:7,heading:0,avatar:'explorer',outfit:0,vehicle:'foot',game:null,emote:null,emoteUntil:0};
    server.serializeAttachment({peer,lastSeen:now,windowStart:now,messages:0,lastEmote:0,lastInvite:0,leaseAt:now,closed:false});
    this.ctx.acceptWebSocket(server);const meta=this.read('meta');
    server.send(JSON.stringify({type:'welcome',self:session.id,room:meta.room,capacity:TOWN_CAPACITY,peers:this.sockets().map(ws=>visible(ws.deserializeAttachment()))}));
    this.broadcast({type:'peer',peer},server);await this.ctx.storage.setAlarm(now+30000);
    return new Response(null,{status:101,webSocket:client});
  }
  broadcast(body,except){const data=JSON.stringify(body);for(const ws of this.sockets())if(ws!==except){try{ws.send(data);}catch{this.drop(ws,1011,'Transport closed');}}}
  async webSocketMessage(ws,message) {
    const a=ws.deserializeAttachment();if(!a||a.closed)return;const now=Date.now();
    if(typeof message!=='string'||new TextEncoder().encode(message).byteLength>1024){this.drop(ws,1009,'Message too large');return;}
    if(now-a.windowStart>=1000){a.windowStart=now;a.messages=0;}a.messages++;
    if(a.messages>30){this.drop(ws,1008,'Too many messages');return;}
    let msg;try{msg=JSON.parse(message);}catch{this.drop(ws,1008,'Invalid message');return;}
    if(!msg||typeof msg!=='object'||Array.isArray(msg)){this.drop(ws,1008,'Invalid message');return;}a.lastSeen=now;
    if(msg.type==='presence'){
      const presence=cleanPresence(msg.presence);if(!presence){this.drop(ws,1008,'Invalid presence');return;}
      Object.assign(a.peer,presence);ws.serializeAttachment(a);this.broadcast({type:'peer',peer:visible(a)},ws);
    }else if(msg.type==='emote'){
      if(!TOWN_EMOTES.includes(msg.emote)){this.drop(ws,1008,'Invalid emote');return;}
      if(now-a.lastEmote>=1500){a.lastEmote=now;a.peer.emote=msg.emote;a.peer.emoteUntil=now+3000;ws.serializeAttachment(a);this.broadcast({type:'peer',peer:visible(a)});}
    }else if(msg.type==='invite'){
      if(!TOWN_GAMES.includes(msg.game)||msg.game==='shop'||!Number.isInteger(msg.level)||msg.level<1||msg.level>20||!Number.isSafeInteger(msg.infiniteRound??0)||(msg.infiniteRound??0)<0||(msg.infiniteRound??0)>1000000){this.drop(ws,1008,'Invalid challenge');return;}
      if(now-a.lastInvite>=5000){a.lastInvite=now;const challenge={id:crypto.randomUUID(),game:msg.game,level:msg.level,infiniteRound:msg.infiniteRound||0,seed:crypto.getRandomValues(new Uint32Array(1))[0],from:a.peer.id,name:a.peer.name,until:now+60000};this.save('challenge',challenge);this.broadcast({type:'challenge',challenge});}
    }else if(msg.type==='accept'){
      const challenge=this.read('challenge');if(challenge&&challenge.id===msg.id&&challenge.until>now){a.peer.game=challenge.game;ws.send(JSON.stringify({type:'start',challenge}));ws.serializeAttachment(a);this.broadcast({type:'peer',peer:visible(a)},ws);}else ws.send(JSON.stringify({type:'error',error:'CHALLENGE_EXPIRED'}));
    }else if(msg.type==='ping')ws.send(JSON.stringify({type:'pong',at:now}));
    else if(msg.type==='leave'){this.save('sessions',(this.read('sessions')||[]).filter(s=>s.id!==a.peer.id));this.drop(ws,1000,'Left room');return;}
    else{this.drop(ws,1008,'Invalid message');return;}
    ws.serializeAttachment(a);
    if(now-a.leaseAt>=15000){const sessions=this.read('sessions')||[],s=sessions.find(s=>s.id===a.peer.id);if(s){s.until=now+RESUME_MS;this.save('sessions',sessions);}a.leaseAt=now;ws.serializeAttachment(a);}
  }
  drop(ws,code=1000,reason='Closed',announce=true){let a;try{a=ws.deserializeAttachment();if(a?.closed)return;if(a){a.closed=true;ws.serializeAttachment(a);}ws.close(code,reason);}catch{}if(announce&&a)this.broadcast({type:'left',id:a.peer.id});}
  webSocketClose(ws){this.drop(ws);}
  webSocketError(ws){this.drop(ws,1011,'Connection error');}
  async alarm(){
    const now=Date.now(),meta=this.read('meta');if(!meta){await this.ctx.storage.deleteAll();return;}
    for(const ws of this.sockets())if(now-ws.deserializeAttachment().lastSeen>IDLE_MS)this.drop(ws,4000,'Heartbeat timeout');
    const sessions=(this.read('sessions')||[]).filter(s=>s.until>now);this.save('sessions',sessions);
    const challenge=this.read('challenge');if(challenge&&challenge.until<=now)this.ctx.storage.sql.exec('DELETE FROM town_state WHERE key=?','challenge');
    if(!sessions.length&&!this.sockets().length&&now-meta.touched>24*3600000){await this.ctx.storage.deleteAll();return;}
    await this.ctx.storage.setAlarm(now+(this.sockets().length||sessions.length?30000:24*3600000));
  }
}
