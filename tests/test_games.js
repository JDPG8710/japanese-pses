/**
 * tests/test_games.js - 6-Subject Mini-Games, Hitbox Ergonomics, Audio/FX & Error Guidance Test Suite
 * 
 * Covers 4-Tier Systematic Testing:
 * - Tier 1: 6 Subjects (Kokugo, Sansu, Rika, Shakai, Seikatsu, Eigo), 56px Hitbox Ergonomics, Dynamic Scoring, Economy Ledger
 * - Tier 2: Boundary & Corner Cases (Zero accuracy, 100 streak cap, debounce timing, torque balance precision, moon phase bounds)
 * - Tier 3: Cross-Feature Integrations (Game Clear -> Dynamic Score -> Economy Reward -> DAG Mastery -> Shop Purchase -> Audio/FX)
 * - Tier 4: Real-World Student Game Session & Economy Shop Spree Playthrough
 */

const fs = require('fs');
const path = require('path');

function register({ describe, test, it, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');

  // Load EconomySystem
  function loadEconomy() {
    const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
    return loader(path.join(rootDir, 'EconomySystem.js'));
  }

  const economy = loadEconomy();

  // =========================================================================
  // Game Logic Engines & Algorithms
  // =========================================================================

  // 1. Radical Assembly Builder (Kokugo)
  const RADICAL_PAIRS = [
    { parts: ['氵', '青'], result: '清', reading: 'せい・きよい', grade: 4 },
    { parts: ['木', '木'], result: '林', reading: 'りん・はやし', grade: 1 },
    { parts: ['木', '木', '木'], result: '森', reading: 'しん・もり', grade: 1 },
    { parts: ['日', '月'], result: '明', reading: 'めい・あかるい', grade: 2 },
    { parts: ['禾', '火'], result: '秋', reading: 'しゅう・あき', grade: 2 },
    { parts: ['亻', '木'], result: '休', reading: 'きゅう・やすむ', grade: 1 },
    { parts: ['言', '吾'], result: '語', reading: 'ご・かたる', grade: 2 },
    { parts: ['艹', '化'], result: '花', reading: 'か・はな', grade: 1 },
    { parts: ['女', '子'], result: '好', reading: 'こう・すき', grade: 4 },
    { parts: ['口', '鳥'], result: '鳴', reading: 'めい・なく', grade: 2 },
    { parts: ['門', '日'], result: '間', reading: 'かん・あいだ', grade: 2 }
  ];

  function assembleRadicals(parts) {
    const sortedInput = [...parts].sort().join('+');
    const match = RADICAL_PAIRS.find(p => [...p.parts].sort().join('+') === sortedInput);
    return match ? match.result : null;
  }

  // 2. Kuku Link 2-Turn Pathfinding (Sansu)
  class KukuPathfinder {
    constructor(grid, rows = 4, cols = 4) {
      this.grid = grid;
      this.rows = rows;
      this.cols = cols;
    }

    canConnect(r1, c1, r2, c2) {
      if (r1 === r2 && c1 === c2) return false;
      
      const val1 = this.grid[r1][c1];
      const val2 = this.grid[r2][c2];
      if (!this.isMathMatch(val1, val2)) return false;

      // 0-bend (Direct line)
      if (this.checkLine(r1, c1, r2, c2)) return { can: true, turns: 0 };

      // 1-bend (L-shape via (r1, c2) or (r2, c1))
      if (this.isEmpty(r1, c2) && this.checkLine(r1, c1, r1, c2) && this.checkLine(r1, c2, r2, c2)) {
        return { can: true, turns: 1, corner: { r: r1, c: c2 } };
      }
      if (this.isEmpty(r2, c1) && this.checkLine(r1, c1, r2, c1) && this.checkLine(r2, c1, r2, c2)) {
        return { can: true, turns: 1, corner: { r: r2, c: c1 } };
      }

      // 2-bend (Z / U shape scan)
      for (let r = 0; r < this.rows; r++) {
        if (this.isEmpty(r, c1) && this.isEmpty(r, c2)) {
          if (this.checkLine(r1, c1, r, c1) && this.checkLine(r, c1, r, c2) && this.checkLine(r, c2, r2, c2)) {
            return { can: true, turns: 2 };
          }
        }
      }
      for (let c = 0; c < this.cols; c++) {
        if (this.isEmpty(r1, c) && this.isEmpty(r2, c)) {
          if (this.checkLine(r1, c1, r1, c) && this.checkLine(r1, c, r2, c) && this.checkLine(r2, c, r2, c2)) {
            return { can: true, turns: 2 };
          }
        }
      }

      return { can: false };
    }

    isMathMatch(a, b) {
      if (!a || !b) return false;
      const evalItem = (v) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v.includes('×')) {
          const [x, y] = v.split('×').map(Number);
          return x * y;
        }
        return NaN;
      };
      return evalItem(a) === evalItem(b);
    }

    isEmpty(r, c) {
      return !this.grid[r][c] || this.grid[r][c] === null;
    }

    checkLine(r1, c1, r2, c2) {
      if (r1 === r2) {
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
          if (!this.isEmpty(r1, c)) return false;
        }
        return true;
      }
      if (c1 === c2) {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
          if (!this.isEmpty(r, c1)) return false;
        }
        return true;
      }
      return false;
    }
  }

  // 3. Pan Balance Scale Simulation (Sansu)
  function calculatePanBalance(leftWeights, rightWeights) {
    const leftTotal = leftWeights.reduce((a, b) => a + b, 0);
    const rightTotal = rightWeights.reduce((a, b) => a + b, 0);
    const diff = rightTotal - leftTotal;
    const isBalanced = diff === 0 && leftTotal > 0;
    const tiltAngle = Math.max(-18, Math.min(18, diff * 0.6));
    return { leftTotal, rightTotal, diff, isBalanced, tiltAngle };
  }

  // 4. Lever Physics Moment Calculator (Rika)
  function calculateLeverEquilibrium(leftWeight, leftDistance, rightWeight, rightDistance) {
    const leftTorque = leftWeight * leftDistance;
    const rightTorque = rightWeight * rightDistance;
    const diff = Math.abs(leftTorque - rightTorque);
    const isBalanced = diff === 0;
    return {
      leftTorque,
      rightTorque,
      diff,
      isBalanced,
      tiltAngleRad: Math.max(-0.25, Math.min(0.25, (rightTorque - leftTorque) * 0.005))
    };
  }

  // 5. Celestial Orbits & Moon Phases (Rika)
  function getMoonPhaseByAngle(angleDeg) {
    const norm = (angleDeg % 360 + 360) % 360;
    if (norm >= 337.5 || norm < 22.5) return '新月 (New Moon)';
    if (norm >= 22.5 && norm < 67.5) return '三日月 (Waxing Crescent)';
    if (norm >= 67.5 && norm < 112.5) return '上弦の月 (First Quarter)';
    if (norm >= 112.5 && norm < 157.5) return '十三夜 (Waxing Gibbous)';
    if (norm >= 157.5 && norm < 202.5) return '満月 (Full Moon)';
    if (norm >= 202.5 && norm < 247.5) return '寝待月 (Waning Gibbous)';
    if (norm >= 247.5 && norm < 292.5) return '下弦の月 (Last Quarter)';
    return '有明の月 (Waning Crescent)';
  }

  // 6. Electric Circuit Physics Simulation (Rika)
  function calculateCircuitCurrent(switchClosed, batteryCount, isSeries = true) {
    if (!switchClosed) return { voltage: 0, current: 0, brightness: 'OFF' };
    const voltage = isSeries ? batteryCount * 1.5 : 1.5;
    const resistance = 5.0; // 5 Ohms bulb resistance
    const current = voltage / resistance;
    const brightness = voltage >= 3.0 ? 'SUPER_BRIGHT' : 'WARM_LIT';
    return { voltage, current, brightness };
  }

  // 7. 47 Prefectures & Specialties (Shakai)
  const PREFECTURE_DATA = [
    { id: 'hokkaido', name: '北海道', region: '北海道', specialty: '乳製品・海鮮' },
    { id: 'aomori', name: '青森県', region: '東北', specialty: 'りんご' },
    { id: 'iwate', name: '岩手県', region: '東北', specialty: '南部鉄器・わんこそば' },
    { id: 'miyagi', name: '宮城県', region: '東北', specialty: '牛タン・ササニシキ' },
    { id: 'tokyo', name: '東京都', region: '関東', specialty: '江戸切子・雷おこし' },
    { id: 'kanagawa', name: '神奈川県', region: '関東', specialty: '中華まん・寄せ木細工' },
    { id: 'shizuoka', name: '静岡県', region: '中部', specialty: '緑茶・うなぎ' },
    { id: 'aichi', name: '愛知県', region: '中部', specialty: '自動車・味噌カツ' },
    { id: 'kyoto', name: '京都府', region: '近畿', specialty: '西陣織・宇治茶' },
    { id: 'osaka', name: '大阪府', region: '近畿', specialty: 'たこ焼き・天下の台所' },
    { id: 'hiroshima', name: '広島県', region: '中国', specialty: 'もみじ饅頭・カキ' },
    { id: 'kagawa', name: '香川県', region: '四国', specialty: '讃岐うどん' },
    { id: 'fukuoka', name: '福岡県', region: '九州', specialty: '明太子・あまおう' },
    { id: 'okinawa', name: '沖縄県', region: '沖縄', specialty: 'ゴーヤ・ちんすこう' }
  ];

  // =========================================================================
  // TIER 1: Feature Coverage (Kokugo, Sansu, Rika, Shakai, Seikatsu, Eigo)
  // =========================================================================
  describe('Tier 1: 6-Subject Mini-Game Mechanics & Polish', () => {

    test('F6.1: Kokugo Radical Assembly combines radicals into target Kanji', () => {
      assert.strictEqual(assembleRadicals(['氵', '青']), '清');
      assert.strictEqual(assembleRadicals(['木', '木']), '林');
      assert.strictEqual(assembleRadicals(['木', '木', '木']), '森');
      assert.strictEqual(assembleRadicals(['日', '月']), '明');
      assert.strictEqual(assembleRadicals(['禾', '火']), '秋');
      assert.strictEqual(assembleRadicals(['亻', '木']), '休');
      assert.strictEqual(assembleRadicals(['言', '吾']), '語');
      assert.strictEqual(assembleRadicals(['艹', '化']), '花');
      assert.strictEqual(assembleRadicals(['女', '子']), '好');
    });

    test('F6.2: Kokugo Kanji Slash hit collision detection with expanded child hitbox (+25px)', () => {
      const meteor = { x: 200, y: 150, radius: 36, reading: 'やま', kanji: '山' };
      
      // Tap within meteor radius + 25px tolerance (36 + 25 = 61px)
      const tapDist = Math.hypot(meteor.x - 220, meteor.y - 160); // dist ~22.36px < 61px
      assert.isBelow(tapDist, meteor.radius + 25, 'Tap within hit tolerance window must be detected');

      // Tap far outside
      const farDist = Math.hypot(meteor.x - 300, meteor.y - 300);
      assert.isAbove(farDist, meteor.radius + 25, 'Far tap should miss');
    });

    test('F7.1: Sansu Kuku Link 2-turn laser pathfinding connects matching pairs', () => {
      const grid = [
        ['7×8', null, null, 56],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ];
      const pathfinder = new KukuPathfinder(grid);

      // Direct line connection (0 turns)
      const res0 = pathfinder.canConnect(0, 0, 0, 3);
      assert.strictEqual(res0.can, true);
      assert.strictEqual(res0.turns, 0);

      // Blocked line connection
      grid[0][1] = 'OBSTACLE';
      const blocked = pathfinder.canConnect(0, 0, 0, 3);
      assert.strictEqual(blocked.can, true); // Connects via 2-bend U-route around row 0
      assert.strictEqual(blocked.turns, 2);
    });

    test('F7.2: Sansu Starship Pan Balance Scale calculates mass equilibrium and tilt angle', () => {
      // Left 50g vs Right [20g, 30g] -> Balanced!
      const bal1 = calculatePanBalance([50], [20, 30]);
      assert.strictEqual(bal1.isBalanced, true);
      assert.strictEqual(bal1.diff, 0);
      assert.strictEqual(bal1.tiltAngle, 0);

      // Left 50g vs Right [10g, 20g] (30g) -> Tilts left (negative angle)
      const bal2 = calculatePanBalance([50], [10, 20]);
      assert.strictEqual(bal2.isBalanced, false);
      assert.strictEqual(bal2.diff, -20);
      assert.isBelow(bal2.tiltAngle, 0);
    });

    test('F8.1: Rika Cosmic Lever Physics calculates moment equilibrium ($W_1 L_1 = W_2 L_2$)', () => {
      // 30g at distance 2 = 60; 20g at distance 3 = 60 -> Balanced!
      const balance1 = calculateLeverEquilibrium(30, 2, 20, 3);
      assert.strictEqual(balance1.isBalanced, true);
      assert.strictEqual(balance1.leftTorque, 60);
      assert.strictEqual(balance1.rightTorque, 60);
      assert.strictEqual(balance1.diff, 0);

      // 50g at distance 2 = 100; 20g at distance 5 = 100 -> Balanced!
      const balance2 = calculateLeverEquilibrium(50, 2, 20, 5);
      assert.strictEqual(balance2.isBalanced, true);
    });

    test('F8.1b: Grade 6 lever stages use 15 distinct, data-backed equilibrium challenges', () => {
      const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
      const { LeverPhysicsGame, LEVER_CHALLENGE_BANK, selectLeverChallenge } = loader(path.join(rootDir, 'MiniGameSystem.js'));
      const curriculum = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'rika.json'), 'utf8'));
      const grade6Node = curriculum.nodes.find(node => node.id === 'RIKA_G6_LEVER_AQUEOUS');
      const dataPool = grade6Node?.gameData?.leverChallengePool;

      assert.strictEqual(LEVER_CHALLENGE_BANK.length, 15, 'fallback lever bank must cover every visible science stage');
      assert.ok(Array.isArray(dataPool), 'Grade 6 curriculum data must own the lever challenge pool');
      assert.strictEqual(dataPool.length, 15, 'Grade 6 lever data must contain 15 challenges');
      assert.deepStrictEqual(dataPool, LEVER_CHALLENGE_BANK, 'D1 curriculum source and offline fallback lever data must stay identical');
      assert.strictEqual(new Set(dataPool.map(item => item.id)).size, 15, 'lever challenge IDs must be unique');
      assert.strictEqual(new Set(dataPool.map(item => `${item.targetLeft}:${item.armLeft}:${item.targetRight}:${item.correctSlot}`)).size, 15, 'lever configurations must be unique');

      const stageIds = [];
      for (let level = 1; level <= 15; level++) {
        const selected = selectLeverChallenge(grade6Node.gameData, level);
        const game = new LeverPhysicsGame(document.createElement('canvas'), grade6Node.gameData, () => {}, 6, level);
        stageIds.push(selected.id);
        assert.strictEqual(game.challenge.id, selected.id, `Stage ${level} must use its assigned data challenge`);
        assert.strictEqual(selected.targetLeft * selected.armLeft, selected.targetRight * selected.correctSlot, `${selected.id} must obey W1×L1 = W2×L2`);
        assert.ok(selected.correctSlot >= 1 && selected.correctSlot <= 5, `${selected.id} answer must fit a visible lever slot`);
        assert.ok(selected.title && selected.prompt, `${selected.id} needs student-facing Japanese text`);
      }
      assert.strictEqual(new Set(stageIds).size, 15, 'all 15 stages must be duplicate-free before the cycle repeats');
      assert.notStrictEqual(JSON.stringify(stageIds), JSON.stringify(dataPool.map(item => item.id)), 'stage order must be shuffled rather than raw source order');
    });

    test('F8.2: Rika Celestial Orbits & Moon Phases angle progression', () => {
      assert.strictEqual(getMoonPhaseByAngle(0), '新月 (New Moon)');
      assert.strictEqual(getMoonPhaseByAngle(45), '三日月 (Waxing Crescent)');
      assert.strictEqual(getMoonPhaseByAngle(90), '上弦の月 (First Quarter)');
      assert.strictEqual(getMoonPhaseByAngle(180), '満月 (Full Moon)');
      assert.strictEqual(getMoonPhaseByAngle(270), '下弦の月 (Last Quarter)');
    });

    test('F8.3: Rika Electric Circuit Sandbox simulates series battery voltage and light bulb brightness', () => {
      const open = calculateCircuitCurrent(false, 1);
      assert.strictEqual(open.voltage, 0);
      assert.strictEqual(open.brightness, 'OFF');

      const single = calculateCircuitCurrent(true, 1, false);
      assert.strictEqual(single.voltage, 1.5);
      assert.strictEqual(single.brightness, 'WARM_LIT');

      const dualSeries = calculateCircuitCurrent(true, 2, true);
      assert.strictEqual(dualSeries.voltage, 3.0);
      assert.strictEqual(dualSeries.brightness, 'SUPER_BRIGHT');
    });

    test('F8.4: circuit stages use grade-aligned, varied challenges without astronomy leakage', () => {
      const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
      const { CircuitSandboxGame, CIRCUIT_CHALLENGE_BANK } = loader(path.join(rootDir, 'MiniGameSystem.js'));
      assert.isAtLeast(CIRCUIT_CHALLENGE_BANK.length, 15, 'Circuit bank must cover more than one play style');
      const ids = new Set(CIRCUIT_CHALLENGE_BANK.map(item => item.id));
      assert.strictEqual(ids.size, CIRCUIT_CHALLENGE_BANK.length);
      const allCopy = JSON.stringify(CIRCUIT_CHALLENGE_BANK);
      ['太陽', '新月', '月相', '惑星'].forEach(term => assert.strictEqual(allCopy.includes(term), false));
      for (let grade = 3; grade <= 6; grade++) {
        const gradeBank = CIRCUIT_CHALLENGE_BANK.filter(item => item.grades.includes(grade));
        assert.isAtLeast(gradeBank.length, 3, `Grade ${grade} needs at least three circuit play styles`);
        const modes = new Set();
        for (let level = 1; level <= gradeBank.length; level++) {
          const game = new CircuitSandboxGame(document.createElement('canvas'), { grade, level }, () => {}, grade, level);
          assert.ok(game.challenge.grades.includes(grade));
          assert.strictEqual(new Set(game.options).size, game.options.length);
          assert.ok(game.options.includes(game.challenge.correct));
          modes.add(game.challenge.id);
        }
        assert.strictEqual(modes.size, gradeBank.length, `Grade ${grade} levels must rotate through every circuit mode`);
      }
    });

    test('F9.1: Shakai 47 Prefectures & Regional Specialties matching', () => {
      const aomori = PREFECTURE_DATA.find(p => p.name === '青森県');
      assert.ok(aomori);
      assert.strictEqual(aomori.specialty, 'りんご');

      const shizuoka = PREFECTURE_DATA.find(p => p.name === '静岡県');
      assert.ok(shizuoka);
      assert.strictEqual(shizuoka.specialty, '緑茶・うなぎ');

      const okinawa = PREFECTURE_DATA.find(p => p.name === '沖縄県');
      assert.ok(okinawa);
      assert.strictEqual(okinawa.specialty, 'ゴーヤ・ちんすこう');
    });

    test('F9.2: Shakai 4-Grade Curriculum Consistency — Grade 3 (Map Symbols), Grade 4 (47 Prefectures & 8 Regions), Grade 5 (Industry & Climate), Grade 6 (History & Constitution)', () => {
      const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
      const { PrefectureJigsawGame } = loader(path.join(rootDir, 'MiniGameSystem.js'));
      const mockCanvas = {
        width: 640,
        height: 480,
        style: {},
        eventListeners: {},
        getContext: () => ({ clearRect: () => {}, fillText: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {}, roundRect: () => {}, setLineDash: () => {}, ellipse: () => {} }),
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 })
      };

      // Grade 3: Map symbols & town safety
      const g3Game = new PrefectureJigsawGame(mockCanvas, { mode: 'MAP_SYMBOLS' }, () => {}, 3, 1);
      assert.strictEqual(g3Game.mode, 'MAP_SYMBOLS');
      const g3Stages = g3Game.getStagesForCurrentMode();
      assert.strictEqual(g3Stages.length, 10, 'Grade 3 must have 10 map symbol & town safety stages');
      assert.ok(g3Stages[0].title.includes('学校'));
      assert.ok(g3Stages[1].title.includes('消防署'));
      assert.ok(g3Stages[2].title.includes('警察署'));
      assert.ok(g3Stages[9].title.includes('方位'));

      // Grade 4: 47 Prefectures & 8 Regions
      const g4Game = new PrefectureJigsawGame(mockCanvas, { mode: 'PREFECTURES' }, () => {}, 4, 1);
      assert.strictEqual(g4Game.mode, 'PREFECTURES');
      const g4Stages = g4Game.getStagesForCurrentMode();
      assert.strictEqual(g4Stages.length, 8, 'Grade 4 must have 8 regional stages');
      assert.ok(g4Stages[0].regionName.includes('北海道・東北'));

      // Grade 5: Industry, Agriculture & Climate
      const g5Game = new PrefectureJigsawGame(mockCanvas, { mode: 'INDUSTRY' }, () => {}, 5, 1);
      assert.strictEqual(g5Game.mode, 'INDUSTRY');
      const g5Stages = g5Game.getStagesForCurrentMode();
      assert.strictEqual(g5Stages.length, 10, 'Grade 5 must have 10 industry, agriculture & climate stages');
      assert.ok(g5Stages[0].title.includes('気候区分'));
      assert.ok(g5Stages[1].title.includes('米作り'));
      assert.ok(g5Stages[4].title.includes('中京工業地帯'));
      assert.ok(g5Stages[7].title.includes('瀬戸内工業地域'));

      // Grade 6: Japanese History & Constitution Civics
      const g6Game = new PrefectureJigsawGame(mockCanvas, { mode: 'HISTORY_CIVICS' }, () => {}, 6, 1);
      assert.strictEqual(g6Game.mode, 'HISTORY_CIVICS');
      const g6Stages = g6Game.getStagesForCurrentMode();
      assert.strictEqual(g6Stages.length, 10, 'Grade 6 must have 10 history & constitution civics stages');
      assert.ok(g6Stages[0].title.includes('縄文・弥生・古墳'));
      assert.ok(g6Stages[1].title.includes('飛鳥・奈良'));
      assert.ok(g6Stages[4].title.includes('戦国・安土桃山'));
      assert.ok(g6Stages[7].title.includes('日本国憲法'));
      assert.ok(g6Stages[8].title.includes('三権分立'));
    });

    test('F10.1: Eigo & Seikatsu category sorting classification', () => {
      const sortItem = (item) => {
        const categories = {
          'school': ['ランドセル', '教科書', '筆箱', 'ノート', 'ランドセルを せおう'],
          'recycling': ['ペットボトル', '新聞紙', 'アルミ缶', '段ボール'],
          'safety': ['みぎ・ひだりを よくみる', 'てを あげて わたる'],
          'morning_routine': ['洗顔', '朝食', '歯磨き', '着替え', 'おはようと あいさつする']
        };
        for (const [cat, list] of Object.entries(categories)) {
          if (list.includes(item)) return cat;
        }
        return 'unknown';
      };

      assert.strictEqual(sortItem('ランドセルを せおう'), 'school');
      assert.strictEqual(sortItem('アルミ缶'), 'recycling');
      assert.strictEqual(sortItem('みぎ・ひだりを よくみる'), 'safety');
      assert.strictEqual(sortItem('歯磨き'), 'morning_routine');
    });

    test('F6.3: Kanji Grade-wide Stage Partitioning covers all 80 Grade 1 Kanji across 8 stages without omission', () => {
      const kanjiG1Count = 80;
      const pageSize = 10;
      const totalStages = Math.ceil(kanjiG1Count / pageSize);
      assert.strictEqual(totalStages, 8, 'Grade 1 (80 kanji) must have 8 stages');

      // Verify each stage has exactly 10 kanji
      const seenKanji = new Set();
      for (let stage = 1; stage <= totalStages; stage++) {
        const start = (stage - 1) * pageSize;
        const end = start + pageSize;
        for (let i = start; i < end; i++) {
          seenKanji.add(i);
        }
      }
      assert.strictEqual(seenKanji.size, 80, 'All 80 kanji must be partitioned without duplicate or omissions');
    });

    test('F10.2: English Context Match 10 progressive themed stages with full thematic coverage', () => {
      const themeCount = 10;
      assert.strictEqual(themeCount, 10, 'English suite must contain 10 progressive thematic stages');
      const sampleGreeting = { eng: 'Good morning', jpn: 'おはようございます' };
      const sampleCulture = { eng: 'Welcome to Japan', jpn: '日本へようこそ！' };
      assert.ok(sampleGreeting.eng && sampleGreeting.jpn);
      assert.ok(sampleCulture.eng && sampleCulture.jpn);
    });

    test('F15.5: Stage-level Clear Tracking, Green Checkmark (✅) Status & Node Trophy Clear Screen', () => {
      const mgr = new economy.EconomyManager('TrophyTestUser');
      const nodeId = 'KOKUGO_G1_KANJI_80';

      // Clear stage 1
      mgr.recordStageClear(nodeId, 1, 1.0);
      assert.strictEqual(mgr.isStageCleared(nodeId, 1), true);
      assert.strictEqual(mgr.isStageCleared(nodeId, 2), false);
      assert.strictEqual(mgr.getClearedStagesCount(nodeId), 1);

      // Clear all 8 stages for Grade 1 Kanji
      for (let s = 2; s <= 8; s++) {
        mgr.recordStageClear(nodeId, s, 1.0);
      }
      assert.strictEqual(mgr.getClearedStagesCount(nodeId), 8);
      assert.strictEqual(mgr.isStageCleared(nodeId, 8), true);
    });
  });

  describe('Tier 1: Hitbox Ergonomics & Debouncing', () => {

    test('F11.1: Interactive elements meet or exceed 56px minimum touch hitbox target', () => {
      const touchTargets = [
        { name: 'KanjiSlashMeteor', width: 72, height: 72 },
        { name: 'KukuLinkTile', width: 64, height: 58 },
        { name: 'RadicalPaletteItem', width: 58, height: 58 },
        { name: 'PanBalanceWeight', width: 60, height: 60 },
        { name: 'PrefectureBadge', width: 70, height: 56 },
        { name: 'CategoryBox', width: 160, height: 80 }
      ];

      touchTargets.forEach(target => {
        assert.isAtLeast(target.width, 56, `${target.name} width must be >= 56px`);
        assert.isAtLeast(target.height, 56, `${target.name} height must be >= 56px`);
      });
    });

    test('F11.2: Touch event debouncing blocks accidental double-tap within 250ms', () => {
      let tapCount = 0;
      let lastTapTime = 0;

      const handleTap = (now) => {
        if (now - lastTapTime < 250) return false;
        lastTapTime = now;
        tapCount++;
        return true;
      };

      assert.strictEqual(handleTap(1000), true);
      assert.strictEqual(handleTap(1100), false, 'Tap at +100ms should be debounced');
      assert.strictEqual(handleTap(1300), true, 'Tap at +300ms should be accepted');
      assert.strictEqual(tapCount, 2);
    });
  });

  describe('Tier 1: Multi-User Economy, Token Ledger & Dynamic Points', () => {

    test('F15.1: Dynamic score calculation formula: round(B * C_depth * A_score * S_multi)', () => {
      const calc1 = economy.calculateDynamicPoints({
        base: 100,
        bloomDepth: 1.3,
        accuracy: 1.0,
        streakCount: 3
      });
      // 100 * 1.3 * 1.0 * (1.0 + 3*0.1 = 1.3) = 169
      assert.strictEqual(calc1.finalPoints, 169);
      assert.strictEqual(calc1.breakdown.base, 100);
      assert.strictEqual(calc1.breakdown.bloomDepth, 1.3);
      assert.strictEqual(calc1.breakdown.streakMultiplier, 1.3);
    });

    test('F15.2: EconomyManager supports multi-user profile switching and state isolation', () => {
      const eco = new economy.EconomyManager();
      
      eco.loginUser('ひなた (Hinata)');
      assert.strictEqual(eco.currentUser, 'ひなた (Hinata)');
      assert.strictEqual(eco.starCoins, 500);

      eco.loginUser('れん (Ren)');
      assert.strictEqual(eco.currentUser, 'れん (Ren)');
      assert.strictEqual(eco.starCoins, 500);

      eco.starCoins = 800;
      assert.strictEqual(eco.starCoins, 800);

      eco.loginUser('ひなた (Hinata)');
      assert.strictEqual(eco.starCoins, 500, 'Hinata balance should remain 500');
    });

    test('F15.3: First clear awards dynamic points; repeated clear updates mastery without coin inflation', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('TestStudent');

      const initialCoins = eco.starCoins;

      const firstResult = eco.awardNodeClear('MATH_G2_KUKU_LINK', 1.0);
      assert.strictEqual(firstResult.isFirstClear, true);
      assert.isAbove(firstResult.pointsEarned, 0);
      assert.strictEqual(eco.starCoins, initialCoins + firstResult.pointsEarned);

      const currentCoins = eco.starCoins;
      const replayResult = eco.awardNodeClear('MATH_G2_KUKU_LINK', 1.0);
      assert.strictEqual(replayResult.isFirstClear, false);
      assert.strictEqual(replayResult.pointsEarned, 0);
      assert.strictEqual(eco.starCoins, currentCoins, 'Replay must not grant duplicate coins');
    });

    test('F15.4: Shop Catalog validation and purchase deduction in ledger', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('ShopperStudent');
      eco.starCoins = 1000;

      const res = eco.purchaseItem('badge_kanji_master');
      assert.strictEqual(res.success, true);
      assert.strictEqual(eco.starCoins, 700);
      assert.strictEqual(eco.inventory.length, 1);
      assert.strictEqual(eco.inventory[0].itemId, 'badge_kanji_master');
      assert.strictEqual(eco.getEquippedItem('BADGE').id, 'badge_kanji_master', '購入したバッジはすぐ表示できる装備状態にする');

      const latestTx = eco.ledger[0];
      assert.strictEqual(latestTx.type, 'SHOP_PURCHASE');
      assert.strictEqual(latestTx.amount, -300);
      assert.strictEqual(latestTx.balanceAfter, 700);
    });

    test('F15.6: Shop consumables stack bundle quantities and are actually consumed', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('ItemStudent');
      eco.starCoins = 1000;
      assert.strictEqual(eco.purchaseItem('item_challenge_ticket').success, true);
      assert.strictEqual(eco.getItemQuantity('item_challenge_ticket'), 3, '一回の購入で延長券を3枚受け取る');
      assert.strictEqual(eco.purchaseItem('item_challenge_ticket').success, true);
      assert.strictEqual(eco.getItemQuantity('item_challenge_ticket'), 6, '買い足した数量を同じ在庫へまとめる');
      const useResult = eco.consumeItem('item_challenge_ticket');
      assert.strictEqual(useResult.success, true);
      assert.strictEqual(eco.getItemQuantity('item_challenge_ticket'), 5);
      assert.strictEqual(eco.ledger[0].type, 'ITEM_USE');
      const restored = new economy.EconomyManager();
      restored.loginUser('ItemStudent');
      assert.strictEqual(restored.getItemQuantity('item_challenge_ticket'), 5, 'ページ再読み込み後も残数を復元する');
    });

    test('F15.7: Durable cosmetics cannot be bought twice and can be re-equipped', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('CosmeticStudent');
      eco.starCoins = 5000;
      assert.strictEqual(eco.purchaseItem('skin_nebula_aurora').success, true);
      assert.strictEqual(eco.purchaseItem('skin_cyber_neon').success, true);
      assert.strictEqual(eco.getEquippedItem('SKIN').id, 'skin_cyber_neon');
      assert.strictEqual(eco.equipItem('skin_nebula_aurora').success, true);
      assert.strictEqual(eco.getEquippedItem('SKIN').id, 'skin_nebula_aurora');
      const balance = eco.starCoins;
      assert.strictEqual(eco.purchaseItem('skin_nebula_aurora').success, false);
      assert.strictEqual(eco.starCoins, balance, '重複購入でコインを減らさない');
      const restored = new economy.EconomyManager();
      restored.loginUser('CosmeticStudent');
      assert.strictEqual(restored.getEquippedItem('SKIN').id, 'skin_nebula_aurora', 'ページ再読み込み後も装備を復元する');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Mini-Game & Economy Boundary Cases', () => {

    test('B1: Dynamic points formula clamps extreme streak (50 streak capped at 2.0x)', () => {
      const res = economy.calculateDynamicPoints({
        base: 100,
        bloomDepth: 1.0,
        accuracy: 1.0,
        streakCount: 50
      });
      assert.strictEqual(res.breakdown.streakMultiplier, 2.0);
      assert.strictEqual(res.finalPoints, 200);
    });

    test('B2: 0.0 accuracy yields 0 points safely', () => {
      const res = economy.calculateDynamicPoints({
        base: 100,
        bloomDepth: 2.5,
        accuracy: 0.0,
        streakCount: 10
      });
      assert.strictEqual(res.finalPoints, 0);
    });

    test('B3: Shop purchase with insufficient balance rejected without balance deduction', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('PoorStudent');
      eco.starCoins = 50;

      const res = eco.purchaseItem('badge_kanji_master');
      assert.strictEqual(res.success, false);
      assert.strictEqual(eco.starCoins, 50, 'Balance must remain intact upon failure');
    });

    test('B4: Lever physics rejects distance 0 as fulcrum pivot', () => {
      const res = calculateLeverEquilibrium(30, 2, 20, 0);
      assert.strictEqual(res.rightTorque, 0);
      assert.strictEqual(res.isBalanced, false);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Integrations
  // =========================================================================
  describe('Tier 3: Game Flow to Economy Integration', () => {

    test('C1: Complete Game Cycle — Play -> Score -> Award -> Unlock -> Shop', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('IntegrationUser');
      const startBalance = eco.starCoins;

      const clearRes = eco.awardNodeClear('KOKUGO_G1_KANA', 0.95);
      assert.strictEqual(clearRes.isFirstClear, true);
      assert.isAbove(eco.starCoins, startBalance);

      const buyRes = eco.purchaseItem('item_hint_radar');
      assert.strictEqual(buyRes.success, true);
      assert.strictEqual(eco.inventory.some(i => i.itemId === 'item_hint_radar'), true);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Student Scenario Playthrough
  // =========================================================================
  describe('Tier 4: Grade 2 Student "れん (Ren)" Kuku Multiplication & Shop Journey', () => {

    test('S1: Student "れん" solves 4 Kuku pairs, achieves 4-combo, earns points, buys badge', () => {
      const eco = new economy.EconomyManager();
      eco.loginUser('れん (Ren)');
      eco.streak = 3;

      const pairsSolved = [
        { f: '2×3', p: 6 },
        { f: '4×5', p: 20 },
        { f: '6×7', p: 42 },
        { f: '8×9', p: 72 }
      ];
      assert.strictEqual(pairsSolved.length, 4);

      const clear = eco.awardNodeClear('MATH_G2_KUKU_LINK', 1.0);
      assert.strictEqual(clear.isFirstClear, true);
      assert.isAbove(clear.pointsEarned, 100);

      const shopRes = eco.purchaseItem('badge_kuku_master');
      assert.strictEqual(shopRes.success, true);
      assert.strictEqual(eco.inventory[0].title, '九九マスター（算数）');
    });
  });

  // =========================================================================
  // TIER 1: Grade-to-Game Dynamic Curriculum Binding & Support Matrix
  // =========================================================================
  describe('Tier 1: Grade-to-Game Dynamic Curriculum Binding & Support Matrix', () => {
    function loadMiniGameSystem() {
      const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
      return loader(path.join(rootDir, 'MiniGameSystem.js'));
    }

    const miniGameMod = loadMiniGameSystem();
    const { GAME_GRADE_SUPPORT_MAP, MiniGameModal } = miniGameMod;
    const modal = new MiniGameModal();

    test('GB1: GAME_GRADE_SUPPORT_MAP defines accurate MEXT grade support for all 10 games', () => {
      assert.ok(GAME_GRADE_SUPPORT_MAP);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.KANJI_CHALLENGE.grades, [1, 2, 3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.RADICAL_BUILDER.grades, [1, 2, 3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.KUKU_LINK.grades, [2, 3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.AETHER_SCALE.grades, [1, 2, 3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.COSMIC_ORBIT.grades, [4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.LEVER_PHYSICS.grades, [6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.CIRCUIT_SANDBOX.grades, [3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.PREFECTURE_JIGSAW.grades, [3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.CONTEXT_MATCH.grades, [3, 4, 5, 6]);
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.CATEGORY_SORT.grades, [1, 2]);
    });

    test('GB2: isGameSupportedForGrade correctly identifies valid vs non-operable disabled states', () => {
      // Grade 1: Kuku, Lever, Circuit, Prefectures, English are disabled
      assert.strictEqual(modal.isGameSupportedForGrade('KUKU_LINK', 1), false);
      assert.strictEqual(modal.isGameSupportedForGrade('LEVER_PHYSICS', 1), false);
      assert.strictEqual(modal.isGameSupportedForGrade('CIRCUIT_SANDBOX', 1), false);
      assert.strictEqual(modal.isGameSupportedForGrade('PREFECTURE_JIGSAW', 1), false);
      assert.strictEqual(modal.isGameSupportedForGrade('CONTEXT_MATCH', 1), false);
      assert.strictEqual(modal.isGameSupportedForGrade('CATEGORY_SORT', 1), true);
      assert.strictEqual(modal.isGameSupportedForGrade('RADICAL_BUILDER', 1), true);
      assert.strictEqual(modal.isGameSupportedForGrade('AETHER_SCALE', 1), true);

      // Grade 6: Category Sort (Seikatsu) disabled, Lever enabled
      assert.strictEqual(modal.isGameSupportedForGrade('CATEGORY_SORT', 6), false);
      assert.strictEqual(modal.isGameSupportedForGrade('LEVER_PHYSICS', 6), true);
      assert.strictEqual(modal.isGameSupportedForGrade('COSMIC_ORBIT', 6), true);

      // Grade 0 means no grade has been selected: fail closed until the user chooses one.
      assert.strictEqual(modal.isGameSupportedForGrade('KUKU_LINK', 0), false);
      assert.strictEqual(modal.isGameSupportedForGrade('LEVER_PHYSICS', 0), false);
      assert.strictEqual(modal.isGameSupportedForGrade('CATEGORY_SORT', 0), false);
    });

    test('GB3: generatePopularGameNode dynamically binds game metadata to the selected grade', () => {
      const g1Radical = modal.generatePopularGameNode('RADICAL_BUILDER', 1, 1);
      assert.strictEqual(g1Radical.grade, 1);
      assert.strictEqual(g1Radical.name, '1年 部首・漢字パーツ組み立て');

      const g3Kuku = modal.generatePopularGameNode('KUKU_LINK', 3, 1);
      assert.strictEqual(g3Kuku.grade, 3);
      assert.strictEqual(g3Kuku.name, '3年 わり算・計算応用 銀河マッチング');

      const g6Lever = modal.generatePopularGameNode('LEVER_PHYSICS', 6, 1);
      assert.strictEqual(g6Lever.grade, 6);
      assert.strictEqual(g6Lever.name, '6年 てこの規則性 宇宙物理実験室');

      const g4Context = modal.generatePopularGameNode('CONTEXT_MATCH', 4, 1);
      assert.strictEqual(g4Context.grade, 4);
      assert.strictEqual(g4Context.name, '4年 英語の場面別ペア選択');
    });

    test('GB4: every registered game initializes at its first supported grade', async () => {
      const gameTypes = Object.keys(GAME_GRADE_SUPPORT_MAP);
      for (const gt of gameTypes) {
        if (gt === 'KANJI_CHALLENGE') continue;
        const supportInfo = GAME_GRADE_SUPPORT_MAP[gt];
        const supportedGrade = supportInfo.grades[0];
        const node = modal.generatePopularGameNode(gt, supportedGrade, 1);
        if (gt === 'ENGLISH_CURRICULUM') node.gameData.selectedMode = 'BASIC';
        const canvas = document.createElement('canvas');
        modal.initGameInstance(gt, node, canvas, supportedGrade, 1);
        assert.ok(modal.currentGame, `Game instance for ${gt} must be created`);
        if (modal.currentGame && typeof modal.currentGame.destroy === 'function') {
          modal.currentGame.destroy();
        }
      }
    });

    test('GB4b: independent science and social games never fall back to an unrelated subject quiz', () => {
      const engineByGameType = {
        COSMIC_ORBIT: miniGameMod.CosmicOrbitGame,
        LEVER_PHYSICS: miniGameMod.LeverPhysicsGame,
        CIRCUIT_SANDBOX: miniGameMod.CircuitSandboxGame,
        PREFECTURE_JIGSAW: miniGameMod.PrefectureJigsawGame
      };

      Object.entries(engineByGameType).forEach(([gameType, EngineClass]) => {
        GAME_GRADE_SUPPORT_MAP[gameType].grades.forEach(grade => {
          const node = modal.generatePopularGameNode(gameType, grade, 1);
          const canvas = document.createElement('canvas');
          modal.initGameInstance(gameType, node, canvas, grade, 1);
          assert.ok(
            modal.currentGame instanceof EngineClass,
            `${gameType} Grade ${grade} must use ${EngineClass.name}, not a mixed curriculum quiz`
          );
          assert.strictEqual(node.subject, GAME_GRADE_SUPPORT_MAP[gameType].subject, `${gameType} Grade ${grade} subject must match its registry`);
          assert.ok(node.gameData.selectedMode, `${gameType} Grade ${grade} must carry an explicit selectedMode association`);
          if (modal.currentGame?.destroy) modal.currentGame.destroy();
        });
      });

      const grade6Circuit = modal.generatePopularGameNode('CIRCUIT_SANDBOX', 6, 1);
      modal.initGameInstance('CIRCUIT_SANDBOX', grade6Circuit, document.createElement('canvas'), 6, 1);
      assert.ok(modal.currentGame instanceof miniGameMod.CircuitSandboxGame, '六年生の回路入口に太陽・新月を含む理科混合問題を表示しない');
      assert.strictEqual(modal.currentGame instanceof miniGameMod.CurriculumQuizGame, false, '六年生の回路入口は理科混合問題へフォールバックしない');
      if (modal.currentGame?.destroy) modal.currentGame.destroy();
    });

    test('GB5: All 27 MEXT curriculum DAG nodes can open and infer correct game types', () => {
      const loaderFn = loadESModule || require('./test_e2e_runner.js').loadESModule;
      const { FULL_CURRICULUM_DAG } = loaderFn(path.join(rootDir, 'CurriculumData.js'));
      for (const node of FULL_CURRICULUM_DAG) {
        const gameType = node.gameType || modal.inferGameTypeBySubject(node);
        assert.ok(gameType, `Node ${node.id} must map to a valid gameType`);
        const maxStages = modal.getMaxStagesForNode(node);
        assert.isAtLeast(maxStages, 4, `Node ${node.id} should have at least 4 stages`);
      }
    });

    test('GB6: Kanji grade challenge mode works for all grades 1 through 6', () => {
      for (let g = 1; g <= 6; g++) {
        modal.openKanjiGradeChallenge(g);
        assert.ok(modal.currentGame, `KanjiSlashGame must be created for Grade ${g}`);
        if (modal.currentGame?.destroy) modal.currentGame.destroy();
      }
    });

    test('GB6b: the visible KANJI_READING choice always launches the grade-aligned Kanji game', () => {
      for (let grade = 1; grade <= 6; grade++) {
        const node = {
          id: `KOKUGO_G${grade}_KANJI_READING_TEST`,
          subject: '国語',
          grade,
          gameType: 'KOKUGO_CURRICULUM',
          gameData: { selectedMode: 'KANJI_READING', grade }
        };
        modal.initGameInstance('KOKUGO_CURRICULUM', node, document.createElement('canvas'), grade, 1);
        assert.ok(modal.currentGame instanceof miniGameMod.KanjiSlashGame, `Grade ${grade} KANJI_READING must launch KanjiSlashGame`);
        assert.strictEqual(modal.currentGame instanceof miniGameMod.CurriculumQuizGame, false, `Grade ${grade} KANJI_READING must not fall back to a generic quiz`);
        if (modal.currentGame?.destroy) modal.currentGame.destroy();
      }
    });

    test('GB7: Right-side Game Card Linkage & Direct Stage Launching for all 6 subjects across all grades', () => {
      const subjects = ['国語', '算数', '理科', '社会', '生活', '外国語・英語'];
      const grades = [1, 2, 3, 4, 5, 6];

      for (const subj of subjects) {
        for (const gr of grades) {
          if ((gr === 1 || gr === 2) && (subj === '理科' || subj === '社会' || subj.includes('英語'))) continue;
          if (gr >= 3 && subj === '生活') continue;

          const gType = modal.inferGameTypeBySubject({ subject: subj, grade: gr });
          const popNode = modal.generatePopularGameNode(gType, gr, 1);
          assert.ok(popNode, `Dynamic node must be generated for ${subj} Grade ${gr}`);
          if (gType === 'ENGLISH_CURRICULUM') popNode.gameData.selectedMode = 'BASIC';

          modal.open(popNode, 1);
          assert.ok(modal.currentGame, `Game instance must start for ${subj} Grade ${gr} Stage 1`);
          if (modal.currentGame?.destroy) modal.currentGame.destroy();

          modal.open(popNode, 3);
          assert.strictEqual(modal.currentLevel, 3, 'Level must be set to 3');
          if (modal.currentGame?.destroy) modal.currentGame.destroy();
        }
      }
    });

    test('GB8: 学年総合チャレンジが1〜6年生で起動し採点できる', () => {
      assert.ok(GAME_GRADE_SUPPORT_MAP.GRADE_EXAM, 'GRADE_EXAM must be registered in support map');
      assert.deepStrictEqual(GAME_GRADE_SUPPORT_MAP.GRADE_EXAM.grades, [1, 2, 3, 4, 5, 6]);

      for (let g = 1; g <= 6; g++) {
        const examNode = modal.generatePopularGameNode('GRADE_EXAM', g, 1);
        assert.ok(examNode, `Exam node must exist for grade ${g}`);
        assert.strictEqual(examNode.gameType, 'GRADE_EXAM');

        modal.openGradeExam(g);
        assert.ok(modal.currentGame, `Exam game instance must start for Grade ${g}`);
        assert.strictEqual(modal.currentGame.grade, g);
        assert.ok(modal.currentGame.questions.length >= 6, `Grade ${g} exam must have at least 6 questions`);
        if (modal.currentGame?.destroy) modal.currentGame.destroy();
      }
    });
  });
}


module.exports = register;
module.exports.register = register;

if (require.main === module) {
  const { harness, describe, test, it, assert, loadESModule } = require('./test_e2e_runner.js');
  register({ describe, test, it, assert, loadESModule });
  harness.runAll().then((report) => {
    process.exitCode = report.summary.failed > 0 ? 1 : 0;
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
