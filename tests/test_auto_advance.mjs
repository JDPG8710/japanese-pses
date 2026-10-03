import assert from 'node:assert/strict';
import {scheduleAutoAdvance} from '../src/town/AutoAdvance.mjs';
let queued=new Map(),id=0,paused=false,calls=0;
const request=fn=>{queued.set(++id,fn);return id;},cancel=id=>queued.delete(id);
const step=t=>{const fns=[...queued.values()];queued.clear();for(const fn of fns)fn(t);};
const options={delay:200,isPaused:()=>paused,request,cancel};
scheduleAutoAdvance(()=>calls++,options);step(0);step(100);paused=true;step(200);step(10000);assert.equal(calls,0);paused=false;step(10100);assert.equal(calls,1);step(10200);assert.equal(calls,1);
const stop=scheduleAutoAdvance(()=>calls++,options);step(0);stop();step(500);assert.equal(calls,1);assert.equal(queued.size,0);console.log('Auto advance: visible-time delay, pause, one-shot and exit cancellation passed.');
