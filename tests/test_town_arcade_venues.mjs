import assert from 'node:assert/strict';
import {TOWN_BUILDINGS,CASUAL_ARCADE_IDS,buildingAt} from '../src/town/TownBuildings.mjs';
import {canWalk,findPath,newState} from '../src/town/TownRules.mjs';
import {ARCADE_IDS} from '../src/arcade/ArcadeHub.mjs';
import {arcadeText} from '../src/arcade/ArcadeText.mjs';
import {MODES} from '../src/town/ArcadeRules.mjs';

assert.deepEqual([...CASUAL_ARCADE_IDS].sort(),[...ARCADE_IDS].sort());
for(const id of ARCADE_IDS)assert.ok(!MODES.includes(id),'casual ids must not join educational MODES');
for(const locale of ['zh','en','ja']){
  const t=arcadeText(locale);
  for(const id of ARCADE_IDS)assert.ok(t.games[id].title&&t.games[id].blurb);
}
const casual=TOWN_BUILDINGS.filter(b=>CASUAL_ARCADE_IDS.includes(b.id));
assert.equal(casual.length,4);
const eduZ=TOWN_BUILDINGS.filter(b=>!CASUAL_ARCADE_IDS.includes(b.id)).map(b=>b.z);
assert.ok(eduZ.every(z=>z===22));
assert.ok(!casual.every(b=>b.z===22),'arcade buildings must leave the educational row');
const start=newState().player;
for(const b of casual){
  const approach={x:b.x*25+550,y:(b.z-2)*25+380};
  assert.ok(canWalk(approach.x,approach.y),b.id+' approach walkable');
  assert.equal(buildingAt(b.x,b.z-1.2).id,b.id);
  assert.ok(findPath(start,approach).length>0,b.id+' path from spawn');
}
console.log('ok - arcade venues wired outside MODES with zh/en/ja copy and paths');
