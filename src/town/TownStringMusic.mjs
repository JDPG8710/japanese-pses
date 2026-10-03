// One decoded, gapless loop routed through the existing BGM/mute gain.
export const STRING_MUSIC_URL=new URL('../../assets/audio/piko-town-strings.mp3',import.meta.url);
const RATES={town:1,course:1.04,race:1.12,breakout:1.07,fruit:1.06,ninja:.98,bubble:1.03,rhythm:1};
export function createTownStringMusic(getContext,getDestination){
 let buffer=null,loading=null,source=null,gain=null,theme='town',offset=0,started=0,rate=1,wanted=false,disposed=false,revision=0;
 async function load(ctx){
  if(buffer)return buffer;
  if(!loading)loading=fetch(STRING_MUSIC_URL).then(r=>{if(!r.ok)throw Error('Town music unavailable');return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).then(b=>{if(!disposed)buffer=b;return b;}).catch(()=>null).finally(()=>{loading=null;});
  return loading;
 }
 function stop(reset=false){
  revision++;const ctx=getContext();
  if(source){
   offset=buffer?(offset+Math.max(0,ctx.currentTime-started)*rate)%buffer.duration:0;
   const old=source,oldGain=gain;source=null;gain=null;
   oldGain.gain.cancelScheduledValues(ctx.currentTime);oldGain.gain.setValueAtTime(oldGain.gain.value,ctx.currentTime);oldGain.gain.linearRampToValueAtTime(0,ctx.currentTime+.08);
   old.onended=()=>{old.disconnect();oldGain.disconnect();};try{old.stop(ctx.currentTime+.09);}catch{old.disconnect();oldGain.disconnect();}
  }
  if(reset)offset=0;
 }
 async function play(id='town'){
  if(disposed)return;
  if(theme===id&&wanted&&(source||loading))return;
  const changed=theme!==id;stop(changed);theme=id;wanted=true;
  const ctx=getContext();if(!ctx)return;
  const ticket=revision,b=await load(ctx);
  if(!b||disposed||!wanted||ticket!==revision)return;
  rate=RATES[id]||1;source=ctx.createBufferSource();gain=ctx.createGain();
  source.buffer=b;source.loop=true;source.playbackRate.value=rate;source.connect(gain);gain.connect(getDestination(ctx));
  gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.62,ctx.currentTime+.35);
  started=ctx.currentTime;source.start(started,offset%b.duration);
 }
 return {play,pause(){wanted=false;stop();},stop(){wanted=false;stop(true);},destroy(){wanted=false;disposed=true;stop(true);buffer=null;},get active(){return wanted&&(!!source||!!loading);}};
}
