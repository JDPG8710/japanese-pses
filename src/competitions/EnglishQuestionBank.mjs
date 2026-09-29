// Pure question generation: safe to import without creating game UI.
function shuffleCopy(items) { const result=[...items]; for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];} return result; }

function expandNaturalEnglishPairs(actions, frames, prefix) {
  const pairs = [];
  actions.forEach(([action, japanese], actionIndex) => {
    frames.forEach(([englishFrame, japaneseFrame], frameIndex) => {
      pairs.push({
        id: `${prefix}_${actionIndex}_${frameIndex}`,
        eng: englishFrame.replace('{action}', action),
        jpn: japaneseFrame.replace('{action}', japanese)
      });
    });
  });
  return pairs;
}

function makeEnglishReadingBank(longMode = false) {
  const names = ['Aki', 'Ben', 'Mika', 'Ken', 'Yui', 'Sora', 'Emma', 'Leo', 'Hana', 'Riku'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const scenarios = [
    ['the library', 'borrow a book about space', 'prepare for a science project', 'found a useful diagram'],
    ['the community center', 'practice a short speech', 'welcome new students', 'spoke with more confidence'],
    ['the school garden', 'water the tomato plants', 'help the plants grow', 'noticed three new flowers'],
    ['the science museum', 'join a robot workshop', 'learn how sensors work', 'built a small moving car'],
    ['the riverside park', 'collect plastic litter', 'protect birds and fish', 'filled two recycling bags'],
    ['the train station', 'make a barrier-free map', 'help visitors move safely', 'found a new elevator'],
    ['the sports center', 'practice swimming', 'improve endurance', 'completed ten laps'],
    ['the town hall', 'interview a city worker', 'study disaster preparation', 'learned about emergency water'],
    ['the art museum', 'sketch a landscape painting', 'study the use of color', 'shared the sketch with classmates'],
    ['the local bakery', 'learn how bread is made', 'write a report about local jobs', 'watched the dough rise'],
    ['the animal shelter', 'prepare clean water bowls', 'support rescued animals', 'helped five dogs'],
    ['the school kitchen', 'cook vegetable soup', 'learn about healthy meals', 'used locally grown carrots'],
    ['the beach', 'count different shells', 'compare the coastal environment', 'recorded six kinds of shells'],
    ['the music room', 'rehearse a flute piece', 'perform at the school festival', 'kept the rhythm correctly'],
    ['the history museum', 'examine an old farming tool', 'understand life in the past', 'wrote notes about its shape'],
    ['the fire station', 'ask about rescue equipment', 'make a community safety guide', 'learned how firefighters train'],
    ['the recycling center', 'sort used containers', 'reduce waste at school', 'understood three recycling marks'],
    ['the weather station', 'check rainfall records', 'compare this month with last month', 'discovered a wetter week'],
    ['the nursing home', 'read a picture book aloud', 'spend time with older residents', 'received helpful storytelling advice'],
    ['the shopping street', 'survey reusable bag use', 'study environmentally friendly habits', 'collected forty responses']
  ];
  const placeOptions = scenarios.map(item => item[0]);
  const actionOptions = scenarios.map(item => item[1]);
  const reasonOptions = scenarios.map(item => item[2]);
  const outcomeOptions = scenarios.map(item => item[3]);
  return Array.from({ length: 200 }, (_, index) => {
    const name = names[index % names.length];
    const scenario = scenarios[Math.floor(index / names.length) % scenarios.length];
    const day = days[index % days.length];
    const [place, action, reason, outcome] = scenario;
    const passage = longMode
      ? `On ${day}, ${name} visited ${place} with a small school team. Their main task was to ${action}. Before starting, they discussed safety rules and divided the work fairly. They chose this activity because they wanted to ${reason}. Although one part of the task was difficult, the team exchanged ideas and continued carefully. By the end of the visit, ${name} ${outcome} and wrote a reflection for the next class.`
      : `On ${day}, ${name} went to ${place} after school. ${name} wanted to ${action} because the class hoped to ${reason}. In the end, ${name} ${outcome}.`;
    const questionType = index % 4;
    const specs = [
      [`Where did ${name} go?`, place, placeOptions],
      [`What did ${name} plan to do?`, action, actionOptions],
      [`Why did ${name} choose the activity?`, `To ${reason}.`, reasonOptions.map(item => `To ${item}.`)],
      [`What happened at the end?`, `${name} ${outcome}.`, outcomeOptions.map(item => `${name} ${item}.`)]
    ];
    const [prompt, correct, sourceOptions] = specs[questionType];
    const distractors = sourceOptions.filter(item => item !== correct);
    return {
      id: `${longMode ? 'LONG' : 'SHORT'}_${index}`,
      passage,
      prompt: `${passage}\n\n${prompt}`,
      correct,
      options: [correct, ...shuffleCopy(distractors).slice(0, 3)]
    };
  });
}

export function getEnglishQuestionBank(mode = 'BASIC') {
  const basicActions = [
    ['read picture books', '絵本を読む'], ['play soccer', 'サッカーをする'], ['practice the piano', 'ピアノを練習する'], ['draw animals', '動物の絵を描く'],
    ['visit the library', '図書館へ行く'], ['help my family', '家族を手伝う'], ['cook breakfast', '朝ごはんを作る'], ['water the flowers', '花に水をやる'],
    ['ride a bicycle', '自転車に乗る'], ['study English', '英語を勉強する'], ['sing this song', 'この歌を歌う'], ['clean the classroom', '教室を掃除する'],
    ['watch birds', '鳥を観察する'], ['take pictures', '写真を撮る'], ['write a short story', '短い物語を書く'], ['make a paper plane', '紙飛行機を作る'],
    ['play with my dog', '犬と遊ぶ'], ['walk in the park', '公園を歩く'], ['eat fresh fruit', '新鮮な果物を食べる'], ['drink some water', '水を飲む'],
    ['open the window', '窓を開ける'], ['close the door', 'ドアを閉める'], ['use a dictionary', '辞書を使う'], ['ask a question', '質問する'],
    ['answer the teacher', '先生に答える'], ['listen to music', '音楽を聞く'], ['make a calendar', 'カレンダーを作る'], ['check the time', '時刻を確認する'],
    ['buy a notebook', 'ノートを買う'], ['carry an umbrella', '傘を持つ'], ['meet my friend', '友達に会う'], ['learn a new word', '新しい単語を覚える'],
    ['feed the fish', '魚にえさをやる'], ['wash my hands', '手を洗う'], ['set the table', '食卓を整える'], ['read the map', '地図を読む'],
    ['join the game', 'ゲームに参加する'], ['share my idea', '考えを伝える'], ['plant a seed', '種を植える'], ['write my name', '名前を書く']
  ];
  const basicFrames = [
    ['I like to {action}.', '私は{action}ことが好きです。'], ['I want a chance to {action}.', '私は{action}機会がほしいです。'], ['I can {action}.', '私は{action}ことができます。'],
    ['It is fun to {action}.', '{action}ことは楽しいです。'], ['We have time to {action}.', '私たちには{action}時間があります。']
  ];
  const eiken3Actions = [
    ['study for the test', 'テストに向けて勉強する'], ['visit the history museum', '歴史博物館を訪れる'], ['help an elderly neighbor', '近所の高齢者を手伝う'], ['join the science club', '科学部に入る'],
    ['finish the report', '報告書を仕上げる'], ['practice for the concert', '演奏会に向けて練習する'], ['take an earlier train', 'いつもより早い電車に乗る'], ['prepare a healthy lunch', '健康的な昼食を用意する'],
    ['ask the teacher for advice', '先生に助言を求める'], ['read the local news', '地域のニュースを読む'], ['protect wild animals', '野生動物を守る'], ['complete the homework before dinner', '夕食前に宿題を終える'],
    ['meet my cousin at the station', '駅でいとこに会う'], ['learn about Japanese history', '日本の歴史を学ぶ'], ['bring an umbrella tomorrow', '明日傘を持ってくる'], ['write a thank-you letter', 'お礼の手紙を書く'],
    ['watch the final game', '決勝戦を見る'], ['prepare for the school trip', '修学旅行の準備をする'], ['share my opinion clearly', '自分の意見を明確に伝える'], ['improve my English pronunciation', '英語の発音を改善する'],
    ['volunteer at the festival', '祭りでボランティアをする'], ['save enough money for the book', '本を買うお金を十分にためる'], ['return the library books', '図書館の本を返す'], ['invite a new classmate', '新しい同級生を招く'],
    ['check the weather forecast', '天気予報を確認する'], ['learn how to cook curry', 'カレーの作り方を学ぶ'], ['keep a daily journal', '毎日日記をつける'], ['explain the rule to everyone', '全員に規則を説明する'],
    ['choose a topic for the speech', 'スピーチの話題を選ぶ'], ['repair my old bicycle', '古い自転車を修理する'], ['collect information online', 'オンラインで情報を集める'], ['compare the two plans', '二つの計画を比べる'],
    ['remember the meeting time', '集合時刻を覚えておく'], ['solve the problem together', '一緒に問題を解く'], ['take care of the class pet', 'クラスの動物を世話する'], ['review the new vocabulary', '新しい語彙を復習する'],
    ['follow the safety instructions', '安全の指示に従う'], ['introduce my hometown', '自分の故郷を紹介する'], ['organize the sports equipment', '運動用具を整理する'], ['practice speaking slowly', 'ゆっくり話す練習をする']
  ];
  const eiken3Frames = [
    ['I decided to {action}.', '私は{action}ことにしました。'], ['We plan to {action}.', '私たちは{action}予定です。'], ['I had a chance to {action}.', '私は{action}機会がありました。'],
    ['We need time to {action}.', '私たちには{action}時間が必要です。'], ['Our goal is to {action}.', '私たちの目標は{action}ことです。']
  ];
  const eiken2Actions = [
    ['reduce plastic waste', 'プラスチックごみを減らす'], ['improve public transportation', '公共交通を改善する'], ['protect local forests', '地域の森林を守る'], ['support elderly residents', '高齢の住民を支援する'],
    ['save energy at home', '家庭でエネルギーを節約する'], ['share reliable information', '信頼できる情報を共有する'], ['prepare for natural disasters', '自然災害に備える'], ['encourage healthy habits', '健康的な習慣を促す'],
    ['welcome students from abroad', '海外からの生徒を歓迎する'], ['solve community problems', '地域の問題を解決する'], ['develop useful technology', '有用な技術を開発する'], ['respect different opinions', '異なる意見を尊重する'],
    ['increase urban green spaces', '都市の緑地を増やす'], ['improve air quality', '大気の質を改善する'], ['make education more accessible', '教育をより受けやすくする'], ['preserve traditional culture', '伝統文化を保存する'],
    ['respond to climate change', '気候変動に対応する'], ['build safer cities', 'より安全な都市を築く'], ['promote international cooperation', '国際協力を促進する'], ['use natural resources responsibly', '天然資源を責任をもって利用する'],
    ['prevent food waste', '食品ロスを防ぐ'], ['protect personal information', '個人情報を守る'], ['provide equal opportunities', '平等な機会を提供する'], ['strengthen local businesses', '地域企業を強化する'],
    ['improve working conditions', '労働条件を改善する'], ['expand renewable energy', '再生可能エネルギーを拡大する'], ['support scientific research', '科学研究を支援する'], ['maintain public facilities', '公共施設を維持する'],
    ['restore damaged ecosystems', '損なわれた生態系を回復する'], ['increase media literacy', 'メディアリテラシーを高める'], ['reduce economic inequality', '経済格差を縮小する'], ['prepare students for future careers', '生徒が将来の進路に備えられるようにする'],
    ['make tourism more sustainable', '観光をより持続可能にする'], ['improve emergency communication', '緊急時の情報伝達を改善する'], ['protect endangered species', '絶滅危惧種を守る'], ['encourage civic participation', '市民参加を促す'],
    ['design inclusive public spaces', '誰もが使いやすい公共空間を設計する'], ['improve access to medical care', '医療を受けやすくする'], ['support responsible consumption', '責任ある消費を支援する'], ['preserve clean water sources', 'きれいな水源を守る']
  ];
  const eiken2Frames = [
    ['The project aims to {action}.', 'その計画は{action}ことを目指しています。'], ['Local leaders have proposed a plan to {action}.', '地域の指導者は{action}計画を提案しました。'],
    ['It is increasingly important to {action}.', '{action}ことの重要性が高まっています。'], ['The report recommends several ways to {action}.', '報告書は{action}ための方法をいくつか提案しています。'],
    ['Citizens can work together to {action}.', '市民は協力して{action}ことができます。']
  ];

  if (mode === 'SHORT_READING') return makeEnglishReadingBank(false);
  if (mode === 'LONG_READING') return makeEnglishReadingBank(true);
  const pairs = mode === 'EIKEN2'
    ? expandNaturalEnglishPairs(eiken2Actions, eiken2Frames, 'E2')
    : mode === 'EIKEN3'
      ? expandNaturalEnglishPairs(eiken3Actions, eiken3Frames, 'E3')
      : expandNaturalEnglishPairs(basicActions, basicFrames, 'BASIC');
  return pairs.map((pair, index) => {
    const distractors = [1, 7, 19].map(offset => pairs[(index + offset) % pairs.length].jpn);
    return { id: pair.id, prompt: `「${pair.eng}」の意味として最も近いものは？`, correct: pair.jpn, options: [pair.jpn, ...distractors] };
  });
}

