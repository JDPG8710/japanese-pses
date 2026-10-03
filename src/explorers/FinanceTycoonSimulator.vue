<script setup lang="ts">
import { computed, ref } from 'vue';
import {locale,t} from './locale';
const INITIAL=10000, TURNS=10;
const monthlyGrowth=Math.pow(1.05,1/12)-1;
const inflationFactor=(months:number)=>Math.pow(1.02,months/12);
const money=(n:number)=>new Intl.NumberFormat(({en:'en-US',ja:'ja-JP',zh:'zh-CN'} as Record<string,string>)[locale.value],{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(n);
const month=ref(0), cash=ref(INITIAL), assets=ref(0), inventory=ref(0), investment=ref(0);
const history=ref([{month:0,nominal:INITIAL,real:INITIAL,baseline:INITIAL}]);
const report=ref<null|{rainy:boolean;roi:number;business:number;growth:number;inflation:number}>(null);
const total=computed(()=>cash.value+assets.value);
const remaining=computed(()=>cash.value-inventory.value-investment.value);
const done=computed(()=>month.value>=TURNS);
function allocate(kind:'inventory'|'investment',event:Event){
  const value=Number((event.target as HTMLInputElement).value);
  if(!Number.isFinite(value))return;
  const other=kind==='inventory'?investment.value:inventory.value;
  const safe=Math.max(0,Math.min(Math.floor(cash.value-other),Math.floor(value)));
  if(kind==='inventory')inventory.value=safe;else investment.value=safe;
}
function advance(){
  if(done.value||remaining.value<0)return;
  // Rain reduces the month's business return to -10%; sunny ROI is 10–30%.
  const rainy=Math.random()<0.3, roi=rainy?-0.1:0.1+Math.random()*0.2;
  const business=inventory.value*roi, growth=(assets.value+investment.value)*monthlyGrowth;
  cash.value=remaining.value+inventory.value+business;
  assets.value+=investment.value+growth;month.value++;
  const nominal=total.value, real=nominal/inflationFactor(month.value);
  report.value={rainy,roi,business,growth,inflation:nominal-real};
  history.value.push({month:month.value,nominal,real,baseline:INITIAL/inflationFactor(month.value)});
  inventory.value=0;investment.value=0;
}
function reset(){month.value=0;cash.value=INITIAL;assets.value=0;inventory.value=0;investment.value=0;history.value=[{month:0,nominal:INITIAL,real:INITIAL,baseline:INITIAL}];report.value=null;}
const bounds=computed(()=>{const all=history.value.flatMap(p=>[p.nominal,p.real,p.baseline]);return {min:Math.floor(Math.min(...all)*0.9/100)*100,max:Math.ceil(Math.max(...all)*1.1/100)*100};});
const y=(v:number)=>230-(v-bounds.value.min)/(bounds.value.max-bounds.value.min)*190;
const points=(key:'nominal'|'real'|'baseline')=>history.value.map(p=>`${80+p.month*49},${y(p[key])}`).join(' ');
</script>

<template>
  <section class="finance"><p>MONEY LAB · {{t('finance')}}</p><h1>{{t('moneyTitle')}}</h1>
    <p>{{t('moneyIntro',{money:money(INITIAL)})}}</p><p class="note">{{t('note')}}</p>
    <div class="stats"><p>{{t('month')}} <strong>{{month}} / 10</strong></p><p>{{t('cash')}} <strong>{{money(cash)}}</strong></p><p>{{t('assets')}} <strong>{{money(assets)}}</strong></p><p>{{t('total')}} <strong>{{money(total)}}</strong></p></div>
    <fieldset :disabled="done"><legend>{{t('allocation')}}</legend>
      <label for="inventory">{{t('inventory')}}: {{money(inventory)}}</label><input id="inventory" type="range" min="0" :max="Math.floor(cash-investment)" step="1" :value="inventory" @input="allocate('inventory',$event)">
      <p>{{t('weatherRules')}}</p>
      <label for="investment">{{t('investment')}}: {{money(investment)}}</label><input id="investment" type="range" min="0" :max="Math.floor(cash-inventory)" step="1" :value="investment" @input="allocate('investment',$event)">
      <p>{{t('growthRules',{rate:(monthlyGrowth*100).toFixed(3)})}}</p>
      <p>{{t('safe')}}: <strong>{{money(remaining)}}</strong> · {{t('noInterest')}}</p>
      <button @click="advance">{{t('advance',{month:Math.min(month+1,10)})}}</button>
    </fieldset>
    <section v-if="report" aria-live="polite"><h2>{{t('bill',{month})}}</h2><p>{{t(report.rainy?'rain':'sun',{rate:(report.roi*100).toFixed(1)})}}</p><p>{{t('profit')}}: {{money(report.business)}} · {{t('growth')}}: {{money(report.growth)}}</p><p>{{t('inflation')}}: {{money(report.inflation)}} ({{t('inflationNote')}})</p></section>
    <figure><figcaption>{{t('chart')}}</figcaption><svg viewBox="0 0 620 280" role="img" :aria-label="t('chartAria')">
      <line x1="80" y1="35" x2="80" y2="230" stroke="#94a3b8"/><line x1="80" y1="230" x2="580" y2="230" stroke="#94a3b8"/>
      <text x="0" y="45">{{money(bounds.max)}}</text><text x="0" y="230">{{money(bounds.min)}}</text>
      <text v-for="m in [0,2,4,6,8,10]" :key="m" :x="80+m*49" y="260">{{m}}</text>
      <polyline :points="points('nominal')" stroke="#0369a1"/><polyline :points="points('real')" stroke="#15803d"/><polyline :points="points('baseline')" stroke="#9a3412" stroke-dasharray="7 5"/>
    </svg><p>🔵 {{t('nominal')}}　🟢 {{t('real')}}　🟠 {{t('baseline')}}</p></figure>
    <details><summary>{{t('data')}}</summary><div class="table-wrap"><table><thead><tr><th>{{t('month')}}</th><th>{{t('nominal')}}</th><th>{{t('real')}}</th><th>{{t('baseline')}}</th></tr></thead><tbody><tr v-for="p in history" :key="p.month"><td>{{p.month}}</td><td>{{money(p.nominal)}}</td><td>{{money(p.real)}}</td><td>{{money(p.baseline)}}</td></tr></tbody></table></div></details>
    <section v-if="done" class="result" aria-live="polite"><h2>{{t('complete')}}</h2><p>{{t('total')}} {{money(total)}} · ROI {{((total/INITIAL-1)*100).toFixed(2)}}%</p><p>{{t('real')}} {{money(history[10].real)}}; {{t('compare')}} {{money(history[10].real-history[10].baseline)}}.</p><p>{{t('lesson')}}</p></section>
    <button class="reset" @click="reset">{{t('reset')}}</button>
  </section>
</template>

<style scoped>
.finance{color:#164e63}.note{background:#fff7ed;padding:16px;border-radius:12px}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.stats p{background:#ecfdf5;padding:16px;border-radius:16px;margin:0}.stats strong{display:block;font-size:1.4rem}fieldset{border:1px solid #a7d6cb;border-radius:16px;padding:20px;margin-top:24px}label{display:block;font-weight:700}input{width:100%;height:44px;accent-color:#0f766e}button{min-height:44px;border:0;border-radius:12px;padding:12px 20px;color:white;background:#0f766e;cursor:pointer}button:disabled{opacity:.5;cursor:default}.reset{margin-top:24px}svg{width:100%}polyline{fill:none;stroke-width:3}text{font-size:13px;fill:#334155}figure{margin:24px 0}summary{min-height:44px;cursor:pointer}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #cbd5e1}.result{background:#dcfce7;padding:20px;border-radius:16px}
</style>
