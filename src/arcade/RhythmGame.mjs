import {sphereMesh,boxMesh} from './Arcade3D.mjs';
import {createKidsStage,KID_COLORS,KID_SYMBOLS,seeded,kidScale} from './KidsArcade.mjs';
export const RHYTHM_DIFFICULTY=Object.freeze({lives:4,notes:10,interval:1.5,window:.48});
export function createRhythmGame({canvas,onHud,onEnd,audio=null,locale='en',difficulty,seed=1,autoStart=true}={}){
 const scale=kidScale(difficulty),D={...RHYTHM_DIFFICULTY,notes:10+Math.ceil(scale*14),interval:1.5-scale*.43,window:.48-scale*.15};
 let rng,notes=[],clock=0,score=0,lives=4,hits=0,ended=false,flash=-1,flashTime=0;
 let hitLine;
 const meshes=[],pads=[],stage=createKidsStage({canvas,count:4,locale,onPress:press,tick,draw,clear:0x28244b});
 if(stage.gl.ok){for(let i=0;i<4;i++){const p=boxMesh(2.5,.4,2,KID_COLORS[i]);p.position.set((i-1.5)*3,0,0);stage.gl.scene.add(p);pads.push(p);const m=sphereMesh(.5,KID_COLORS[i]);m.visible=false;stage.gl.scene.add(m);meshes.push(m);}hitLine=boxMesh(13,.08,.1,0xffffff);hitLine.position.y=.35;stage.gl.scene.add(hitLine);}
 const text={zh:['等音符落到白线，再敲对应鼓！','好节奏！'],en:['Tap the matching drum when its note reaches the white line!','Nice beat!'],ja:['おとが しろい せんに きたら おなじ ドラムを たたこう！','いい リズム！']}[locale]||['Tap at the white line!','Nice beat!'];
 function hud(){onHud?.({score,lives,extra:`${hits}/${D.notes}`});const next=notes.find(n=>!n.done);stage.message(flashTime>0?text[1]:`${text[0]}${next?' '+KID_SYMBOLS[next.lane]:''}`);}
 function press(index){if(!stage.running||ended||!Number.isInteger(index)||index<0||index>3)return false;const note=notes.find(n=>!n.done&&n.lane===index&&Math.abs(n.at-clock)<=D.window);if(note){note.done=true;hits++;score+=Math.abs(note.at-clock)<D.window*.45?20:10;flash=index;flashTime=.25;audio?.correct?.();if(hits>=D.notes)finish(true);hud();return true;}lives--;audio?.error?.();if(lives<=0)finish(false);hud();return false;}
 function finish(cleared){if(ended)return;ended=true;stage.pause();onEnd?.({cleared,score,detail:`${hits}/${D.notes}`});}
 function tick(dt){if(!stage.running||ended||!Number.isFinite(dt)||dt<=0)return;clock+=Math.min(dt,.1);flashTime=Math.max(0,flashTime-dt);for(const n of notes){if(!n.done&&clock>n.at+D.window){n.done=true;lives--;if(lives<=0){finish(false);break;}}}if(!ended&&notes.every(n=>n.done))finish(hits>=D.notes);hud();}
 function draw(){const lineY=stage.playY(.85);if(hitLine)hitLine.position.y=lineY;for(let lane=0;lane<meshes.length;lane++){const n=notes.find(n=>!n.done&&n.lane===lane&&n.at-clock<3),m=meshes[lane];m.visible=!!n;if(n)m.position.set((lane-1.5)*3,lineY+(n.at-clock)*2,0);pads[lane].position.y=lineY-.3;pads[lane].scale.y=flash===lane&&flashTime>0?1.6:1;}stage.highlight(flashTime>0?flash:-1);}
 function start(){rng=seeded(seed);clock=score=hits=0;lives=4;ended=false;notes=Array.from({length:D.notes+3},(_,i)=>({lane:Math.floor(rng()*4),at:2+i*D.interval,done:false}));stage.resume();hud();stage.render();}
 function resume(){if(!ended)stage.resume();}
 if(autoStart)start();
 return {start,pause:stage.pause,resume,destroy:stage.destroy,tick,draw:stage.render,press,getState:()=>({game:'rhythm',score,lives,hits,clock,notes:notes.map(n=>({...n})),ended,difficulty:D,gl:stage.gl.ok})};
}
