/** zh / en / ja copy for casual arcade leisure games (not learning-first). */
export const ARCADE_TEXT = {
  en: {
    section: 'Arcade',
    sectionKicker: 'CASUAL · 3D ARCADE',
    sectionIntro: 'Four fun 3D games: racing, breakout, fruit slash, and typing.',
    play: 'Play',
    best: 'Best',
    score: 'Score',
    lives: 'Lives',
    wave: 'Wave',
    distance: 'Distance',
    pause: 'Pause',
    resume: 'Resume',
    retry: 'Try again',
    back: 'Back',
    gameOver: 'Game over',
    cleared: 'You cleared it!',
    hardHint: '3D · clearable',
    paused: 'Paused',
    tip: 'Tip',
    combo: 'Combo',
    games: {
      race: {
        title: 'Night Drift',
        tag: 'RACING',
        blurb: 'Race in 3D — switch lanes, dodge cars, and reach the finish line.',
        tip: '← → or A/D · tap left or right to change lanes'
      },
      breakout: {
        title: 'Brick Siege',
        tag: 'BREAKOUT',
        blurb: 'Bounce the ball, smash the bricks, and catch power-ups with your paddle.',
        tip: 'Drag or use ← → · click or press Space to launch'
      },
      fruit: {
        title: 'Fruit Storm',
        tag: 'SLASH',
        blurb: 'Slash flying fruit, dodge bombs, and build a big combo.',
        tip: 'Swipe through fruit · bombs cost a life'
      },
      ninja: {
        title: 'Ninja Type',
        tag: 'TYPING',
        blurb: 'Type the glowing word panels before they reach you.',
        tip: 'Keyboard only · type each glowing word'
      }
    }
  },
  zh: {
    section: '休闲街机',
    sectionKicker: '休闲 · 3D街机',
    sectionIntro: '四款 3D 休闲街机：竞速、打砖块、切水果、打字。',
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
    hardHint: '3D · 可通关',
    paused: '已暂停',
    tip: '提示',
    combo: '连击',
    games: {
      race: {
        title: '夜路赛车',
        tag: '赛车',
        blurb: '车流很密，车道很窄。几乎撞一次就结束。',
        tip: '← → 或 A/D · 点左右 · 第三人称 3D 竞速'
      },
      breakout: {
        title: '打砖块围城',
        tag: '打砖块',
        blurb: '小板、快球、多层砖。把墙清掉才算赢。',
        tip: '拖动指针或 ← → · 点击 / 空格发球'
      },
      fruit: {
        title: '水果风暴',
        tag: '切水果',
        blurb: '水果飞得很快，炸弹很多。连击不够整波不算。',
        tip: '在 3D 中滑动切水果 · 炸弹扣命'
      },
      ninja: {
        title: '忍者打字',
        tag: '打字',
        blurb: '落下的词很快。输错就掉命，速度还会再加快。',
        tip: '只用键盘 · 输入飞近的文字面板'
      }
    }
  },
  ja: {
    section: 'アーケード',
    sectionKicker: 'カジュアル · 3D',
    sectionIntro: '3Dゲームが4つ。レース・ブロックくずし・フルーツ・タイピング。',
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
    hardHint: '3D · クリアできる',
    paused: 'いちじていし中',
    tip: 'ヒント',
    combo: 'コンボ',
    games: {
      race: {
        title: 'ナイトドリフト',
        tag: 'レース',
        blurb: 'レーンをかえてくるまをよけながら、ゴールをめざそう。',
        tip: '← → または A/D · 左右をタップしてレーン移動'
      },
      breakout: {
        title: 'ブロック包囲',
        tag: 'ブロックくずし',
        blurb: 'ボールをはじいてブロックをくずそう。パワーアップもキャッチしてね。',
        tip: 'ドラッグ / ← → · クリックかスペースで発射'
      },
      fruit: {
        title: 'フルーツストーム',
        tag: 'フルーツカット',
        blurb: 'とんでくるフルーツをカット！ばくだんにはちゅういして、コンボをのばそう。',
        tip: 'スワイプでカット · ばくだんはライフがへる'
      },
      ninja: {
        title: 'にんじゃタイピング',
        tag: 'タイピング',
        blurb: 'ちかづくことばパネルを、とどくまえにタイプしよう。',
        tip: 'キーボードだけ · ひかることばをうってね'
      }
    }
  }
};

export function arcadeText(locale = 'en') {
  return ARCADE_TEXT[locale] || ARCADE_TEXT.en;
}
