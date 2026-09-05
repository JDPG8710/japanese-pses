import assert from 'node:assert/strict';
import {PROFILES} from '../src/world/GradePaths.mjs';
import {JOURNEY_SUBJECTS,JAPAN_GRADE_STAGE_TOTALS,gameGateId,gateUrl,japanStageTarget,journeyFor,journeyProgressKey,journeyState,lessonGateId,nextGate,readJourneyScores} from '../src/world/GradeJourney.mjs';

let routes=0;
for(const [profile,definition] of Object.entries(PROFILES))for(const year of definition.years){
 const journey=journeyFor(profile,year);routes++;
 assert.equal(journey.length,japanStageTarget(profile,year),`${profile}/${year} must match the Japanese same-grade stage count`);
 assert.equal(new Set(journey.map(gate=>gate.id)).size,journey.length);
 assert.ok(journey.some(gate=>gate.kind==='lesson'&&gate.subject==='math'));
 assert.ok(journey.some(gate=>gate.kind==='lesson'&&gate.subject==='language'));
 assert.ok(journey.some(gate=>gate.kind==='lesson'&&gate.subject==='science'));
 for(const subject of JOURNEY_SUBJECTS){
  const gates=journey.filter(gate=>gate.subject===subject);if(!gates.length)continue;
  const initial=journeyState(profile,year,{},subject);assert.equal(initial[0].unlocked,true);
  assert.ok(initial.slice(1).every(gate=>!gate.unlocked));
  const firstDone={[initial[0].id]:800},advanced=journeyState(profile,year,firstDone,subject);
  if(advanced[1])assert.equal(advanced[1].unlocked,true);
  const next=nextGate(profile,year,initial[0].id,firstDone);assert.equal(next?.id,advanced[1]?.id);
 }
 for(const gate of journey){
  const url=new URL(gateUrl(gate,{profile,year,country:definition.country||'',locale:'en'}),'https://example.test');
  assert.equal(url.searchParams.get('curriculum'),profile);assert.equal(url.searchParams.get('year'),year);
  assert.equal(url.pathname,gate.kind==='lesson'?'/learn.html':'/world.html');
 }
}
const storage={getItem:key=>key.includes(lessonGateId('add20'))?null:key.includes('piko-foundation')?'900':key.includes(gameGateId('circuit'))?'810':null};
const scores=readJourneyScores(storage,'CN63','Y1','zh');
assert.equal(scores[lessonGateId('add20')],900);assert.equal(scores[gameGateId('circuit')],810);
assert.ok(journeyProgressKey('US','G1',gameGateId('circuit')).includes('piko-grade-journey-1'));
assert.ok(journeyFor('CN63','Y1','science').length>1);
assert.ok(journeyFor('CN63','Y1','science').every(gate=>gate.subject==='science'));
assert.equal(journeyFor('CN63','Y1').length,JAPAN_GRADE_STAGE_TOTALS[1]);
assert.equal(journeyFor('CN63','Y2').length,JAPAN_GRADE_STAGE_TOTALS[2]);
assert.equal(journeyFor('CN63','Y3').length,JAPAN_GRADE_STAGE_TOTALS[3]);
assert.equal(journeyFor('CN63','Y1','english')[0].cefr,'Pre-A1');
assert.deepEqual(journeyFor('CN54','Y6'),[]);
console.log(`Grade journeys: ${routes} regional year maps, ordered gates, unlocks, progress compatibility and links passed.`);
