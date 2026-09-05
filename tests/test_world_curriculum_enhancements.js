const fs=require('fs');
const path=require('path');

module.exports=({describe,test,assert,loadESModule})=>{
 const root=path.resolve(__dirname,'..');
 const catalog=loadESModule(path.join(root,'src/world/FoundationCatalog.mjs'));
 const journey=loadESModule(path.join(root,'src/world/GradeJourney.mjs'));
 const rules=loadESModule(path.join(root,'src/world/FoundationRules.mjs'));
 const words=loadESModule(path.join(root,'src/world/FoundationWords.mjs'));
 const english=loadESModule(path.join(root,'src/world/FoundationEnglish.mjs'));
 const pinyin=loadESModule(path.join(root,'src/world/PinyinRuby.mjs'));
 const japaneseGames=loadESModule(path.join(root,'MiniGameSystem.js'));

 describe('世界模式：同年级关卡、英语挑战与拼音辅助',()=>{
  test('中国1—6年级总关卡与日本同年级实际关卡数一致',()=>{
   for(let grade=1;grade<=6;grade++){
    const gates=journey.journeyFor('CN63',`Y${grade}`);
    assert.strictEqual(gates.length,journey.JAPAN_GRADE_STAGE_TOTALS[grade]);
    assert.strictEqual(new Set(gates.map(gate=>gate.id)).size,gates.length);
    assert.ok(gates.every(gate=>gate.stage>=1&&gate.stage<=gate.stages));
   }
  });

  test('中国课程每个年级都有带CEFR标注的原创英语挑战和排行榜路径',()=>{
   const expected=['Pre-A1','Pre-A1','A1','A1','A1+','A2 bridge'];
   for(let grade=1;grade<=6;grade++){
    const lessons=catalog.lessonsFor('CN63',`Y${grade}`,'english');
    assert.strictEqual(lessons.length,1);
    assert.strictEqual(lessons[0].cefr,expected[grade-1]);
    const gates=journey.journeyFor('CN63',`Y${grade}`,'english');
    assert.ok(gates.length>=4);
    const url=journey.gateUrl(gates[0],{profile:'CN63',year:`Y${grade}`,country:'CN',locale:'zh'});
    assert.ok(url.includes('lesson=english')&&url.includes('stage=1'));
   }
   assert.strictEqual(catalog.lessonsFor('US','G3','english').length,0);
  });

  test('英中与中英题库是双向、唯一、可组成10道不重复挑战',()=>{
   const directions=new Set();
   const formats=new Set();
   for(let stage=1;stage<=6;stage++){
    const pool=english.englishPool(stage,'zh');
    assert.ok(pool.length>=40);
    pool.forEach(question=>{
     assert.strictEqual(new Set(question.choices).size,question.choices.length);
     assert.strictEqual(question.choices.filter(choice=>choice===question.correct).length,1);
     formats.add(question.format);
     if(question.format?.startsWith('translation'))directions.add(question.format);
    });
    const rounds=rules.makeFoundationRounds({profile:'CN63',year:`Y${stage}`,lesson:`english${stage}`,locale:'zh',stage:'2'},12345);
    assert.strictEqual(rounds.length,10);
    assert.strictEqual(new Set(rounds.map(question=>question.id)).size,10);
   }
   assert.deepStrictEqual([...directions].sort(),['translation-en-zh','translation-zh-en']);
   for(const format of ['dialogue-completion','word-order','short-reading'])assert.ok(formats.has(format));
  });

  test('英语与日语题库不再把日语动词原形机械拼接到ます、たい或意向形',()=>{
   const broken=/(?:る|う|く|ぐ|す|つ|ぬ|ぶ|む)(?:ます|たいです|ようとしました)/;
   for(const mode of ['BASIC','EIKEN3','EIKEN2']){
    const bank=japaneseGames.getEnglishQuestionBank(mode);
    assert.strictEqual(bank.length,200);
    assert.strictEqual(bank.some(question=>broken.test(question.correct)),false,mode);
    assert.ok(bank.every(question=>question.correct.endsWith('。')));
   }
   const basic=japaneseGames.getEnglishQuestionBank('BASIC');
   assert.ok(basic.some(question=>question.prompt.includes('I like to read picture books.')&&question.correct==='私は絵本を読むことが好きです。'));
   assert.ok(basic.some(question=>question.prompt.includes('We have time to open the window.')&&question.correct==='私たちには窓を開ける時間があります。'));
   const eiken3=japaneseGames.getEnglishQuestionBank('EIKEN3');
   assert.ok(eiken3.some(question=>question.prompt.includes('I had a chance to study for the test.')&&question.correct==='私はテストに向けて勉強する機会がありました。'));
  });

  test('中国低年级题面、选项、提示与讲解的汉字都有ruby拼音',()=>{
   const records=[...words.wordPool(0,'zh'),...words.wordPool(1,'zh'),...words.wordPool(2,'zh'),...english.englishPool(1,'zh'),...english.englishPool(2,'zh')];
   for(const question of records)for(const value of [question.prompt,question.correct,...question.choices,question.hint,question.explanation]){
    const coverage=pinyin.pinyinCoverage(value);assert.strictEqual(coverage.complete,true,`${value}: ${coverage.missing.join('')}`);
   }
   const html=pinyin.rubyPinyin('选择“书”的正确读音。');
   assert.ok(html.includes('<ruby>')&&html.includes('<rt>'));
   assert.ok(!html.includes('<script>'));
   const worldText=loadESModule(path.join(root,'src/world/WorldText.mjs')).TEXT.zh;
   for(const game of Object.values(worldText.games))assert.strictEqual(pinyin.pinyinCoverage(game[3]).complete,true,game[3]);
  });

  test('世界游戏和年级题目都有可关闭的声音、触觉点击与可见按压反馈',()=>{
   const world=fs.readFileSync(path.join(root,'src/world/WorldPlay.mjs'),'utf8');
   const foundation=fs.readFileSync(path.join(root,'src/world/FoundationPlay.mjs'),'utf8');
   const feedback=fs.readFileSync(path.join(root,'src/world/InteractionFeedback.mjs'),'utf8');
   const css=fs.readFileSync(path.join(root,'src/world/world.css'),'utf8');
   const worldHtml=fs.readFileSync(path.join(root,'world.html'),'utf8');
   const learnHtml=fs.readFileSync(path.join(root,'learn.html'),'utf8');
   for(const source of [world,foundation])assert.ok(source.includes('createInteractionFeedback')&&source.includes('interaction.tap()'));
   for(const source of [worldHtml,learnHtml])assert.ok(source.includes('id="sound-toggle"'));
   assert.ok(feedback.includes('playClick()')&&feedback.includes('playSuccess')&&feedback.includes('playGentleError')&&feedback.includes('navigator.vibrate'));
   assert.ok(css.includes('button:active')&&css.includes('scale(.97)'));
   assert.ok(css.includes('.order-card button{width:56px;min-width:56px;min-height:56px'));
   assert.ok(css.includes('.pipe{width:56px;min-width:56px;height:56px'));
   assert.ok(css.includes('.sudoku-cell{width:56px;min-width:56px;height:56px'));
  });
 });
};
