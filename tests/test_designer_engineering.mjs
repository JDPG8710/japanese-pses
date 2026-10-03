import assert from 'node:assert/strict';
import {ENGINE_COUNTS,engineComponents,drawingComponent} from '../src/arcade/DesignerEngineering.mjs';
import {DESIGN_KITS} from '../src/arcade/DesignerCatalog.mjs';
import {createDesignModel} from '../src/arcade/Designer3D.mjs';
import {createBubbleGame} from '../src/arcade/BubbleGame.mjs';
import {createStubCanvas} from '../src/arcade/ArcadeShell.mjs';
for(const n of ENGINE_COUNTS){
 const parts=engineComponents(n);assert.equal(parts.filter(p=>/-piston-\d+$/.test(p.id)).length,n);assert.equal(parts.filter(p=>/-spark-\d+$/.test(p.id)).length,n);assert.equal(parts.filter(p=>/-valve-/.test(p.id)).length,n*2);assert.equal(new Set(parts.map(p=>p.id)).size,parts.length);assert.ok(parts.length>n*9);assert.ok(parts.every(p=>!p.required&&p.names.zh&&p.names.en&&p.names.ja));
 if(n>=6)assert.ok(parts.some(p=>p.bankAngle>0)&&parts.some(p=>p.bankAngle<0));
 const model=createDesignModel(DESIGN_KITS.sport,parts);assert.equal(model.userData.partCount,parts.length);
}
const drawing=drawingComponent([{color:'#3887b0',size:4,points:[{x:1,y:2},{x:10,y:20},{x:20,y:2}]}]);assert.equal(drawing.kind,'drawing');assert.ok(drawing.w>20);const dm=createDesignModel(DESIGN_KITS.sport,[drawing]);assert.ok(dm.children[0].children.some(m=>m.geometry.type==='TubeGeometry'));
const erased=drawingComponent([{color:'#3887b0',size:4,points:[{x:0,y:0},{x:40,y:0}]},{erase:true,size:10,points:[{x:20,y:-10},{x:20,y:10}]}]);assert.equal(erased.ink.length,2);assert.ok(erased.ink.every(s=>s.points.every(p=>Math.abs(p.x+erased.x-20)>=7)));assert.equal(drawingComponent([{color:'#3887b0',size:4,points:[{x:0,y:0},{x:5,y:0}]},{erase:true,size:20,points:[{x:0,y:0},{x:5,y:0}]}]),null);
for(const kit of Object.values(DESIGN_KITS)){
 const model=createDesignModel(kit,kit.parts,{demo:true});if(kit.category!=='phone')assert.ok(model.children.some(p=>p.userData.mirrored)||kit.category==='plane');
 if(kit.category==='plane'){const a=model.children.find(p=>p.userData.partId==='engine-a'),b=model.children.find(p=>p.userData.partId==='engine-b');assert.equal(a.position.x,b.position.x);assert.equal(a.position.y,b.position.y);assert.equal(a.position.z,-b.position.z);assert.equal(a.children[0].geometry.parameters.radiusTop,b.children[0].geometry.parameters.radiusTop);}
 const isolated=kit.parts.find(p=>p.kind==='window'||p.kind==='door'||p.kind==='face'||p.kind==='lens');if(isolated&&kit.category!=='phone'){const pair=createDesignModel(kit,[{...isolated,placed:true}]);assert.equal(pair.children.length,2);assert.equal(pair.children[0].position.z,-pair.children[1].position.z);}
}
const game=createBubbleGame({canvas:createStubCanvas()});game.placePart('fuselage',-200,800);assert.equal(game.getState().parts[0].x,-200);game.transformPart('depth',.8);assert.equal(game.getState().parts[0].depthPosition,.8);game.duplicatePart();assert.equal(game.getState().parts.at(-1).required,false);game.undo();assert.equal(game.getState().parts.length,19);for(const n of ENGINE_COUNTS)game.addEngine(n);assert.ok(game.getState().parts.length>400);game.selectProject('pro');game.selectProject('airliner');assert.ok(game.getState().parts.length>400);game.destroy();
console.log('Engineering: 3/4/6/8/12 cylinders and V banks, independent components, arbitrary placement/depth, unlimited repeated assemblies, duplication/undo/drafts, drawn geometry and symmetric layouts passed');
