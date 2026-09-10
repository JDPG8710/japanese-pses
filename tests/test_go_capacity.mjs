import assert from 'node:assert/strict';
import { goHarness } from './go-harness.mjs';
import { capacityConfig } from '../worker/go-capacity.mjs';
const {mf}=await goHarness();const origin='http://localhost:4173';let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
try {
  async function api(path,body,cookie,ip='capacity-test') {
    const r=await mf.dispatchFetch(`${origin}/api/arena/${path}`,{method:'POST',headers:{origin,cookie:cookie||'','content-type':'application/json','cf-connecting-ip':ip},body:JSON.stringify(body)});
    return {status:r.status,retry:r.headers.get('retry-after'),cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};
  }
  const cookies=await Promise.all(Array.from({length:12},async(_,i)=>(await api('identity',{},'',`id-${i}`)).cookie));
  const hard=await Promise.all(cookies.slice(0,5).map(c=>api('rooms',{mode:'ai',difficulty:'hard'},c)));
  check(hard.filter(r=>r.status===200).length===4,'atomic weighted capacity accepts four hard rooms');
  check(hard.filter(r=>r.status===503&&r.data.error==='AI_BUSY'&&r.retry==='60').length===1,'overload rejected with retry hint');
  const accepted=hard.findIndex(r=>r.status===200),r=hard[accepted].data;
  check((await api('rooms',{mode:'ai'},cookies[accepted])).data.error==='AI_ALREADY_ACTIVE','one active AI room per identity');
  check((await api('rooms',{mode:'invite'},cookies[8])).status===200,'human rooms unaffected at AI capacity');
  await api(`rooms/${r.id}`,{type:'cancel',revision:r.revision},cookies[accepted]);
  check((await api('rooms',{mode:'ai',difficulty:'hard'},cookies[9])).status===200,'cancel frees weighted reservation');
  const storage=await mf.unsafeGetDurableObjectStorage('go-backend','GoLobby',{name:'ai-capacity:v1'});
  await storage.exec('UPDATE ai_leases SET expires=0');
  const easy=await Promise.all(cookies.map((c,i)=>api('rooms',{mode:'ai',difficulty:'easy'},c,`easy-${i}`)));
  check(easy.filter(r=>r.status===200).length===8,'global room count caps cheap games too');
  check(easy.filter(r=>r.data.error==='AI_BUSY').length===4,'no concurrent oversubscription');
  await mf.unsafeEvictDurableObject('go-backend','GoLobby',{name:'ai-capacity:v1'});
  check((await api('rooms',{mode:'ai'},cookies[11])).status!==200,'capacity survives eviction');
  await storage.exec('UPDATE ai_leases SET expires=0');
  const ns=await mf.getDurableObjectNamespace('GO_LOBBY'),gate=ns.getByName('ai-capacity:v1');
  await gate.reportAI(300);
  check((await api('rooms',{mode:'ai'},cookies[11])).data.error==='AI_BUSY','slow move opens admission circuit');
  await storage.exec("UPDATE entries SET expires=0 WHERE key='ai-cooldown'");
  check((await api('rooms',{mode:'ai'},cookies[11])).status===200,'expired circuit and leases allow recovery');
  check(capacityConfig({GO_AI_MAX_ROOMS:'0'}).rooms===0,'zero disables new AI games');
  check(capacityConfig({GO_AI_MAX_UNITS:'invalid'}).units===0,'bad config fails closed');
  console.log(`Go capacity: ${checks} checks passed.`);
}finally{await mf.dispose();}
