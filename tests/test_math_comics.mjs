import assert from 'node:assert/strict';
import {COMICS,LESSON_COMICS,JAPAN_COMICS,diagram} from '../src/comics/MathComic.mjs';
for(const [id,c] of Object.entries(COMICS)){
 assert.equal(c.panels.length,4,id);assert.ok(c.answer>=0&&c.answer<c.choices.length);
 for(const locale of ['zh','ja','en']){assert.ok(c.title[locale]);for(const p of c.panels){assert.ok(p.title[locale]);assert.ok(p.text[locale]);assert.match(diagram(p.diagram),/<svg/);}}
}
const cells=type=>[...diagram(type).matchAll(/<rect /g)].length;
assert.equal(cells('area'),8);assert.equal(cells('areaTry'),6);
assert.equal(cells('layers1'),6);assert.equal(cells('layers2'),12);assert.equal(cells('layers3'),18);
assert.equal(cells('percent25'),100);assert.equal((diagram('percent25').match(/fill="#8fd6c7"/g)||[]).length,25);
assert.equal((diagram('percent50').match(/fill="#8fd6c7"/g)||[]).length,50);
assert.equal(cells('twoquarters'),4);assert.equal(cells('ratio'),5);assert.equal(cells('ratioDouble'),10);
assert.equal(LESSON_COMICS.count,undefined);assert.equal(LESSON_COMICS.fractionSum,undefined);
assert.deepEqual(JAPAN_COMICS.MATH_G5_RATIO,['volume','percent']);
assert.equal(COMICS.area.choices[COMICS.area.answer],'6 m²');
assert.equal(COMICS.measure.choices[COMICS.measure.answer],'10 m');
assert.equal(COMICS.volume.choices[COMICS.volume.answer],'18 cm³');
console.log('PASS: six trilingual comics, precise geometry, units, and scoped mappings');
