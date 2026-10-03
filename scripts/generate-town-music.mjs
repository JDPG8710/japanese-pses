// Original Piko score and deterministic ensemble synthesis; no external recordings.
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rate=44100,bpm=108,beat=60/bpm,bars=32,duration=bars*4*beat,length=Math.round(duration*rate);
const left=new Float32Array(length),right=new Float32Array(length),events=[];
const chords=[
 [48,52,55],[43,47,50],[45,48,52],[40,43,47],[41,45,48],[48,52,55],[38,41,45],[43,47,50],
 [48,52,55],[43,47,50],[45,48,52],[40,43,47],[41,45,48],[38,41,45],[43,47,50],[48,52,55],
 [53,57,60],[52,56,59],[45,48,52],[43,47,50],[41,45,48],[38,41,45],[43,47,50],[43,47,50],
 [48,52,55],[43,47,50],[45,48,52],[40,43,47],[41,45,48],[38,41,45],[43,47,50],[43,47,50]
];
// A / A variation / B / A return. Each row is four beats, with deliberate breathing spaces.
const melody=[
 [[72,1],[76,.5],[79,.5],[76,1],[74,1]],[[71,1],[74,1],[79,1.5],[77,.5]],
 [[76,.75],[79,.25],[81,1],[79,1],[76,1]],[[74,1],[71,1],[67,1],[0,1]],
 [[69,1],[72,.5],[77,.5],[76,1],[72,1]],[[67,.5],[72,.5],[76,1],[79,1],[76,1]],
 [[74,1],[77,1],[76,.5],[74,.5],[72,1]],[[71,1],[74,1],[79,1],[0,1]],
 [[72,.5],[74,.5],[76,1],[79,1],[84,1]],[[83,1],[79,.5],[77,.5],[74,1],[71,1]],
 [[81,1],[79,.5],[76,.5],[72,1],[76,1]],[[79,1.5],[76,.5],[74,1],[71,1]],
 [[77,1],[76,.5],[72,.5],[69,1],[72,1]],[[74,1],[77,1],[81,1],[77,1]],
 [[79,1],[77,.5],[74,.5],[71,1],[74,1]],[[76,1],[72,2],[0,1]],
 [[81,1.5],[79,.5],[77,1],[72,1]],[[80,1],[76,1],[71,1],[76,1]],
 [[81,.5],[84,.5],[83,1],[81,1],[76,1]],[[79,1],[74,1],[71,1],[0,1]],
 [[77,.5],[79,.5],[81,1],[79,1],[77,1]],[[74,1],[77,1],[81,1.5],[79,.5]],
 [[77,1],[74,.5],[71,.5],[74,1],[79,1]],[[74,2],[0,1],[67,.5],[71,.5]],
 [[72,1],[76,.5],[79,.5],[84,1],[79,1]],[[83,1],[79,1],[77,.5],[74,.5],[71,1]],
 [[81,.75],[79,.25],[76,1],[72,1],[76,1]],[[79,1],[76,1],[74,1],[71,1]],
 [[77,1],[76,.5],[72,.5],[69,1],[72,1]],[[74,1],[77,.5],[81,.5],[77,1],[74,1]],
 [[79,1],[77,.5],[74,.5],[71,1],[74,1]],[[71,1],[74,1],[79,1],[0,1]]
];
function add(bar,at,note,beats,voice,volume,pan){if(note)events.push({time:(bar*4+at)*beat,note,duration:beats*beat,voice,volume,pan});}
for(let bar=0;bar<bars;bar++){
 const chord=chords[bar];let at=0;
 for(const [n,d]of melody[bar]){add(bar,at,n,d*.91,'violin',.105,-.18);at+=d;}
 chord.slice(1).forEach((n,i)=>add(bar,.03,n+12,3.75,'viola',.041,.18+i*.12));
 add(bar,0,chord[0]-12,1.72,'cello',.082,-.08);add(bar,2,chord[0]-5,1.65,'cello',.058,.08);
 // Pizzicato offbeats make walking feel playful, without a heavy drum loop.
 for(let i=0;i<8;i++)add(bar,i*.5+.02,chord[[0,2,1,2,0,1,2,1][i]]+12,.36,'pizz',bar>=16&&bar<24?.031:.045,.4);
 if(bar>=8&&bar<16||bar>=24){add(bar,1,chord[1]+24,.65,'violin',.021,.4);add(bar,3,chord[2]+24,.65,'violin',.021,.4);}
}
const tableSize=8192,tables={};
for(const voice of ['violin','viola','cello','pizz']){
 const table=new Float32Array(tableSize+1);
 for(let i=0;i<=tableSize;i++){let value=0;for(let h=1;h<=12;h++)value+=Math.sin(2*Math.PI*h*i/tableSize)*(h===1?1:Math.exp(-h*(voice==='cello'?.22:voice==='pizz'?.38:.3))/Math.pow(h,.72));table[i]=value*.65;}tables[voice]=table;
}
for(let index=0;index<events.length;index++){
 const event=events[index],pizz=event.voice==='pizz',attack=pizz?.004:event.voice==='cello'?.11:.065,release=pizz?.12:.18;
 const count=Math.ceil((event.duration+release)*rate),start=Math.round(event.time*rate),table=tables[event.voice];
 const players=pizz?1:3;
 for(let player=0;player<players;player++){
  const frequency=440*2**((event.note-69+(player-1)*.055)/12),pan=Math.max(-.9,Math.min(.9,event.pan+(player-1)*.13));
  const lg=Math.cos((pan+1)*Math.PI/4)*event.volume/Math.sqrt(players),rg=Math.sin((pan+1)*Math.PI/4)*event.volume/Math.sqrt(players);
  let phase=(index*.137+player*.31)%1;
  for(let i=0;i<count;i++){
   const t=i/rate,env=pizz?(1-Math.exp(-t/.002))*Math.exp(-t/.115):Math.min(1,t/attack)*Math.min(1,Math.max(0,(event.duration+release-t)/release))*(.92+.08*Math.sin(t*4.3+index));
   const vibrato=pizz?0:.0025*Math.sin(2*Math.PI*(5.1+player*.24)*t+player*2.1)*Math.min(1,t/.3);
   phase=(phase+frequency*(1+vibrato)/rate)%1;const x=phase*tableSize,j=Math.floor(x),value=(table[j]+(table[j+1]-table[j])*(x-j))*env;
   const pos=(start+i)%length;left[pos]+=value*lg;right[pos]+=value*rg;
  }
 }
}
// Circular room reflections preserve reverb tails across the exact musical loop boundary.
const dryL=left.slice(),dryR=right.slice();
for(const [seconds,gain]of [[.071,.16],[.113,.12],[.173,.10],[.293,.075],[.419,.05],[.613,.035]]){
 const delay=Math.round(seconds*rate);let lp=0,rp=0;
 for(let i=0;i<length+delay;i++){const p=(i-delay*2+length)%length;lp=lp*.6+dryR[p]*.4;rp=rp*.6+dryL[p]*.4;if(i>=delay){const out=i-delay;left[out]+=lp*gain;right[out]+=rp*gain;}}
}
let peak=0,sum=0;for(let i=0;i<length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sum+=left[i]**2+right[i]**2;}
const normalization=.82/peak,wav=Buffer.alloc(44+length*4);
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*4,40);
for(let i=0;i<length;i++){wav.writeInt16LE(Math.round(left[i]*normalization*32767),44+i*4);wav.writeInt16LE(Math.round(right[i]*normalization*32767),46+i*4);}
await mkdir(path.join(root,'.wrangler/town-music'),{recursive:true});await mkdir(path.join(root,'assets/audio'),{recursive:true});
await writeFile(path.join(root,'.wrangler/town-music/piko-town-strings.wav'),wav);
await writeFile(path.join(root,'assets/audio/piko-town-strings.json'),JSON.stringify({title:'Piko — A Stroll Through Town',composer:'Original procedural Piko score',instrumentation:'Synthesized violin ensemble, viola, cello and pizzicato strings',bpm,bars,duration,sampleRate:rate,peak:.82,rms:Math.sqrt(sum/(length*2))*normalization,events:events.length,sections:['A','A variation','B','A return'],license:'Original project asset; no third-party samples'},null,2)+'\n');
console.log(`Rendered ${duration.toFixed(3)}s original string ensemble, ${events.length} notes, peak -1.72 dBFS`);
