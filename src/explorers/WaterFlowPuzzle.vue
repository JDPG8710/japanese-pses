<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import {t} from './locale';
interface Node { id: string; type: 'source' | 'junction' | 'target'; x: number; y: number; capacity?: number; demand?: number; currentFlow: number }
interface Edge { id: string; from: string; to: string; capacity: number; flow: number; isOpen: boolean }
interface LevelConfig { levelId: number; title: string; hint: string; nodes: Node[]; edges: Edge[] }
const levelMockData: LevelConfig = {
  levelId: 1, title: '水のネットワーク · 水流网络', hint: '水按管道编号先后流动，先到的管道最多取走其容量；剩余水留在节点。关闭支路，观察另一条路的变化。',
  nodes: [
    { id:'S', type:'source', x:90,y:210,capacity:10,currentFlow:0 },
    { id:'J', type:'junction',x:300,y:210,currentFlow:0 },
    { id:'A', type:'target',x:560,y:95,demand:4,currentFlow:0 },
    { id:'B', type:'target',x:560,y:330,demand:6,currentFlow:0 }
  ],
  edges:[{id:'1',from:'S',to:'J',capacity:10,flow:0,isOpen:false},{id:'2',from:'J',to:'A',capacity:4,flow:0,isOpen:false},{id:'3',from:'J',to:'B',capacity:6,flow:0,isOpen:false},{id:'4',from:'S',to:'A',capacity:3,flow:0,isOpen:false}]
};
// Kahn's BFS waits for all parents before distributing merged incoming water.
function propagate(level: LevelConfig) {
  const nodes = new Map(level.nodes.map(n=>[n.id,n]));
  const degree = new Map(level.nodes.map(n=>[n.id,0]));
  level.nodes.forEach(n=>n.currentFlow=n.type==='source'?(n.capacity??0):0);
  level.edges.forEach(e=>{e.flow=0;degree.set(e.to,degree.get(e.to)!+1);});
  const queue=level.nodes.filter(n=>degree.get(n.id)===0); let visited=0;
  while(queue.length){const n=queue.shift()!;visited++;let available=n.currentFlow;
    for(const e of level.edges.filter(e=>e.from===n.id)){
      e.flow=e.isOpen?Math.min(available,e.capacity):0;available-=e.flow;
      nodes.get(e.to)!.currentFlow+=e.flow;
      degree.set(e.to,degree.get(e.to)!-1);if(degree.get(e.to)===0)queue.push(nodes.get(e.to)!);
    }
  }
  if(visited!==level.nodes.length)throw new Error('关卡必须是无环网络');
}
const solved=(l:LevelConfig)=>l.nodes.filter(n=>n.type==='target').every(n=>n.currentFlow===n.demand);
const level=ref<LevelConfig>(structuredClone(levelMockData));propagate(level.value);
const steps=ref(0), showWin=ref(false), closeButton=ref<HTMLButtonElement|null>(null);
let lastPipe: HTMLElement | SVGElement | null=null;
const optimal=computed(()=>{let best=Infinity;for(let mask=0;mask<2**levelMockData.edges.length;mask++){
  const candidate=structuredClone(levelMockData);let count=0;
  candidate.edges.forEach((e,i)=>{const open=Boolean(mask&(1<<i));if(open!==e.isOpen)count++;e.isOpen=open;});propagate(candidate);if(solved(candidate))best=Math.min(best,count);
}return best;});
const node=(id:string)=>level.value.nodes.find(n=>n.id===id)!;
async function toggle(e:Edge,event:Event){if(showWin.value)return;lastPipe=event.currentTarget as SVGElement;e.isOpen=!e.isOpen;steps.value++;propagate(level.value);if(solved(level.value)){showWin.value=true;await nextTick();closeButton.value?.focus();}}
function close(){showWin.value=false;lastPipe?.focus();}
function reset(){level.value=structuredClone(levelMockData);propagate(level.value);steps.value=0;showWin.value=false;}
</script>

<template>
  <section class="water">
    <p>{{t('logic')}}</p><h1>{{t('water')}}</h1>
    <p>{{t('waterIntro')}}</p><p>{{t('waterSupply')}}</p>
    <svg viewBox="0 0 680 430" role="group" :aria-label="t('waterAria')">
      <g v-for="e in level.edges" :key="e.id" role="button" tabindex="0" :aria-label="t('pipeAria',{id:e.id,from:e.from,to:e.to,flow:e.flow,capacity:e.capacity})" :aria-pressed="e.isOpen" @click="toggle(e,$event)" @keydown.enter.prevent="toggle(e,$event)" @keydown.space.prevent="toggle(e,$event)">
        <path :d="`M${node(e.from).x},${node(e.from).y} L${node(e.to).x},${node(e.to).y}`" stroke="transparent" stroke-width="44"/>
        <path :d="`M${node(e.from).x},${node(e.from).y} L${node(e.to).x},${node(e.to).y}`" :stroke="e.isOpen?'#0284c7':'#94a3b8'" :stroke-width="e.isOpen?14:6"/>
        <path v-if="e.flow>0" class="stream" :d="`M${node(e.from).x},${node(e.from).y} L${node(e.to).x},${node(e.to).y}`"/>
        <rect :x="(node(e.from).x+node(e.to).x)/2-43" :y="(node(e.from).y+node(e.to).y)/2-23" width="86" height="46" rx="12" fill="white" stroke="#64748b"/>
        <text :x="(node(e.from).x+node(e.to).x)/2" :y="(node(e.from).y+node(e.to).y)/2+5">{{e.id}}: {{e.flow}}/{{e.capacity}}</text>
      </g>
      <g v-for="n in level.nodes" :key="n.id" pointer-events="none">
        <circle :cx="n.x" :cy="n.y" r="43" :fill="n.type==='target' && n.currentFlow===n.demand?'#bbf7d0':'#e0f2fe'" stroke="#0f766e" stroke-width="3"/>
        <text :x="n.x" :y="n.y-7">{{n.type==='source'?t('source'):n.type==='junction'?t('junction'):`${t('field')} ${n.id}`}}</text>
        <text :x="n.x" :y="n.y+17">{{n.currentFlow}}{{n.demand!==undefined?` / ${n.demand}`:n.capacity?` / ${n.capacity}`:''}}</text>
      </g>
    </svg>
    <div class="pipe-controls"><button v-for="e in level.edges" :key="e.id" :aria-pressed="e.isOpen" @click="toggle(e,$event)">{{t('pipe')}} {{e.id}} · {{t(e.isOpen?'open':'closed')}}</button></div>
    <p aria-live="polite">{{steps}} {{t('steps')}} · {{t('field')}} A: {{node('A').currentFlow}}/4 · {{t('field')}} B: {{node('B').currentFlow}}/6</p>
    <button @click="reset">{{t('restart')}}</button><details><summary>{{t('rules')}}</summary><p>{{t('hint')}}</p><p>{{t('direction')}}</p></details>
    <div v-if="showWin" class="veil" @keydown.esc.prevent="close" @keydown.tab.prevent="closeButton?.focus()"><section role="dialog" aria-modal="true" aria-labelledby="water-win"><h2 id="water-win">{{t('waterWin')}}</h2><p>{{t('waterResult',{steps,optimal})}}</p><p>{{t(steps===optimal?'optimal':'tryFewer')}}</p><button ref="closeButton" @click="close">{{t('view')}}</button></section></div>
  </section>
</template>

<style scoped>
.pipe-controls{display:flex;flex-wrap:wrap;gap:10px}.pipe-controls button{min-height:44px;background:#e2e8f0;color:#164e63;border:2px solid transparent}.pipe-controls button[aria-pressed=true]{background:#e0f2fe;border-color:#0284c7}
.water{color:#164e63}svg{width:100%;display:block;min-height:260px}text{text-anchor:middle;font-size:16px;font-weight:700;fill:#164e63}g[role=button]{cursor:pointer}g[role=button]:focus{outline:none}g[role=button]:focus rect{stroke:#7c3aed;stroke-width:5}.stream{stroke:#bae6fd;stroke-width:5;stroke-dasharray:10 12;animation:water 1s linear infinite;pointer-events:none}@keyframes water{to{stroke-dashoffset:-44}}button,summary{min-height:44px;cursor:pointer}button{padding:12px 20px;border:0;border-radius:12px;background:#164e63;color:white}.veil{position:fixed;inset:0;background:#082f4988;display:grid;place-items:center;z-index:10;padding:20px}.veil section{background:white;border-radius:24px;padding:28px;max-width:420px}@media(prefers-reduced-motion:reduce){.stream{animation:none}}@media(max-width:480px){svg{min-height:0}text{font-size:18px}}
</style>
