import assert from 'node:assert/strict';
import { createChessGame, playChess, boardFromFen, rebuild, legalMoves } from '../src/arena/ChessRules.mjs';
import { goHarness } from './go-harness.mjs';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const sequence=(moves,game=createChessGame())=>moves.reduce((state,[from,to,promotion])=>playChess(state,from,to,promotion||'q'),game);

let game=createChessGame();
assert.throws(()=>playChess(game,'e2','e5'),/INVALID_MOVE/);checks++;
game=sequence([['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','e2'],['g8','f6'],['e1','g1']]);
check(rebuild(game).get('g1').type==='k'&&rebuild(game).get('f1').type==='r','king-side castling moves king and rook');
game=sequence([['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5'],['e5','d6']]);
check(!rebuild(game).get('d5')&&rebuild(game).get('d6').type==='p','en passant capture');
game=playChess(createChessGame('7k/P7/8/8/8/8/8/4K3 w - - 0 1'),'a7','a8','n');
check(rebuild(game).get('a8').type==='n','underpromotion supported');
game=sequence([['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]);
check(game.result?.reason==='checkmate'&&game.result.winner===2,'checkmate ends game with black winner');
game=createChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');game.result=(await import('../src/arena/ChessRules.mjs')).status(rebuild(game));
check(game.result?.reason==='stalemate'&&game.result.winner===0,'stalemate draw');
game=createChessGame('8/8/8/8/8/8/7k/K7 w - - 0 1');game.result=(await import('../src/arena/ChessRules.mjs')).status(rebuild(game));
check(game.result?.reason==='insufficient','insufficient material draw');
game=sequence([['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8'],['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']]);
check(game.result?.reason==='repetition','threefold repetition draw');
game=playChess(createChessGame('8/8/8/8/8/8/R6k/K7 w - - 99 1'),'a2','b2');
check(game.result?.reason==='fifty','fifty-move draw');
check(legalMoves(createChessGame(),'e2').some(m=>m.to==='e4'),'legal move hints come from rule engine');
check(boardFromFen(createChessGame().fen).filter(Boolean).length===32,'initial board has 32 pieces');

const {mf,db}=await goHarness(),origin='http://localhost:4173';
try{
  async function api(cookie,path,body=null){const response=await mf.dispatchFetch(`${origin}/api/arena/${path}`,{method:body===null?'GET':'POST',headers:{origin,cookie:cookie||'','content-type':'application/json','cf-connecting-ip':crypto.randomUUID()},body:body===null?undefined:JSON.stringify(body)});return{status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],data:await response.json()};}
  const a=(await api('','identity',{})).cookie,b=(await api('','identity',{})).cookie,c=(await api('','identity',{})).cookie;
  let room=(await api(a,'chess/rooms',{mode:'invite'})).data;
  check(room.phase==='waiting'&&room.gameType==='chess','create invitation room');
  check((await api(c,`chess/rooms/${room.id}`)).data.error==='NOT_PLAYER','room is private to players');
  let second=(await api(b,`chess/rooms/${room.id}`,{type:'join'})).data;
  room=(await api(a,`chess/rooms/${room.id}`,{type:'ready',revision:second.revision})).data;
  second=(await api(b,`chess/rooms/${room.id}`,{type:'ready',revision:room.revision})).data;
  check(second.phase==='playing'&&second.game.turn===1,'both ready starts with White');
  check((await api(b,`chess/rooms/${room.id}`,{type:'move',revision:second.revision,from:'e7',to:'e5'})).data.error==='NOT_YOUR_TURN','server rejects out-of-turn move');
  room=(await api(a,`chess/rooms/${room.id}`,{type:'move',revision:second.revision,from:'e2',to:'e4'})).data;
  check(room.game.moves[0].san==='e4'&&room.game.turn===2,'server records authoritative move');
  second=(await api(b,`chess/rooms/${room.id}`,{type:'offer_draw',revision:room.revision})).data;
  check(second.game.drawOffer===2,'draw offer recorded');
  room=(await api(a,`chess/rooms/${room.id}`,{type:'decline_draw',revision:second.revision})).data;
  check(room.phase==='playing'&&!room.game.drawOffer,'draw can be declined');
  second=(await api(b,`chess/rooms/${room.id}`,{type:'offer_draw',revision:room.revision})).data;
  room=(await api(a,`chess/rooms/${room.id}`,{type:'accept_draw',revision:second.revision})).data;
  check(room.phase==='finished'&&room.game.result.reason==='agreement','draw agreement ends game');
  await api(a,`chess/rooms/${room.id}`,{type:'rematch',revision:room.revision});
  const accepted=await Promise.all([api(b,`chess/rooms/${room.id}`,{type:'rematch'}),api(b,`chess/rooms/${room.id}`,{type:'rematch'})]);
  check(accepted[0].data.nextRoom===accepted[1].data.nextRoom,'concurrent rematch acceptance is idempotent');
  const next=(await api(a,`chess/rooms/${accepted[0].data.nextRoom}`)).data;
  check(next.seat===2&&next.phase==='playing'&&next.game.moves.length===0,'rematch swaps colors and starts clean');
  check(!!await db.prepare('SELECT room_id FROM chess_games WHERE room_id=?').bind(room.id).first(),'finished chess game archived');
  const sockets=await Promise.all([a,b].map(cookie=>mf.dispatchFetch(`${origin}/api/arena/chess/rooms/${next.id}/socket`,{headers:{origin,cookie,Upgrade:'websocket','cf-connecting-ip':crypto.randomUUID()}})));
  check(sockets.every(response=>response.status===101),'both players can restore live websocket');sockets.forEach(response=>{response.webSocket.accept();response.webSocket.close();});

  await api(a,'profile',{name:'爸爸',avatar:'🐻',visible:false});await api(b,'profile',{name:'小朋友',avatar:'🐼',visible:false});
  const tabA=crypto.randomUUID(),tabB=crypto.randomUUID();let family=(await api(a,'families',{tab:tabA})).data;family=(await api(b,`families/${family.id}`,{type:'join',tab:tabB})).data;
  family=(await api(a,`families/${family.id}`,{type:'settings',revision:family.revision,gameType:'chess',size:9,rules:'chinese',seats:family.seats})).data;
  family=(await api(a,`families/${family.id}`,{type:'ready',revision:family.revision})).data;family=(await api(b,`families/${family.id}`,{type:'ready',revision:family.revision})).data;
  family=(await api(a,`families/${family.id}`,{type:'start',revision:family.revision})).data;
  check(family.gameType==='chess'&&family.game,'family room launches chess');
  const familyGame=(await api(a,`chess/rooms/${family.game}`)).data;check(familyGame.family===family.id&&familyGame.phase==='playing','family chess starts after readiness');
  const blocked=await api(a,`families/${family.id}`,{type:'settings',revision:family.revision,gameType:'go',size:9,rules:'chinese',seats:family.seats});check(blocked.data.error==='GAME_ACTIVE','cannot switch game while a match is active');
  const before=(await api(a,'identity',{})).data.tutorials.chess;await api(a,'tutorial',{game:'chess',step:8});await api(a,'tutorial',{game:'chess',step:2});const after=(await api(a,'identity',{})).data.tutorials.chess;
  check(before===0&&after===8,'chess tutorial progress persists and never regresses');
  console.log(`Chess: ${checks} checks passed.`);
}finally{await mf.dispose();}
