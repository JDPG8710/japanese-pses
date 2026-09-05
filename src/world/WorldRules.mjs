export const VERSION = 3;
export const GAMES = ['circuit','sudoku','code','set','balance','order','water','network'];
export function validGame(game, level) { return GAMES.includes(game) && [1,2].includes(level); }

export function random(seed) {
  let state=seed>>>0;
  return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
}
const pick=(rng,n)=>Math.floor(rng()*n);
const shuffle=(items,rng)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=pick(rng,i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};
const permutations=items=>items.length?items.flatMap((item,i)=>permutations([...items.slice(0,i),...items.slice(i+1)]).map(rest=>[item,...rest])):[[]];

const DIRS=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
export function rotateMask(mask,times){let out=mask;for(let i=0;i<(times%4+4)%4;i++)out=((out<<1)&15)|((out>>3)&1);return out;}
function directionBit(from,to){const dx=to[0]-from[0],dy=to[1]-from[1];return DIRS.find(d=>d[0]===dx&&d[1]===dy)?.[2]||0;}
function makeCircuit(rng,level){
  const size=level===1?4:5,startRow=pick(rng,size),route=[[0,startRow]];let row=startRow;
  for(let x=0;x<size-1;x++){
    const target=pick(rng,size),step=Math.sign(target-row);
    while(row!==target){row+=step;route.push([x,row]);}
    route.push([x+1,row]);
  }
  const pieces=[5,10,3,6,12,9],tiles=Array.from({length:size*size},()=>pieces[pick(rng,pieces.length)]);
  route.forEach((cell,i)=>{
    const previous=i?route[i-1]:[-1,startRow],next=i===route.length-1?[size,row]:route[i+1];
    const targetMask=directionBit(cell,previous)|directionBit(cell,next),turn=pick(rng,4);
    tiles[cell[1]*size+cell[0]]=rotateMask(targetMask,turn);
  });
  return {size,startRow,endRow:row,tiles};
}
function circuitSolution(q){
  const rotations=Array(q.tiles.length).fill(0),visited=new Set();
  function walk(x,y,incoming){
    const key=`${x},${y}`;if(visited.has(key))return false;visited.add(key);
    const index=y*q.size+x;
    for(let turn=0;turn<4;turn++){
      const mask=rotateMask(q.tiles[index],turn);if(!(mask&incoming))continue;
      for(const [dx,dy,out,opposite] of DIRS){
        if(out===incoming||!(mask&out))continue;
        if(x===q.size-1&&y===q.endRow&&out===2){rotations[index]=turn;return true;}
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=q.size||ny>=q.size)continue;
        rotations[index]=turn;if(walk(nx,ny,opposite))return true;
      }
    }
    visited.delete(key);return false;
  }
  return walk(0,q.startRow,8)?rotations:null;
}
function circuitValid(q,answer){
  if(answer.length!==q.tiles.length||answer.some(n=>n<0||n>3))return false;
  const queue=[[0,q.startRow]],seen=new Set();
  while(queue.length){const [x,y]=queue.shift(),key=`${x},${y}`;if(seen.has(key))continue;seen.add(key);const mask=rotateMask(q.tiles[y*q.size+x],answer[y*q.size+x]);if(x===0&&y===q.startRow&&!(mask&8))continue;if(x===q.size-1&&y===q.endRow&&(mask&2))return true;for(const [dx,dy,out,opposite] of DIRS){if(!(mask&out))continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=q.size||ny>=q.size)continue;const other=rotateMask(q.tiles[ny*q.size+nx],answer[ny*q.size+nx]);if(other&opposite)queue.push([nx,ny]);}}
  return false;
}

function makeSudoku(rng,level){
  const size=level===1?4:6,boxRows=2,boxCols=level===1?2:3;
  const rows=shuffle(Array.from({length:size/boxRows},(_,i)=>i),rng).flatMap(group=>shuffle(Array.from({length:boxRows},(_,i)=>group*boxRows+i),rng));
  const cols=shuffle(Array.from({length:size/boxCols},(_,i)=>i),rng).flatMap(group=>shuffle(Array.from({length:boxCols},(_,i)=>group*boxCols+i),rng));
  const digits=shuffle(Array.from({length:size},(_,i)=>i+1),rng);
  const solved=rows.flatMap(r=>cols.map(c=>digits[(boxCols*(r%boxRows)+Math.floor(r/boxRows)+c)%size]));
  const holes=shuffle(Array.from({length:size*size},(_,i)=>i),rng).slice(0,level===1?7:18),givens=[...solved];holes.forEach(i=>givens[i]=0);
  return {size,boxRows,boxCols,givens};
}
function sudokuValid(q,grid){
  if(grid.length!==q.size*q.size||grid.some((n,i)=>n<1||n>q.size||(q.givens[i]&&q.givens[i]!==n)))return false;
  const wanted=q.size*(q.size+1)/2;
  for(let r=0;r<q.size;r++)if(new Set(grid.slice(r*q.size,(r+1)*q.size)).size!==q.size||grid.slice(r*q.size,(r+1)*q.size).reduce((a,b)=>a+b,0)!==wanted)return false;
  for(let c=0;c<q.size;c++){const col=Array.from({length:q.size},(_,r)=>grid[r*q.size+c]);if(new Set(col).size!==q.size)return false;}
  for(let br=0;br<q.size;br+=q.boxRows)for(let bc=0;bc<q.size;bc+=q.boxCols){const values=[];for(let r=0;r<q.boxRows;r++)for(let c=0;c<q.boxCols;c++)values.push(grid[(br+r)*q.size+bc+c]);if(new Set(values).size!==q.size)return false;}
  return true;
}
function sudokuSolution(q){
  const grid=[...q.givens];
  function fill(index=0){while(index<grid.length&&grid[index])index++;if(index===grid.length)return true;for(let value=1;value<=q.size;value++){grid[index]=value;if(partialSudoku(q,grid,index)&&fill(index+1))return true;}grid[index]=0;return false;}
  return fill()?[...grid]:null;
}
function partialSudoku(q,grid,index){const row=Math.floor(index/q.size),col=index%q.size,value=grid[index];for(let c=0;c<q.size;c++)if(c!==col&&grid[row*q.size+c]===value)return false;for(let r=0;r<q.size;r++)if(r!==row&&grid[r*q.size+col]===value)return false;const br=Math.floor(row/q.boxRows)*q.boxRows,bc=Math.floor(col/q.boxCols)*q.boxCols;for(let r=br;r<br+q.boxRows;r++)for(let c=bc;c<bc+q.boxCols;c++)if((r!==row||c!==col)&&grid[r*q.size+c]===value)return false;return true;}

function allCodes(length,symbols){let codes=[[]];for(let i=0;i<length;i++)codes=codes.flatMap(code=>Array.from({length:symbols},(_,n)=>[...code,n]));return codes;}
export function codeFeedback(secret,guess,symbols){let exact=0,color=0;const a=Array(symbols).fill(0),b=Array(symbols).fill(0);for(let i=0;i<secret.length;i++)if(secret[i]===guess[i])exact++;else{a[secret[i]]++;b[guess[i]]++;}for(let i=0;i<symbols;i++)color+=Math.min(a[i],b[i]);return [exact,color];}
function makeCode(rng,level){
  const length=level===1?3:4,symbols=level===1?4:5,all=allCodes(length,symbols),secret=all[pick(rng,all.length)],used=new Set(),clues=[];let candidates=all;
  while(candidates.length>1){
    let best=null,bestRemain=Infinity;
    for(const guess of shuffle(all,rng).slice(0,Math.min(all.length,80))){const key=guess.join('');if(key===secret.join('')||used.has(key))continue;const result=codeFeedback(secret,guess,symbols),remain=candidates.filter(candidate=>codeFeedback(candidate,guess,symbols).every((n,i)=>n===result[i])).length;if(remain<bestRemain){best={guess,result,key};bestRemain=remain;}}
    if(!best){for(const guess of all){const key=guess.join('');if(key===secret.join('')||used.has(key))continue;const result=codeFeedback(secret,guess,symbols),remain=candidates.filter(candidate=>codeFeedback(candidate,guess,symbols).every((n,i)=>n===result[i])).length;if(remain<bestRemain){best={guess,result,key};bestRemain=remain;}}}
    if(!best||bestRemain>=candidates.length)throw new Error('CODE_GENERATION_FAILED');
    used.add(best.key);clues.push({guess:best.guess,exact:best.result[0],color:best.result[1]});candidates=candidates.filter(candidate=>codeFeedback(candidate,best.guess,symbols).every((n,i)=>n===best.result[i]));
  }
  const minimum=level===1?4:6;
  for(const guess of shuffle(all,rng)){if(clues.length>=minimum)break;const key=guess.join('');if(key===secret.join('')||used.has(key))continue;const [exact,color]=codeFeedback(secret,guess,symbols);used.add(key);clues.push({guess,exact,color});}
  return {length,symbols,clues};
}
function codeSolution(q){return allCodes(q.length,q.symbols).find(candidate=>q.clues.every(clue=>{const [exact,color]=codeFeedback(candidate,clue.guess,q.symbols);return exact===clue.exact&&color===clue.color;}))||null;}

const decodeCard=n=>[Math.floor(n/9),Math.floor(n/3)%3,n%3];
export function isSet(cards){return cards.length===3&&[0,1,2].every(feature=>{const count=new Set(cards.map(card=>card[feature])).size;return count===1||count===3;});}
function makeSet(rng,level){const count=level===1?9:12,a=pick(rng,27);let b=pick(rng,27);while(b===a)b=pick(rng,27);const ca=decodeCard(a),cb=decodeCard(b),cc=ca.map((value,i)=>value===cb[i]?value:3-value-cb[i]),chosen=new Set([a,b,cc[0]*9+cc[1]*3+cc[2]]);while(chosen.size<count)chosen.add(pick(rng,27));return {cards:shuffle([...chosen].map(decodeCard),rng)};}
function setSolution(q){for(let a=0;a<q.cards.length-2;a++)for(let b=a+1;b<q.cards.length-1;b++)for(let c=b+1;c<q.cards.length;c++)if(isSet([q.cards[a],q.cards[b],q.cards[c]]))return[a,b,c];return null;}

function makeBalance(rng,level){let weights=shuffle(Array.from({length:level===1?9:12},(_,i)=>i+1),rng).slice(0,3);const rows=level===1?[[1,1,0],[0,1,1],[1,0,1]]:[[2,1,0],[0,1,2],[1,0,1]];const equations=shuffle(rows.map(counts=>({counts,total:counts.reduce((sum,n,i)=>sum+n*weights[i],0)})),rng);return {equations,target:pick(rng,3),max:level===1?9:12};}
function balanceSolution(q){for(let a=1;a<=q.max;a++)for(let b=1;b<=q.max;b++)for(let c=1;c<=q.max;c++){if(new Set([a,b,c]).size<3)continue;const values=[a,b,c];if(q.equations.every(eq=>eq.counts.reduce((sum,n,i)=>sum+n*values[i],0)===eq.total))return[values[q.target]];}return null;}

function orderValid(q,answer){if(answer.length!==q.count||new Set(answer).size!==q.count||answer.some(n=>n<0||n>=q.count))return false;const at=new Map(answer.map((id,i)=>[id,i]));return q.constraints.every(rule=>rule.type==='before'?at.get(rule.a)<at.get(rule.b):Math.abs(at.get(rule.a)-at.get(rule.b))===1);}
function makeOrder(rng,level){const count=level===1?5:6,ids=Array.from({length:count},(_,i)=>i),hidden=shuffle(ids,rng),all=permutations(ids);let candidates=all;const pool=[];for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)pool.push({type:'before',a:hidden[i],b:hidden[j]});for(let i=0;i<count-1;i++)pool.push({type:'beside',a:hidden[i],b:hidden[i+1]});const constraints=[];for(const rule of shuffle(pool,rng)){const next=candidates.filter(candidate=>orderValid({count,constraints:[rule]},candidate));if(next.length<candidates.length){constraints.push(rule);candidates=next;}if(candidates.length===1)break;}if(candidates.length!==1)throw new Error('ORDER_GENERATION_FAILED');return {count,constraints:shuffle(constraints,rng)};}
function orderSolution(q){return permutations(Array.from({length:q.count},(_,i)=>i)).find(candidate=>orderValid(q,candidate))||null;}

function applyWater(state,op,capacities){let[a,b]=state;const[ca,cb]=capacities;if(op===0)a=ca;if(op===1)b=cb;if(op===2)a=0;if(op===3)b=0;if(op===4){const n=Math.min(a,cb-b);a-=n;b+=n;}if(op===5){const n=Math.min(b,ca-a);b-=n;a+=n;}return[a,b];}
function waterSolution(q){const queue=[{state:[0,0],moves:[]}],seen=new Set(['0,0']);while(queue.length){const current=queue.shift();for(let op=0;op<6;op++){const state=applyWater(current.state,op,q.capacities),key=state.join(','),moves=[...current.moves,op];if(state.includes(q.target))return moves;if(!seen.has(key)&&moves.length<12){seen.add(key);queue.push({state,moves});}}}return null;}
function makeWater(rng,level){for(let guard=0;guard<500;guard++){const low=level===1?3:5,span=level===1?5:8,a=low+pick(rng,span),b=low+pick(rng,span);if(a===b)continue;const target=1+pick(rng,Math.max(a,b)-1);if(target===a||target===b)continue;const q={capacities:[a,b],target,limit:12},moves=waterSolution(q);if(moves&&moves.length>=(level===1?3:4)&&moves.length<=(level===1?6:9)){q.limit=moves.length;return q;}}throw new Error('WATER_GENERATION_FAILED');}
function waterValid(q,answer){if(!answer.length||answer.length>q.limit||answer.some(n=>n<0||n>5))return false;let state=[0,0];for(const op of answer)state=applyWater(state,op,q.capacities);return state.includes(q.target);}

function makeNetwork(rng,level){const count=level===1?5:6,nodes=Array.from({length:count},(_,i)=>{const angle=Math.PI*2*i/count-.8,jitter=pick(rng,9)-4;return[Math.round(50+38*Math.cos(angle)+jitter),Math.round(50+34*Math.sin(angle)-jitter)];}),edges=[];let serial=1;for(let a=0;a<count;a++)for(let b=a+1;b<count;b++){const distance=Math.round(Math.hypot(nodes[a][0]-nodes[b][0],nodes[a][1]-nodes[b][1])/5);edges.push([a,b,distance*20+serial++]);}return {count,nodes,edges:shuffle(edges,rng)};}
function networkSolution(q){const parent=Array.from({length:q.count},(_,i)=>i),find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));const chosen=[];[...q.edges.keys()].sort((a,b)=>q.edges[a][2]-q.edges[b][2]).forEach(index=>{const[a,b]=q.edges[index],ra=find(a),rb=find(b);if(ra!==rb){parent[ra]=rb;chosen.push(index);}});return chosen;}
function networkValid(q,answer){if(answer.length!==q.count-1||new Set(answer).size!==answer.length||answer.some(n=>n<0||n>=q.edges.length))return false;const best=networkSolution(q),cost=list=>list.reduce((sum,i)=>sum+q.edges[i][2],0),parent=Array.from({length:q.count},(_,i)=>i),find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));for(const i of answer){const[a,b]=q.edges[i],ra=find(a),rb=find(b);if(ra===rb)return false;parent[ra]=rb;}return new Set(parent.map(find)).size===1&&cost(answer)===cost(best);}

export function makeRounds(game,level,seed){
  if(!validGame(game,level))throw new Error('INVALID_GAME');const rng=random(seed),rounds=[],seen=new Set();
  while(rounds.length<10){let q;if(game==='circuit')q=makeCircuit(rng,level);if(game==='sudoku')q=makeSudoku(rng,level);if(game==='code')q=makeCode(rng,level);if(game==='set')q=makeSet(rng,level);if(game==='balance')q=makeBalance(rng,level);if(game==='order')q=makeOrder(rng,level);if(game==='water')q=makeWater(rng,level);if(game==='network')q=makeNetwork(rng,level);const key=JSON.stringify(q);if(!seen.has(key)){seen.add(key);rounds.push(q);}}
  return rounds;
}
export function solution(game,q){if(game==='circuit')return circuitSolution(q);if(game==='sudoku')return sudokuSolution(q);if(game==='code')return codeSolution(q);if(game==='set')return setSolution(q);if(game==='balance')return balanceSolution(q);if(game==='order')return orderSolution(q);if(game==='water')return waterSolution(q);if(game==='network')return networkSolution(q);return null;}
export function checkAnswer(game,q,answer){if(!Array.isArray(answer)||answer.some(n=>!Number.isInteger(n)))return false;if(game==='circuit')return circuitValid(q,answer);if(game==='sudoku')return sudokuValid(q,answer);if(game==='code'){const expected=codeSolution(q);return !!expected&&answer.length===expected.length&&answer.every((n,i)=>n===expected[i]);}if(game==='set')return answer.length===3&&new Set(answer).size===3&&answer.every(n=>n>=0&&n<q.cards.length)&&isSet(answer.map(i=>q.cards[i]));if(game==='balance')return answer.length===1&&answer[0]===balanceSolution(q)?.[0];if(game==='order')return orderValid(q,answer);if(game==='water')return waterValid(q,answer);if(game==='network')return networkValid(q,answer);return false;}
export function evaluate(game,q,answer,tries){const correct=checkAnswer(game,q,answer),done=correct||tries>=2;return{correct,done,points:correct?[100,70,40][tries]:0,tries:done?0:tries+1};}
