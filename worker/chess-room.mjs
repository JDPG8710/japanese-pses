import { DurableObject } from 'cloudflare:workers';
import { createChessGame, playChess, chessPgn } from '../src/arena/ChessRules.mjs';

const MINUTE = 60000, fail = error => ({ error });
export class ChessRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  read() { const row=this.ctx.storage.sql.exec('SELECT value FROM room WHERE id=1').toArray()[0]; return row ? JSON.parse(row.value) : null; }
  write(room) { this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room VALUES(1,?)', JSON.stringify(room)); }
  tick(room) {
    if (room.phase === 'playing') {
      const seat=room.game.turn-1, elapsed=Date.now()-room.turnAt;
      if (room.remaining[seat] <= elapsed) { room.remaining[seat]=0; room.game.result={winner:2-seat,reason:'timeout'}; room.phase='finished'; room.revision++; }
    } else if (['waiting','ready'].includes(room.phase) && Date.now() >= room.expires) { room.phase='expired'; room.revision++; }
  }
  view(room, id) {
    return { id:room.id, gameType:'chess', mode:room.mode, family:room.family||null, phase:room.phase, revision:room.revision,
      players:room.players.map(p=>({name:p.name,avatar:p.avatar||'🌱',ready:p.ready})), seat:room.players.findIndex(p=>p.id===id)+1,
      game:{...room.game,pgn:chessPgn(room.game)}, remaining:room.remaining, turnAt:room.turnAt, expires:room.expires, now:Date.now(),
      rematchVotes:room.rematchVotes||[], nextRoom:room.nextReady?room.nextRoom:null };
  }
  broadcast(room) { for(const ws of this.ctx.getWebSockets()){const actor=ws.deserializeAttachment();try{if(actor.expires<=Date.now())ws.close(4001,'Session expired');else ws.send(JSON.stringify(this.view(room,actor.id)));}catch{try{ws.close(1011,'Reconnect');}catch{}}} }
  async schedule(room) { const at=room.phase==='playing'?room.turnAt+room.remaining[room.game.turn-1]:['waiting','ready'].includes(room.phase)?room.expires:Date.now()+24*60*MINUTE; await this.ctx.storage.setAlarm(at); }
  async archive(room) {
    if(room.phase!=='finished'||!this.env.DB)return;
    await this.env.DB.prepare(`INSERT INTO chess_games(room_id,mode,white_user,black_user,result_json,game_json,finished_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(room_id) DO NOTHING`).bind(room.id,room.mode,room.players[0]?.userId||null,room.players[1]?.userId||null,JSON.stringify(room.game.result),JSON.stringify(room.game),Date.now()).run();
  }
  async isOver(){const room=this.read();if(!room)return true;const revision=room.revision;this.tick(room);if(room.revision!==revision){this.write(room);this.broadcast(room);await this.schedule(room);await this.archive(room);}return ['finished','expired'].includes(room.phase);}
  async seed(data){
    if(this.read())return {ok:true};
    const room={id:data.id,mode:'invite',family:data.family||null,players:data.players.map(p=>({...p,ready:!!data.autoStart})),game:createChessGame(),revision:0,remaining:[15*MINUTE,15*MINUTE],turnAt:data.autoStart?Date.now():0,phase:data.autoStart?'playing':'ready',expires:Date.now()+30*MINUTE};
    this.write(room);await this.schedule(room);return {ok:true};
  }
  async rematch(actor,accept){
    let room=this.read();if(!room||!room.players.some(p=>p.id===actor.id))return fail('NOT_PLAYER');
    if(room.phase!=='finished')return fail('INVALID_ACTION');
    const seat=room.players.findIndex(p=>p.id===actor.id)+1;
    if(!room.nextRoom){const votes=new Set(room.rematchVotes||[]);accept?votes.add(seat):votes.delete(seat);room.rematchVotes=[...votes];room.revision++;if(votes.size===2)room.nextRoom=crypto.randomUUID();this.write(room);this.broadcast(room);}
    if(room.nextRoom&&!room.nextReady){
      await this.archive(room);
      await this.env.CHESS_ROOMS.getByName(room.nextRoom).seed({id:room.nextRoom,players:[...room.players].reverse(),family:room.family,autoStart:true});
      if(room.family)await this.env.PLAYROOMS.getByName(`family:${room.family}`).advance(room.id,room.nextRoom,'chess');
      room=this.read();room.nextReady=true;room.revision++;this.write(room);this.broadcast(room);
    }
    return this.view(room,actor.id);
  }
  async execute(actor,command){
    let room=this.read();
    if(!room){
      if(command.type!=='create')return fail('ROOM_NOT_FOUND');
      room={id:command.room,mode:command.mode,players:[{...actor,ready:false}],game:createChessGame(),revision:0,remaining:[15*MINUTE,15*MINUTE],turnAt:0,phase:'waiting',expires:Date.now()+30*MINUTE};
    }else{
      this.tick(room);const seat=room.players.findIndex(p=>p.id===actor.id);
      if(['join','create'].includes(command.type)){
        if(seat<0){if(room.phase!=='waiting')return fail(room.phase==='expired'?'ROOM_EXPIRED':'ROOM_FULL');room.players.push({...actor,ready:false});room.phase='ready';room.revision++;}
      }else if(seat<0)return fail('NOT_PLAYER');
      else if(command.type!=='get'){
        if(command.revision!==room.revision)return fail('STALE');
        if(command.type==='ready'&&room.phase==='ready'){room.players[seat].ready=true;if(room.players.every(p=>p.ready)){room.phase='playing';room.turnAt=Date.now();}}
        else if(command.type==='cancel'&&['waiting','ready'].includes(room.phase))room.phase='expired';
        else if(command.type==='resign'&&room.phase==='playing'){room.game.result={winner:2-seat,reason:'resign'};room.phase='finished';}
        else if(command.type==='move'&&room.phase==='playing'){
          if(room.game.turn!==seat+1)return fail('NOT_YOUR_TURN');
          try{room.game=playChess(room.game,command.from,command.to,command.promotion||'q');}catch(e){return fail(e.message);}
          room.remaining[seat]-=Date.now()-room.turnAt;room.turnAt=Date.now();if(room.game.result)room.phase='finished';
        }else if(command.type==='offer_draw'&&room.phase==='playing'){room.game.drawOffer=seat+1;}
        else if(command.type==='decline_draw'&&room.phase==='playing'&&room.game.drawOffer&&room.game.drawOffer!==seat+1){room.game.drawOffer=0;}
        else if(command.type==='accept_draw'&&room.phase==='playing'&&room.game.drawOffer&&room.game.drawOffer!==seat+1){room.game.result={winner:0,reason:'agreement'};room.game.drawOffer=0;room.phase='finished';}
        else return fail(room.phase==='expired'?'ROOM_EXPIRED':'INVALID_ACTION');
        room.revision++;
      }
    }
    this.write(room);this.broadcast(room);await this.schedule(room);
    if(room.phase==='finished')this.ctx.waitUntil(this.archive(room).catch(e=>console.error(JSON.stringify({message:'Chess archive retry scheduled',error:String(e),room:room.id}))));
    return this.view(room,actor.id);
  }
  async fetch(request){
    const actor=JSON.parse(request.headers.get('x-chess-actor')||'null'),room=this.read();
    if(!actor||!room||!room.players.some(p=>p.id===actor.id))return new Response('Not a player',{status:403});
    if(this.ctx.getWebSockets().length>=8)return new Response('Too many connections',{status:429});
    const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment(actor);server.send(JSON.stringify(this.view(room,actor.id)));return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(ws,message){if(message!=='ping')ws.close(1008,'Use authenticated actions');}
  webSocketClose(ws,code,reason){ws.close(code,reason);}
  webSocketError(ws){ws.close(1011,'Reconnect');}
  async alarm(){let room=this.read();if(!room)return;if(['finished','expired'].includes(room.phase)){await this.archive(room);for(const ws of this.ctx.getWebSockets())ws.close(1000,'Room closed');await this.ctx.storage.deleteAll();return;}this.tick(room);this.write(room);this.broadcast(room);await this.schedule(room);await this.archive(room);}
}
