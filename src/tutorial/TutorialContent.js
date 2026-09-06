const ui = {
  ja: { title:'あそびかた',close:'とじて あそぶ',steps:'あそびかたの ステップ',step:'ステップ',play:'わかった！ あそぶ',pause:'自動の見本をとめる',animate:'見本をうごかす',example:'これは れんしゅう用の見本だよ。説明を見ているあいだ、時間はへらないよ。',rule:'3分以内にチャレンジ！ クリアすると、つぎのステージへ進めるよ。' },
  en: { title:'How to play',close:'Close and play',steps:'Tutorial steps',step:'Step',play:'Got it! Let’s play',pause:'Pause the demo',animate:'Animate the demo',example:'A practice example, not your puzzle’s answer. The game clock pauses while you read.',rule:'Complete the challenge within 3 minutes. Clear it to unlock the next stage.' },
  zh: { title:'怎么玩',close:'关闭并游玩',steps:'玩法步骤',step:'步骤',play:'明白了，开始玩！',pause:'暂停演示',animate:'播放演示',example:'这是操作示例，不是当前题目的答案。阅读说明时，游戏倒计时暂停。',rule:'在3分钟内完成挑战，通关后可进入下一关。' }
};
export function tutorialCopy(locale) { return ui[locale] || ui.ja; }

const demos = {
 choice:['❔  A · B · C','A · [B] · C','✓ → ❔'], number:['❔ → □','1 · 2 · 3 → □','✓ → ❔'],
 circuit:['┐  ─  ┘','└  ┐  ─','⚡ ─ ─ 🏁'], sudoku:['1 · □ · 3','1 · [2] · 3','1 · 2 · 3'], code:['● ▲ ■ ?','[●] ▲ ■','● ▲ ■ ✓'],
 robot:['🤖 · · 🏁','→ → →','· · · 🤖'], set:['● ▲ ◆','[●] [▲] [◆]','● ▲ ◆ ✓'], balance:['● + ● = 6','● = 6 ÷ 2','● = 3'],
 order:['🐼 🦊 🐰','🐼 ← 🦊 🐰','🦊 🐼 🐰'], water:['A ▱ · B ▱','A ▰ → B ▱','A ▱ · B ▰'], network:['A · B · C','A ─ B · C','A ─ B ─ C'],
 radical:['木 + 木','[木] + [木]','林'], pairs:['2 × 3 · 6','[2 × 3] → [6]','✓'], scale:['⚖ 3 ≠ 1','1 + 2 → ⚖','3 = 3'], moon:['🌍 · 🌙','🌙 ↻ 🌍','🌍 · 🌓'], lever:['2 × 3 = ?','3 × □','2 × 3 = 3 × 2'], sort:['● · □','[●] → ◯','◯ ● ✓'], map:['▧ · 🗾','[▧] → 🗾','🗾 ✓']
};
const japanese = {
 KanjiSlashGame:['上の漢字と「よみ」を見よう。','正しいよみのカードをタップ！','つぎの漢字にも答えて、最後まで進もう。','choice'],
 RadicalBuilderGame:['漢字の形や、聞かれているパーツを見よう。','下のカードから、必要なパーツをタップしよう。','組み合わせが合うと次へ。ちがったら、選びなおせるよ。','radical'],
 KukuLinkGame:['式のカードと答えのカードをさがそう。','同じ答えになるペアを順番にタップしよう。','線でつながるペアを全部見つけるとクリア！','pairs'],
 PanBalanceScaleGame:['左のお皿のおもさを見よう。','下のおもりをタップして右のお皿にのせよう。','右のお皿をタップすると一つもどせるよ。まっすぐになったら次へ！','scale'],
 CosmicOrbitGame:['お手本の月と、太陽の向きを見よう。','月をドラッグして、地球のまわりを動かそう。','お手本と同じ見え方になる場所をさがそう。','moon'],
 LeverPhysicsGame:['左のおもりと、中心からのきょりを見よう。','右のめもりをタップして、おもりを置こう。','おもさ×きょりが左右で同じになると、つり合うよ。','lever'],
 CircuitSandboxGame:['回路図と、上の質問をよく見よう。','電気の通り道を考えて、下の答えを一つタップ。','正解の説明を読んで、次の回路にもチャレンジ！','choice'],
 PrefectureJigsawGame:['上に出る、地図や都道府県の問題を見よう。','ピースを選んで場所をタップ。選択問題では答えをタップ。','画面の進み具合を見ながら、最後まで答えよう。','map'],
 CategorySortGame:['上の箱の名前と、下のカードを見よう。','カードをタップしてから、合う箱をタップしよう。','全部のカードを正しい箱に入れるとクリア！','sort'],
 CurriculumQuizGame:['上の問題を、ゆっくり読んでみよう。','下に並んだ答えから、一つをタップしよう。','答え合わせを見て、つぎの問題へ。最後まで挑戦しよう！','choice'],
 MathCurriculumGame:['式や図で、何を求めるか見つけよう。','計算して、答えのカードを一つタップ。','単位もたしかめて、10問にチャレンジ！','choice'],
 ContextMatchGame:['英語の文と質問を読もう。長い文は、下まで見てね。','文に合う答えを一つタップしよう。','答え合わせを見ながら、選んだレベルの10問に挑戦！','choice'],
 GradeComprehensiveExamGame:['教科と問題を見よう。','答えを一つタップしよう。','正解をふやして、学年のまとめにチャレンジ！','choice']
};
export function japaneseTutorial(game, title) {
  const entry = japanese[game.constructor.name] || japanese.CurriculumQuizGame;
  const quiz = ['CurriculumQuizGame','MathCurriculumGame','ContextMatchGame'].includes(game.constructor.name);
  return {title,locale:'ja',steps:entry.slice(0,3),demo:demos[entry[3]],rule:quiz?'3分以内に10問。7問以上正解するとクリア！':ui.ja.rule};
}

const controls = {
 en:{circuit:'Tap a pipe to turn it a quarter turn.',sudoku:'Tap an empty cell repeatedly to choose its number.',code:'Tap each code slot to cycle its symbol.',robot:'Tap the arrows to build your route. Undo removes the last move.',set:'Tap three cards. Tap again to remove a selection.',balance:'Tap the number for the requested object’s weight.',order:'Use the left and right arrows to move each traveller.',water:'Choose fill, empty or pour. Watch both tank levels change.',network:'Tap the links you want to build. Tap again to remove one.'},
 ja:{circuit:'パイプをタップすると、90度回るよ。',sudoku:'空いたマスをタップして、数字をかえよう。',code:'答えのマスをタップして、記号をかえよう。',robot:'矢印で道順を作ろう。「もどす」で一つ取り消せるよ。',set:'3枚をタップ！ もう一度タップすると取り消せるよ。',balance:'聞かれている形のおもさを、数字から選ぼう。',order:'左右の矢印で、ならび順をかえよう。',water:'入れる・空にする・うつすを選んで、水の量を見よう。',network:'つなぎたい線をタップ。もう一度タップで取り消せるよ。'},
 zh:{circuit:'点击管道，每次旋转90度。',sudoku:'重复点击空白格，切换要填入的数字。',code:'点击密码格，切换其中的符号。',robot:'点击方向键编排路线，“撤销”可取消最后一步。',set:'点击选中三张卡片，再次点击可以取消。',balance:'点击数字，回答所问物体的重量。',order:'用左右箭头移动角色，调整队列顺序。',water:'选择装满、倒空或倾倒，观察两个水箱的水量。',network:'点击选中要修建的连线，再次点击可以取消。'}
};
export function worldTutorial(game, locale, text) {
  const lang = ui[locale] ? locale : 'en';
  const submit={en:'Check all the rules, then press “Submit solution”. Solve 10 puzzles and reach 800 points to clear.',ja:'ルールを全部たしかめて「答え合わせ」。10問で800点をめざそう！',zh:'检查所有条件后点击“提交答案”。完成10道题，达到800分即可通关。'}[lang];
  return {title:text.games[game][0],locale:lang,steps:[text.games[game][3],controls[lang][game],submit],demo:demos[game],kind:game==='circuit'?'rotate':'choice',rule:text.rules};
}
export function foundationTutorial(title, locale, kind, rules) {
  const steps={
    en:['Read the question and any diagram carefully.',kind==='choice'?'Tap one answer card, then press “Check”.':'Use the number pad to enter your answer, then press “Check”.','Read the feedback, then move to the next question. Reach 800 points across 10 questions to clear.'],
    ja:['問題と図を、よく見てみよう。',kind==='choice'?'答えのカードを一つ選んで「答え合わせ」。':'数字のボタンで答えを入れて「答え合わせ」。','答え合わせを見て、次の問題へ。10問で800点をめざそう！'],
    zh:['仔细阅读题目，并观察题目中的图示。',kind==='choice'?'先选中一张答案卡，再点击“检查答案”。':'用数字键盘输入答案，再点击“检查答案”。','查看反馈，再进入下一题。10题累计达到800分即可通关。']
  };
  return {title,locale,steps:steps[locale]||steps.en,demo:demos[kind==='choice'?'choice':'number'],rule:rules};
}
