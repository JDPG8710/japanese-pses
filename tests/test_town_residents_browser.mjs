import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startContentPreview} from '../scripts/preview-content.mjs';
const preview=process.env.TOWN_TEST_ORIGIN?{origin:process.env.TOWN_TEST_ORIGIN,close:async()=>{}}:await startContentPreview();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});await mkdir('.wrangler/town-controls',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(preview.origin+'/about');
 const result=await page.evaluate(async()=>{
  const version=(await(await fetch('/release.json')).json()).releaseId;
  const {THREE,disposeGroup}=await import('/src/town/Models3D.mjs?v='+version);
  const {TOWN_WORKERS,makeWorkingResident,animateWorkingResident,updateResidentSurprise}=await import('/src/town/TownResidents.mjs?v='+version);
  document.body.replaceChildren();document.body.style.cssText='margin:0;background:#d7edf2;';const canvas=document.createElement('canvas');canvas.id='residents';document.body.append(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1100,750);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xd7edf2);scene.add(new THREE.HemisphereLight(0xfff8e0,0x709b92,3));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-5,12,10);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(38,1100/750,.1,100);camera.position.set(10,13,21);camera.lookAt(0,1,0);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(22,16),new THREE.MeshStandardMaterial({color:0x9ac68b}));floor.rotation.x=-Math.PI/2;floor.position.y=-.05;scene.add(floor);
  const residents=TOWN_WORKERS.map((spec,i)=>{const r=makeWorkingResident(spec),group=new THREE.Group();group.add(r.mesh,r.station,r.effects);group.position.set(-spec.x+(i%3-1)*5,0,-spec.z+(Math.floor(i/3)-.5)*6);r.mesh.rotation.y=r.station.rotation.y=0;scene.add(group);return r;});
  const poses=residents.map(r=>r.mesh.userData.rightArm.rotation.x);for(let frame=0;frame<18;frame++){for(const r of residents){animateWorkingResident(r,frame/60);updateResidentSurprise(r,1/60,{player:{x:r.spec.x+1,y:0,z:r.spec.z}});}renderer.render(scene,camera);}
  const pixels=new Uint8Array(4*1100*750);renderer.getContext().readPixels(0,0,1100,750,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);let different=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<180&&pixels[i+1]<210)different++;
  const result={jobs:residents.map(r=>r.spec.job),effects:residents.map(r=>r.effects.visible),triggers:residents.map(r=>r.triggerCount),animated:residents.every((r,i)=>r.mesh.userData.rightArm.rotation.x!==poses[i]),different};
  window.cleanupResidents=()=>{disposeGroup(scene);renderer.dispose();renderer.forceContextLoss();};return result;
 });
 assert.equal(result.jobs.length,6);assert.ok(result.effects.every(Boolean));assert.ok(result.triggers.every(n=>n===1));assert.equal(result.animated,true);assert.ok(result.different>10000);await page.screenshot({path:'.wrangler/town-controls/residents.png'});await page.evaluate(()=>window.cleanupResidents());assert.deepEqual(errors,[]);console.log('Residents WebGL: all six work stations and articulated poses render, all proximity surprises are visible, and renderer cleanup passed.');
}finally{await browser.close();await preview.close();}
