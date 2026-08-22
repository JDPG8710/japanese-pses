/**
 * MiniGameSystem.js - 全教科ミニゲーム自适应システム（日本語・文部科学省学習指導要領対応）
 * 
 * 1. 国語：星流漢字・ことば斬り (KanjiSlashGame) ＆ 漢字偏旁部首拼装 (RadicalBuilderGame)
 * 2. 算数：九九星際マッチング (KukuLinkGame) ＆ 星艦天平 (PanBalanceScaleGame)
 * 3. 理科：天体・月相実験室 (CosmicOrbitGame), てこ物理実験室 (LeverPhysicsGame), 回路実験室 (CircuitSandboxGame)
 * 4. 社会：日本47都道府県 列島パズル ＆ 特産品・名所尋宝 (PrefectureJigsawGame)
 * 5. 英語：情景趣味配対 (ContextMatchGame)
 * 6. 生活：生活仕分け箱 (CategorySortGame)
 */

import { FULL_CURRICULUM_DAG } from './CurriculumData.js?v=2';
import { KukuLinkGame } from './KukuLinkGame.js?v=2';
import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';
import { getErrorGuidanceSystem } from './ErrorGuidanceSystem.js';

/** Canvas cannot render HTML ruby. Grades 1-2, or unknown grade -> append hiragana after the title. */
function withKidsReading(kanjiTitle, hiragana, grade) {
  if (grade != null && Number(grade) > 2) return kanjiTitle;
  return `${kanjiTitle}（${hiragana}）`;
}


// =========================================================================
// 0. MiniGameModal - モーダル管理 ＆ ゲームルーティング
// =========================================================================
export class MiniGameModal {
  constructor() {
    this.createModalDOM();
    this.currentGame = null;
  }

  createModalDOM() {
    let modal = document.getElementById('game-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'game-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 hidden select-none';
      modal.innerHTML = `
        <div class="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
          <!-- ヘッダー -->
          <div class="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
            <div class="min-w-0 pr-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span id="game-grade-badge" class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">小学1年</span>
                <span id="game-subject-badge" class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">国語</span>
                <span id="game-mode-badge" class="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">体験学習</span>
              </div>
              <h2 id="game-title" class="text-sm sm:text-base md:text-lg font-bold text-white mt-1 truncate">ステージ読込中...</h2>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button id="game-hint-btn" class="hidden px-2.5 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition cursor-pointer min-h-[36px]">💡 ヒント</button>
              <button id="game-shuffle-btn" class="hidden px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition cursor-pointer min-h-[36px]">🌀 シャッフル</button>
              <div id="game-timer" class="text-xs sm:text-sm font-mono text-amber-400 font-bold bg-amber-400/10 px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">⏱ 60s</div>
              <button id="game-close-btn" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer" title="閉じる">✕</button>
            </div>
          </div>

          <!-- ゲームステージキャンバス -->
          <div id="game-stage" class="relative w-full h-80 sm:h-96 md:h-[420px] bg-slate-950 overflow-hidden flex items-center justify-center">
            <canvas id="game-canvas" class="w-full h-full touch-none"></canvas>
            <div id="game-overlay-ui" class="absolute inset-0 pointer-events-none"></div>
          </div>

          <!-- フッター案内とスコア -->
          <div class="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/95 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 flex-shrink-0">
            <span id="game-hint" class="truncate max-w-[65%] sm:max-w-[70%]">操作案内：画面をタップまたはドラッグして回答してください</span>
            <div id="game-score-box" class="font-mono text-white font-semibold flex-shrink-0 text-right">
              スコア: <span id="game-score" class="text-amber-400 font-bold">0</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('game-close-btn').addEventListener('click', () => this.close());
      document.getElementById('game-hint-btn').addEventListener('click', () => {
        if (this.currentGame?.useHint) this.currentGame.useHint();
      });
      document.getElementById('game-shuffle-btn').addEventListener('click', () => {
        if (this.currentGame?.useShuffle) this.currentGame.useShuffle();
      });
    }
    this.modal = modal;
  }

  // 知識ノードからゲームを開始
  open(nodeInfo) {
    this.modal.classList.remove('hidden');

    const targetNode = FULL_CURRICULUM_DAG.find(n => n.id === nodeInfo?.id) ||
                       FULL_CURRICULUM_DAG.find(n => n.subject === nodeInfo?.subject) ||
                       FULL_CURRICULUM_DAG[0];

    const gradeText = targetNode.grade ? `小学${targetNode.grade}年` : '全学年';
    document.getElementById('game-grade-badge').innerText = gradeText;
    document.getElementById('game-subject-badge').innerText = targetNode.subject || '全般';
    document.getElementById('game-title').innerText = targetNode.name || '学習ステージ';

    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-stage');
    canvas.width = container.clientWidth || 640;
    canvas.height = container.clientHeight || 384;

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    const gameType = targetNode.gameType || this.inferGameTypeBySubject(targetNode);
    this.initGameInstance(gameType, targetNode, canvas);
  }

  inferGameTypeBySubject(node) {
    const subj = node?.subject || '';
    if (subj === '国語') return 'KANJI_SLASH';
    if (subj === '算数') return node?.grade === 2 ? 'KUKU_LINK' : 'AETHER_SCALE';
    if (subj === '理科') {
      if (node?.grade === 4) return 'COSMIC_ORBIT';
      if (node?.grade === 5) return 'CIRCUIT_SANDBOX';
      return 'LEVER_PHYSICS';
    }
    if (subj === '社会') return 'PREFECTURE_JIGSAW';
    if (subj === '生活') return 'CATEGORY_SORT';
    if (subj === '外国語・英語' || subj === '英語') return 'CONTEXT_MATCH';
    return 'KANJI_SLASH';
  }

  // 特訓・人気ミニゲームから直接起動
  openPopularGame(gameType) {
    this.modal.classList.remove('hidden');

    const POPULAR_GAME_STUBS = {
      KUKU_LINK: {
        id: 'POPULAR_KUKU_LINK',
        subject: '算数',
        grade: 2,
        name: '2年 かけ算九九 星際マッチング',
        desc: '2〜9の段の九九暗唱。式と積を2曲がり以内の星際レーザーでつなごう！',
        bloomDepth: 1.3,
        gameType: 'KUKU_LINK',
        gameData: { rows: 4, cols: 4, timeLimit: 75 }
      },
      RADICAL_BUILDER: {
        id: 'POPULAR_RADICAL_BUILDER',
        subject: '国語',
        grade: 2,
        name: '2年 漢字偏旁部首拼装 (部首合成)',
        desc: 'へん・つくり・かんむり等の部首パーツを合体させて正しい漢字を完成させよう！',
        bloomDepth: 1.4,
        gameType: 'RADICAL_BUILDER'
      },
      AETHER_SCALE: {
        id: 'POPULAR_AETHER_SCALE',
        subject: '算数',
        grade: 5,
        name: '5年 割合・百分率 星艦エネルギー天秤',
        desc: '左右の天秤におもりや結晶を配置し、力と割合の平衡を達成しよう！',
        bloomDepth: 2.3,
        gameType: 'AETHER_SCALE',
        gameData: { targetRatio: 65, hint: '6割5分（65%）に合わせよう！' }
      },
      RATIO_SCALE: {
        id: 'POPULAR_RATIO_SCALE',
        subject: '算数',
        grade: 5,
        name: '5年 割合・百分率 星艦エネルギー天秤',
        desc: '左右の天秤におもりや結晶を配置し、力と割合の平衡を達成しよう！',
        bloomDepth: 2.3,
        gameType: 'AETHER_SCALE',
        gameData: { targetRatio: 65, hint: '6割5分（65%）に合わせよう！' }
      },
      COSMIC_ORBIT: {
        id: 'POPULAR_COSMIC_ORBIT',
        subject: '理科',
        grade: 4,
        name: '4年 月と星・太陽 天体軌道実験室',
        desc: '月を地球のまわりに回転させ、太陽の光による月の満ち欠け（新月・三日月・上弦・満月）を観察しよう！',
        bloomDepth: 1.6,
        gameType: 'COSMIC_ORBIT'
      },
      LEVER_PHYSICS: {
        id: 'POPULAR_LEVER_PHYSICS',
        subject: '理科',
        grade: 6,
        name: '6年 てこの規則性 宇宙物理実験室',
        desc: '支点・力点・作用点と力のモーメント平衡。おもりを正しい目盛りに吊るして釣り合わせよう！',
        bloomDepth: 2.5,
        gameType: 'LEVER_PHYSICS',
        gameData: { targetLeft: 50, armLeft: 2, targetRight: 20, correctSlot: 5 }
      },
      CIRCUIT_SANDBOX: {
        id: 'POPULAR_CIRCUIT_SANDBOX',
        subject: '理科',
        grade: 5,
        name: '5年 電流と回路・電磁石実験室',
        desc: '乾電池・スイッチ・豆電球を配線し、直列・並列つなぎで豆電球の明るさを実験しよう！',
        bloomDepth: 2.0,
        gameType: 'CIRCUIT_SANDBOX'
      },
      PREFECTURE_JIGSAW: {
        id: 'POPULAR_PREFECTURE_JIGSAW',
        subject: '社会',
        grade: 4,
        name: '4年 日本47都道府県 列島パズル＆特産品尋宝',
        desc: '8地方47都道府県の名称・位置・特産品。ピースを地図の正しい位置にはめ込もう！',
        bloomDepth: 1.7,
        gameType: 'PREFECTURE_JIGSAW',
        gameData: { mode: 'PREFECTURES', region: 'ALL_JAPAN' }
      },
      CONTEXT_MATCH: {
        id: 'POPULAR_CONTEXT_MATCH',
        subject: '外国語・英語',
        grade: 3,
        name: '3年 英語情景趣味配対 (Word & Scene Match)',
        desc: '英単語・挨拶表現とイラストや日本語の意味をエネルギーレーザーでペアマッチング！',
        bloomDepth: 1.3,
        gameType: 'CONTEXT_MATCH'
      },
      CATEGORY_SORT: {
        id: 'POPULAR_CATEGORY_SORT',
        subject: '生活',
        grade: 1,
        name: '1年 生活仕分け箱 (Category Sorting)',
        desc: '毎日の生活習慣、安全な行動、ゴミ分別などを正しい仕分けボックスへドラッグ！',
        bloomDepth: 1.1,
        gameType: 'CATEGORY_SORT'
      }
    };

    const matchingNode = POPULAR_GAME_STUBS[gameType] ||
      FULL_CURRICULUM_DAG.find(n => n.gameType === gameType) ||
      FULL_CURRICULUM_DAG[0];

    const gradeText = matchingNode.grade ? `小学${matchingNode.grade}年` : '特訓モード';
    document.getElementById('game-grade-badge').innerText = gradeText;
    document.getElementById('game-subject-badge').innerText = matchingNode.subject;
    document.getElementById('game-title').innerText = `【特訓】${matchingNode.name}`;

    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-stage');
    canvas.width = container.clientWidth || 640;
    canvas.height = container.clientHeight || 384;

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    this.initGameInstance(gameType, matchingNode, canvas);
  }

  // 国語 漢字1026字 学年別闖関モード
  openKanjiGradeChallenge(grade = 1) {
    this.modal.classList.remove('hidden');

    const KANJI_COUNTS = { 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191 };
    const count = KANJI_COUNTS[grade] || 80;
    const virtualNode = {
      id: `KOKUGO_G${grade}_KANJI_CHALLENGE`,
      subject: '国語',
      grade: grade,
      name: `小学${grade}年 配当漢字特訓（${count}字）`,
      desc: `文部科学省・小学${grade}年生配当漢字（${count}字）の読み仮名・音訓マスター関卡。`,
      bloomDepth: 1.0 + grade * 0.25,
      gameType: 'KANJI_SLASH'
    };

    document.getElementById('game-grade-badge').innerText = `小学${grade}年`;
    document.getElementById('game-subject-badge').innerText = '国語 (漢字1026字)';
    document.getElementById('game-title').innerText = virtualNode.name;

    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-stage');
    canvas.width = container.clientWidth || 640;
    canvas.height = container.clientHeight || 384;

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    this.initGameInstance('KANJI_SLASH', virtualNode, canvas, grade);
  }

  initGameInstance(gameType, targetNode, canvas, customGrade = null) {
    const hintBtn = document.getElementById('game-hint-btn');
    const shuffleBtn = document.getElementById('game-shuffle-btn');

    // Reset buttons
    hintBtn.classList.add('hidden');
    shuffleBtn.classList.add('hidden');

    const onWinCallback = (stars, score) => this.onGameOver(targetNode, stars, score);

    switch (gameType) {
      case 'KUKU_LINK':
        hintBtn.classList.remove('hidden');
        shuffleBtn.classList.remove('hidden');
        this.currentGame = new KukuLinkGame(canvas, {
          rows: targetNode.gameData?.rows || 4,
          cols: targetNode.gameData?.cols || 4,
          timeLimit: targetNode.gameData?.timeLimit || 75,
          onWin: onWinCallback
        });
        document.getElementById('game-hint').innerText = '操作ヒント：式（例: 7×8）と積（56）を2曲がり以内の星際レーザーでつなげよう！';
        break;

      case 'RADICAL_BUILDER':
        this.currentGame = new RadicalBuilderGame(canvas, targetNode.gameData, onWinCallback, targetNode.grade || 2);
        document.getElementById('game-hint').innerText = '操作ヒント：下の部首パーツをタップして上のスロットに合体させよう！';
        break;

      case 'AETHER_SCALE':
      case 'RATIO_SCALE':
        this.currentGame = new PanBalanceScaleGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = targetNode.gameData?.hint || '操作ヒント：右側の皿におもりを置いて天秤を釣り合わせよう！';
        break;

      case 'COSMIC_ORBIT':
      case 'CELESTIAL_ORBIT':
        this.currentGame = new CosmicOrbitGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：月をドラッグして、目標の月相（三日月・上弦・満月など）に合わせよう！';
        break;

      case 'LEVER_PHYSICS':
        this.currentGame = new LeverPhysicsGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：右側のおもりを選んで目盛りに吊るし、てこを釣り合わせよう！';
        break;

      case 'CIRCUIT_SANDBOX':
      case 'SCIENCE_SANDBOX':
        this.currentGame = new CircuitSandboxGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：スイッチを閉じて回路を通電させ、豆電球を点灯させよう！';
        break;

      case 'PREFECTURE_JIGSAW':
        this.currentGame = new PrefectureJigsawGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：都道府県ピースをマップの正しい位置にはめ込もう！';
        break;

      case 'CONTEXT_MATCH':
        this.currentGame = new ContextMatchGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：左の英語表現と右の日本語・情景カードをタップしてペアにしよう！';
        break;

      case 'CATEGORY_SORT':
        this.currentGame = new CategorySortGame(canvas, targetNode.gameData, onWinCallback);
        document.getElementById('game-hint').innerText = '操作ヒント：下のアイテムをタップまたはドラッグして正しい仕分け箱に入れよう！';
        break;

      case 'KANJI_SLASH':
      default:
        const grade = customGrade || targetNode.grade || 1;
        this.currentGame = new KanjiSlashGame(canvas, targetNode.gameData, onWinCallback, grade);
        document.getElementById('game-hint').innerText = `操作ヒント：小学${grade}年の漢字が落ちる前に正しい読みをタップまたはスワイプ斬撃！`;
        break;
    }

    this.currentGame.start();
  }

  onGameOver(node, stars = 3, score = 100) {
    const accuracy = Number((stars / 3).toFixed(2));
    window.dispatchEvent(new CustomEvent('GAME_CLEAR_SUCCESS', {
      detail: { nodeId: node.id, subject: node.subject, grade: node.grade, stars, score, accuracy }
    }));

    const overlay = document.getElementById('game-overlay-ui');
    overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `
      <div class="w-full h-full bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div class="text-4xl mb-2">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <h3 class="text-2xl font-black text-amber-400 mb-1">ステージクリア！単元マスター！</h3>
        <p class="text-sm font-semibold text-white mb-1">[${node.name}]</p>
        <p class="text-xs text-slate-400 mb-4 max-w-md">${node.desc || ''}</p>
        <div class="flex gap-3">
          <button id="settle-confirm-btn" class="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl shadow-lg transition cursor-pointer">銀河星図へ戻る</button>
        </div>
      </div>
    `;
    document.getElementById('settle-confirm-btn').onclick = () => this.close();
  }

  close() {
    if (this.currentGame) {
      this.currentGame.destroy();
      this.currentGame = null;
    }
    const overlay = document.getElementById('game-overlay-ui');
    if (overlay) {
      overlay.innerHTML = '';
      overlay.style.pointerEvents = 'none';
    }
    this.modal.classList.add('hidden');
  }
}

let KANJI_1026_CACHE = null;
async function fetchKanji1026() {
  if (!KANJI_1026_CACHE) {
    try {
      const res = await fetch('./data/kanji_1026.json');
      if (res.ok) KANJI_1026_CACHE = await res.json();
    } catch (e) {
      console.warn('kanji_1026.json load failed, using fallback:', e);
    }
  }
  return KANJI_1026_CACHE;
}

// =========================================================================
// 1. 国語：星流漢字・ことば斬り (KanjiSlashGame)
// =========================================================================
export class KanjiSlashGame {
  constructor(canvas, gameData, onWin, grade = 1) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = grade || 1;
    this.score = 0;
    this.combo = 0;
    this.timeLeft = 50;
    this.running = false;
    this.questions = gameData?.questions ? [...gameData.questions] : [];
    this.qIndex = 0;
    this.meteors = [];
    this.trail = [];
    this.boundHandlePointer = this.handlePointer.bind(this);
    this.boundHandlePointerMove = this.handlePointerMove.bind(this);
  }

  async start() {
    this.running = true;
    this.score = 0;
    this.combo = 0;
    this.qIndex = 0;

    if (this.questions.length === 0) {
      const db = await fetchKanji1026();
      const gradeData = db?.grades?.[String(this.grade)];
      if (gradeData?.kanjiList && gradeData.kanjiList.length > 0) {
        const pool = [...gradeData.kanjiList].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(5, pool.length); i++) {
          const item = pool[i];
          const wrongPool = pool.filter(p => p.k !== item.k);
          const options = [
            item.r,
            wrongPool[0]?.r || 'みず',
            wrongPool[1]?.r || 'やま',
            wrongPool[2]?.r || 'そら'
          ].sort(() => Math.random() - 0.5);

          this.questions.push({
            kanji: item.k,
            correct: item.r,
            options
          });
        }
      } else {
        this.questions = [
          { kanji: '花', correct: 'はな', options: ['はな', 'か', 'くさ', 'き'] },
          { kanji: '空', correct: 'そら', options: ['そら', 'くう', 'あめ', 'ほし'] },
          { kanji: '山', correct: 'やま', options: ['やま', 'かわ', 'もり', 'うみ'] }
        ];
      }
    }

    this.spawnQuestion();

    this.canvas.addEventListener('pointerdown', this.boundHandlePointer);
    this.canvas.addEventListener('pointermove', this.boundHandlePointerMove);

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const tEl = document.getElementById('game-timer');
      if (tEl) tEl.innerText = `⏱ ${this.timeLeft}s`;
      if (this.timeLeft <= 0) {
        this.destroy();
        this.onWin(2, this.score);
      }
    }, 1000);

    this.loop();
  }

  spawnQuestion() {
    if (this.qIndex >= this.questions.length) {
      this.destroy();
      this.onWin(3, this.score);
      return;
    }
    const q = this.questions[this.qIndex];
    this.currentKanji = q.kanji;
    this.meteors = [];

    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    const count = shuffled.length;
    const padding = 65;
    const step = (this.canvas.width - padding * 2) / Math.max(1, count - 1);

    shuffled.forEach((text, i) => {
      this.meteors.push({
        text,
        isCorrect: text === q.correct,
        x: padding + i * step,
        y: -30 - Math.random() * 40,
        speed: 1.1 + Math.random() * 0.6,
        radius: 36, // Min touch hitbox >= 56px (radius 36 -> 72px diameter)
        alive: true,
        highlight: false
      });
    });
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    this.checkHit(x, y);
  }

  handlePointerMove(e) {
    if (e.buttons === 1) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.trail.push({ x, y, life: 10 });
      this.checkHit(x, y);
    }
  }

  checkHit(x, y) {
    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    this.meteors.forEach((m) => {
      if (m.alive) {
        const dist = Math.hypot(m.x - x, m.y - y);
        // Expanded child-friendly hitbox tolerance (+25px)
        if (dist <= m.radius + 25) {
          if (m.isCorrect) {
            m.alive = false;
            this.combo++;
            audio.playSlash();
            audio.playPositive(this.grade, this.combo);
            fx.spawnStarBurst(m.x, m.y, 25, '#38bdf8');
            fx.showFloatingScore(m.x, m.y, `+${100 * this.combo}pt!`, '#fbbf24');
            guidance.registerSuccess({ questionId: 'KANJI_' + (this.currentKanji || this.qIndex) });

            this.score += 100 * this.combo;
            const scoreEl = document.getElementById('game-score');
            if (scoreEl) scoreEl.innerText = this.score;
            this.qIndex++;
            setTimeout(() => this.spawnQuestion(), 350);
          } else {
            this.combo = 0;
            const res = guidance.registerError({
              subject: '国語',
              questionId: 'KANJI_' + (this.currentKanji || this.qIndex),
              questionData: {
                kanji: this.currentKanji,
                correctAnswer: this.questions[this.qIndex]?.correct
              },
              coords: { x: m.x, y: m.y },
              targetElement: this.canvas
            });

            if (res.tier >= 2) {
              const correctM = this.meteors.find(mt => mt.isCorrect);
              if (correctM) correctM.highlight = true;
            }

            fx.triggerScreenShake(this.canvas, 'bounce', 250);
          }
        }
      }
    });
  }

  loop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // お題表示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`【 ${this.currentKanji || ''} 】の${withKidsReading('正しい読み', 'ただしいよみ', this.grade)}は？`, this.canvas.width / 2, 42);

    // 流れ星描画
    this.meteors.forEach((m) => {
      if (m.alive) {
        m.y += m.speed;

        // Tier 2/3 Clue Highlighting Glow Ring
        if (m.highlight) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(m.x, m.y, m.radius + 6, 0, Math.PI * 2);
          this.ctx.strokeStyle = '#fbbf24';
          this.ctx.lineWidth = 4;
          this.ctx.shadowColor = '#fbbf24';
          this.ctx.shadowBlur = 14;
          this.ctx.stroke();
          this.ctx.restore();
        }

        this.ctx.beginPath();
        this.ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = m.highlight ? '#422006' : '#1e293b';
        this.ctx.fill();
        this.ctx.strokeStyle = m.highlight ? '#f59e0b' : '#38bdf8';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = m.text.length > 5 ? '12px sans-serif' : 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(m.text, m.x, m.y);

        if (m.y > this.canvas.height + 40) {
          m.y = -30;
        }
      }
    });

    // 斬撃軌跡
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 4;
    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i];
      const p2 = this.trail[i + 1];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
      p1.life--;
    }
    this.trail = this.trail.filter((p) => p.life > 0);

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    clearInterval(this.timerInterval);
    this.canvas.removeEventListener('pointerdown', this.boundHandlePointer);
    this.canvas.removeEventListener('pointermove', this.boundHandlePointerMove);
  }
}

// =========================================================================
// 2. 国語：漢字偏旁部首拼装 (RadicalBuilderGame)
// =========================================================================
export class RadicalBuilderGame {
  constructor(canvas, gameData, onWin, grade = 2) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = grade || 2;
    this.score = 0;
    this.combo = 0;
    this.running = false;
    this.qIndex = 0;

    this.defaultPuzzles = [
      { target: '清', reading: 'せい・きよい', parts: ['氵', '青'], options: ['氵', '木', '青', '日', '言'], hint: '水（さんずい）と青で清らか' },
      { target: '休', reading: 'きゅう・やすむ', parts: ['亻', '木'], options: ['亻', '言', '木', '口', '日'], hint: '人（にんべん）が木によりそって休む' },
      { target: '語', reading: 'ご・かたる', parts: ['言', '吾'], options: ['言', '氵', '吾', '心', '口'], hint: 'ごんべんと吾で言葉の語' },
      { target: '明', reading: 'めい・あかるい', parts: ['日', '月'], options: ['日', '月', '木', '火', '禾'], hint: '日（太陽）と月で明るい' },
      { target: '秋', reading: 'しゅう・あき', parts: ['禾', '火'], options: ['禾', '火', '木', '日', '土'], hint: '禾（のぎへん）と火で実りの秋' },
      { target: '花', reading: 'か・はな', parts: ['艹', '化'], options: ['艹', '化', '木', '水', '人'], hint: 'くさかんむりと化けるで花' }
    ];

    this.puzzles = gameData?.questions || this.defaultPuzzles;
    this.placedParts = [];
    this.palette = [];
    this.animFuse = 0;

    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.score = 0;
    this.combo = 0;
    this.qIndex = 0;
    this.setupPuzzle();
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  setupPuzzle() {
    if (this.qIndex >= this.puzzles.length) {
      this.destroy();
      this.onWin(3, this.score);
      return;
    }

    const p = this.puzzles[this.qIndex];
    this.currentPuzzle = p;
    this.placedParts = [];
    this.targetKanji = p.target;
    this.requiredParts = p.parts || p.radicals || ['氵', '青'];

    const opts = p.options || [...this.requiredParts, '木', '日'];
    const shuffled = [...opts].sort(() => Math.random() - 0.5);

    const w = this.canvas.width;
    const h = this.canvas.height;
    const btnSize = 58; // min 56px hitbox
    const totalW = shuffled.length * (btnSize + 14);
    const startX = (w - totalW) / 2 + btnSize / 2;

    this.palette = shuffled.map((text, idx) => ({
      text,
      x: startX + idx * (btnSize + 14),
      y: h - 65,
      size: btnSize,
      used: false,
      highlight: false
    }));
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. Check tap on bottom radical palette
    for (const item of this.palette) {
      if (!item.used && Math.abs(item.x - x) < item.size / 2 + 10 && Math.abs(item.y - y) < item.size / 2 + 10) {
        audio.playClick();
        item.used = true;
        this.placedParts.push(item.text);

        // Check if slots are full
        if (this.placedParts.length === this.requiredParts.length) {
          const sortedPlaced = [...this.placedParts].sort().join('');
          const sortedReq = [...this.requiredParts].sort().join('');

          if (sortedPlaced === sortedReq) {
            this.combo++;
            audio.playPositive(this.grade, this.combo);
            fx.spawnStarBurst(this.canvas.width / 2, this.canvas.height / 2, 35, '#fbbf24');
            fx.showFloatingScore(this.canvas.width / 2, this.canvas.height / 2 - 40, `合体成功！【${this.targetKanji}】`, '#34d399');
            guidance.registerSuccess({ questionId: 'RADICAL_' + this.targetKanji });

            this.score += 150 * this.combo;
            const scoreEl = document.getElementById('game-score');
            if (scoreEl) scoreEl.innerText = this.score;

            this.animFuse = 15;
            setTimeout(() => {
              this.qIndex++;
              this.setupPuzzle();
            }, 600);
          } else {
            this.combo = 0;
            const res = guidance.registerError({
              subject: '国語',
              questionId: 'RADICAL_' + this.targetKanji,
              questionData: {
                kanji: this.targetKanji,
                hint: this.currentPuzzle.hint
              },
              targetElement: this.canvas
            });

            if (res.tier >= 2) {
              this.palette.forEach(p => {
                if (this.requiredParts.includes(p.text)) p.highlight = true;
              });
            }

            fx.triggerScreenShake(this.canvas, 'bounce', 250);
            setTimeout(() => {
              // Return pieces
              this.placedParts = [];
              this.palette.forEach(p => p.used = false);
            }, 500);
          }
        }
        return;
      }
    }

    // 2. Check tap on placed slot to return piece
    const slotY = this.canvas.height / 2 + 10;
    const slotSize = 64;
    const slotCount = this.requiredParts.length;
    const totalSlotW = slotCount * (slotSize + 16);
    const slotStartX = (this.canvas.width - totalSlotW) / 2 + slotSize / 2;

    for (let i = 0; i < this.placedParts.length; i++) {
      const sx = slotStartX + i * (slotSize + 16);
      if (Math.abs(sx - x) < slotSize / 2 && Math.abs(slotY - y) < slotSize / 2) {
        audio.playClick();
        const removed = this.placedParts.splice(i, 1)[0];
        const pal = this.palette.find(p => p.text === removed && p.used);
        if (pal) pal.used = false;
        return;
      }
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // お題・ヒント表示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('目標漢字', 'もくひょうかんじ', this.grade)}：【 ${this.targetKanji} 】を部首合体で作ろう！`, w / 2, 40);

    if (this.currentPuzzle?.hint) {
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '13px sans-serif';
      this.ctx.fillText(`ヒント：${this.currentPuzzle.hint}`, w / 2, 68);
    }

    // スロット（合体エリア）描画
    const slotY = h / 2 + 10;
    const slotSize = 64;
    const slotCount = this.requiredParts.length;
    const totalSlotW = slotCount * (slotSize + 16);
    const slotStartX = (w - totalSlotW) / 2 + slotSize / 2;

    for (let i = 0; i < slotCount; i++) {
      const sx = slotStartX + i * (slotSize + 16);
      const text = this.placedParts[i] || '';

      this.ctx.save();
      this.ctx.fillStyle = text ? '#1e293b' : '#0f172a';
      this.ctx.strokeStyle = text ? '#38bdf8' : '#475569';
      this.ctx.lineWidth = 2.5;
      if (!text) this.ctx.setLineDash([6, 6]);

      this.ctx.beginPath();
      this.ctx.roundRect(sx - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 14);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      if (text) {
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, sx, slotY);
      } else {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`パーツ${i + 1}`, sx, slotY);
      }
    }

    // 部首トレイパレット描画
    this.palette.forEach(item => {
      if (item.used) return;

      this.ctx.save();
      if (item.highlight) {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 12;
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 3;
      } else {
        this.ctx.strokeStyle = '#64748b';
        this.ctx.lineWidth = 2;
      }

      this.ctx.fillStyle = item.highlight ? '#422006' : '#1e293b';
      this.ctx.beginPath();
      this.ctx.roundRect(item.x - item.size / 2, item.y - item.size / 2, item.size, item.size, 14);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = 'bold 26px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(item.text, item.x, item.y);
      this.ctx.restore();
    });

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 3. 算数：星艦エネルギー天秤 (PanBalanceScaleGame)
// =========================================================================
export class PanBalanceScaleGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.targetLeftWeight = gameData?.targetLeft || gameData?.leftWeights?.[0] || 50;
    this.targetRatio = gameData?.targetRatio || null;
    this.targetRightWeight = this.targetLeftWeight;

    this.rightWeightsPlaced = [];
    this.weightTray = [
      { val: 10, count: 5, color: '#38bdf8' },
      { val: 20, count: 3, color: '#10b981' },
      { val: 30, count: 2, color: '#f59e0b' },
      { val: 50, count: 1, color: '#8b5cf6' }
    ];

    this.angle = 0;
    this.targetAngle = 0;
    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.rightWeightsPlaced = [];
    this.angle = 0;
    this.targetAngle = 0;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. Check tap on weight tray at bottom
    const trayY = this.canvas.height - 50;
    const trayStartX = 80;
    const stepX = (this.canvas.width - 160) / Math.max(1, this.weightTray.length - 1);

    for (let i = 0; i < this.weightTray.length; i++) {
      const item = this.weightTray[i];
      const wx = trayStartX + i * stepX;
      if (Math.abs(wx - x) < 30 && Math.abs(trayY - y) < 30) {
        audio.playClick();
        this.rightWeightsPlaced.push(item.val);
        this.recalcBalance();
        return;
      }
    }

    // 2. Check tap on Reset / Clear button
    if (x > this.canvas.width - 90 && y > this.canvas.height - 50) {
      audio.playClick();
      this.rightWeightsPlaced = [];
      this.recalcBalance();
      return;
    }

    // 3. Check tap on right pan to remove last weight
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 - 20;
    const rx = cx + 130;
    const ry = cy + 60;
    if (Math.hypot(rx - x, ry - y) < 45 && this.rightWeightsPlaced.length > 0) {
      audio.playClick();
      this.rightWeightsPlaced.pop();
      this.recalcBalance();
    }
  }

  recalcBalance() {
    const rightTotal = this.rightWeightsPlaced.reduce((a, b) => a + b, 0);
    const diff = rightTotal - this.targetLeftWeight;

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // Calculate angle: diff > 0 -> tilts right (+)
    this.targetAngle = Math.max(-18, Math.min(18, diff * 0.6));

    const scoreEl = document.getElementById('game-score');
    if (scoreEl) scoreEl.innerText = `左: ${this.targetLeftWeight}g | 右: ${rightTotal}g`;

    if (diff === 0 && rightTotal > 0) {
      audio.playPositive(5, 1);
      fx.spawnStarBurst(this.canvas.width / 2, this.canvas.height / 2, 35, '#10b981');
      fx.showFloatingScore(this.canvas.width / 2, this.canvas.height / 2 - 40, '天秤完全平衡！', '#34d399');
      guidance.registerSuccess({ questionId: 'PAN_BALANCE' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 300);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // Smooth angle interpolation
    this.angle += (this.targetAngle - this.angle) * 0.15;

    const cx = w / 2;
    const cy = h / 2 - 20;
    const armLen = 130;

    // Header Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('星艦天秤', 'せいかんてんびん')}：左の結晶（${this.targetLeftWeight}g）とおもりを釣り合わせよう！`, cx, 40);

    // Base Pillar
    this.ctx.fillStyle = '#334155';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx - 20, cy + 90);
    this.ctx.lineTo(cx + 20, cy + 90);
    this.ctx.closePath();
    this.ctx.fill();

    // Fulcrum Pivot
    this.ctx.fillStyle = '#eab308';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // Tilting Balance Beam
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate((this.angle * Math.PI) / 180);

    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(-armLen, -4, armLen * 2, 8);

    // Left Pan Suspension
    const lx = -armLen;
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(lx, 0);
    this.ctx.lineTo(lx - 25, 45);
    this.ctx.moveTo(lx, 0);
    this.ctx.lineTo(lx + 25, 45);
    this.ctx.stroke();

    // Left Plate
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(lx - 30, 45, 60, 6);

    // Right Pan Suspension
    const rx = armLen;
    this.ctx.beginPath();
    this.ctx.moveTo(rx, 0);
    this.ctx.lineTo(rx - 25, 45);
    this.ctx.moveTo(rx, 0);
    this.ctx.lineTo(rx + 25, 45);
    this.ctx.stroke();

    // Right Plate
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(rx - 30, 45, 60, 6);

    // Left Weight Object
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.beginPath();
    this.ctx.arc(lx, 32, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.targetLeftWeight}g`, lx, 32);

    // Right Placed Weights
    const rightTotal = this.rightWeightsPlaced.reduce((a, b) => a + b, 0);
    if (this.rightWeightsPlaced.length > 0) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(rx, 32, 15, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`${rightTotal}g`, rx, 32);
    }

    this.ctx.restore();

    // Bottom Weight Selection Tray
    const trayY = h - 50;
    const trayStartX = 80;
    const stepX = (w - 160) / Math.max(1, this.weightTray.length - 1);

    this.weightTray.forEach((item, i) => {
      const wx = trayStartX + i * stepX;
      this.ctx.save();
      this.ctx.fillStyle = item.color;
      this.ctx.beginPath();
      this.ctx.arc(wx, trayY, 22, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`+${item.val}g`, wx, trayY);
      this.ctx.restore();
    });

    // Reset Button
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(w - 85, h - 68, 70, 36);
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('クリア', w - 50, h - 50);

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 4. 理科：天体・月相実験室 (CosmicOrbitGame)
// =========================================================================
export class CosmicOrbitGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.moonAngleDeg = 45; // Start at Crescent
    this.targetPhase = gameData?.targetPhase || '上弦の月'; // Target: 90 deg
    this.targetAngleDeg = 90;
    this.isDragging = false;

    this.boundDown = this.handlePointerDown.bind(this);
    this.boundMove = this.handlePointerMove.bind(this);
    this.boundUp = this.handlePointerUp.bind(this);
  }

  start() {
    this.running = true;
    this.moonAngleDeg = 30;
    this.canvas.addEventListener('pointerdown', this.boundDown);
    this.canvas.addEventListener('pointermove', this.boundMove);
    this.canvas.addEventListener('pointerup', this.boundUp);
    this.loop();
  }

  getMoonPhaseName(angle) {
    const norm = (angle % 360 + 360) % 360;
    if (norm >= 337.5 || norm < 22.5) return '新月 (New Moon)';
    if (norm >= 22.5 && norm < 67.5) return '三日月 (Waxing Crescent)';
    if (norm >= 67.5 && norm < 112.5) return '上弦の月 (First Quarter)';
    if (norm >= 112.5 && norm < 157.5) return '十三夜 (Waxing Gibbous)';
    if (norm >= 157.5 && norm < 202.5) return '満月 (Full Moon)';
    if (norm >= 202.5 && norm < 247.5) return '寝待月 (Waning Gibbous)';
    if (norm >= 247.5 && norm < 292.5) return '下弦の月 (Last Quarter)';
    return '有明の月 (Waning Crescent)';
  }

  handlePointerDown(e) {
    this.isDragging = true;
    this.updateAngleByPointer(e);
  }

  handlePointerMove(e) {
    if (this.isDragging) {
      this.updateAngleByPointer(e);
    }
  }

  handlePointerUp() {
    this.isDragging = false;
    this.checkAlignment();
  }

  updateAngleByPointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const cx = this.canvas.width / 2 - 40;
    const cy = this.canvas.height / 2 + 10;

    const rad = Math.atan2(y - cy, x - cx);
    this.moonAngleDeg = (rad * (180 / Math.PI) + 360) % 360;
  }

  checkAlignment() {
    const currentPhase = this.getMoonPhaseName(this.moonAngleDeg);
    const isMatched = Math.abs(this.moonAngleDeg - this.targetAngleDeg) <= 22;

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const scoreEl = document.getElementById('game-score');
    if (scoreEl) scoreEl.innerText = currentPhase;

    if (isMatched) {
      audio.playPositive(4, 1);
      fx.spawnStarBurst(this.canvas.width - 80, 90, 30, '#fbbf24');
      fx.showFloatingScore(this.canvas.width / 2, this.canvas.height / 2, `観察成功！【${this.targetPhase}】`, '#34d399');
      guidance.registerSuccess({ questionId: 'COSMIC_ORBIT' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 280);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const cx = w / 2 - 40;
    const cy = h / 2 + 10;
    const orbitR = 95;

    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('天体観察', 'てんたいかんさつ')}：月を回して【 ${this.targetPhase} 】の位置に合わせよう！`, w / 2, 38);

    // Sun Rays (from Left)
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.beginPath();
    this.ctx.arc(0, cy, 50, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.fillText('太陽光 ☀️', 45, cy - 60);

    // Orbit Ring
    this.ctx.strokeStyle = '#334155';
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Earth
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillText('地球 🌍', cx, cy + 4);

    // Moon Position
    const moonRad = (this.moonAngleDeg * Math.PI) / 180;
    const mx = cx + Math.cos(moonRad) * orbitR;
    const my = cy + Math.sin(moonRad) * orbitR;

    this.ctx.fillStyle = '#fef08a';
    this.ctx.beginPath();
    this.ctx.arc(mx, my, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Telescope Viewport on Right
    const teleX = w - 80;
    const teleY = 95;
    const teleR = 36;

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(teleX, teleY, teleR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Moon Phase Render in Telescope
    this.ctx.fillStyle = '#fef08a';
    this.ctx.beginPath();
    this.ctx.arc(teleX, teleY, teleR - 4, -Math.PI / 2, Math.PI / 2, false);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '11px sans-serif';
    this.ctx.fillText(this.getMoonPhaseName(this.moonAngleDeg), teleX, teleY + teleR + 18);

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundDown);
    this.canvas.removeEventListener('pointermove', this.boundMove);
    this.canvas.removeEventListener('pointerup', this.boundUp);
  }
}

// =========================================================================
// 5. 理科：てこの規則性物理実験室 (LeverPhysicsGame)
// =========================================================================
export class LeverPhysicsGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.targetLeft = gameData?.targetLeft || 50;
    this.armLeft = gameData?.armLeft || 2; // Left Torque = 50 * 2 = 100
    this.targetRight = gameData?.targetRight || 20;
    this.correctSlot = gameData?.correctSlot || 5; // Right Torque = 20 * 5 = 100

    this.placedRightWeight = 0;
    this.placedRightSlot = 0;
    this.angle = 0;
    this.targetAngle = 0;

    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.placedRightWeight = 0;
    this.placedRightSlot = 0;
    this.angle = 0;
    this.targetAngle = 0;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const cx = this.canvas.width / 2;

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    if (x > cx + 15) {
      const slotDistance = (x - cx) / 30;
      const clickedSlot = Math.max(1, Math.min(5, Math.round(slotDistance)));

      this.placedRightWeight = this.targetRight;
      this.placedRightSlot = clickedSlot;

      const leftTorque = this.targetLeft * this.armLeft;
      const rightTorque = this.targetRight * clickedSlot;
      const isBalanced = leftTorque === rightTorque;

      this.targetAngle = isBalanced ? 0 : (rightTorque > leftTorque ? 12 : -12);

      const scoreEl = document.getElementById('game-score');
      if (scoreEl) scoreEl.innerText = `左モーメント: ${leftTorque} | 右: ${rightTorque}`;

      if (isBalanced) {
        audio.playPositive(6, 1);
        fx.spawnStarBurst(cx + clickedSlot * 30, this.canvas.height / 2 + 50, 30, '#10b981');
        fx.showFloatingScore(cx, this.canvas.height / 2 - 30, 'モーメント完全平衡！', '#34d399');
        guidance.registerSuccess({ questionId: 'LEVER_PHYSICS' });

        setTimeout(() => {
          this.destroy();
          this.onWin(3, 300);
        }, 500);
      } else {
        guidance.registerError({
          subject: '理科',
          questionId: 'LEVER_PHYSICS',
          questionData: {
            targetLeft: this.targetLeft,
            armLeft: this.armLeft,
            targetRight: this.targetRight,
            correctSlot: this.correctSlot
          },
          targetElement: this.canvas
        });
        fx.triggerScreenShake(this.canvas, 'bounce', 250);
      }
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    this.angle += (this.targetAngle - this.angle) * 0.15;

    const cx = w / 2;
    const cy = h / 2 + 20;

    // Header
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`てこの${withKidsReading('釣り合い', 'つりあい')}：左(${this.targetLeft}g × ${this.armLeft}) ＝ 右(${this.targetRight}g × 目盛り？)`, cx, 40);

    // Fulcrum
    this.ctx.fillStyle = '#eab308';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx - 16, cy + 40);
    this.ctx.lineTo(cx + 16, cy + 40);
    this.ctx.closePath();
    this.ctx.fill();

    // Lever Bar
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate((this.angle * Math.PI) / 180);

    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(-180, -6, 360, 12);

    // Left Weight
    const lx = -(this.armLeft * 32);
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillRect(lx - 1, 6, 2, 24);
    this.ctx.fillStyle = '#f97316';
    this.ctx.beginPath();
    this.ctx.arc(lx, 44, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.targetLeft}g`, lx, 44);

    // Right Slots (1..5)
    for (let i = 1; i <= 5; i++) {
      const sx = i * 30;
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillRect(sx - 1, 6, 2, 12);
      this.ctx.fillText(`${i}`, sx, 26);
    }

    // Right Placed Weight
    if (this.placedRightWeight > 0) {
      const rx = this.placedRightSlot * 30;
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(rx, 44, 15, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`${this.placedRightWeight}g`, rx, 44);
    }

    this.ctx.restore();

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 6. 理科：回路実験室 (CircuitSandboxGame)
// =========================================================================
export class CircuitSandboxGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.switchClosed = false;
    this.isSeriesDual = false; // Toggle 1 or 2 batteries
    this.animSpark = 0;

    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.switchClosed = false;
    this.isSeriesDual = false;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. Click switch area
    if (Math.abs(x - (this.canvas.width / 2)) < 60 && Math.abs(y - 120) < 40) {
      this.switchClosed = !this.switchClosed;
      audio.playClick();

      if (this.switchClosed) {
        audio.playLaser();
        fx.spawnSparkBurst(this.canvas.width / 2, 120, 15, '#38bdf8');
        this.checkWinCondition();
      }
      return;
    }

    // 2. Click battery mode toggle button
    if (x > this.canvas.width - 150 && y > this.canvas.height - 70) {
      this.isSeriesDual = !this.isSeriesDual;
      audio.playClick();
      if (this.switchClosed) this.checkWinCondition();
      return;
    }
  }

  checkWinCondition() {
    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const scoreEl = document.getElementById('game-score');
    if (scoreEl) scoreEl.innerText = this.switchClosed ? (this.isSeriesDual ? '3.0V (超高輝度)' : '1.5V (点灯)') : '0V (未通電)';

    if (this.switchClosed) {
      audio.playPositive(5, 1);
      fx.spawnStarBurst(this.canvas.width / 2, this.canvas.height / 2 + 60, 30, '#fbbf24');
      fx.showFloatingScore(this.canvas.width / 2, this.canvas.height / 2, '回路開通！豆電球点灯！', '#34d399');
      guidance.registerSuccess({ questionId: 'CIRCUIT_SANDBOX' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 260);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Header
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('回路実験室', 'かいろじっけんしつ')}：スイッチを閉じて豆電球を光らせよう！`, cx, 40);

    // Circuit Wires Rectangle
    this.ctx.strokeStyle = this.switchClosed ? '#38bdf8' : '#64748b';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(cx - 160, cy - 80, 320, 160);

    // Switch on Top Wire
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(cx - 35, cy - 90, 70, 20);

    this.ctx.strokeStyle = '#eab308';
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 30, cy - 80);
    if (this.switchClosed) {
      this.ctx.lineTo(cx + 30, cy - 80);
    } else {
      this.ctx.lineTo(cx + 25, cy - 105);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '11px sans-serif';
    this.ctx.fillText(this.switchClosed ? 'スイッチ: 閉 [ON]' : 'スイッチ: 開 [OFF]', cx, cy - 110);

    // Battery on Bottom Wire
    const batY = cy + 80;
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(cx - 40, batY - 14, 40, 28);
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(cx, batY - 14, 40, 28);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillText('+  1.5V  -', cx, batY + 4);

    // Light Bulb on Right Wire
    const bulbX = cx + 160;
    const bulbY = cy;

    if (this.switchClosed) {
      // Glow
      const grad = this.ctx.createRadialGradient(bulbX, bulbY, 5, bulbX, bulbY, 45);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(bulbX, bulbY, 45, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = this.switchClosed ? '#fbbf24' : '#475569';
    this.ctx.beginPath();
    this.ctx.arc(bulbX, bulbY, 18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillText('💡', bulbX, bulbY + 3);

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 7. 社会：日本47都道府県 列島パズル＆特産品尋宝 (PrefectureJigsawGame)
// =========================================================================
export class PrefectureJigsawGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.prefectures = [
      { name: '北海道', region: '北海道', specialty: '乳製品・じゃがいも', targetX: 300, targetY: 85, currentX: 70, currentY: 280, snapped: false },
      { name: '青森県', region: '東北', specialty: 'りんご', targetX: 280, targetY: 135, currentX: 160, currentY: 280, snapped: false },
      { name: '東京都', region: '関東', specialty: '江戸切子・雷おこし', targetX: 240, targetY: 190, currentX: 250, currentY: 280, snapped: false },
      { name: '静岡県', region: '中部', specialty: '緑茶・うなぎ', targetX: 210, targetY: 210, currentX: 340, currentY: 280, snapped: false },
      { name: '京都府', region: '近畿', specialty: '西陣織・宇治茶', targetX: 160, targetY: 195, currentX: 430, currentY: 280, snapped: false },
      { name: '沖縄県', region: '九州・沖縄', specialty: 'ゴーヤ・ちんすこう', targetX: 90, targetY: 250, currentX: 520, currentY: 280, snapped: false }
    ];

    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    let hit = false;
    this.prefectures.forEach((p) => {
      // 56px child-friendly tap hitbox
      if (!p.snapped && Math.hypot(p.currentX - x, p.currentY - y) < 45) {
        p.snapped = true;
        p.currentX = p.targetX;
        p.currentY = p.targetY;
        hit = true;

        audio.playCoin();
        fx.spawnStarBurst(p.targetX, p.targetY, 20, '#4ade80');
        fx.showFloatingScore(p.targetX, p.targetY, `正解！【${p.name}】`, '#4ade80');
        guidance.registerSuccess({ questionId: 'PREFECTURE_' + p.name });
      }
    });

    if (!hit) {
      const rem = this.prefectures.find(pr => !pr.snapped);
      if (rem) {
        guidance.registerError({
          subject: '社会',
          questionId: 'PREFECTURE_JIGSAW',
          questionData: { prefecture: rem.name, region: rem.region },
          targetElement: this.canvas
        });
        fx.triggerScreenShake(this.canvas, 'bounce', 250);
      }
    }

    if (this.prefectures.every((p) => p.snapped)) {
      audio.playFanfare();
      fx.spawnConfetti(this.canvas.width, this.canvas.height, 60);
      setTimeout(() => {
        this.destroy();
        this.onWin(3, 300);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('日本列島47都道府県', 'にほんれっとう・とどうふけん')}：下のピースを地図の正しい位置にはめ込もう！`, this.canvas.width / 2, 35);

    this.prefectures.forEach((p) => {
      // Target slot
      this.ctx.strokeStyle = p.snapped ? '#4ade80' : '#475569';
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeRect(p.targetX - 35, p.targetY - 18, 70, 36);
      this.ctx.setLineDash([]);

      // Piece badge
      this.ctx.fillStyle = p.snapped ? '#4ade80' : '#1e293b';
      this.ctx.beginPath();
      this.ctx.roundRect(p.currentX - 35, p.currentY - 18, 70, 36, 10);
      this.ctx.fill();
      this.ctx.strokeStyle = p.snapped ? '#4ade80' : '#38bdf8';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = p.snapped ? '#0f172a' : '#f8fafc';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.name, p.currentX, p.currentY);
    });

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 8. 英語：情景趣味配対 (ContextMatchGame)
// =========================================================================
export class ContextMatchGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.defaultPairs = [
      { id: 'p1', eng: 'Hello', jpn: 'こんにちは', matched: false },
      { id: 'p2', eng: 'Red', jpn: 'あか（赤色）', matched: false },
      { id: 'p3', eng: 'It is 3:00', jpn: 'いま 3時です', matched: false },
      { id: 'p4', eng: 'Thank you', jpn: 'ありがとう', matched: false }
    ];

    const inputPairs = gameData?.pairs || this.defaultPairs;
    this.pairs = inputPairs.map((p, idx) => ({
      id: `pair_${idx}`,
      eng: p.english || p.eng || 'Apple',
      jpn: p.japanese || p.jpn || 'りんご',
      matched: false
    }));

    this.selectedLeft = null;
    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.selectedLeft = null;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const leftX = 120;
    const rightX = this.canvas.width - 120;
    const cardH = 46;

    // Check tap on left cards
    this.pairs.forEach((p, idx) => {
      const cy = 90 + idx * 60;
      if (!p.matched && Math.abs(leftX - x) < 85 && Math.abs(cy - y) < cardH / 2) {
        audio.playClick();
        this.selectedLeft = p;
      }
    });

    // Check tap on right cards
    this.pairs.forEach((p, idx) => {
      const cy = 90 + idx * 60;
      if (!p.matched && Math.abs(rightX - x) < 85 && Math.abs(cy - y) < cardH / 2) {
        if (this.selectedLeft) {
          if (this.selectedLeft.id === p.id) {
            p.matched = true;
            this.selectedLeft = null;
            audio.playLaser();
            audio.playPositive(3, 1);
            fx.spawnStarBurst(rightX, cy, 25, '#34d399');
            fx.showFloatingScore(this.canvas.width / 2, cy, 'Match!', '#fbbf24');
            guidance.registerSuccess({ questionId: 'CONTEXT_' + p.id });

            if (this.pairs.every(pr => pr.matched)) {
              audio.playFanfare();
              setTimeout(() => {
                this.destroy();
                this.onWin(3, 280);
              }, 500);
            }
          } else {
            audio.playGentleError();
            guidance.registerError({
              subject: '外国語・英語',
              questionId: 'CONTEXT_' + p.id,
              targetElement: this.canvas
            });
            fx.triggerScreenShake(this.canvas, 'bounce', 250);
            this.selectedLeft = null;
          }
        }
      }
    });
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('英語情景配対', 'えいごじょうけいはいたい')}：左の英語と右の日本語をタップしてつなごう！`, w / 2, 38);

    const leftX = 120;
    const rightX = w - 120;

    this.pairs.forEach((p, idx) => {
      const cy = 90 + idx * 60;

      // Left Card
      this.ctx.fillStyle = p.matched ? '#064e3b' : (this.selectedLeft?.id === p.id ? '#1e3a8a' : '#1e293b');
      this.ctx.strokeStyle = p.matched ? '#10b981' : (this.selectedLeft?.id === p.id ? '#38bdf8' : '#475569');
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(leftX - 85, cy - 22, 170, 44, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.eng, leftX, cy);

      // Right Card
      this.ctx.fillStyle = p.matched ? '#064e3b' : '#1e293b';
      this.ctx.strokeStyle = p.matched ? '#10b981' : '#475569';
      this.ctx.beginPath();
      this.ctx.roundRect(rightX - 85, cy - 22, 170, 44, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillText(p.jpn, rightX, cy);
    });

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 9. 生活：生活仕分け箱 (CategorySortGame)
// =========================================================================
export class CategorySortGame {
  constructor(canvas, gameData, onWin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.running = false;

    this.categories = gameData?.categories || [
      { id: 'morning', title: 'あさの じゅんび' },
      { id: 'safety', title: 'あんぜんな こうどう' }
    ];

    this.items = (gameData?.items || [
      { text: 'ランドセルを せおう', category: 'morning', sorted: false },
      { text: 'みぎ・ひだりを よくみる', category: 'safety', sorted: false },
      { text: 'おはようと あいさつする', category: 'morning', sorted: false },
      { text: 'てを あげて わたる', category: 'safety', sorted: false }
    ]).map(it => ({ ...it, sorted: false }));

    this.selectedItem = null;
    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.selectedItem = null;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const w = this.canvas.width;
    const catW = 160;
    const catStartX = (w - (this.categories.length * (catW + 20))) / 2 + catW / 2;

    // 1. Select item from bottom
    const itemStartX = 80;
    const itemStepX = (w - 160) / Math.max(1, this.items.length - 1);
    this.items.forEach((it, idx) => {
      const ix = itemStartX + idx * itemStepX;
      const iy = this.canvas.height - 60;
      if (!it.sorted && Math.hypot(ix - x, iy - y) < 45) {
        audio.playClick();
        this.selectedItem = it;
      }
    });

    // 2. Drop into category box
    this.categories.forEach((cat, idx) => {
      const cx = catStartX + idx * (catW + 20);
      const cy = 110;
      if (Math.abs(cx - x) < catW / 2 && Math.abs(cy - y) < 45) {
        if (this.selectedItem) {
          if (this.selectedItem.category === cat.id) {
            this.selectedItem.sorted = true;
            this.selectedItem = null;
            audio.playCoin();
            fx.spawnStarBurst(cx, cy, 25, '#34d399');
            fx.showFloatingScore(cx, cy - 30, '正解！仕分け完了！', '#fbbf24');
            guidance.registerSuccess({ questionId: 'SORT_' + cat.id });

            if (this.items.every(it => it.sorted)) {
              audio.playVictory();
              setTimeout(() => {
                this.destroy();
                this.onWin(3, 260);
              }, 500);
            }
          } else {
            audio.playGentleError();
            guidance.registerError({
              subject: '生活',
              questionId: 'SORT_' + cat.id,
              targetElement: this.canvas
            });
            fx.triggerScreenShake(this.canvas, 'bounce', 250);
            this.selectedItem = null;
          }
        }
      }
    });
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('生活仕分け箱', 'せいかつしわけばこ')}：下のアイテムを正しい箱に仕分けよう！`, w / 2, 38);

    // Categories Boxes at Top
    const catW = 160;
    const catStartX = (w - (this.categories.length * (catW + 20))) / 2 + catW / 2;

    this.categories.forEach((cat, idx) => {
      const cx = catStartX + idx * (catW + 20);
      const cy = 110;

      this.ctx.fillStyle = '#1e293b';
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.roundRect(cx - catW / 2, cy - 40, catW, 80, 16);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText(`📦 ${cat.title}`, cx, cy);
    });

    // Unsorted Items at Bottom
    const itemStartX = 80;
    const itemStepX = (w - 160) / Math.max(1, this.items.length - 1);

    this.items.forEach((it, idx) => {
      if (it.sorted) return;

      const ix = itemStartX + idx * itemStepX;
      const iy = h - 60;
      const isSel = this.selectedItem === it;

      this.ctx.fillStyle = isSel ? '#1e3a8a' : '#1e293b';
      this.ctx.strokeStyle = isSel ? '#38bdf8' : '#64748b';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(ix - 55, iy - 25, 110, 50, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(it.text, ix, iy);
    });

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// Global Singleton Initialization
let globalMiniGameModal = null;
export function getMiniGameModal() {
  if (!globalMiniGameModal) {
    globalMiniGameModal = new MiniGameModal();
  }
  return globalMiniGameModal;
}

if (typeof window !== 'undefined') {
  window.MiniGameModal = MiniGameModal;
  window.KanjiSlashGame = KanjiSlashGame;
  window.RadicalBuilderGame = RadicalBuilderGame;
  window.PanBalanceScaleGame = PanBalanceScaleGame;
  window.CosmicOrbitGame = CosmicOrbitGame;
  window.LeverPhysicsGame = LeverPhysicsGame;
  window.CircuitSandboxGame = CircuitSandboxGame;
  window.PrefectureJigsawGame = PrefectureJigsawGame;
  window.ContextMatchGame = ContextMatchGame;
  window.CategorySortGame = CategorySortGame;
  window.miniGameModal = getMiniGameModal();
}
