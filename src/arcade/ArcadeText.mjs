/** zh / en / ja copy for casual arcade leisure games (not learning-first). */
export const ARCADE_TEXT = {
  en: {
    section: 'Arcade',
    sectionKicker: 'CASUAL · HARD MODE',
    sectionIntro: 'Four tough leisure games. Clearing is rare — practice, then try again.',
    play: 'Play',
    best: 'Best',
    score: 'Score',
    lives: 'Lives',
    wave: 'Wave',
    distance: 'Distance',
    pause: 'Pause',
    resume: 'Resume',
    retry: 'Retry',
    back: 'Back',
    gameOver: 'Game over',
    cleared: 'Cleared!',
    hardHint: 'HARD · few clears',
    paused: 'Paused',
    tip: 'Tip',
    combo: 'Combo',
    games: {
      race: {
        title: 'Night Drift',
        tag: 'RACING',
        blurb: 'Weave through dense traffic. One mistake ends the run.',
        tip: '← → or A/D · touch sides · survive the full stretch'
      },
      breakout: {
        title: 'Brick Siege',
        tag: 'BREAKOUT',
        blurb: 'Tiny paddle, angry ball, multi-hit bricks. Clear the wall.',
        tip: 'Drag / move pointer · keep the ball alive'
      },
      fruit: {
        title: 'Fruit Storm',
        tag: 'SLASH',
        blurb: 'Swipe fruits, dodge bombs. Combos decide if a wave counts.',
        tip: 'Swipe / drag across fruits · bombs cost a life'
      },
      ninja: {
        title: 'Ninja Type',
        tag: 'TYPING',
        blurb: 'Type falling words before they hit. Mistakes cost lives.',
        tip: 'Keyboard only · match each letter exactly'
      }
    }
  },
  zh: {
    section: '休闲街机',
    sectionKicker: '休闲 · 高难度',
    sectionIntro: '四款偏硬的休闲小游戏。通关不容易——多练几次再冲。',
    play: '开始',
    best: '最佳',
    score: '得分',
    lives: '生命',
    wave: '波次',
    distance: '距离',
    pause: '暂停',
    resume: '继续',
    retry: '再来',
    back: '返回',
    gameOver: '结束了',
    cleared: '通关！',
    hardHint: '高难度 · 少通关',
    paused: '已暂停',
    tip: '提示',
    combo: '连击',
    games: {
      race: {
        title: '夜路赛车',
        tag: '赛车',
        blurb: '车流很密，车道很窄。几乎撞一次就结束。',
        tip: '← → 或 A/D · 点左右侧 · 撑完全程'
      },
      breakout: {
        title: '打砖块围城',
        tag: '打砖块',
        blurb: '小板、快球、多层砖。把墙清掉才算赢。',
        tip: '拖动 / 移动指针 · 别让球掉下去'
      },
      fruit: {
        title: '水果风暴',
        tag: '切水果',
        blurb: '水果飞得很快，炸弹很多。连击不够整波不算。',
        tip: '滑动切开水果 · 切到炸弹扣命'
      },
      ninja: {
        title: '忍者打字',
        tag: '打字',
        blurb: '落下的词很快。输错就掉命，速度还会再加快。',
        tip: '只用键盘 · 逐字准确输入'
      }
    }
  },
  ja: {
    section: 'アーケード',
    sectionKicker: 'カジュアル · HARD',
    sectionIntro: 'かんたんには クリアできない 4つの レジャーゲーム。れんしゅうして もういちど！',
    play: 'あそぶ',
    best: 'ベスト',
    score: 'スコア',
    lives: 'ライフ',
    wave: 'ウェーブ',
    distance: 'きょり',
    pause: 'いちじていし',
    resume: 'つづける',
    retry: 'もういちど',
    back: 'もどる',
    gameOver: 'ゲームオーバー',
    cleared: 'クリア！',
    hardHint: 'HARD · クリアは まれ',
    paused: 'ていしちゅう',
    tip: 'ヒント',
    combo: 'コンボ',
    games: {
      race: {
        title: 'ナイトドリフト',
        tag: 'レーシング',
        blurb: 'くるまが たくさん。ほぼ 1かいの ミスで おわる。',
        tip: '← → または A/D · 左右タップ · ゴールまで たえる'
      },
      breakout: {
        title: 'ブロック包囲',
        tag: 'ブロックくずし',
        blurb: 'パドルは ちいさい。ボールは はやい。ぜんぶ くずそう。',
        tip: 'ドラッグ / ポインタ · ボールを おとすな'
      },
      fruit: {
        title: 'フルーツストーム',
        tag: 'フルーツカット',
        blurb: 'はやい なげと おおい ばくだん。コンボが たりないと むし。',
        tip: 'スワイプで きる · ばくだんは ライフげん'
      },
      ninja: {
        title: '忍者タイピング',
        tag: 'タイピング',
        blurb: 'おちる ことばを うつ。まちがえると ライフが へる。',
        tip: 'キーボードのみ · いちもじずつ せいかくに'
      }
    }
  }
};

export function arcadeText(locale = 'en') {
  return ARCADE_TEXT[locale] || ARCADE_TEXT.en;
}
