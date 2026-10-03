import {sphereMesh,boxMesh,THREE,spawnParticleBurst,updateParticles} from './Arcade3D.mjs';
import {createKidsStage,KID_COLORS,KID_SYMBOLS,seeded,kidScale} from './KidsArcade.mjs';
export const BUBBLE_DIFFICULTY=Object.freeze({lives:3,targets:8,responseSeconds:6});
export function createBubbleGame({canvas,onHud,onEnd,audio=null,locale='en',difficulty,seed=1,autoStart=true}={}){
 const scale=kidScale(difficulty),D={...BUBBLE_DIFFICULTY,targets:8+Math.ceil(scale*12),responseSeconds:6-scale*2.5};
 let rng,colors=[],target=0,hits=0,lives=3,score=0,remaining=0,ended=false,clock=0,flash=-1,flashTime=0;
 let particles=[];
 const meshes=[],stage=createKidsStage({canvas,count:6,locale,onPress:press,tick,draw,clear:0x184963});
 if(stage.gl.ok){for(let i=0;i<6;i++){const m=sphereMesh(.8,KID_COLORS[i],{roughness:.16});m.position.set((i%3-1)*3.6,4-Math.floor(i/3)*3,0);stage.gl.scene.add(m);meshes.push(m);}const floor=boxMesh(18,.3,6,0x348677);floor.position.y=-2;stage.gl.scene.add(floor);}
 const text={zh:['寻找','戳破泡泡','再看看图案哦'],en:['Find','Pop the bubble','Look at the shape again'],ja:['さがそう','あわを わろう','かたちを もういちど みよう']}[locale]||['Find','Pop the bubble','Look again'];
 function hud(){onHud?.({score,lives,extra:`${hits}/${D.targets} · ${Math.ceil(remaining)}s`});stage.message(`${text[0]} ${KID_SYMBOLS[target]} · ${text[1]} · ${hits}/${D.targets}`);}
 function next(){colors=Array.from({length:6},(_,i)=>i);for(let i=5;i;i--){const j=Math.floor(rng()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}target=colors[Math.floor(rng()*6)];remaining=D.responseSeconds;for(let i=0;i<meshes.length;i++){const m=meshes[i];for(const child of [...m.children]){child.material?.map?.dispose();child.material?.dispose();m.remove(child);}const c=canvas.ownerDocument.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.font='bold 82px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#102a40';ctx.fillText(KID_SYMBOLS[colors[i]],64,66);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));sprite.scale.set(1,1,1);sprite.position.z=.9;m.add(sprite);}hud();}
 // Pads are stable shape keys; floating spheres are shuffled every turn.
 function press(index){if(ended||!stage.running||!Number.isInteger(index)||index<0||index>5)return false;flash=index;flashTime=.25;if(index===target){if(stage.gl.ok){const mesh=meshes[colors.indexOf(index)];particles.push(...spawnParticleBurst(stage.gl.scene,mesh.position,{color:KID_COLORS[index],count:10,speed:3}));}hits++;score+=10+Math.ceil(remaining);audio?.correct?.();if(hits>=D.targets)finish(true);else next();return true;}lives--;audio?.error?.();remaining=D.responseSeconds;if(lives<=0)finish(false);else{hud();stage.message(text[2]+` · ${text[0]} ${KID_SYMBOLS[target]}`);}return false;}
 function finish(cleared){if(ended)return;ended=true;stage.pause();onEnd?.({cleared,score,detail:`${hits}/${D.targets}`});}
 function tick(dt){if(!stage.running||ended||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);clock+=dt;flashTime=Math.max(0,flashTime-dt);particles=updateParticles(particles,dt,stage.gl.scene);remaining-=dt;if(remaining<=0){lives--;if(lives<=0)finish(false);else next();}hud();}
 function draw(){for(let i=0;i<meshes.length;i++){const m=meshes[i],color=colors[i]??i;m.material.color.setHex(KID_COLORS[color]);m.position.y=stage.playY(i<3?.3:.7)+Math.sin(clock*1.8+i)*.18;m.scale.setScalar(flashTime>0&&flash===color?1.2:1);m.material.emissive.setHex(color===target?KID_COLORS[color]:0);m.material.emissiveIntensity=color===target?.25:0;}stage.highlight(flashTime>0?flash:-1);}
 function start(){rng=seeded(seed);hits=score=clock=0;lives=3;ended=false;next();stage.resume();stage.render();}
 function resume(){if(!ended)stage.resume();}
 function pointer(e){if(!stage.gl.ok||!stage.running||ended)return;const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),stage.gl.camera);const hit=ray.intersectObjects(meshes,false)[0];if(hit){e.preventDefault();press(colors[meshes.indexOf(hit.object)]);}}
 canvas?.addEventListener?.('pointerdown',pointer);
 function destroy(){canvas?.removeEventListener?.('pointerdown',pointer);stage.destroy();}
 if(autoStart)start();
 return {start,pause:stage.pause,resume,destroy,tick,draw:stage.render,press,getState:()=>({game:'bubble',score,lives,hits,target,remaining,ended,difficulty:D,gl:stage.gl.ok})};
}
