import assert from 'node:assert/strict';
import {breakoutBrickLayout,advanceBreakoutBall,stabilizeBreakoutBall,BREAKOUT_BACK_Z} from '../src/arcade/BreakoutPhysics.mjs';
import {breakoutDifficultyFor} from '../src/arcade/BreakoutGame.mjs';
import {createFruitSlashGame,FRUIT_SIZES,FRUIT_BOMBS,FRUIT_TYPES} from '../src/arcade/FruitSlashGame.mjs';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
for(let level=1;level<=20;level++){
 const D=breakoutDifficultyFor({level}),bricks=breakoutBrickLayout(D).map(b=>({...b,hits:2}));
 for(const b of bricks){assert.ok(b.x-b.w/2>-D.playWidth/2+D.ballRadius*2);assert.ok(b.x+b.w/2<D.playWidth/2-D.ballRadius*2);assert.ok(b.z-b.d/2>BREAKOUT_BACK_Z+D.ballRadius*2);}
 const ball={x:0,z:5.2,vx:3,vz:-D.ballSpeed};let frame=0;
 for(;frame<60000&&bricks.some(b=>b.hits>0);frame++){
  const paddleX=Math.max(-D.playWidth/2+D.paddleWidth/2,Math.min(D.playWidth/2-D.paddleWidth/2,ball.x+.75*Math.sin(frame*.017)));
  advanceBreakoutBall(ball,1/120,{D,paddleX,paddleW:D.paddleWidth,bricks,onBrick:b=>b.hits--});
  assert.ok(Math.abs(ball.vz)>=Math.hypot(ball.vx,ball.vz)*.3999);assert.ok(ball.z<7.5,'following paddle must not lose the ball');
 }
 assert.equal(bricks.filter(b=>b.hits>0).length,0,`level ${level}: every brick can be cleared in the real field`);
}
{
 const D=breakoutDifficultyFor({level:20}),ball={x:4.6,z:2,vx:16,vz:.001};stabilizeBreakoutBall(ball,16);
 const speed=Math.hypot(ball.vx,ball.vz);assert.ok(Math.abs(speed-16)<1e-8);
 for(let i=0;i<1000;i++)advanceBreakoutBall(ball,.01,{D,paddleX:ball.x,paddleW:2,bricks:[]});assert.ok(Math.abs(ball.vz)>=speed*.4-.01);
 const brick={x:0,z:0,w:1,d:.55,hits:2},b={x:0,z:1,vx:.01,vz:-16};let hits=0;
 advanceBreakoutBall(b,.08,{D,paddleX:0,paddleW:2,bricks:[brick],onBrick(){brick.hits--;hits++;}});assert.equal(hits,1,'fast sweep hits once, separates and reflects without overlap damage');assert.ok(b.vz>0);
}
const make=(seed=5,difficulty={level:1})=>createFruitSlashGame({canvas:createStubCanvas(),seed,difficulty,autoStart:false});
{
 let result;const game=createFruitSlashGame({canvas:createStubCanvas(),seed:9,autoStart:false,onEnd:r=>result=r});game.start();game.tick(10);assert.equal(game.getState().remainingTime,45);game.pause();game.tick(20);assert.equal(game.getState().remainingTime,45);game.resume();game.tick(45);assert.equal(game.getState().ended,true);assert.equal(result.cleared,false);game.destroy();
}
const fruits=new Set(),bombs=new Set(),sizes=new Set(),effects=new Set();let successes=0;
for(let seed=1;seed<=20;seed++){
 const game=make(seed,{level:20});game.start();
 for(let i=0;i<55*60&&!game.getState().ended;i++){
  game.tick(1/60);const s=game.getState();
  for(const item of s.items){if(item.bomb)bombs.add(item.kind);else{fruits.add(item.kind);sizes.add(item.size);}}
  const item=s.items.find(a=>a.y>-.8&&a.y<2&&!s.items.some(b=>b!==a&&Math.hypot(b.x-a.x,b.y-a.y)<a.radius+b.radius+.25));
  if(!item)continue;
  if(!item.bomb){game.slashAt(item);const after=game.getState();if(after.score>s.score)assert.equal(after.score-s.score,item.points+Math.min(10,(s.combo+1)*2));}
  else if(seed<=10){game.slashAt(item);const after=game.getState(),effect=FRUIT_BOMBS.find(b=>b.id===item.kind);if(s.frozenFor<=0){effects.add(item.kind);assert.equal(after.lives,s.lives-(effect.lives||0));assert.ok(Math.abs(after.remainingTime-(s.remainingTime-(effect.seconds||0)))<1e-6);if(effect.freeze)assert.equal(after.frozenFor,effect.freeze);}}
 }
 if(game.getState().creditedWaves>=game.getState().difficulty.clearWaves)successes++;
 game.destroy();
}
assert.equal(fruits.size,FRUIT_TYPES.length);assert.equal(bombs.size,4);assert.equal(effects.size,4);assert.equal(sizes.size,3);assert.ok(successes>0,'highest difficulty is clearable within 55 seconds');assert.ok(FRUIT_SIZES[0].points>FRUIT_SIZES[2].points);
console.log('Arcade repairs: all 20 brick fields fully cleared; safe angles and swept hits; six fruits, three score sizes, four bomb effects, pause-safe 55s timer and high-level clears passed.');
