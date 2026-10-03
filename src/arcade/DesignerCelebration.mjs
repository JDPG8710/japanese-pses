import * as THREE from '../town/vendor/three.module.js';
/** Animate the child's existing assembly, never a replacement stock model. */
export function prepareCelebration(scene,model,category){
 const radius=model.userData.radius,environment=new THREE.Group(),effects=[],states=model.children.map(part=>({part,pos:part.position.clone(),rot:part.rotation.clone(),scale:part.scale.clone()})),base={pos:model.position.clone(),rot:model.rotation.clone(),scale:model.scale.clone()};scene.add(environment);
 const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.8,transparent:true,opacity:.8});
 if(['car','boat','robot','building','mechanical'].includes(category)){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(radius*5,radius*3),material(category==='boat'?'#5fb2ce':category==='car'?'#52616f':'#bacfbc'));floor.rotation.x=-Math.PI/2;const box=new THREE.Box3().setFromObject(model);floor.position.y=box.min.y-.08;environment.add(floor);
  if(category==='car'||category==='boat')for(let i=0;i<12;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(radius*.25,.008,category==='car'?.04:.015),material(category==='car'?'#fff3c6':'#d3f7ff'));mark.position.set((i-6)*radius*.5,floor.position.y+.01,category==='car'?0:(i%3-1)*radius*.4);mark.userData.x=mark.position.x;environment.add(mark);effects.push(mark);}
 }
 if(category==='rocket')for(const state of states){if(!/^(engine|nozzle-\d)$/.test(state.part.userData.partId))continue;const flame=new THREE.Mesh(new THREE.CylinderGeometry(.22,0,.85,24),new THREE.MeshBasicMaterial({color:'#ffad45',transparent:true,opacity:.9}));flame.position.y=-.65;state.part.add(flame);effects.push(flame);}
 if(category==='plane')for(let i=0;i<8;i++){const cloud=new THREE.Mesh(new THREE.SphereGeometry(radius*.06,12,8),material('#ffffff'));cloud.position.set((i-4)*radius*.6,-radius*.3,(i%3-1)*radius*.4);cloud.scale.x=2;cloud.userData.x=cloud.position.x;environment.add(cloud);effects.push(cloud);}
 const glowing=[];model.traverse(m=>{if(m.isMesh&&m.material?.isMeshStandardMaterial&&/window|screen|lamp|headlight|lens/.test(m.parent?.userData.partId||'')){glowing.push({material:m.material,color:m.material.emissive.clone(),intensity:m.material.emissiveIntensity});}});
 function frame(seconds,progress){
  model.position.copy(base.pos);model.rotation.copy(base.rot);model.scale.copy(base.scale);
  if(category==='car'||category==='boat'||category==='robot')model.position.x+=radius*(progress-.5)*.55;
  if(category==='boat'){model.rotation.z+=Math.sin(seconds*2)*.025;model.position.y+=Math.sin(seconds*3)*radius*.015;}
  if(category==='plane'){model.position.x+=radius*(progress-.5)*.45;model.position.y+=radius*.12+Math.sin(seconds*1.8)*radius*.06;model.rotation.x+=Math.sin(seconds*1.4)*.08;}
  if(category==='rocket'){model.position.y+=radius*progress*.6;model.scale.multiplyScalar(1-progress*.3);}
  if(category==='phone')model.rotation.y+=Math.sin(seconds*1.5)*.15;
  if(category==='robot')model.position.y+=Math.abs(Math.sin(seconds*5))*radius*.02;
  for(const state of states){const {part,pos,rot,scale}=state,id=part.userData.partId;part.position.copy(pos);part.rotation.copy(rot);part.scale.copy(scale);
   if(category==='car'&&/wheel/.test(id)&&id!=='spare')part.rotation.z-=seconds*6;
   if(category==='robot'&&/arm|leg|hand|foot/.test(id))part.rotation.z+=Math.sin(seconds*5+(id.endsWith('1')?Math.PI:0))*.2;
   if(part.userData.engineering){const n=Number(id.match(/(\d+)$/)?.[1]||0),phase=seconds*5+n*Math.PI*.65;if(/piston|rings|rod/.test(id)){const stroke=Math.sin(phase)*(/rod/.test(id)?.035:.075);part.position.y+=stroke*Math.cos(rot.x);part.position.z+=stroke*Math.sin(rot.x);if(/rod/.test(id))part.rotation.z+=Math.sin(phase)*.12;}if(/valve/.test(id)){const stroke=Math.max(0,Math.sin(phase))*.035;part.position.y+=stroke*Math.cos(rot.x);part.position.z+=stroke*Math.sin(rot.x);}if(/crankshaft|cam-/.test(id))part.rotation.x+=seconds*5;}
   if(category==='building'&&/planter|garden/.test(id))part.scale.multiplyScalar(1+Math.sin(seconds*2)*.025);
  }
  for(const effect of effects){if(category==='rocket')effect.scale.y=1+Math.sin(seconds*24)*.18;else effect.position.x=((effect.userData.x-seconds*radius*.8+radius*3)%(radius*6)+radius*6)%(radius*6)-radius*3;}
  for(const glow of glowing){glow.material.emissive.set(category==='building'?'#f7cf81':'#5294b8');glow.material.emissiveIntensity=.08+(Math.sin(seconds*3)+1)*.1;}
 }
 function destroy(){model.position.copy(base.pos);model.rotation.copy(base.rot);model.scale.copy(base.scale);for(const s of states){s.part.position.copy(s.pos);s.part.rotation.copy(s.rot);s.part.scale.copy(s.scale);}for(const g of glowing){g.material.emissive.copy(g.color);g.material.emissiveIntensity=g.intensity;}if(category==='rocket')for(const e of effects){e.removeFromParent();e.geometry.dispose();e.material.dispose();}scene.remove(environment);environment.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 return {frame,destroy};
}
