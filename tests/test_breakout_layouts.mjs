import assert from 'node:assert/strict';
import {breakoutLayoutFor,BREAKOUT_LAYOUT_COUNT} from '../src/arcade/BreakoutLayouts.mjs';
import {breakoutDifficultyFor,createBreakoutGame} from '../src/arcade/BreakoutGame.mjs';
import {advanceBreakoutBall} from '../src/arcade/BreakoutPhysics.mjs';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
const brickSignatures=new Set(),wallSignatures=new Set();
for(let level=1;level<=20;level++){
 const D=breakoutDifficultyFor({level}),layout=breakoutLayoutFor(D),walls=layout.walls,bricks=layout.bricks.map(b=>({...b,hits:2}));
 brickSignatures.add(JSON.stringify(layout.bricks));wallSignatures.add(JSON.stringify(walls));assert.ok(walls.length>0);assert.ok(bricks.length>=20);
 // Check physically open routes from the paddle to the entire brick garden.
 const cell=.08,r=D.ballRadius,queue=[[0,5.2]],seen=new Set();let garden=false;
 function free(x,z){return Math.abs(x)<D.playWidth/2-r&&z>-6+r&&z<5.5&&!walls.some(w=>Math.abs(x-w.x)<w.w/2+r+.02&&Math.abs(z-w.z)<w.d/2+r+.02);}
 for(let at=0;at<queue.length;at++){const [x,z]=queue[at],key=`${Math.round(x/cell)},${Math.round(z/cell)}`;if(seen.has(key)||!free(x,z))continue;seen.add(key);if(z<-.6){garden=true;break;}for(const [dx,dz]of [[cell,0],[-cell,0],[0,cell],[0,-cell]])queue.push([x+dx,z+dz]);}
 assert.ok(garden,`level ${level}: ball-width route remains open`);
 let wallHits=0;const ball={x:0,z:5.2,vx:3,vz:-D.ballSpeed};
 for(let frame=0;frame<60000&&bricks.some(b=>b.hits>0);frame++){
  const paddleX=Math.max(-D.playWidth/2+D.paddleWidth/2,Math.min(D.playWidth/2-D.paddleWidth/2,ball.x+.75*Math.sin(frame*.017)));
  advanceBreakoutBall(ball,1/120,{D,paddleX,paddleW:D.paddleWidth,bricks,walls,onBrick:b=>b.hits--,onWall:()=>wallHits++});
  assert.ok(!walls.some(w=>Math.abs(ball.x-w.x)<w.w/2+D.ballRadius-.001&&Math.abs(ball.z-w.z)<w.d/2+D.ballRadius-.001),'ball never tunnels into a steel wall');
 }
 assert.equal(bricks.filter(b=>b.hits>0).length,0);assert.ok(wallHits>0,'permanent walls really participate in every level');
 const game=createBreakoutGame({canvas:createStubCanvas(),difficulty:{level},seed:8,autoStart:false});game.start();const s=game.getState();assert.equal(s.layoutId,layout.id);assert.deepEqual(s.wallStates,walls);game.destroy();
 for(const locale of ['en','zh','ja'])assert.ok(breakoutLayoutFor(D,locale).name);
}
assert.equal(brickSignatures.size,BREAKOUT_LAYOUT_COUNT);assert.equal(wallSignatures.size,BREAKOUT_LAYOUT_COUNT);
for(const round of [1,20,21,40,41,80,81,1000000]){const a=breakoutLayoutFor({level:20,infiniteRound:round}),b=breakoutLayoutFor({level:20,infiniteRound:round});assert.deepEqual(a,b);assert.ok(a.walls.length>0);assert.notDeepEqual(a,breakoutLayoutFor({level:20}));}
{
 const D=breakoutDifficultyFor({level:1}),wall={x:0,z:1,w:2,d:.32},ball={x:0,z:2,vx:.01,vz:-14},original={...wall};let count=0;
 advanceBreakoutBall(ball,.1,{D,paddleX:0,paddleW:2,bricks:[],walls:[wall],onWall:()=>count++});assert.equal(count,1);assert.ok(ball.vz>0);assert.deepEqual(wall,original,'walls are never damaged or credited as bricks');
}
console.log('Breakout layouts: 20 unique brick patterns and 20 unique wall plans; open ball-width routes, actual wall collisions, no penetration, all complete clears and deterministic endless remixes passed.');
