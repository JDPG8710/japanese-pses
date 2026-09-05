import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PROFILES,defaultProfile,profileOptions,availableTasks,yearLabel,validateGradeRoute} from '../src/world/GradePaths.mjs';
import {TEXT} from '../src/world/WorldText.mjs';
assert.equal(PROFILES.CN63.years.length,6);assert.equal(PROFILES.CN54.years.length,5);
assert.equal(defaultProfile('CN'),'CN63');assert.equal(defaultProfile('GB'),null);assert.equal(defaultProfile('FR'),null);
assert.deepEqual(profileOptions('GB'),['ENG','SCT','WLS','NIR','INT']);
assert.ok(PROFILES.AU.years.includes('F'));assert.ok(PROFILES.US.years.includes('K'));assert.ok(PROFILES.NZ.years.includes('Y8'));assert.ok(PROFILES.SCT.years.includes('P7'));
assert.equal(yearLabel('Y1','zh'),'1年级');assert.equal(yearLabel('G1','en'),'Grade 1');assert.equal(yearLabel('P7','en'),'Primary 7');
assert.equal(availableTasks('CN54','Y6').length,0);assert.equal(availableTasks('US','Y1').length,0);
assert.equal(availableTasks('CN63','Y1','science').length,0);assert.deepEqual(availableTasks('CN63','Y1','language').map(t=>t.game),['order']);
assert.ok(availableTasks('CN63','Y6').every(t=>t.review));assert.deepEqual(availableTasks('US','K').map(t=>t.game),['circuit','set','order']);
for(const [profile,p]of Object.entries(PROFILES))for(const year of p.years)for(const task of availableTasks(profile,year)){
  const params=new URLSearchParams({curriculum:profile,year,game:task.game,level:String(task.level)});
  assert.ok(validateGradeRoute(params));params.set('level',String(3-task.level));assert.equal(validateGradeRoute(params),false);
}
assert.equal(validateGradeRoute(new URLSearchParams()),null);
assert.equal(validateGradeRoute(new URLSearchParams('curriculum=CN54&year=Y6&game=cafe&level=2')),false);
for(const locale of ['en','zh','ja']){
  const names=Object.values(TEXT[locale].games).map(game=>game[0]);assert.equal(new Set(names).size,8);
  assert.ok(names.every(Boolean));
}
const home=await readFile('src/location/CountryHome.mjs','utf8');assert.ok(home.includes('grades.html?country='));
const build=await readFile('scripts/build.mjs','utf8');assert.ok(build.includes("'grades.html'"));
console.log('Grade entries: regional school systems, invalid routes, skill filtering, foundation review and consistent game names passed.');
