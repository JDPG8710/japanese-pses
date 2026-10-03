import {THREE,makeAvatar,animateAvatar,label,disposeGroup} from './Models3D.mjs';
import {makeVehicle} from './TownVehicles.mjs';
const OUTFITS=['#ec825f','#509fd4','#9c82cf','#62a67a'];
const EMOTES={wave:'👋',happy:'😄',laugh:'😄',cheer:'🎉',dance:'🎵',heart:'❤️',star:'⭐',clap:'👏'};
/** Remote models are visual only: one player's network lag cannot block another. */
export function createTownRemotePlayers(scene){
 const group=new THREE.Group();group.name='online-players';scene.world.add(group);const people=new Map();let disposed=false;
 function remove(id){const p=people.get(id);if(!p)return;group.remove(p.root);disposeGroup(p.root);people.delete(id);}
 function sync(peers=[]){
  if(disposed)return;const ids=new Set();
  for(const data of peers.slice(0,12)){
   if(!data?.id||![data.x,data.y,data.z,data.heading].every(Number.isFinite))continue;ids.add(data.id);
   let p=people.get(data.id);const key=`${data.avatar}:${data.outfit}:${data.vehicle}`;
   if(p&&p.key!==key){remove(data.id);p=null;}
   if(!p){const root=new THREE.Group(),avatar=makeAvatar(data.avatar,null,data.outfit>0?OUTFITS[data.outfit]:undefined);root.add(avatar);let vehicle=null;if(['car','plane'].includes(data.vehicle)){vehicle=makeVehicle(data.vehicle);root.add(vehicle);avatar.scale.setScalar(.65);avatar.position.y=.6;}root.position.set(data.x,data.y,data.z);root.rotation.y=data.heading;group.add(root);p={root,avatar,vehicle,key,data,label:null,labelKey:''};people.set(data.id,p);}
   p.data={...data};
  }
  for(const id of people.keys())if(!ids.has(id))remove(id);
  scene.canvas.dataset.onlinePlayers=String(people.size);
 }
 function update(dt,clock){
  if(disposed)return;group.visible=!scene.mode;
  for(const p of people.values()){
   const d=p.data,dx=d.x-p.root.position.x,dz=d.z-p.root.position.z,moving=Math.hypot(dx,dz)>.025;
   p.root.position.lerp(new THREE.Vector3(d.x,d.y,d.z),Math.min(1,dt*12));
   const turn=Math.atan2(Math.sin(d.heading-p.root.rotation.y),Math.cos(d.heading-p.root.rotation.y));p.root.rotation.y+=turn*Math.min(1,dt*14);
   animateAvatar(p.avatar,clock,moving&&d.vehicle==='foot');
   const emote=d.emoteUntil>Date.now()?(EMOTES[d.emote]||''):'';
   if(emote==='🎵'&&!scene.nameMotion?.matches)p.avatar.rotation.z=Math.sin(clock*8)*.12;else p.avatar.rotation.z=0;
   if(p.vehicle){const pose=p.avatar.userData;pose.leftLeg.rotation.x=pose.rightLeg.rotation.x=-Math.PI/2;pose.leftArm.rotation.x=pose.rightArm.rotation.x=-.9;for(const wheel of p.vehicle.userData.wheels||[])if(moving)wheel.rotation.x+=dt*12;if(p.vehicle.userData.propeller)p.vehicle.userData.propeller.rotation.z+=dt*30;}
   const title=`${String(d.name||'Piko').slice(0,24)} ${d.game?'🎮 ':''}${emote}`;
   if(title!==p.labelKey){if(p.label){p.root.remove(p.label);p.label.material.map.dispose();p.label.material.dispose();}p.label=label(p.root,title,0,d.vehicle==='foot'?3.3:4,0,{width:5.5,size:36,color:'#194354',background:'#e4fff8'});p.labelKey=title;}
  }
 }
 function destroy(){if(disposed)return;disposed=true;for(const id of people.keys())remove(id);scene.world.remove(group);scene.canvas.dataset.onlinePlayers='0';}
 return {sync,update,destroy};
}
