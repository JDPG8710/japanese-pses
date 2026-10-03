import { createApp, ref, watchEffect } from 'vue';
import {locale,t} from './locale';
import WaterFlowPuzzle from './WaterFlowPuzzle.vue';
import FinanceTycoonSimulator from './FinanceTycoonSimulator.vue';
createApp({components:{WaterFlowPuzzle,FinanceTycoonSimulator},setup(){
  watchEffect(()=>{
    document.documentElement.lang=locale.value==='zh'?'zh-Hans':locale.value;
    document.title=`${t('title')} · Piko Game`;
    document.querySelector('#explorers-home')!.textContent=`✳ Piko Game · ${t('home')}`;
    document.querySelector('#explorers-intro')!.textContent=t('intro');
    document.querySelector('#explorers-footer')!.textContent=t('footer');
    const q=new URLSearchParams(location.search);q.set('lang',locale.value);history.replaceState(null,'',`${location.pathname}?${q}${location.hash}`);
  });
  return {locale,t,tab:ref(location.hash==='#finance'?'finance':'water')};
},template:`<label class="explorers-language">{{t('language')}} <select v-model="locale" id="explorers-language"><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select></label><nav :aria-label="t('nav')"><button :aria-pressed="tab==='water'" @click="tab='water'">💧 {{t('water')}}</button><button :aria-pressed="tab==='finance'" @click="tab='finance'">🍋 {{t('finance')}}</button></nav><KeepAlive><WaterFlowPuzzle v-if="tab==='water'"/><FinanceTycoonSimulator v-else/></KeepAlive>`}).mount('#explorers');
