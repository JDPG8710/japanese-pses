import assert from 'node:assert/strict';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
import {createBubbleGame} from '../src/arcade/BubbleGame.mjs';
import {createRhythmGame} from '../src/arcade/RhythmGame.mjs';
let checks=0;
for(const level of [1,10,20])for(const [id,factory]of [['bubble',createBubbleGame],['rhythm',createRhythmGame]]){
 const outcomes=[],g=factory({canvas:createStubCanvas(),seed:8821,difficulty:{level,scale:(level-1)/19},onEnd:r=>outcomes.push(r)});
 const before=g.getState();g.pause();g.tick(.1);g.press(0);assert.deepEqual(g.getState(),before,'paused time and inputs must be inert');g.resume();
 if(id==='bubble'){for(let i=0;i<100&&!g.getState().ended;i++)g.press(g.getState().target);}
 else {for(let i=0;i<10000&&!g.getState().ended;i++){g.tick(.02);const s=g.getState(),n=s.notes.find(n=>!n.done&&Math.abs(n.at-s.clock)<.02);if(n)g.press(n.lane);}}
 assert.equal(outcomes.length,1);assert.equal(outcomes[0].cleared,true);assert.ok(outcomes[0].score>0);g.press(0);g.tick(.1);assert.equal(outcomes.length,1);g.destroy();checks++;
 const losses=[],bad=factory({canvas:createStubCanvas(),seed:8821,difficulty:{level,scale:(level-1)/19},onEnd:r=>losses.push(r)});
 for(let i=0;i<4;i++)bad.press(id==='bubble'?(bad.getState().target+1)%6:0);
 assert.equal(losses.length,1);assert.equal(losses[0].cleared,false);assert.equal(losses[0].score,0);bad.destroy();checks++;
}
for(const factory of [createBubbleGame,createRhythmGame]){const a=factory({canvas:createStubCanvas(),seed:42}),b=factory({canvas:createStubCanvas(),seed:42});assert.deepEqual(a.getState(),b.getState());a.destroy();b.destroy();checks++;}
console.log(`Town kids games: ${checks} deterministic, pause, win and failure checks passed`);
