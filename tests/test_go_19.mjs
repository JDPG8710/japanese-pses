import assert from 'node:assert/strict';
import { newGame, play, score, markDead, markSeki, sgf, neighbors } from '../src/arena/GoRules.mjs';
import { chooseMove } from '../src/arena/GoAI.mjs';
import { goHarness } from './go-harness.mjs';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
for(const size of [9,19])for(const rules of ['chinese','japanese']) {
  let g=newGame(size,rules);check(g.board.length===size*size,'correct board size');
  check(g.komi===(rules==='chinese'?7.5:6.5),'preset komi');
  g.board[0]=2;g.board[1]=1;g.history=[g.board.join('')];g=play(g,size);
  check(g.board[0]===0&&g.captures[0]===1,'capture uses board width');
  check(!neighbors(size-1,size).includes(size),'right edge never wraps');
  g=newGame(size,rules);g.board.fill(1);g.board[Math.floor(g.board.length/2)]=0;g.captures=[3,2];
  check(score(g).black===(rules==='chinese'?size*size:4),'area and territory differ');
  if(rules==='japanese') {g.phase='scoring';g=markSeki(g,0);check(score(g).black===3,'seki eye is not territory');g.accepted=[1];g=markDead(g,0);check(g.seki.length===0&&g.accepted.length===0,'dead and seki exclusive; approval resets');}
}
let g=newGame(19,'japanese');g=play(g,360);check(sgf(g).includes('SZ[19]KM[6.5]')&&sgf(g).includes('B[ss]'),'SGF size komi corner');
const original=JSON.stringify(g);play(g,0);check(JSON.stringify(g)===original,'trial move does not mutate history or board');
for(const level of ['beginner','easy','medium','hard']) {const start=performance.now();const p=chooseMove(g,level);play(g,p);console.log(`19x19 ${level}: ${(performance.now()-start).toFixed(1)}ms`);checks++;}
const {mf}=await goHarness(),origin='http://localhost:4173';
try {
  async function api(path,body,cookie='') {const r=await mf.dispatchFetch(`${origin}/api/arena/${path}`,{method:body===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],...await r.json()};}
  const a=(await api('identity',{})).cookie,b=(await api('identity',{})).cookie,c=(await api('identity',{})).cookie;
  check((await api('rooms',{size:13},a)).status===400,'unsupported size rejected');
  check((await api('rooms',{size:19,rules:'japanese',komi:0},a)).status===400,'client cannot forge komi');
  const cn=await api('match',{size:19,rules:'chinese'},a),jp=await api('match',{size:19,rules:'japanese'},b),small=await api('match',{size:9,rules:'chinese'},c);
  check(new Set([cn.id,jp.id,small.id]).size===3,'matchmaking isolates size and scoring');
  let room=await api(`rooms/${jp.id}`,{type:'join',size:9,rules:'chinese'},a);
  check(room.game.size===19&&room.game.komi===6.5,'join cannot replace room settings');
  room=await api(`rooms/${jp.id}`,{type:'ready',revision:room.revision},a);
  room=await api(`rooms/${jp.id}`,{type:'ready',revision:room.revision},b);
  room=await api(`rooms/${jp.id}`,{type:'move',revision:room.revision,point:360},b);
  check(room.game.board[360]===1&&!('history' in room.game),'19x19 move, no bulky history in network state');
  room=await api(`rooms/${jp.id}`,{type:'move',revision:room.revision,point:null},a);
  room=await api(`rooms/${jp.id}`,{type:'move',revision:room.revision,point:null},b);
  room=await api(`rooms/${jp.id}`,{type:'seki',revision:room.revision,point:360},b);
  check(room.game.seki.includes(360),'server accepts seki marker');
  room=await api(`rooms/${jp.id}`,{type:'accept',revision:room.revision},b);
  room=await api(`rooms/${jp.id}`,{type:'accept',revision:room.revision},a);
  check(room.game.result.black===0&&room.game.result.white===6.5,'Japanese score and seki authority');
  let bot=await api('rooms',{mode:'ai',size:19,rules:'japanese',difficulty:'hard'},a);
  check(bot.game.size===19&&bot.game.komi===6.5,'19x19 AI preset');
  check((await api('rooms',{mode:'ai',difficulty:'easy'},b)).error==='AI_BUSY','19x19 hard consumes all 16 units');
  bot=await api(`rooms/${bot.id}`,{type:'ready',revision:bot.revision},a);
  bot=await api(`rooms/${bot.id}`,{type:'move',revision:bot.revision,point:360},a);
  await new Promise(resolve=>setTimeout(resolve,1400));bot=await api(`rooms/${bot.id}`,undefined,a);
  check(bot.game.moves.length===2,'19x19 computer alarm responds');
  console.log(`19x19 and scoring: ${checks} checks passed.`);
}finally{await mf.dispose();}
