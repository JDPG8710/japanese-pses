import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TOPICS,FAMILIES,ARCHIVE,amcBank,topicExamples,createSession,gradeResponse,parseNumeric,resultFor,progressKey} from '../src/competitions/PracticeData.mjs';
import {getEnglishQuestionBank} from '../src/competitions/EnglishQuestionBank.mjs';
import {TEXT} from '../src/competitions/PracticeText.mjs';
assert.equal(FAMILIES.length,30);
let tested=0;
for(const topic of TOPICS){
  const reference=amcBank(topic.id,'en');
  assert.equal(reference.length,120);
  for(const locale of ['ja','zh','en']){
    const bank=amcBank(topic.id,locale);
    assert.equal(bank.length,120);
    assert.equal(new Set(bank.map(q=>JSON.stringify([q.prompt,q.orderItems]))).size,120);
    assert.deepEqual(bank.map(q=>[q.id,q.correct]),reference.map(q=>[q.id,q.correct]));
    const examples=topicExamples(topic.id,locale);assert.equal(examples.length,6);
    assert.ok(examples.every(q=>!bank.some(item=>q.id===item.id)));
    for(const q of [...bank,...examples]){
      assert.ok(q.prompt&&!q.prompt.includes('undefined'));
      assert.equal(q.steps.length,3);assert.ok(q.steps.every(s=>typeof s==='string'&&s.length>8));
      assert.ok(q.hint&&q.mistake&&q.check);
      const response=q.kind==='multi'?q.fields.map(f=>f.answer):q.correct;
      assert.deepEqual(gradeResponse(q,response),{valid:true,correct:true});
      if(q.kind==='choice'){assert.equal(new Set(q.options).size,5);assert.ok(q.options.includes(q.correct));}
      if(q.kind==='number'||q.kind==='multi')assert.equal(gradeResponse(q,q.kind==='number'?'':q.fields.map(()=> '')).valid,false);
      if(q.kind==='order'){assert.equal(new Set(q.correct).size,q.correct.length);assert.equal(gradeResponse(q,[...q.correct].reverse()).correct,false);}
      tested++;
    }
    for(let repeat=0;repeat<30;repeat++){
      const session=createSession(bank);
      assert.equal(session.length,10);assert.equal(new Set(session.map(q=>q.id)).size,10);
      assert.equal(new Set(session.map(q=>q.family)).size,6);
      assert.equal(new Set(session.map(q=>q.kind)).size,4);
      assert.ok(session.filter(q=>q.kind!=='choice').length>=5);
    }
  }
}
// Independent expected answers for the first variant of all 30 families.
const expected={sequence:'25',multiples:['10','5'],remainder:'2',gcd:'5',digits:['12','33'],
 'expression-order':['5 + 1','5 × 2 + 1','5 × 3 + 1','5 × 4 + 1'],part:'15',discount:['35','105'],ratio:['8','12'],remaining:'5/8','unit-price':'42',
 'fraction-order':['1/8','1/7','1/6','1/5'],rectangle:['22','28'],cutout:'39',triangle:'20',angles:'103',units:['315','312'],
 'area-order':['2 cm × 4 cm','3 cm × 4 cm','2 cm × 8 cm','5 cm × 4 cm'],outfits:'12',pairs:'6',probability:'3/7',codes:['16','12'],'grid-paths':['4','10'],
 'chance-order':['1/7','2/7','3/7','4/7'],backwards:'5',average:['45','20'],meeting:'4',ages:['16','6'],'heads-legs':'3',
 'time-order':['4 min','260 s','5 min','340 s']};
for(const q of TOPICS.flatMap(topic=>amcBank(topic.id,'en')).filter(q=>q.variant===1))assert.deepEqual(q.correct,expected[q.family],q.family);
assert.equal(parseNumeric('１／２'),.5);assert.equal(parseNumeric(' .5 '),.5);assert.equal(parseNumeric('1 / 2'),.5);
for(const invalid of ['',' ','1/0','1/','NaN','Infinity','1+1','1e2','<script>','1,2'])assert.equal(parseNumeric(invalid),null);
const fractional={kind:'number',correct:'1/2'};assert.equal(gradeResponse(fractional,'2/4').correct,true);assert.equal(gradeResponse(fractional,'0.5').correct,true);assert.equal(gradeResponse(fractional,'0.6').correct,false);
for(const mode of ['EIKEN3','EIKEN2']){const bank=getEnglishQuestionBank(mode);assert.ok(bank.length>=200);assert.equal(createSession(bank).length,10);}
for(const score of [0,7,11,NaN])assert.equal(resultFor(score).passed,false);assert.equal(resultFor(8).passed,true);
assert.equal(resultFor(8,9).passed,false);assert.notEqual(progressKey('eiken','EIKEN3'),progressKey('amc8','number'));
for(const locale of ['ja','zh','en'])assert.deepEqual(Object.keys(TEXT[locale]).sort(),Object.keys(TEXT.en).sort());
const curriculum=JSON.parse(await readFile(new URL('../data/eigo.json',import.meta.url)));
for(const node of curriculum.nodes)assert.ok(node.gameData.difficultyModes.every(mode=>!/^EIKEN/.test(mode)));
assert.equal(ARCHIVE.reduce((n,paper)=>n+paper.count,0),150);
console.log(`Independent practice: ${tested} localized exercises/examples, 30 mathematical answer checks, mixed sessions, numeric grading, language parity and EIKEN banks passed.`);
