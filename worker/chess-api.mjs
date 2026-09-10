const ROOM=/^[a-f0-9-]{36}$/;
export async function chessRoute(request,env,actor,path,body,reply,HttpError){
  if(!env.CHESS_ROOMS)return reply({error:'ARENA_UNAVAILABLE'},503);
  if(path==='chess/history'&&request.method==='GET'){
    if(!actor.userId)return reply({entries:[]});
    const result=await env.DB.prepare('SELECT room_id,mode,result_json,game_json,finished_at FROM chess_games WHERE white_user=?1 OR black_user=?1 ORDER BY finished_at DESC LIMIT 20').bind(actor.userId).all();return reply({entries:result.results});
  }
  const match=path.match(/^chess\/rooms\/([a-f0-9-]{36})(\/socket)?$/);
  if(match&&request.method==='GET'){
    const stub=env.CHESS_ROOMS.getByName(match[1]);
    if(match[2]){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')throw new HttpError(426,'UPGRADE_REQUIRED');return stub.fetch(new Request(request.url,{headers:{Upgrade:'websocket','x-chess-actor':JSON.stringify(actor)}}));}
    const result=await stub.execute(actor,{type:'get'});return reply(result,result.error?403:200);
  }
  if(request.method!=='POST')throw new HttpError(404,'NOT_FOUND');
  if(path==='chess/match/cancel'){await env.GO_LOBBY.getByName('chess:match').cancel(actor.id);return reply({ok:true});}
  if(path==='chess/rooms'||path==='chess/match'){
    const mode=path.endsWith('match')?'match':'invite';let room=crypto.randomUUID();
    if(mode==='match')room=(await env.GO_LOBBY.getByName('chess:match').match(actor.id)).room;
    const result=await env.CHESS_ROOMS.getByName(room).execute(actor,{type:'create',room,mode});return reply(result,result.error?409:200);
  }
  if(match&&ROOM.test(match[1])){
    if(body.type==='rematch'){const result=await env.CHESS_ROOMS.getByName(match[1]).rematch(actor,body.accept!==false);return reply(result,result.error?409:200);}
    if(!['join','ready','move','offer_draw','accept_draw','decline_draw','resign','cancel'].includes(body.type))throw new HttpError(400,'INVALID_ACTION');
    const result=await env.CHESS_ROOMS.getByName(match[1]).execute(actor,body);return reply(result,result.error?409:200);
  }
  throw new HttpError(404,'NOT_FOUND');
}
