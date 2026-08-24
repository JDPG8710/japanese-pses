/**
 * MiniGameSystem.js - 全教科ミニゲーム自适应システム（日本語・文部科学省学習指導要領対応）
 * 
 * 1. 国語：星流漢字・ことば斬り (KanjiSlashGame) ＆ 部首・漢字パーツ組み立て (RadicalBuilderGame)
 * 2. 算数：九九銀河マッチング (KukuLinkGame) ＆ 宇宙船てんびん (PanBalanceScaleGame)
 * 3. 理科：天体・月相実験室 (CosmicOrbitGame), てこ物理実験室 (LeverPhysicsGame), 回路実験室 (CircuitSandboxGame)
 * 4. 社会：日本47都道府県 列島パズル ＆ 特産品・名所尋宝 (PrefectureJigsawGame)
 * 5. 英語：場面別ペア選択 (ContextMatchGame)
 * 6. 生活：生活仕分け箱 (CategorySortGame)
 */

import { FULL_CURRICULUM_DAG, loadKanjiDatabase, loadPrefecturesDatabase } from './CurriculumData.js';
import { KukuLinkGame } from './KukuLinkGame.js?v=4';
import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';
import { getErrorGuidanceSystem } from './ErrorGuidanceSystem.js?v=3';
import { getRadicalPuzzlesForGrade } from './RadicalQuestionBank.js';
import { HDCanvasRenderer, getLogicalCanvasWidth, getLogicalCanvasHeight } from './src/render/HDCanvasRenderer.js';

const UNIFIED_STAGE_TIME_LIMIT_SECONDS = 3 * 60;

/** Canvas cannot render HTML ruby. Grades 1-2, or unknown grade -> append hiragana after the title. */
function withKidsReading(kanjiTitle, hiragana, grade) {
  if (grade != null && Number(grade) > 2) return kanjiTitle;
  return `${kanjiTitle}（${hiragana}）`;
}

function safeRoundRect(ctx, x, y, w, h, r = 8) {
  if (ctx && typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else if (ctx && typeof ctx.rect === 'function') {
    ctx.rect(x, y, w, h);
  }
}

function safeSetLineDash(ctx, dash) {
  if (ctx && typeof ctx.setLineDash === 'function') {
    ctx.setLineDash(dash);
  }
}

export const GAME_GRADE_SUPPORT_MAP = {
  KANJI_CHALLENGE: {
    id: 'KANJI_CHALLENGE',
    name: '漢字チャレンジ',
    subject: '国語',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  },
  RADICAL_BUILDER: {
    id: 'RADICAL_BUILDER',
    name: '部首合体',
    subject: '国語',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  },
  KUKU_LINK: {
    id: 'KUKU_LINK',
    name: '九九連々',
    subject: '算数',
    grades: [2, 3, 4, 5, 6],
    disabledNotice: '※九九・かけ算わり算は小学2年生から始まります'
  },
  AETHER_SCALE: {
    id: 'AETHER_SCALE',
    name: '宇宙船てんびん',
    subject: '算数',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  },
  RATIO_SCALE: {
    id: 'RATIO_SCALE',
    name: '宇宙船てんびん',
    subject: '算数',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  },
  COSMIC_ORBIT: {
    id: 'COSMIC_ORBIT',
    name: '天体月相',
    subject: '理科',
    grades: [4, 5, 6],
    disabledNotice: '※天体・月の満ち欠けは小学4・6年生の内容です'
  },
  LEVER_PHYSICS: {
    id: 'LEVER_PHYSICS',
    name: 'てこ実験',
    subject: '理科',
    grades: [6],
    disabledNotice: '※てこの原理と規則性は小学6年生で学習します'
  },
  CIRCUIT_SANDBOX: {
    id: 'CIRCUIT_SANDBOX',
    name: '回路実験',
    subject: '理科',
    grades: [3, 4, 5, 6],
    disabledNotice: '※理科（電気と回路）は小学3年生から始まります'
  },
  PREFECTURE_JIGSAW: {
    id: 'PREFECTURE_JIGSAW',
    name: '列島パズル',
    subject: '社会',
    grades: [3, 4, 5, 6],
    disabledNotice: '※社会科（47都道府県・地域産業）は小学3年生以上が対象です'
  },
  CONTEXT_MATCH: {
    id: 'CONTEXT_MATCH',
    name: '英語ペア',
    subject: '外国語・英語',
    grades: [3, 4, 5, 6],
    disabledNotice: '※外国語・英語は小学3年生から始まります'
  },
  CATEGORY_SORT: {
    id: 'CATEGORY_SORT',
    name: '生活仕分け',
    subject: '生活',
    grades: [1, 2],
    disabledNotice: '※生活科は小学1〜2年生専用の教科です（3年生以降は理科・社会に分化）'
  },
  KOKUGO_CURRICULUM: { id: 'KOKUGO_CURRICULUM', name: '国語学年テーマ', subject: '国語', grades: [1, 2, 3, 4, 5, 6], disabledNotice: '全学年対応' },
  MATH_CURRICULUM: { id: 'MATH_CURRICULUM', name: '算数学年テーマ', subject: '算数', grades: [1, 2, 3, 4, 5, 6], disabledNotice: '全学年対応' },
  SCIENCE_CURRICULUM: { id: 'SCIENCE_CURRICULUM', name: '理科学年テーマ', subject: '理科', grades: [3, 4, 5, 6], disabledNotice: '理科は小学3年生から' },
  SOCIAL_CURRICULUM: { id: 'SOCIAL_CURRICULUM', name: '社会学年テーマ', subject: '社会', grades: [3, 4, 5, 6], disabledNotice: '社会は小学3年生から' },
  LIFE_CURRICULUM: { id: 'LIFE_CURRICULUM', name: '生活学年テーマ', subject: '生活', grades: [1, 2], disabledNotice: '生活科は小学1・2年生' },
  ENGLISH_CURRICULUM: { id: 'ENGLISH_CURRICULUM', name: '英語レベル別テーマ', subject: '外国語・英語', grades: [3, 4, 5, 6], disabledNotice: '外国語活動は小学3年生から' },
  GRADE_EXAM: {
    id: 'GRADE_EXAM',
    name: '学年総合チャレンジ',
    subject: '全教科総合',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  }
};

if (typeof window !== 'undefined') {
  window.GAME_GRADE_SUPPORT_MAP = GAME_GRADE_SUPPORT_MAP;
}

// =========================================================================
// 0. MiniGameModal - モーダル管理 ＆ ゲームルーティング
// =========================================================================
export class MiniGameModal {
  static GAME_GRADE_SUPPORT_MAP = GAME_GRADE_SUPPORT_MAP;

  constructor({
    now = () => Date.now(),
    setIntervalImpl = (callback, delay) => globalThis.setInterval(callback, delay),
    clearIntervalImpl = timerId => globalThis.clearInterval(timerId)
  } = {}) {
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.stageTimerId = null;
    this.stageDeadline = 0;
    this.stageTimeLimit = 0;
    this.stageSettled = false;
    this.playActivityActive = false;
    this.createModalDOM();
    this.currentGame = null;
    this.boundCanvasResize = () => this.handleCanvasResize();
    if (typeof ResizeObserver !== 'undefined') {
      const stage = document.getElementById('game-stage');
      if (stage) {
        this.canvasResizeObserver = new ResizeObserver(this.boundCanvasResize);
        this.canvasResizeObserver.observe(stage);
      }
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.boundCanvasResize);
      window.addEventListener('orientationchange', this.boundCanvasResize);
    }
  }

  createModalDOM() {
    if (typeof document === 'undefined' || !document.createElement) return;
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
                <span id="game-mode-badge" class="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">チャレンジ中</span>
              </div>
              <h2 id="game-title" class="text-sm sm:text-base md:text-lg font-bold text-white mt-1 truncate">ゲームを用意しているよ…</h2>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button id="game-hint-btn" class="hidden px-2.5 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition cursor-pointer min-h-[36px]">💡 ヒント</button>
              <button id="game-shuffle-btn" class="hidden px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition cursor-pointer min-h-[36px]">🌀 シャッフル</button>
              <div id="game-timer" role="timer" aria-live="polite" class="text-xs sm:text-sm font-mono text-amber-400 font-bold bg-amber-400/10 border border-amber-400/30 px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">⏱ 3:00</div>
              <button id="game-close-btn" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer" title="閉じる">✕</button>
            </div>
          </div>

          <!-- ゲームステージキャンバス -->
          <div id="game-stage" class="relative w-full h-[420px] bg-slate-950 overflow-hidden flex items-center justify-center">
            <canvas id="game-canvas" class="w-full h-full touch-none"></canvas>
            <div id="game-overlay-ui" class="absolute inset-0 pointer-events-none"></div>
          </div>

          <!-- フッター案内とスコア -->
          <div class="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/95 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 flex-shrink-0">
            <span id="game-hint" class="truncate max-w-[65%] sm:max-w-[70%]">タップやドラッグで答えてね</span>
            <div id="game-score-box" class="font-mono text-white font-semibold flex-shrink-0 text-right">
              スコア: <span id="game-score" class="text-amber-400 font-bold">0</span>
            </div>
          </div>
        </div>
      `;
      if (document.body) {
        document.body.appendChild(modal);
      }

      const closeBtn = document.getElementById('game-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      const hintBtn = document.getElementById('game-hint-btn');
      if (hintBtn) {
        hintBtn.addEventListener('click', () => {
          if (this.currentGame?.useHint) this.currentGame.useHint();
        });
      }
      const shuffleBtn = document.getElementById('game-shuffle-btn');
      if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
          if (this.currentGame?.useShuffle) this.currentGame.useShuffle();
        });
      }
    }
    this.modal = modal;
  }

  getMaxStagesForNode(node) {
    if (!node) return 6;
    if (node.stages) return Number(node.stages);
    if (node.gameData?.stages) return Number(node.gameData.stages);
    const subj = node.subject || '';
    if (subj === '国語') {
      const KANJI_COUNTS = { 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191 };
      const cnt = KANJI_COUNTS[node.grade] || 80;
      return Math.min(12, Math.max(6, Math.ceil(cnt / 12)));
    }
    if (subj.includes('英語') || subj === '外国語・英語') return 25;
    if (subj === '算数') return 20;
    if (subj === '理科') return 15;
    if (subj === '社会') return 10;
    if (subj === '生活') return 4;
    return 6;
  }

  setupGameCanvas(canvas, container) {
    if (!canvas || !container) return null;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 384;
    return HDCanvasRenderer.setup(canvas, width, height);
  }

  handleCanvasResize() {
    if (!this.modal || this.modal.classList.contains('hidden')) return;
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('game-stage');
    if (!canvas || !stage) return;
    this.setupGameCanvas(canvas, stage);
    if (this.currentGame && typeof this.currentGame.render === 'function') this.currentGame.render();
  }

  resolveStageTimeLimit() {
    return UNIFIED_STAGE_TIME_LIMIT_SECONDS;
  }

  startStageCountdown(node) {
    this.stopStageCountdown();
    this.stageTimeLimit = this.resolveStageTimeLimit(node);
    this.stageDeadline = this.now() + this.stageTimeLimit * 1000;
    if (this.currentGame && 'totalTime' in this.currentGame) this.currentGame.totalTime = this.stageTimeLimit;
    this.setPlayActivity(true);
    this.updateStageCountdown(node);
    this.stageTimerId = this.setIntervalImpl(() => this.updateStageCountdown(node), 250);
  }

  setPlayActivity(active) {
    const next = Boolean(active);
    if (this.playActivityActive === next) return;
    this.playActivityActive = next;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('GAME_PLAY_STATE_CHANGED', { detail: { active: next } }));
    }
  }

  updateStageCountdown(node) {
    if (this.stageSettled || !this.currentGame) return;
    const remainingSeconds = Math.max(0, Math.ceil((this.stageDeadline - this.now()) / 1000));
    this.currentGame.timeLeft = remainingSeconds;
    this.currentGame.remainingTime = remainingSeconds;
    this.renderStageCountdown(remainingSeconds);
    if (remainingSeconds <= 0) this.handleStageTimeout(node);
  }

  renderStageCountdown(remainingSeconds) {
    const timerEl = typeof document !== 'undefined' ? document.getElementById('game-timer') : null;
    if (!timerEl) return;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerEl.innerText = `⏱ ${minutes}:${String(seconds).padStart(2, '0')}`;
    timerEl.classList.toggle('text-rose-300', remainingSeconds <= 10);
    timerEl.classList.toggle('bg-rose-500/20', remainingSeconds <= 10);
    timerEl.classList.toggle('animate-pulse', remainingSeconds <= 10);
    timerEl.setAttribute('aria-label', `残り時間 ${minutes}分${seconds}秒`);
  }

  stopStageCountdown() {
    if (this.stageTimerId != null) this.clearIntervalImpl(this.stageTimerId);
    this.stageTimerId = null;
    this.stageDeadline = 0;
    this.setPlayActivity(false);
  }

  handleStageTimeout(node) {
    if (this.stageSettled) return;
    this.stageSettled = true;
    this.stopStageCountdown();
    const game = this.currentGame;
    game.timeLeft = 0;
    game.remainingTime = 0;
    const correctCount = Number(game.correctCount ?? game.qIndex ?? game.matchedPairsCount) || 0;
    const totalCount = Number(game.totalCount ?? game.totalPairs ?? game.questions?.length ?? game.puzzles?.length) || 10;
    game.destroy?.();
    this.onGameOver(node, 0, 0, {
      cleared: false,
      is_success: false,
      accuracy: totalCount > 0 ? Math.max(0, Math.min(1, correctCount / totalCount)) : 0,
      correctCount,
      totalCount,
      reason: 'TIME_UP',
      timedOut: true,
      time_remaining_sec: 0
    });
  }

  // 知識ノードからゲームを開始
  open(nodeInfo, stageNum = 1) {
    this.stopStageCountdown();
    this.stageSettled = false;
    if (this.modal) this.modal.classList.remove('hidden');
    this.currentLevel = Number(stageNum) || 1;
    const scoreEl = document.getElementById('game-score');
    if (scoreEl) scoreEl.innerText = '0';
    const timerEl = document.getElementById('game-timer');
    if (timerEl) timerEl.innerText = '⏱ 3:00';
    const overlayEl = document.getElementById('game-overlay-ui');
    if (overlayEl) {
      overlayEl.innerHTML = '';
      overlayEl.style.pointerEvents = 'none';
    }

    const targetNode = (nodeInfo && typeof nodeInfo === 'object' && (nodeInfo.name || nodeInfo.id))
      ? nodeInfo
      : (FULL_CURRICULUM_DAG.find(n => n.id === nodeInfo?.id) ||
         FULL_CURRICULUM_DAG.find(n => n.subject === nodeInfo?.subject) ||
         nodeInfo ||
         FULL_CURRICULUM_DAG[0] ||
         { id: 'DEFAULT_NODE', name: '学習ステージ', subject: '国語', grade: 1 });

    const effectiveGrade = targetNode.grade || 1;
    const gradeText = targetNode.grade ? `小学${targetNode.grade}年` : '全学年';
    const gradeBadge = document.getElementById('game-grade-badge');
    if (gradeBadge) gradeBadge.innerText = gradeText;
    const subjBadge = document.getElementById('game-subject-badge');
    if (subjBadge) subjBadge.innerText = targetNode.subject || '全般';
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.innerText = `${targetNode.name || '学習ステージ'}　ステージ${this.currentLevel}`;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    this.setupGameCanvas(canvas, container);

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    const gameType = targetNode.gameType || this.inferGameTypeBySubject(targetNode);
    if (canvas) {
      this.initGameInstance(gameType, targetNode, canvas, effectiveGrade, this.currentLevel);
    }
  }

  inferGameTypeBySubject(node) {
    const subj = node?.subject || '';
    if (subj === '国語') return 'KOKUGO_CURRICULUM';
    if (subj === '算数') return 'MATH_CURRICULUM';
    if (subj === '理科') return 'SCIENCE_CURRICULUM';
    if (subj === '社会') return 'SOCIAL_CURRICULUM';
    if (subj === '生活') return 'LIFE_CURRICULUM';
    if (subj === '外国語・英語' || subj === '英語') return 'ENGLISH_CURRICULUM';
    return null;
  }

  isGameSupportedForGrade(gameType, grade) {
    const info = GAME_GRADE_SUPPORT_MAP[gameType];
    if (!info || !Array.isArray(info.grades)) return false;
    if (!grade || Number(grade) === 0) return false;
    return info.grades.includes(Number(grade));
  }

  generatePopularGameNode(gameType, grade = 1, level = 1) {
    const g = Number(grade) || 1;
    switch (gameType) {
      case 'RADICAL_BUILDER':
        return {
          id: `POPULAR_RADICAL_G${g}`,
          subject: '国語',
          grade: g,
          name: `${g}年 部首・漢字パーツ組み立て`,
          desc: `小学${g}年生配当漢字の部首・かんむり・へんパーツを合体させて正しい漢字を完成させよう！`,
          bloomDepth: 1.0 + g * 0.2,
          gameType: 'RADICAL_BUILDER'
        };
      case 'KUKU_LINK':
        return {
          id: `POPULAR_KUKU_G${g}`,
          subject: '算数',
          grade: g,
          name: g === 2 ? '2年 九九銀河マッチング' : `${g}年 わり算・計算応用 銀河マッチング`,
          desc: g === 2 ? '2〜9の段の九九暗唱。式と積を2曲がり以内の銀河レーザーでつなごう！' : `小学${g}年生の計算応用。式と値を銀河レーザーでつなごう！`,
          bloomDepth: 1.2 + g * 0.15,
          gameType: 'KUKU_LINK',
          gameData: { rows: 4, cols: 4, timeLimit: 75, grade: g, level: level }
        };
      case 'AETHER_SCALE':
      case 'RATIO_SCALE':
        return {
          id: `POPULAR_SCALE_G${g}`,
          subject: '算数',
          grade: g,
          name: g <= 2 ? `${g}年 数の合成分解・宇宙船てんびん` : (g <= 4 ? `${g}年 小数・分数 宇宙船てんびん` : `${g}年 割合・方程式 宇宙船てんびん`),
          desc: '左右の天秤におもりや結晶を配置し、力と割合の平衡を達成しよう！',
          bloomDepth: 1.0 + g * 0.25,
          gameType: 'AETHER_SCALE',
          gameData: { targetRatio: 50 + g * 5, grade: g, level: level }
        };
      case 'COSMIC_ORBIT':
        return {
          id: `POPULAR_ORBIT_G${g}`,
          subject: '理科',
          grade: g,
          name: `${g}年 月と星・太陽 天体軌道実験室`,
          desc: '月を地球のまわりに回転させ、太陽の光による月の満ち欠けを観察しよう！',
          bloomDepth: 1.6 + (g - 4) * 0.3,
          gameType: 'COSMIC_ORBIT',
          gameData: { selectedMode: 'COSMIC_ORBIT', contentDomain: 'ASTRONOMY', grade: g, level: level }
        };
      case 'LEVER_PHYSICS':
        return {
          id: `POPULAR_LEVER_G${g}`,
          subject: '理科',
          grade: g,
          name: `${g}年 てこの規則性 宇宙物理実験室`,
          desc: '支点・力点・作用点と力のモーメント平衡。おもりを正しい目盛りに吊るして釣り合わせよう！',
          bloomDepth: 2.5,
          gameType: 'LEVER_PHYSICS',
          gameData: { selectedMode: 'LEVER_PHYSICS', contentDomain: 'LEVER', targetLeft: 50, armLeft: 2, targetRight: 20, correctSlot: 5, grade: g, level: level }
        };
      case 'CIRCUIT_SANDBOX':
        return {
          id: `POPULAR_CIRCUIT_G${g}`,
          subject: '理科',
          grade: g,
          name: g === 3 ? '3年 豆電球と磁石・回路実験室' : (g === 4 ? '4年 直列・並列つなぎ実験室' : `${g}年 電流と回路・電磁石実験室`),
          desc: '乾電池・スイッチ・豆電球を配線し、直列・並列つなぎで豆電球の明るさを実験しよう！',
          bloomDepth: 1.5 + (g - 3) * 0.25,
          gameType: 'CIRCUIT_SANDBOX',
          gameData: { selectedMode: 'CIRCUIT_SANDBOX', contentDomain: 'ELECTRIC', grade: g, level: level }
        };
      case 'PREFECTURE_JIGSAW':
        return {
          id: `POPULAR_PREF_G${g}`,
          subject: '社会',
          grade: g,
          name: `${g}年 日本47都道府県 列島パズル＆特産品尋宝`,
          desc: '8地方47都道府県の名称・位置・特産品。ピースを地図の正しい位置にはめ込もう！',
          bloomDepth: 1.5 + (g - 3) * 0.2,
          gameType: 'PREFECTURE_JIGSAW',
          gameData: { selectedMode: 'PREFECTURE_JIGSAW', contentDomain: 'SOCIAL_GEOGRAPHY', mode: 'PREFECTURES', region: 'ALL_JAPAN', grade: g, level: level }
        };
      case 'CONTEXT_MATCH':
        return {
          id: `POPULAR_CONTEXT_G${g}`,
          subject: '外国語・英語',
          grade: g,
          name: `${g}年 英語の場面別ペア選択`,
          desc: '英単語・挨拶表現とイラストや日本語の意味をエネルギーレーザーでペアマッチング！',
          bloomDepth: 1.2 + (g - 3) * 0.2,
          gameType: 'CONTEXT_MATCH',
          gameData: { grade: g, level: level }
        };
      case 'CATEGORY_SORT':
        return {
          id: `POPULAR_SORT_G${g}`,
          subject: '生活',
          grade: g,
          name: `${g}年 生活仕分け箱 (Category Sorting)`,
          desc: '毎日の生活習慣、安全な行動、ゴミ分別などを正しい仕分けボックスへドラッグ！',
          bloomDepth: 1.0 + g * 0.15,
          gameType: 'CATEGORY_SORT',
          gameData: { grade: g, level: level }
        };
      case 'KOKUGO_CURRICULUM':
      case 'MATH_CURRICULUM':
      case 'SCIENCE_CURRICULUM':
      case 'SOCIAL_CURRICULUM':
      case 'LIFE_CURRICULUM':
      case 'ENGLISH_CURRICULUM': {
        const subjectByType = {
          KOKUGO_CURRICULUM: '国語', MATH_CURRICULUM: '算数', SCIENCE_CURRICULUM: '理科',
          SOCIAL_CURRICULUM: '社会', LIFE_CURRICULUM: '生活', ENGLISH_CURRICULUM: '外国語・英語'
        };
        const subject = subjectByType[gameType];
        return {
          id: `POPULAR_${gameType}_G${g}`,
          subject,
          grade: g,
          name: `${g}年 ${subject} 学年テーマチャレンジ`,
          desc: '学年の学習テーマから10問を無作為に出題します。',
          bloomDepth: 1 + g * 0.25,
          gameType,
          gameData: { grade: g, level }
        };
      }
      case 'GRADE_EXAM':
        return {
          id: `POPULAR_EXAM_G${g}`,
          subject: '全教科総合',
          grade: g,
          name: `${g}年 学年総合チャレンジ（実力判定テスト）`,
          desc: `小学${g}年生で習う教科のまとめ問題だよ。クリアすると、お祝いコインを300枚もらえるよ！`,
          bloomDepth: 2.0 + g * 0.1,
          gameType: 'GRADE_EXAM',
          gameData: { grade: g, isExam: true, level: level }
        };
      default:
        return {
          id: `UNSUPPORTED_${String(gameType || 'UNKNOWN')}_G${g}`,
          subject: '準備中',
          grade: g,
          name: 'ただいま準備中',
          desc: '対応するゲーム形式が登録されていません。',
          bloomDepth: 1,
          gameType: 'UNSUPPORTED_GAME_TYPE',
          gameData: { grade: g, level: level }
        };
    }
  }

  // 特訓・人気ミニゲームから直接起動 (学年指定対応)
  openPopularGame(gameType, level = 1, requestedGrade = null) {
    if (this.modal) this.modal.classList.remove('hidden');
    this.currentLevel = Number(level) || 1;

    const supportInfo = GAME_GRADE_SUPPORT_MAP[gameType];
    let effectiveGrade = 1;

    if (requestedGrade && Number(requestedGrade) > 0) {
      const gNum = Number(requestedGrade);
      if (supportInfo && Array.isArray(supportInfo.grades)) {
        if (supportInfo.grades.includes(gNum)) {
          effectiveGrade = gNum;
        } else {
          effectiveGrade = supportInfo.grades[0];
        }
      } else {
        effectiveGrade = gNum;
      }
    } else {
      effectiveGrade = supportInfo ? supportInfo.grades[0] : 1;
    }

    const matchingNode = this.generatePopularGameNode(gameType, effectiveGrade, this.currentLevel);

    const gradeBadge = document.getElementById('game-grade-badge');
    if (gradeBadge) gradeBadge.innerText = matchingNode.grade ? `小学${matchingNode.grade}年` : '特訓モード';
    const subjBadge = document.getElementById('game-subject-badge');
    if (subjBadge) subjBadge.innerText = matchingNode.subject;
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.innerText = `もう一歩チャレンジ！ ${matchingNode.name}　ステージ${this.currentLevel}`;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    this.setupGameCanvas(canvas, container);

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    if (canvas) {
      this.initGameInstance(gameType, matchingNode, canvas, effectiveGrade, this.currentLevel);
    }
  }

  // 学年総合チャレンジモード
  openGradeExam(grade = 1) {
    if (this.modal) this.modal.classList.remove('hidden');
    this.currentLevel = 1;
    const g = Number(grade) || 1;
    const examNode = this.generatePopularGameNode('GRADE_EXAM', g, 1);

    const gBadge = document.getElementById('game-grade-badge');
    if (gBadge) gBadge.innerText = `小学${g}年`;
    const sBadge = document.getElementById('game-subject-badge');
    if (sBadge) sBadge.innerText = '全教科総合チャレンジ';
    const tEl = document.getElementById('game-title');
    if (tEl) tEl.innerText = examNode.name;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    this.setupGameCanvas(canvas, container);

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    if (canvas) {
      this.initGameInstance('GRADE_EXAM', examNode, canvas, g, 1);
    }
  }

  // 国語：漢字1,026字の学年別チャレンジ
  openKanjiGradeChallenge(grade = 1) {
    if (this.modal) this.modal.classList.remove('hidden');

    const KANJI_COUNTS = { 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191 };
    const count = KANJI_COUNTS[grade] || 80;
    const virtualNode = {
      id: `KOKUGO_G${grade}_KANJI_CHALLENGE`,
      subject: '国語',
      grade: grade,
      name: `小学${grade}年 配当漢字特訓（${count}字）`,
      desc: `文部科学省・小学${grade}年生配当漢字（${count}字）の読み仮名・音訓を学ぶステージ。`,
      bloomDepth: 1.0 + grade * 0.25,
      gameType: 'KANJI_SLASH'
    };

    const gBadge = document.getElementById('game-grade-badge');
    if (gBadge) gBadge.innerText = `小学${grade}年`;
    const sBadge = document.getElementById('game-subject-badge');
    if (sBadge) sBadge.innerText = '国語 (漢字1026字)';
    const tEl = document.getElementById('game-title');
    if (tEl) tEl.innerText = virtualNode.name;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    this.setupGameCanvas(canvas, container);

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    if (canvas) {
      this.initGameInstance('KANJI_SLASH', virtualNode, canvas, grade, 1);
    }
  }

  initGameInstance(gameType, targetNode, canvas, customGrade = null, customLevel = 1) {
    this.stopStageCountdown();
    this.stageSettled = false;
    const hintBtn = document.getElementById('game-hint-btn');
    const shuffleBtn = document.getElementById('game-shuffle-btn');

    // Reset buttons safely
    if (hintBtn) hintBtn.classList.add('hidden');
    if (shuffleBtn) shuffleBtn.classList.add('hidden');

    const onWinCallback = (stars, score, result = {}) => {
      if (this.stageSettled) return;
      this.stageSettled = true;
      this.stopStageCountdown();
      this.onGameOver(targetNode, stars, score, result);
    };
    const hintEl = document.getElementById('game-hint');
    const effectiveGrade = customGrade || targetNode.grade || 1;
    const levelNum = Number(customLevel) || 1;
    const selectedMode = targetNode.gameData?.selectedMode || targetNode.gameData?.mode || null;

    const failClosed = (message) => {
      this.currentGame = null;
      const overlay = document.getElementById('game-overlay-ui');
      if (overlay) {
        overlay.style.pointerEvents = 'auto';
        overlay.innerHTML = `<div class="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <h3 class="text-xl font-black text-rose-300 mb-3">ごめんね、今はあそべないみたい</h3>
          <p class="text-sm text-white max-w-md">${String(message || 'ほかのゲームを選んでみてね。')}</p>
          <button id="unsupported-close-btn" class="mt-5 min-h-14 px-6 rounded-xl bg-slate-700 text-white font-bold">もどる</button>
        </div>`;
        const closeButton = document.getElementById('unsupported-close-btn');
        if (closeButton) closeButton.onclick = () => this.close();
      }
    };

    switch (gameType) {
      case 'KUKU_LINK':
        if (selectedMode === 'MATH_CURRICULUM') {
          this.currentGame = new MathCurriculumGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
          if (hintEl) hintEl.innerText = '算数の問題が10問。よく読んで答えよう！';
          break;
        }
        if (hintBtn) hintBtn.classList.remove('hidden');
        if (shuffleBtn) shuffleBtn.classList.remove('hidden');
        this.currentGame = new KukuLinkGame(canvas, {
          rows: targetNode.gameData?.rows || 4,
          cols: targetNode.gameData?.cols || 4,
          timeLimit: targetNode.gameData?.timeLimit || 75,
          onWin: onWinCallback,
          grade: effectiveGrade,
          level: levelNum,
          manageCountdown: false
        });
        if (hintEl) hintEl.innerText = '式と答えを見つけたら、同じペアをつなごう！';
        break;

      case 'RADICAL_BUILDER':
        this.currentGame = new RadicalBuilderGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '漢字の形をよく見て、ぴったりのカードを選ぼう！';
        break;

      case 'AETHER_SCALE':
      case 'RATIO_SCALE':
        if (effectiveGrade >= 3) {
          this.currentGame = new MathCurriculumGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
          if (hintEl) hintEl.innerText = '算数の問題が10問。よく読んで答えよう！';
        } else {
          this.currentGame = new PanBalanceScaleGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
          if (hintEl) hintEl.innerText = targetNode.gameData?.hint || '右のお皿におもりを置いて、てんびんをまっすぐにしよう！';
        }
        break;

      case 'COSMIC_ORBIT':
      case 'CELESTIAL_ORBIT':
        this.currentGame = new CosmicOrbitGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '月を動かして、お手本と同じ形にしよう！';
        break;

      case 'LEVER_PHYSICS':
        this.currentGame = new LeverPhysicsGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '右のおもりを動かして、てこをまっすぐにしよう！';
        break;

      case 'CIRCUIT_SANDBOX':
        this.currentGame = new CircuitSandboxGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = 'スイッチを入れて、豆電球を光らせよう！';
        break;

      case 'SCIENCE_SANDBOX': {
        const experiment = String(targetNode.gameData?.experiment || '');
        if (/ELECTRIC_CIRCUIT|SERIES|PARALLEL/.test(experiment)) {
          this.currentGame = new CircuitSandboxGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        } else {
          this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '理科');
        }
        if (hintEl) hintEl.innerText = '観察や実験を思い出しながら、10問に挑戦しよう！';
        break;
      }

      case 'PREFECTURE_JIGSAW':
        this.currentGame = new PrefectureJigsawGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '都道府県のピースを、日本地図の正しい場所へ運ぼう！';
        break;

      case 'KOKUGO_CURRICULUM':
        if (selectedMode === 'KANJI_SLASH') {
          this.currentGame = new KanjiSlashGame(canvas, { ...targetNode.gameData, manageCountdown: false }, onWinCallback, effectiveGrade, levelNum);
        } else if (selectedMode === 'RADICAL_BUILDER') {
          this.currentGame = new RadicalBuilderGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        } else {
          this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '国語');
        }
        if (hintEl) hintEl.innerText = selectedMode === 'RADICAL_BUILDER'
          ? '漢字の形をよく見て、ぴったりのカードを選ぼう！'
          : '国語の問題が10問。ことばをよく読んで答えよう！';
        break;

      case 'MATH_CURRICULUM':
        if (selectedMode === 'KUKU_LINK' && effectiveGrade === 2) {
          this.currentGame = new KukuLinkGame(canvas, { rows: 4, cols: 4, timeLimit: 75, onWin: onWinCallback, grade: effectiveGrade, level: levelNum, manageCountdown: false });
        } else {
          this.currentGame = new MathCurriculumGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        }
        if (hintEl) hintEl.innerText = '今の学年で習う算数から10問。落ち着いて考えよう！';
        break;

      case 'SCIENCE_CURRICULUM':
        if (effectiveGrade < 3) {
          failClosed('理科は小学3年生からの学習です。');
          break;
        }
        if (selectedMode === 'COSMIC_ORBIT') this.currentGame = new CosmicOrbitGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        else if (selectedMode === 'LEVER_PHYSICS' && effectiveGrade === 6) this.currentGame = new LeverPhysicsGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        else if (selectedMode === 'CIRCUIT_SANDBOX') this.currentGame = new CircuitSandboxGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        else this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '理科');
        if (hintEl) hintEl.innerText = '今の学年で習う理科から10問。実験を思い出そう！';
        break;

      case 'LIFE_CURRICULUM':
        if (effectiveGrade > 2) {
          failClosed('生活科は小学1・2年生の学習です。');
          break;
        }
        if (selectedMode === 'CATEGORY_SORT') this.currentGame = new CategorySortGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        else this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '生活');
        if (hintEl) hintEl.innerText = '学校やまち、自然のことを思い出して10問に答えよう！';
        break;

      case 'SOCIAL_CURRICULUM':
        if (effectiveGrade < 3) {
          failClosed('社会は小学3年生からの学習です。');
          break;
        }
        if (selectedMode === 'PREFECTURE_JIGSAW') this.currentGame = new PrefectureJigsawGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        else this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '社会');
        if (hintEl) hintEl.innerText = '地図やくらし、歴史から10問。知っていることを生かそう！';
        break;

      case 'ENGLISH_CURRICULUM': {
        const englishMode = targetNode.gameData?.selectedMode;
        const allowedModes = ['BASIC', 'EIKEN3', 'EIKEN2', 'SHORT_READING', 'LONG_READING'];
        if (!allowedModes.includes(englishMode)) {
          failClosed('英語のチャレンジレベルを先に選んでください。');
          break;
        }
        this.currentGame = new ContextMatchGame(canvas, { ...targetNode.gameData, difficulty: englishMode }, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '選んだレベルの英語が10問。文をよく読んでみよう！';
        break;
      }

      case 'CONTEXT_MATCH':
        this.currentGame = new ContextMatchGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = '英語と、その意味が合うカードを見つけてペアにしよう！';
        break;

      case 'CATEGORY_SORT':
        this.currentGame = new CategorySortGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = 'カードを、ぴったりの箱へ入れよう！';
        break;

      case 'GRADE_EXAM':
        this.currentGame = new GradeComprehensiveExamGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
        if (hintEl) hintEl.innerText = `小学${effectiveGrade}年のまとめ問題！よく読んで答えよう！`;
        break;

      case 'KANJI_SLASH':
        if (selectedMode === 'RADICAL_BUILDER') {
          this.currentGame = new RadicalBuilderGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum);
          if (hintEl) hintEl.innerText = '漢字の形をよく見て、ぴったりのカードを選ぼう！';
        } else if (selectedMode && !['KANJI_SLASH', 'KANJI_CHALLENGE'].includes(selectedMode)) {
          this.currentGame = new CurriculumQuizGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, levelNum, '国語');
          if (hintEl) hintEl.innerText = '今の学年で習う国語から10問。ことばをよく見よう！';
        } else {
          this.currentGame = new KanjiSlashGame(canvas, { ...targetNode.gameData, manageCountdown: false }, onWinCallback, effectiveGrade, levelNum);
          if (hintEl) hintEl.innerText = `小学${effectiveGrade}年の漢字だよ。正しい読みを見つけてタップ！`;
        }
        break;

      default:
        failClosed('このゲームはただいま準備中です。ほかのゲームを選んでね。');
        break;
    }

    if (this.currentGame && typeof this.currentGame.start === 'function') {
      this.attachStandardSaveState(this.currentGame, gameType, targetNode, levelNum);
      this.currentGame.start();
      if (!this.stageSettled && this.currentGame) this.startStageCountdown(targetNode);
    }
  }

  attachStandardSaveState(game, gameType, node, level) {
    if (!game || typeof game !== 'object') return;
    if (typeof game.exportSaveState !== 'function') {
      game.exportSaveState = () => ({
        schemaVersion: 1,
        gameType,
        nodeId: node?.id || null,
        updated_at: Date.now(),
        payload: {
          level: Number(game.level ?? level) || 1,
          score: Number(game.score) || 0,
          correctCount: Number(game.correctCount ?? game.matchesFound) || 0,
          totalCount: Number(game.totalCount ?? game.totalPairs ?? game.questions?.length) || 0,
          questionIndex: Number(game.currentQuestionIndex ?? game.questionIndex) || 0,
          timeLeft: Number(game.timeLeft ?? game.remainingTime) || 0,
          completed: Boolean(game.completed || game.isComplete || game.gameEnded)
        }
      });
    }
    if (typeof game.importSaveState !== 'function') {
      game.importSaveState = (state) => {
        if (!state || state.schemaVersion !== 1 || state.gameType !== gameType || state.nodeId !== (node?.id || null)) return false;
        const payload = state.payload || {};
        const assignments = [
          ['score', 'score'], ['correctCount', 'correctCount'], ['currentQuestionIndex', 'questionIndex'],
          ['questionIndex', 'questionIndex'], ['timeLeft', 'timeLeft'], ['remainingTime', 'timeLeft']
        ];
        for (const [property, key] of assignments) {
          if (property in game && Number.isFinite(Number(payload[key]))) game[property] = Number(payload[key]);
        }
        return true;
      };
    }
  }

  onGameOver(node, stars = 3, score = 100, result = {}) {
    this.stopStageCountdown();
    const cleared = result?.cleared ?? result?.is_success ?? (Number(stars) > 0);
    const accuracy = Number.isFinite(Number(result?.accuracy))
      ? Math.max(0, Math.min(1, Number(result.accuracy)))
      : Number((Math.max(0, Number(stars) || 0) / 3).toFixed(2));
    this.lastPlayedNode = node;
    this.lastPlayedLevel = this.currentLevel || 1;

    const maxStages = this.getMaxStagesForNode(node);
    const isLastStage = this.lastPlayedLevel >= maxStages;
    const stageLevel = this.lastPlayedLevel;

    if (cleared && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('GAME_CLEAR_SUCCESS', {
        detail: { nodeId: node.id, subject: node.subject, grade: node.grade, stars, score, accuracy, level: stageLevel, isFinalStage: isLastStage, cleared: true }
      }));
    }

    const overlay = document.getElementById('game-overlay-ui');
    if (overlay) {
      overlay.style.pointerEvents = 'auto';

      if (!cleared) {
        overlay.innerHTML = `<div class="w-full h-full bg-black/90 flex flex-col items-center justify-center p-6 text-center">
          <div class="text-4xl mb-3">🌱</div>
          <h3 class="text-2xl font-black text-sky-300 mb-2">もう一度やってみよう！</h3>
          <p class="text-sm text-white mb-5">正解 ${Number(result?.correctCount) || 0} / ${Number(result?.totalCount) || 10} 問</p>
          <div class="flex gap-3 flex-wrap justify-center">
            <button id="retry-stage-btn" class="min-h-14 px-5 rounded-xl bg-sky-500 text-slate-950 font-bold">同じステージに再挑戦</button>
            <button id="settle-confirm-btn" class="min-h-14 px-5 rounded-xl bg-slate-600 text-white font-bold">銀河星図へ戻る</button>
          </div>
        </div>`;
        const retryBtn = document.getElementById('retry-stage-btn');
        if (retryBtn) retryBtn.onclick = () => {
          overlay.innerHTML = '';
          overlay.style.pointerEvents = 'none';
          if (this.currentGame) this.currentGame.destroy();
          this.currentGame = null;
          this.open(this.lastPlayedNode, this.lastPlayedLevel);
        };
        const backBtn = document.getElementById('settle-confirm-btn');
        if (backBtn) backBtn.onclick = () => this.close();
        return;
      }

      const isExam = node.gameType === 'GRADE_EXAM' || node.id?.includes('EXAM');
      const examBonusHtml = isExam ? `<div class="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse">🌟 まとめ問題クリア！お祝いコインを300枚もらったよ！</div>` : '';

      const nextBtnHtml = isLastStage
        ? `<button disabled class="px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-bold rounded-xl shadow-lg cursor-default opacity-90">🏆 全${maxStages}ステージ完全制覇！</button>`
        : `<button id="next-stage-btn" class="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl shadow-lg transition cursor-pointer">🚀 次のステージへ挑戦！</button>`;

      overlay.innerHTML = `
        <div class="w-full h-full bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div class="text-4xl mb-2">${isLastStage ? '🏆🏆🏆' : '⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</div>
          <h3 class="text-2xl font-black text-amber-400 mb-1">${isLastStage ? '🎉 全ステージ完全制覇！おめでとう！ 🎉' : (isExam ? '🎓 学年総合チャレンジ合格！' : 'ステージクリア！')}</h3>
          <p class="text-sm font-semibold text-white mb-1">${node.name}　${stageLevel} / ${maxStages} ステージ</p>
          <p class="text-xs text-slate-400 mb-4 max-w-md">${node.desc || ''}</p>
          ${examBonusHtml}
          <div class="flex gap-3 flex-wrap justify-center">
            ${nextBtnHtml}
            <button id="settle-confirm-btn" class="px-5 py-2.5 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white font-bold rounded-xl shadow-lg transition cursor-pointer">🏠 銀河星図へ戻る</button>
          </div>
        </div>
      `;
      const confirmBtn = document.getElementById('settle-confirm-btn');
      if (confirmBtn) confirmBtn.onclick = () => this.close();

      const nextBtn = document.getElementById('next-stage-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          const nextLevel = this.lastPlayedLevel + 1;
          overlay.innerHTML = '';
          overlay.style.pointerEvents = 'none';
          if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
          }
          this.open(this.lastPlayedNode, nextLevel);
        };
      }
    }
  }

  close() {
    this.stopStageCountdown();
    this.stageSettled = true;
    if (this.currentGame) {
      this.currentGame.destroy();
      this.currentGame = null;
    }
    const overlay = document.getElementById('game-overlay-ui');
    if (overlay) {
      overlay.innerHTML = '';
      overlay.style.pointerEvents = 'none';
    }
    const canvas = document.getElementById('game-canvas');
    HDCanvasRenderer.for(canvas)?.dispose();
    this.modal.classList.add('hidden');
  }
}

let KANJI_1026_CACHE = null;
async function fetchKanji1026() {
  if (!KANJI_1026_CACHE) {
    try {
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const dataPath = path.resolve(__dirname, 'data', 'kanji_1026.json');
          if (fs.existsSync(dataPath)) {
            KANJI_1026_CACHE = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return KANJI_1026_CACHE;
          }
        } catch (err) {
          // ignore
        }
      }
      if (typeof fetch === 'function') {
        KANJI_1026_CACHE = await loadKanjiDatabase();
      }
    } catch (e) {
      // Fallback
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
    this.manageCountdown = gameData?.manageCountdown !== false;
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

    if (this.manageCountdown) {
      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        const tEl = document.getElementById('game-timer');
        if (tEl) tEl.innerText = `⏱ ${this.timeLeft}s`;
        if (this.timeLeft <= 0) {
          this.destroy();
          this.onWin(0, this.score, { cleared: false, accuracy: 0, correctCount: this.qIndex, totalCount: this.questions.length });
        }
      }, 1000);
    }

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
    const step = (getLogicalCanvasWidth(this.canvas) - padding * 2) / Math.max(1, count - 1);

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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
    this.checkHit(x, y);
  }

  handlePointerMove(e) {
    if (e.buttons === 1) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
      const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
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
    this.ctx.clearRect(0, 0, getLogicalCanvasWidth(this.canvas), getLogicalCanvasHeight(this.canvas));

    // お題表示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`【 ${this.currentKanji || ''} 】の${withKidsReading('正しい読み', 'ただしいよみ', this.grade)}は？`, getLogicalCanvasWidth(this.canvas) / 2, 42);

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

        if (m.y > getLogicalCanvasHeight(this.canvas) + 40) {
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
// 2. 国語：部首・漢字パーツ組み立て (RadicalBuilderGame)
// =========================================================================
export class RadicalBuilderGame {
  constructor(canvas, gameData, onWin, grade = 2) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = Math.max(1, Math.min(6, Number(grade) || 2));
    this.score = 0;
    this.combo = 0;
    this.running = false;
    this.qIndex = 0;

    const suppliedPuzzles = Array.isArray(gameData?.questions)
      ? gameData.questions.map((puzzle, index) => this.normalizePuzzle(puzzle, index)).filter(Boolean)
      : [];
    const gradePuzzles = getRadicalPuzzlesForGrade(this.grade);
    this.puzzles = shuffleCopy(suppliedPuzzles.length >= 10 ? suppliedPuzzles : gradePuzzles).slice(0, 10);
    this.placedParts = [];
    this.palette = [];
    this.animFuse = 0;
    this.locked = false;
    this.answerState = null;
    this.feedback = '';

    this.boundPointer = this.handlePointer.bind(this);
  }

  normalizePuzzle(puzzle, index = 0) {
    if (!puzzle || typeof puzzle !== 'object') return null;
    const target = String(puzzle.target || '').trim();
    const parts = (puzzle.parts || puzzle.radicals || []).map(part => String(part || '').trim()).filter(Boolean);
    if (!target || parts.length === 0) return null;
    const options = (Array.isArray(puzzle.options) ? puzzle.options : parts)
      .map(option => String(option || '').trim())
      .filter(Boolean);
    parts.forEach(part => {
      const needed = parts.filter(value => value === part).length;
      while (options.filter(value => value === part).length < needed) options.push(part);
    });
    return {
      id: String(puzzle.id || `RADICAL_CUSTOM_${index + 1}`),
      type: String(puzzle.type || 'ASSEMBLY'),
      target,
      reading: String(puzzle.reading || ''),
      prompt: String(puzzle.prompt || `「${target}」を正しいパーツで組み立てよう`),
      parts,
      options: options.slice(0, 6),
      hint: String(puzzle.hint || `${parts.join(' ＋ ')} を選びます。`)
    };
  }

  start() {
    this.running = true;
    this.score = 0;
    this.combo = 0;
    this.qIndex = 0;
    this.locked = false;
    this.answerState = null;
    this.feedback = '';
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
    this.locked = false;
    this.answerState = null;
    this.feedback = '';
    this.targetKanji = String(p.target);
    this.requiredParts = [...p.parts];

    const opts = p.options || [...this.requiredParts, '木', '日'];
    const shuffled = [...opts].sort(() => Math.random() - 0.5);

    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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
    if (!this.running || this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);

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
            this.locked = true;
            this.answerState = 'correct';
            this.feedback = `正解！「${this.targetKanji}」`;
            this.combo++;
            audio.playPositive(this.grade, this.combo);
            fx.spawnStarBurst(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2, 35, '#fbbf24');
            fx.showFloatingScore(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2 - 40, `合体成功！【${this.targetKanji}】`, '#34d399');
            guidance.registerSuccess({ questionId: 'RADICAL_' + this.targetKanji });

            this.score += 150 * this.combo;
            const scoreEl = document.getElementById('game-score');
            if (scoreEl) scoreEl.innerText = this.score;

            this.animFuse = 15;
            setTimeout(() => {
              this.qIndex++;
              this.setupPuzzle();
            }, 750);
          } else {
            this.locked = true;
            this.answerState = 'incorrect';
            this.feedback = 'もう一度。黄色のパーツを見てみよう。';
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

            this.palette.forEach(p => {
              if (this.requiredParts.includes(p.text)) p.highlight = true;
            });

            fx.triggerScreenShake(this.canvas, 'bounce', 250);
            setTimeout(() => {
              // Return pieces
              this.placedParts = [];
              this.palette.forEach(p => {
                p.used = false;
                p.highlight = false;
              });
              this.answerState = null;
              this.feedback = '';
              this.locked = false;
            }, 850);
          }
        }
        return;
      }
    }

    // 2. Check tap on placed slot to return piece
    const slotY = getLogicalCanvasHeight(this.canvas) / 2 + 10;
    const slotSize = 64;
    const slotCount = this.requiredParts.length;
    const totalSlotW = slotCount * (slotSize + 16);
    const slotStartX = (getLogicalCanvasWidth(this.canvas) - totalSlotW) / 2 + slotSize / 2;

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
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
    this.ctx.clearRect(0, 0, w, h);

    // お題・ヒント表示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`小学${this.grade}年・部首と漢字パーツ　${this.qIndex + 1} / ${this.puzzles.length}`, w / 2, 26);
    this.ctx.fillStyle = '#bae6fd';
    this.ctx.font = 'bold 17px sans-serif';
    this.ctx.fillText(this.currentPuzzle?.prompt || `「${this.targetKanji}」の問題`, w / 2, 53);

    if (this.currentPuzzle?.hint) {
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '13px sans-serif';
      this.ctx.fillText(`読み：${this.currentPuzzle.reading || '―'}　ヒント：${this.currentPuzzle.hint}`, w / 2, 77);
    }

    if (this.feedback) {
      this.ctx.fillStyle = this.answerState === 'correct' ? '#6ee7b7' : '#fda4af';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText(this.feedback, w / 2, 101);
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
      if (!text) safeSetLineDash(this.ctx, [6, 6]);

      this.ctx.beginPath();
      safeRoundRect(this.ctx, sx - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 14);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      if (text) {
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = text.length > 2 ? 'bold 12px sans-serif' : 'bold 30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, sx, slotY);
      } else {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.currentPuzzle?.type === 'ASSEMBLY' ? `パーツ${i + 1}` : '答え', sx, slotY);
      }
    }

    // 部首トレイパレット描画
    this.palette.forEach(item => {
      this.ctx.save();
      const selectedCorrect = item.used && (this.answerState === 'correct' || (this.answerState === 'incorrect' && this.requiredParts.includes(item.text)));
      const selectedWrong = item.used && this.answerState === 'incorrect' && !this.requiredParts.includes(item.text);
      const selectedPending = item.used && !this.answerState;
      if (item.highlight && !item.used) {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 12;
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 3;
      } else if (selectedCorrect) {
        this.ctx.shadowColor = '#34d399';
        this.ctx.shadowBlur = 14;
        this.ctx.strokeStyle = '#a7f3d0';
        this.ctx.lineWidth = 4;
      } else if (selectedWrong) {
        this.ctx.shadowColor = '#fb7185';
        this.ctx.shadowBlur = 14;
        this.ctx.strokeStyle = '#fecdd3';
        this.ctx.lineWidth = 4;
      } else if (selectedPending) {
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 14;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
      } else {
        this.ctx.strokeStyle = '#64748b';
        this.ctx.lineWidth = 2;
      }

      this.ctx.fillStyle = selectedCorrect ? '#047857' : (selectedWrong ? '#9f1239' : (selectedPending ? '#0369a1' : (item.highlight ? '#422006' : '#1e293b')));
      this.ctx.beginPath();
      safeRoundRect(this.ctx, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size, 14);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = item.text.length > 2 ? 'bold 11px sans-serif' : 'bold 26px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(item.text, item.x, item.y);
      if (item.used) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillText('✓', item.x + item.size / 2 - 9, item.y - item.size / 2 + 12);
      }
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
// 学年・教科別 10 問カリキュラムセッション
// =========================================================================
function shuffleCopy(items = []) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function curriculumQuestion(prompt, correct, distractors, mode = 'ALL', explanation = '') {
  return { prompt, correct: String(correct), distractors: distractors.map(String), mode, explanation };
}

function getFallbackCurriculumBank(subject, grade) {
  const g = Math.max(1, Math.min(6, Number(grade) || 1));
  const q = curriculumQuestion;
  if (subject === '生活') {
    return g === 1 ? [
      q('横断歩道を渡る前にすることは？', '左右をよく見る', ['すぐ走り出す', '目を閉じる', '後ろだけを見る'], 'SAFETY'),
      q('学校で会った先生への朝のあいさつは？', 'おはようございます', ['いただきます', 'ただいま', 'おやすみなさい'], 'SCHOOL'),
      q('アサガオの種をまいた後に必要な世話は？', '土が乾いたら水をやる', ['毎日掘り返す', '暗い箱に入れる', '葉を全部取る'], 'NATURE'),
      q('教室で友達が困っているときは？', '声をかけて助ける', ['知らないふりをする', '大声で笑う', '物を隠す'], 'SCHOOL'),
      q('雨の日の通学で安全な行動は？', '前を見てゆっくり歩く', ['傘で遊びながら走る', '車道を歩く', '水たまりへ飛び込む'], 'SAFETY'),
      q('春に見つけやすい自然の変化は？', '花が咲き始める', ['雪が毎日積もる', '木の葉が全部落ちる', '日が最も短くなる'], 'SEASON'),
      q('使ったはさみを片づける場所は？', '決められた道具箱', ['床の上', '机の端', '通路の中央'], 'SCHOOL'),
      q('給食の前にすることは？', '手を洗う', ['外を走る', '机に靴を置く', '帽子を投げる'], 'HEALTH'),
      q('生き物を観察するときに大切なことは？', 'やさしく扱って元の場所へ戻す', ['強くつかむ', '持ち帰って放置する', '巣を壊す'], 'NATURE'),
      q('家族に手伝ってもらったときの言葉は？', 'ありがとう', ['知らない', 'いやだ', 'あとで'], 'GROWTH')
    ] : [
      q('図書館で本を読むときのマナーは？', '静かな声で読む', ['大声で話す', '本を投げる', '走り回る'], 'COMMUNITY'),
      q('借りた本を読み終えたらどうする？', '期限までに返す', ['家の外へ置く', 'ページを切る', '友達に隠す'], 'COMMUNITY'),
      q('ミニトマトの土が乾いていたら？', '根元へ水をやる', ['実を全部取る', '茎を折る', '土を捨てる'], 'PLANT'),
      q('町探検で道路を歩く場所は？', '歩道の内側', ['車道の中央', '線路の上', '駐車場の出口'], 'SAFETY'),
      q('駅で電車を待つときは？', '黄色い線の内側で待つ', ['線路をのぞき込む', 'ホームを走る', '扉を押さえる'], 'COMMUNITY'),
      q('野菜の成長を比べる方法は？', '日付と様子を記録する', ['一度だけ見る', '名前を変える', '土を毎日替える'], 'PLANT'),
      q('地域のお店で質問するときは？', 'あいさつしてから尋ねる', ['商品を勝手に開ける', '大声で命令する', '返事を聞かず帰る'], 'COMMUNITY'),
      q('自分の成長を振り返る資料は？', '写真やできるようになったこと', ['知らない人の荷物', '空の箱だけ', '道路標識だけ'], 'GROWTH'),
      q('冬の生き物の様子を調べるときは？', '安全な場所で静かに観察する', ['巣を壊す', '池へ入る', '枝を全部折る'], 'SEASON'),
      q('家の仕事を分担するときに大切なのは？', 'できる仕事を相談する', ['全部人に任せる', '約束を忘れる', '道具を出したままにする'], 'GROWTH')
    ];
  }

  if (subject === '理科') {
    const banks = {
      3: [
        q('磁石の異なる極を近づけると？', '引き合う', ['しりぞけ合う', '光り出す', '溶け出す'], 'MAGNET'), q('磁石の同じ極を近づけると？', 'しりぞけ合う', ['引き合う', '重くなる', '温かくなる'], 'MAGNET'),
        q('日光は鏡でどのように進む？', '反射して向きが変わる', ['鏡を通り抜けるだけ', '必ず消える', '音に変わる'], 'LIGHT'), q('虫眼鏡で日光を集めると明るさは？', '集めた所が明るくなる', ['全体が暗くなる', '色がなくなる', '風が起こる'], 'LIGHT'),
        q('モンシロチョウの育つ順序は？', '卵・幼虫・さなぎ・成虫', ['卵・成虫・幼虫・さなぎ', '幼虫・卵・成虫・さなぎ', 'さなぎ・卵・幼虫・成虫'], 'LIFE'), q('植物の根の主なはたらきは？', '水を吸い上げる', ['光を出す', '音を作る', '種を飛ばす'], 'PLANT'),
        q('乾電池と豆電球が光る回路は？', '一つの輪につながった回路', ['途中が切れた回路', '導線が一本だけの回路', '電池がない回路'], 'ELECTRIC'), q('電気を通しやすい物は？', 'アルミニウムはく', ['乾いた木', '消しゴム', 'ガラス'], 'ELECTRIC'),
        q('音が出ている物に触れると？', '細かくふるえている', ['必ず冷たい', '動かない', '軽くなる'], 'SOUND'), q('風の強さを比べる方法は？', '物の動き方をそろえて比べる', ['色だけを見る', '場所を毎回変える', '時間を記録しない'], 'WIND')
      ],
      4: [
        q('閉じ込めた空気を押すと？', '体積が小さくなる', ['体積が必ず増える', '重さがなくなる', '水に変わる'], 'AIR_WATER'), q('閉じ込めた水を押したときは？', '体積はほとんど変わらない', ['半分になる', '空気になる', '必ず凍る'], 'AIR_WATER'),
        q('金属を温めると体積は？', '少し大きくなる', ['必ず半分になる', '変化せず消える', '水になる'], 'TEMPERATURE'), q('水が沸騰すると出る泡の中身は？', '水蒸気', ['空気だけ', '酸素だけ', '氷の粒'], 'WATER'),
        q('月や星は時間がたつとおおむねどちらへ動く？', '東から西へ', ['西から東へだけ', '北から南へだけ', '動かない'], 'ASTRONOMY'), q('星の並び方を保った集まりは？', '星座', ['地層', '回路', '磁極'], 'ASTRONOMY'),
        q('腕を曲げるとき縮む筋肉は？', '曲げる側の筋肉', ['両側が必ず同じだけ縮む', '骨だけ', '皮膚だけ'], 'BODY'), q('乾電池を直列につなぐと豆電球は？', '一個のときより明るくなる', ['必ず消える', '色だけ変わる', '音が鳴る'], 'ELECTRIC'),
        q('雨水が低い所へ流れる理由は？', '地面に高低があるから', ['水が磁石だから', '太陽が押すから', '土が光るから'], 'WEATHER'), q('一日の気温を比べる条件は？', '同じ場所で時刻ごとに測る', ['毎回温度計を変える', '日付を書かない', '手の感覚だけで決める'], 'WEATHER')
      ],
      5: [
        q('電磁石を強くする方法は？', 'コイルの巻き数を増やす', ['電流を止める', '導線を切る', '鉄心を外して必ず弱くしない'], 'ELECTROMAGNET'), q('電磁石の極を反対にするには？', '電流の向きを反対にする', ['コイルを水に入れる', '鉄心を短くするだけ', '電池を外す'], 'ELECTROMAGNET'),
        q('食塩が水に溶けた後の全体の重さは？', '溶かす前の合計と同じ', ['食塩の分だけ消える', '二倍になる', '水だけの重さになる'], 'DISSOLUTION'), q('多くの物質で水温を上げると溶ける量は？', '増えることがある', ['必ずゼロになる', 'どれも同じ', '測れなくなる'], 'DISSOLUTION'),
        q('花粉がめしべの先につくことを何という？', '受粉', ['発芽', '蒸散', '呼吸'], 'PLANT'), q('種子が発芽するために必要なものは？', '水・空気・適した温度', ['光だけ', '肥料だけ', '土だけ'], 'PLANT'),
        q('流れる水が地面をけずるはたらきは？', '侵食', ['堆積', '蒸発', '受粉'], 'RIVER'), q('川の流れが緩やかな所で起きやすいのは？', '土砂の堆積', ['強い侵食だけ', '沸騰', '磁化'], 'RIVER'),
        q('台風の進路を調べる資料は？', '気象衛星画像や天気図', ['歴史年表', '地形図だけ', '漢字辞典'], 'WEATHER'), q('ふりこの一往復の時間を変える条件は？', 'ふりこの長さ', ['おもりの色', '糸の色', '支柱の材質だけ'], 'PENDULUM')
      ],
      6: [
        q('てこがつり合う条件は？', '力と支点からの距離の積が等しい', ['左右の重さだけが等しい', '棒の色が同じ', '支点が端にある'], 'LEVER'), q('支点から遠い所で押すと必要な力は？', '小さくてすむ', ['必ず大きくなる', '変わらない', 'ゼロになる'], 'LEVER'),
        q('青色リトマス紙を赤くする水溶液は？', '酸性の水溶液', ['中性の水溶液', 'アルカリ性の水溶液', 'どの水溶液でも同じ'], 'SOLUTION'), q('塩酸に金属を入れた後にできる物は？', '元の金属と異なる物質', ['必ず同じ金属だけ', '水だけ', '何も残らない'], 'SOLUTION'),
        q('物が燃え続けるために必要な気体は？', '酸素', ['二酸化炭素', '窒素だけ', '水蒸気だけ'], 'COMBUSTION'), q('植物が日光を受けて葉で作るものは？', 'でんぷん', ['食塩', '金属', '砂'], 'PHOTOSYNTHESIS'),
        q('月の形が変わって見える主な理由は？', '太陽・地球・月の位置関係が変わるから', ['月自身が変形するから', '雲が毎日同じ形だから', '地球が止まるから'], 'MOON'), q('新月のころの月は太陽に対してどこにある？', '太陽とほぼ同じ方向', ['太陽と反対方向', '地球の真下', '位置は関係しない'], 'MOON'),
        q('電気を光や熱に変えて利用する例は？', '発光ダイオード', ['方位磁針だけ', '温度計だけ', '虫眼鏡だけ'], 'ENERGY'), q('土地のしま模様から分かることは？', '地層が積み重なった順序', ['今日の風向だけ', '電流の向き', '月の満ち欠け'], 'EARTH')
      ]
    };
    return banks[g] || [];
  }

  if (subject === '社会') {
    const banks = {
      3: [
        q('一般的な地図で上が表す方位は？', '北', ['南', '東', '西'], 'MAP'), q('土地の高さや建物の位置を表すものは？', '地図', ['年表', '回路図', '楽譜'], 'MAP'),
        q('火事や救急に対応する施設は？', '消防署', ['郵便局', '図書館', '博物館'], 'COMMUNITY'), q('町の安全を守る仕事をする施設は？', '警察署', ['農場', '工場', '市場'], 'COMMUNITY'),
        q('商品を売る店が工夫する目的は？', '買う人が利用しやすくするため', ['道路を狭くするため', '品物を隠すため', '客を減らすため'], 'WORK'), q('農家が作物を出荷する前に行うことは？', '大きさや品質をそろえる', ['土を付け足す', '名前を消す', '全部同じ箱から出す'], 'WORK'),
        q('市役所が行う仕事として適切なのは？', '住民票などの手続きを行う', ['電車を運転する', '魚を育てる', '本を出版する'], 'GOVERNMENT'), q('昔の町の様子を調べる資料は？', '古い写真や地図', ['未来の予定だけ', '今日の献立だけ', '音階表だけ'], 'HISTORY'),
        q('事故を防ぐため道路に設置されるものは？', '信号機や横断歩道', ['本棚や黒板', 'ベッドや机', '漁網や船'], 'SAFETY'), q('地域で働く人へ話を聞く前にすることは？', '質問を準備して許可を得る', ['勝手に録音する', '仕事を止める', '名前を隠す'], 'RESEARCH')
      ],
      4: [
        q('日本の都道府県の数は？', '47', ['43', '45', '50'], 'PREFECTURE'), q('北海道が属する地方区分は？', '北海道地方', ['東北地方', '関東地方', '中部地方'], 'PREFECTURE'),
        q('東京都が属する地方区分は？', '関東地方', ['近畿地方', '中国地方', '九州地方'], 'PREFECTURE'), q('京都府が属する地方区分は？', '近畿地方', ['東北地方', '四国地方', '関東地方'], 'PREFECTURE'),
        q('香川県が属する地方区分は？', '四国地方', ['中国地方', '中部地方', '東北地方'], 'PREFECTURE'), q('沖縄県が属する地方区分は？', '九州地方', ['北海道地方', '近畿地方', '関東地方'], 'PREFECTURE'),
        q('家庭から出たごみを集めて処理する主な主体は？', '市区町村', ['外国政府', '学校だけ', '各家庭だけ'], 'PUBLIC'), q('安全な水を家庭へ送る施設は？', '浄水場', ['発電所', '消防署', '裁判所'], 'PUBLIC'),
        q('使った水をきれいにして川へ戻す施設は？', '下水処理場', ['図書館', '空港', '郵便局'], 'PUBLIC'), q('地域の災害に備えて確認する地図は？', 'ハザードマップ', ['世界時差表', '星座早見表', '音楽記号表'], 'DISASTER')
      ],
      5: [
        q('日本の国土で最も面積が大きい地形は？', '山地', ['平地', '湖', '砂浜'], 'LAND'), q('暖流と寒流が出会う海域の特徴は？', '魚が集まりやすい', ['雨が降らない', '海水が凍らないだけ', '船が進めない'], 'FISHERY'),
        q('都市の近くで新鮮な野菜を作る農業は？', '近郊農業', ['焼畑農業', '遊牧', '遠洋漁業'], 'AGRICULTURE'), q('涼しい高地を利用して出荷時期を遅らせる栽培は？', '抑制栽培', ['促成栽培', '水耕だけ', '二毛作だけ'], 'AGRICULTURE'),
        q('自動車工業が特に盛んな工業地帯は？', '中京工業地帯', ['京浜工業地帯', '阪神工業地帯', '北九州工業地域'], 'INDUSTRY'), q('原料を輸入して製品を輸出する貿易は？', '加工貿易', ['中継貿易', '自由貿易', '国内取引'], 'TRADE'),
        q('工場同士をパイプで結んだ地域は？', 'コンビナート', ['ニュータウン', '棚田', '漁港'], 'INDUSTRY'), q('食料自給率が表すものは？', '国内消費を国内生産でまかなう割合', ['輸出品だけの割合', '人口増加の割合', '森林だけの割合'], 'FOOD'),
        q('ニュースを複数の資料で確かめる理由は？', '情報の正確さを判断するため', ['文字を減らすため', '広告を増やすため', '意見を一つにするため'], 'INFORMATION'), q('森林が水をたくわえるはたらきは？', '水源を守るはたらき', ['海水を増やすはたらき', '地震を起こすはたらき', '電気を直接作るはたらき'], 'ENVIRONMENT')
      ],
      6: [
        q('米づくりが広まった時代は？', '弥生時代', ['縄文時代', '江戸時代', '明治時代'], 'HISTORY'), q('武士による最初の本格的な幕府は？', '鎌倉幕府', ['江戸幕府', '室町幕府', '大和朝廷'], 'HISTORY'),
        q('全国統一を進め太閤検地を行った人物は？', '豊臣秀吉', ['源頼朝', '徳川家光', '伊能忠敬'], 'HISTORY'), q('日本全国を測量して地図を作った人物は？', '伊能忠敬', ['聖徳太子', '福沢諭吉', '杉田玄白'], 'HISTORY'),
        q('明治政府が藩を廃止して置いたものは？', '府と県', ['幕府と藩', '荘園と国', '郡だけ'], 'HISTORY'), q('日本国憲法の基本原則の一つは？', '国民主権', ['武家政治', '身分制度', '鎖国政策'], 'CIVICS'),
        q('法律をつくる国の機関は？', '国会', ['内閣', '裁判所', '都道府県庁'], 'CIVICS'), q('行政を担当する国の機関は？', '内閣', ['国会', '裁判所', '選挙管理委員会だけ'], 'CIVICS'),
        q('争いを法に基づいて判断する機関は？', '裁判所', ['内閣', '国会', '消防署'], 'CIVICS'), q('選挙で大切にされる原則は？', '一人一票の平等', ['家族で一票', '税金で票数を決める', '役所だけが投票する'], 'CIVICS')
      ]
    };
    return banks[g] || [];
  }

  if (subject !== '国語') return [];
  const kokugoByGrade = {
    1: [['「あ」の次のひらがなは？','い',['う','え','お']],['「ア」と同じ音のひらがなは？','あ',['い','う','え']],['「やま」を表す漢字は？','山',['川','木','日']],['「かわ」を表す漢字は？','川',['山','田','火']],['「おおきい」の反対の言葉は？','ちいさい',['ながい','はやい','あかるい']],['文の終わりにつける記号は？','。',['、','・','「']],['「はな」を二つの音に分けると？','は・な',['はな・な','な・は・な','は・は']],['「がっこう」にある小さい文字は？','っ',['ょ','ゅ','ゃ']],['丁寧な返事は？','はい',['いや','だめ','あと']],['相手にお願いするときの言葉は？','おねがいします',['しらない',['あとで'],'いやだ']]],
    2: [['「明るい」の読みは？','あかるい',['あけるい','あかりい','めいるい']],['「海」の読みは？','うみ',['そら','やま','かわ']],['「春」の次の季節は？','夏',['冬','秋','朝']],['「高い」の反対の言葉は？','低い',['長い','広い','近い']],['「わたしは本を読みます」の主語は？','わたし',['本','読みます','は']],['読点として使う記号は？','、',['。','？','！']],['仲間になる言葉の組は？','犬と猫',['赤と走る','本と高い','朝と読む']],['「きょう」を漢字で表すと？','今日',['教日','京日','今月']],['順序を表す言葉は？','はじめに',['もしもし','さようなら','たしかに']],['手紙の最後に書く内容は？','自分の名前',['題名だけ','相手の住所だけ','天気だけ']]],
    3: [['「登る」の読みは？','のぼる',['くだる','わたる','はしる']],['「温度」の読みは？','おんど',['おんとう','あつど','おど']],['出来事の順序を表す言葉は？','まず・次に・最後に',['もし・だから・でも','右・左・上','赤・青・白']],['段落が変わるときは？','行を変えて一字下げる',['句点を消す','題名を変える','文字を小さくする']],['国語辞典で言葉を探す順序は？','五十音順',['文字数順','意味の長さ順','漢字の画数だけ']],['「頭が下がる」の意味は？','感心する',['眠くなる','帽子を取る','走り出す']],['理由を表す接続語は？','なぜなら',['しかし','そして','ところで']],['引用部分を囲む記号は？','「 」',['（ ）',['〔 〕'],'・ ・']],['物語の中心人物を何という？','主人公',['筆者','読者','編集者']],['相手に分かる説明で大切なことは？','順序と具体例',['声の大きさだけ','同じ言葉の繰り返しだけ','結論を隠すこと']]],
    4: [['「景色」の読みは？','けしき',['けいろ','かげいろ','けいしょく']],['「努力」の読みは？','どりょく',['どうりき','どりき','ぬりょく']],['「石の上にも三年」の意味は？','辛抱すれば成果が出る',['石は三年で割れる','毎日場所を変える','急げば必ず成功する']],['説明文の要点はどこに表れやすい？','段落の中心文',['ページ番号だけ','挿絵だけ','漢字の数だけ']],['「一方」を使う場面は？','二つを比べる場面',['名前を呼ぶ場面','時刻を聞く場面','謝る場面']],['同じ意味に近い言葉は？','希望と願い',['希望と失敗','願いと禁止','未来と昨日']],['新聞の見出しの役割は？','内容を短く伝える',['文字を飾るだけ','広告を隠す','日付を消す']],['事実と意見を分ける手がかりは？','根拠が示されているか',['文字の色だけ','文の長さだけ','句読点の数だけ']],['話し合いで大切なことは？','理由を添えて発言する',['相手をさえぎる','同じ意見だけ聞く','結論を決めない']],['要約するときに残すものは？','中心となる内容',['すべての例','同じ表現全部','飾りの言葉全部']]],
    5: [['「経験」の読みは？','けいけん',['きょうけん','けいげん','けんけい']],['「責任」の読みは？','せきにん',['せいにん','せきじん','せつにん']],['先生が来る、の尊敬語は？','先生がいらっしゃる',['先生が参る','先生がうかがう','先生が来てやる']],['自分が先生の本を読む、の謙譲表現は？','拝読する',['お読みになる','読まれる','お読みにする']],['提案文で必要なものは？','主張と根拠',['感想だけ','題名だけ','反対意見だけ']],['資料を引用するときに必要なことは？','出典を示す',['数字を変える','作者名を消す','一部を逆にする']],['「臨機応変」の意味は？','状況に合わせて対応する',['計画を必ず変えない','急いで逃げる','同じ失敗を重ねる']],['複合語の組は？','読書会',['読む','静かに','美しい']],['物語の人物像を考える手がかりは？','行動や会話',['ページ数だけ','表紙の色だけ','題名の文字数だけ']],['討論で反対意見を述べる前にすることは？','相手の考えを確かめる',['話を途中で止める','根拠を隠す','声だけ大きくする']]],
    6: [['「創造」の読みは？','そうぞう',['そうそう','しょうぞう','ぞうそう']],['「推測」の読みは？','すいそく',['すいそつ','おしはかり','ついそく']],['「温故知新」の意味は？','昔を学び新しい知識を得る',['新しい物だけを見る','昔を忘れる','温度を調べる']],['筆者の主張を支えるものは？','根拠や具体例',['題名の長さ','漢字の数','余白の広さ']],['反論を書くときに必要なことは？','相手の主張を正確に捉える',['相手を否定する言葉だけ','資料を使わない','結論を隠す']],['随筆の特徴は？','体験や考えを自由に書く',['事実を年代順だけに書く','会話だけを書く','数式だけを書く']],['敬意を表す言葉遣いは？','相手や場面に応じた敬語',['いつも同じ話し方','命令形だけ','主語を省くだけ']],['複数資料を読むときに比べるものは？','共通点と相違点',['紙の厚さだけ','文字色だけ','ページ番号だけ']],['文章を推敲する目的は？','より分かりやすく正確にする',['文字数を必ず増やす','題名を消す','段落を一つにする']],['スピーチの構成として適切なのは？','導入・本論・結論',['結論・結論・結論','例だけ','質問だけ']]]
  };
  return (kokugoByGrade[g] || kokugoByGrade[1]).map(([prompt, correct, wrong]) => q(prompt, correct, Array.isArray(wrong) ? wrong : []));
}

function sanitizeCurriculumBank(records, subject, selectedMode) {
  const removeEmoji = (value) => String(value ?? '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const normalized = records.map((record, index) => {
    const prompt = subject === '社会' ? removeEmoji(record.prompt ?? record.q) : String(record.prompt ?? record.q ?? '');
    const correct = subject === '社会' ? removeEmoji(record.correct) : String(record.correct ?? '');
    const rawOptions = record.options || [correct, ...(record.distractors || [])];
    const options = [...new Set(rawOptions.map(item => subject === '社会' ? removeEmoji(item) : String(item)))];
    if (!options.includes(correct)) options.unshift(correct);
    return { ...record, id: record.id || `${subject}_${index}`, prompt, correct, options: options.slice(0, 4), mode: record.mode || 'ALL' };
  }).filter(record => record.prompt && record.correct && record.options.length >= 4)
    .filter(record => subject !== '社会' || !record.prompt.toLocaleLowerCase().includes(record.correct.toLocaleLowerCase()));
  const preferred = selectedMode ? normalized.filter(record => record.mode === selectedMode) : [];
  const remaining = normalized.filter(record => !preferred.includes(record));
  return [...shuffleCopy(preferred), ...shuffleCopy(remaining)];
}

export class CurriculumQuizGame {
  constructor(canvas, gameData, onWin, grade = 1, level = 1, subject = '国語') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = Number(grade) || 1;
    this.level = Math.max(1, Number(level) || 1);
    this.subject = subject;
    this.gameData = gameData || {};
    this.selectedMode = this.gameData.selectedMode || this.gameData.mode || null;
    const supplied = Array.isArray(this.gameData.questionBank) ? this.gameData.questionBank : [];
    const fallback = getFallbackCurriculumBank(subject, this.grade);
    const bank = sanitizeCurriculumBank([...supplied, ...fallback], subject, this.selectedMode);
    this.questions = bank.slice(0, 10).map(question => ({ ...question, options: shuffleCopy(question.options) }));
    this.qIndex = 0;
    this.correctCount = 0;
    this.locked = false;
    this.feedback = '';
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.running = false;
    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    if (this.questions.length < 10) {
      this.onWin(0, 0, { cleared: false, accuracy: 0, correctCount: 0, totalCount: 10, reason: 'QUESTION_BANK_TOO_SMALL' });
      return;
    }
    this.running = true;
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  getOptionLayout() {
    const h = getLogicalCanvasHeight(this.canvas);
    const startY = 154;
    const gap = 8;
    const optionH = Math.max(56, Math.floor((h - startY - 12 - gap * 3) / 4));
    return { x: 24, w: getLogicalCanvasWidth(this.canvas) - 48, startY, gap, optionH };
  }

  handlePointer(event) {
    if (!this.running || this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (event.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
    const layout = this.getOptionLayout();
    const question = this.questions[this.qIndex];
    question.options.forEach((option, index) => {
      const optionY = layout.startY + index * (layout.optionH + layout.gap);
      if (this.locked || x < layout.x || x > layout.x + layout.w || y < optionY || y > optionY + layout.optionH) return;
      this.locked = true;
      const correct = option === question.correct;
      this.selectedOption = option;
      this.selectionCorrect = correct;
      const audio = getAudioSynthesizer();
      const fx = getFXSystem();
      const guidance = getErrorGuidanceSystem();
      if (correct) {
        this.correctCount++;
        this.feedback = '正解！';
        audio.playPositive(this.grade, this.correctCount);
        fx.spawnStarBurst(getLogicalCanvasWidth(this.canvas) / 2, optionY + layout.optionH / 2, 24, '#34d399');
        guidance.registerSuccess({ questionId: question.id });
      } else {
        this.feedback = `正解は「${question.correct}」`;
        audio.playGentleError();
        guidance.registerError({ subject: this.subject, questionId: question.id, targetElement: this.canvas, customExplanation: question.explanation || this.feedback });
        fx.triggerScreenShake(this.canvas, 'bounce', 180);
      }
      setTimeout(() => this.advance(), 700);
    });
  }

  advance() {
    if (!this.running) return;
    this.qIndex++;
    this.feedback = '';
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.locked = false;
    if (this.qIndex >= this.questions.length) {
      const accuracy = this.correctCount / this.questions.length;
      const cleared = this.correctCount >= 7;
      const stars = cleared ? (this.correctCount === 10 ? 3 : this.correctCount >= 8 ? 2 : 1) : 0;
      this.destroy();
      this.onWin(stars, this.correctCount * 100, { cleared, accuracy, correctCount: this.correctCount, totalCount: this.questions.length });
    }
  }

  drawWrappedText(text, x, y, width, height, fontSize = 16, color = '#ffffff') {
    const chars = Array.from(String(text || ''));
    const lines = [];
    let line = '';
    this.ctx.font = `bold ${fontSize}px sans-serif`;
    chars.forEach(char => {
      const candidate = line + char;
      if (this.ctx.measureText(candidate).width > width && line) {
        lines.push(line);
        line = char;
      } else line = candidate;
    });
    if (line) lines.push(line);
    const lineHeight = fontSize + 5;
    const visible = lines.slice(0, Math.max(1, Math.floor(height / lineHeight)));
    const start = y + (height - visible.length * lineHeight) / 2 + lineHeight * 0.75;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    visible.forEach((entry, index) => this.ctx.fillText(entry, x + width / 2, start + index * lineHeight));
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const question = this.questions[this.qIndex];
    this.ctx.clearRect(0, 0, w, getLogicalCanvasHeight(this.canvas));
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.subject}・小学${this.grade}年　${this.qIndex + 1} / ${this.questions.length}`, w / 2, 28);
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(24, 40, (w - 48) * (this.qIndex / this.questions.length), 5);
    this.drawWrappedText(question.prompt, 28, 52, w - 56, 86, 17, '#e0f2fe');
    const layout = this.getOptionLayout();
    question.options.forEach((option, index) => {
      const optionY = layout.startY + index * (layout.optionH + layout.gap);
      const isSelected = option === this.selectedOption;
      const isCorrectReveal = this.locked && option === question.correct;
      const isWrongSelected = isSelected && this.selectionCorrect === false;
      this.ctx.fillStyle = isCorrectReveal ? '#065f46' : (isWrongSelected ? '#9f1239' : (isSelected ? '#075985' : '#172554'));
      this.ctx.strokeStyle = isCorrectReveal ? '#6ee7b7' : (isWrongSelected ? '#fda4af' : (isSelected ? '#ffffff' : '#60a5fa'));
      this.ctx.lineWidth = isSelected || isCorrectReveal ? 4 : 2;
      if (isSelected) {
        this.ctx.shadowColor = isWrongSelected ? '#fb7185' : '#38bdf8';
        this.ctx.shadowBlur = 14;
      }
      this.ctx.beginPath();
      safeRoundRect(this.ctx, layout.x, optionY, layout.w, layout.optionH, 12);
      this.ctx.fill();
      this.ctx.stroke();
      this.drawWrappedText(`${String.fromCharCode(65 + index)}. ${option}`, layout.x + 8, optionY + 2, layout.w - 16, layout.optionH - 4, option.length > 30 ? 12 : 14, '#ffffff');
      this.ctx.shadowBlur = 0;
    });
    if (this.feedback) {
      this.ctx.fillStyle = this.selectionCorrect ? '#6ee7b7' : '#fda4af';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.fillText(this.feedback, w / 2, 146);
    }
    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 算数：学年別テーマ 10 問セッション
// =========================================================================
export class MathCurriculumGame extends CurriculumQuizGame {
  constructor(canvas, gameData, onWin, grade = 1, level = 1) {
    super(canvas, gameData, onWin, grade, level, '算数');
    const forcedVariant = this.variantForMode(this.selectedMode);
    const variants = forcedVariant == null ? shuffleCopy([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]) : Array(10).fill(forcedVariant);
    const seen = new Set();
    this.questions = variants.map((variant, index) => {
      let question;
      for (let attempt = 0; attempt < 30; attempt++) {
        question = this.buildQuestion(variant);
        if (!seen.has(question.prompt)) break;
      }
      seen.add(question.prompt);
      return { ...question, id: `MATH_G${this.grade}_L${this.level}_${index}`, options: shuffleCopy(question.options) };
    });
  }

  variantForMode(mode) {
    if (!mode || mode === 'MATH_CURRICULUM') return null;
    const value = String(mode).toUpperCase();
    const mappings = {
      ADD_SUB: 0, NUMBER: 0, SHAPE: 4, MEASURE: 3, KUKU: 1,
      DIVISION: 0, FRACTION: 1, DATA: 3, AREA: 0, DECIMAL: 2,
      ANGLE: 4, PERCENT: 0, AVERAGE: 3, VOLUME: 1, RATIO: 1,
      SPEED: 0, PROPORTION: 2, SYMMETRY: 4, STATISTICS: 3
    };
    return Number.isInteger(mappings[value]) ? mappings[value] : null;
  }

  makeChoice(correct, distractors) {
    const values = [String(correct), ...distractors.map(String)];
    const unique = [...new Set(values)];
    let delta = 1;
    while (unique.length < 4) {
      const numeric = Number(correct);
      const candidate = Number.isFinite(numeric) ? String(numeric + delta) : `ほかの答え ${delta}`;
      if (!unique.includes(candidate)) unique.push(candidate);
      delta++;
    }
    return { correct: String(correct), options: unique.slice(0, 4) };
  }

  buildQuestion(variant) {
    let prompt, answer, distractors, theme;
    const lane = Math.abs(Number(variant) || 0) % 5;
    const chance = (limit) => Math.floor(Math.random() * limit);
    if (this.grade === 1) {
      const a = 1 + chance(9), b = 1 + chance(Math.max(1, 10 - a));
      if (lane === 0 && Math.random() < 0.5) { prompt = `${a}こ と ${b}こ。ぜんぶで いくつ？`; answer = a + b; distractors = [a + b - 1, a + b + 1, a]; theme = '10までのたし算'; }
      else if (lane === 0) { const n = 20 + chance(80); prompt = `${n} の十の位の数字は？`; answer = Math.floor(n / 10); distractors = [n % 10, n, Math.floor(n / 10) + 1]; theme = '100までの数'; }
      else if (lane === 1) { const total = a + b; prompt = `${total}こ から ${b}こ とると、のこりは？`; answer = a; distractors = [b, total, a + 1]; theme = '10までのひき算'; }
      else if (lane === 2) { const left = 1 + chance(9), right = 10 + chance(10); prompt = `${left} と ${right}、大きい数は？`; answer = right; distractors = [left, left + right, 10]; theme = '数の比較・大小'; }
      else if (lane === 3 && Math.random() < 0.5) { const cm = 2 + chance(8); prompt = `${cm} cm のテープと ${cm + 2} cm のテープ。長いのは何 cm？`; answer = `${cm + 2} cm`; distractors = [`${cm} cm`, `${cm + 1} cm`, `${cm + 3} cm`]; theme = '長さくらべ'; }
      else if (lane === 3) { const hour = 1 + chance(11); prompt = `短い針が ${hour}、長い針が12を指す時刻は？`; answer = `${hour}時`; distractors = [`${hour}時30分`, `${hour + 1}時`, '12時']; theme = '時刻'; }
      else { const sides = [3, 4, 5, 6][chance(4)]; prompt = `辺が ${sides}本の形はどれ？`; const names = { 3: '三角形', 4: '四角形', 5: '五角形', 6: '六角形' }; answer = names[sides]; distractors = Object.values(names).filter(item => item !== answer).slice(0, 3); theme = 'かたち・形'; }
    } else if (this.grade === 2) {
      if (lane === 0 && Math.random() < 0.5) { const a = 20 + chance(60), b = 10 + chance(40); prompt = `${a} + ${b} = ?`; answer = a + b; distractors = [a + b - 10, a + b + 10, Math.abs(a - b)]; theme = '2けたのたし算'; }
      else if (lane === 0) { const n = 100 + chance(900); prompt = `${n} の百の位の数字は？`; answer = Math.floor(n / 100); distractors = [Math.floor(n / 10) % 10, n % 10, n]; theme = '1000までの大きな数'; }
      else if (lane === 1) { const table = 2 + chance(8), factor = 1 + chance(9); prompt = `${table} × ${factor} = ?`; answer = table * factor; distractors = [table + factor, table * Math.max(1, factor - 1), table * (factor + 1)]; theme = 'かけ算九九'; }
      else if (lane === 2 && Math.random() < 0.5) { const a = 50 + chance(50), b = 10 + chance(30); prompt = `${a} - ${b} = ?`; answer = a - b; distractors = [a + b, a - b + 10, a - b - 10]; theme = '2けたのひき算'; }
      else if (lane === 2) { const counts = [3 + chance(5), 2 + chance(5), 1 + chance(5)]; prompt = `表：赤 ${counts[0]}人、青 ${counts[1]}人、黄 ${counts[2]}人。いちばん多い色は？`; const index = counts.indexOf(Math.max(...counts)); answer = ['赤', '青', '黄'][index]; distractors = ['赤', '青', '黄', '同じ'].filter(v => v !== answer); theme = '簡単な表'; }
      else if (lane === 3 && Math.random() < 0.5) { const cm = 100 + chance(190); prompt = `${cm} cm は何 m 何 cm？`; answer = `${Math.floor(cm / 100)} m ${cm % 100} cm`; distractors = [`${cm} m`, `${cm % 100} m`, `${Math.floor(cm / 10)} m ${cm % 10} cm`]; theme = '長さ'; }
      else if (lane === 3) { const dl = 10 + chance(20); prompt = `${dl} dL は何 L 何 dL？`; answer = `${Math.floor(dl / 10)} L ${dl % 10} dL`; distractors = [`${dl} L`, `${dl % 10} L`, `${Math.floor(dl / 10)} dL`]; theme = '水の容量・かさ'; }
      else { const hour = 1 + chance(10), minutes = [10, 20, 30][chance(3)]; prompt = `${hour}時${minutes}分の 30分後は？`; const total = hour * 60 + minutes + 30; answer = `${Math.floor(total / 60)}時${total % 60}分`; distractors = [`${hour}時${minutes + 10}分`, `${hour + 1}時${minutes}分`, `${hour}時30分`]; theme = '時刻と時間'; }
    } else if (this.grade === 3) {
      if (lane === 0 && Math.random() < 0.34) { const a = 12 + chance(28), b = 2 + chance(7); prompt = `${a} × ${b} = ?`; answer = a * b; distractors = [a + b, a * b - b, a * b + a]; theme = '2けたのかけ算・乗法'; }
      else if (lane === 0 && Math.random() < 0.5) { const d = 2 + chance(7), n = 3 + chance(8); prompt = `${d * n} ÷ ${d} = ?`; answer = n; distractors = [d, n + 1, d * n]; theme = 'わり算・除法'; }
      else if (lane === 0) { const d = 3 + chance(6), q = 2 + chance(7), r = 1 + chance(d - 1); prompt = `${d * q + r} ÷ ${d} の答えは？`; answer = `${q} あまり ${r}`; distractors = [`${q + 1} あまり ${r}`, `${q} あまり ${r + 1}`, `${q}`]; theme = '余りのあるわり算'; }
      else if (lane === 1) { const denominator = [2, 3, 4, 5, 8][chance(5)]; prompt = `1を ${denominator}等分した1つ分は？`; answer = `1/${denominator}`; distractors = [`${denominator}/1`, `1/${denominator + 1}`, `${denominator - 1}/${denominator}`]; theme = '分数'; }
      else if (lane === 2 && Math.random() < 0.5) { const whole = 1 + chance(8), tenths = 1 + chance(9); prompt = `${whole}と 0.${tenths} を合わせた数は？`; answer = `${whole}.${tenths}`; distractors = [`${whole + tenths}`, `0.${whole}${tenths}`, `${whole}.${tenths + 1}`]; theme = '小数'; }
      else if (lane === 2) { const minutes = 2 + chance(8); prompt = `${minutes}分は何秒？`; answer = `${minutes * 60}秒`; distractors = [`${minutes * 10}秒`, `${minutes + 60}秒`, `${minutes * 100}秒`]; theme = '時刻と時間'; }
      else if (lane === 3 && Math.random() < 0.34) { const kg = 1 + chance(5); prompt = `${kg} kg は何 g？`; answer = `${kg * 1000} g`; distractors = [`${kg * 100} g`, `${kg * 10} g`, `${kg + 1000} g`]; theme = '計量・重さ'; }
      else if (lane === 3 && Math.random() < 0.5) { const values = [2, 3, 3, 4, 5, 5, 5, 6]; const target = [3, 5][chance(2)]; prompt = `表：${values.join('、')}。${target} はいくつある？`; answer = values.filter(value => value === target).length; distractors = [1, 2, 4]; theme = '表とデータ'; }
      else if (lane === 3) { const red = 2 + chance(6), blue = red + 2; prompt = `棒グラフで赤が${red}人、青が${blue}人。何人多い？`; answer = `${blue - red}人`; distractors = [`${blue}人`, `${red}人`, `${blue + red}人`]; theme = '棒グラフ'; }
      else { const r = 2 + chance(8); prompt = `半径 ${r} cm の円の直径は？`; answer = `${r * 2} cm`; distractors = [`${r} cm`, `${r * 3} cm`, `${r * 2 + 1} cm`]; theme = '円と球'; }
    } else if (this.grade === 4) {
      if (lane === 0) { const width = 3 + chance(12), height = 3 + chance(10); prompt = `たて ${height} cm、横 ${width} cm の長方形の面積は？`; answer = `${width * height} cm²`; distractors = [`${width + height} cm²`, `${width * height + width} cm²`, `${(width + height) * 2} cm²`]; theme = '面積'; }
      else if (lane === 1) { const denominator = [4, 5, 8, 10][chance(4)], a = 1 + chance(denominator - 2); prompt = `${a}/${denominator} + 1/${denominator} = ?`; answer = `${a + 1}/${denominator}`; distractors = [`${a + 1}/${denominator * 2}`, `${a}/${denominator}`, `${a + 2}/${denominator}`]; theme = '同分母の分数'; }
      else if (lane === 2) { const a = (10 + chance(70)) / 10, b = (10 + chance(40)) / 10; prompt = `${a} + ${b} = ?`; answer = (a + b).toFixed(1); distractors = [(a + b + 0.1).toFixed(1), Math.abs(a - b).toFixed(1), (a + b + 1).toFixed(1)]; theme = '小数の計算'; }
      else if (lane === 3 && Math.random() < 0.5) { const n = 100000 + chance(800000), divisor = [10, 100][chance(2)]; prompt = `${n} ÷ ${divisor} = ?`; answer = n / divisor; distractors = [n * divisor, n / 10, n / divisor + 10]; theme = '大きな数と四則計算'; }
      else if (lane === 3) { const mon = 10 + chance(20), tue = mon + 2 + chance(8); prompt = `折れ線グラフで月曜${mon}℃、火曜${tue}℃。何℃上がった？`; answer = `${tue - mon}℃`; distractors = [`${tue}℃`, `${mon}℃`, `${tue + mon}℃`]; theme = '折れ線グラフ'; }
      else { const angle = [45, 90, 135, 180][chance(4)]; const labels = { 45: '鋭角', 90: '直角', 135: '鈍角', 180: '平角' }; prompt = `${angle}° の角の名前は？`; answer = labels[angle]; distractors = ['鋭角', '直角', '鈍角', '平角'].filter(label => label !== answer); theme = '角'; }
    } else if (this.grade === 5) {
      if (lane === 0 && Math.random() < 0.5) { const percent = [10, 20, 25, 40, 50][chance(5)], base = 20 * (5 + chance(6)); prompt = `${base}人の ${percent}% は何人？`; answer = base * percent / 100; distractors = [base - answer, percent, answer + 10]; theme = '割合・百分率'; }
      else if (lane === 0) { const people = 3 + chance(8), pages = people * (2 + chance(5)); prompt = `${pages}ページを${people}人で同じ数ずつ読むと、1人あたり何ページ？`; answer = `${pages / people}ページ`; distractors = [`${pages}ページ`, `${people}ページ`, `${pages - people}ページ`]; theme = '単位量あたりの大きさ'; }
      else if (lane === 1) { const a = 2 + chance(7), b = 2 + chance(7), c = 2 + chance(7); prompt = `たて ${a} cm、横 ${b} cm、高さ ${c} cm の直方体の体積は？`; answer = `${a * b * c} cm³`; distractors = [`${a + b + c} cm³`, `${a * b} cm³`, `${(a + b) * c} cm³`]; theme = '体積'; }
      else if (lane === 2 && Math.random() < 0.5) { const a = 4 + chance(12), b = 4 + chance(12); prompt = `${a} と ${b} の平均は？`; answer = (a + b) / 2; distractors = [a + b, Math.abs(a - b), (a + b) / 2 + 1]; theme = '平均'; }
      else if (lane === 2) { const a = 2 + chance(8), b = 2 + chance(8); prompt = `${a}.${b} × 10 = ?`; answer = `${a * 10 + b}`; distractors = [`${a}.${b}`, `${a * 100 + b}`, `${a + b}`]; theme = '小数の乗法'; }
      else if (lane === 3 && Math.random() < 0.5) { const base = 2 + chance(8), height = 2 + chance(8); prompt = `底辺 ${base} cm、高さ ${height} cm の三角形の面積は？`; answer = `${base * height / 2} cm²`; distractors = [`${base * height} cm²`, `${base + height} cm²`, `${(base + height) * 2} cm²`]; theme = '三角形の面積'; }
      else if (lane === 3) { const denominator = [4, 5, 8][chance(3)], a = 1 + chance(denominator - 2); prompt = `${a}/${denominator} + 1/${denominator} = ?`; answer = `${a + 1}/${denominator}`; distractors = [`${a}/${denominator}`, `${a + 2}/${denominator}`, `${a + 1}/${denominator + 1}`]; theme = '分数の加法'; }
      else { const sides = [5, 6, 8][chance(3)]; prompt = `辺も角もすべて等しい${sides}角形の名前は？`; answer = `正${sides}角形`; distractors = [`${sides}角形`, `正${sides + 1}角形`, '円']; theme = '正多角形と円'; }
    } else {
      if (lane === 0 && Math.random() < 0.5) { const speed = 30 + chance(50), time = 2 + chance(4); prompt = `時速 ${speed} km で ${time}時間進む道のりは？`; answer = `${speed * time} km`; distractors = [`${Math.floor(speed / time)} km`, `${speed + time} km`, `${speed} km`]; theme = '速さ'; }
      else if (lane === 0) { const a = 2 + chance(7), b = 2 + chance(7), c = 2 + chance(7); prompt = `底面積${a * b} cm²、高さ${c} cmの角柱の体積は？`; answer = `${a * b * c} cm³`; distractors = [`${a * b + c} cm³`, `${a * b} cm³`, `${(a + b) * c} cm³`]; theme = '立体の体積'; }
      else if (lane === 1) { const a = 2 + chance(7), b = 2 + chance(7), multiple = 2 + chance(5); prompt = `${a}:${b} = ${a * multiple}:? の ? は？`; answer = b * multiple; distractors = [a * multiple, b + multiple, a + b]; theme = '比'; }
      else if (lane === 2 && Math.random() < 0.5) { const x = 2 + chance(8), k = 2 + chance(7); prompt = `y = ${k}x で、x = ${x} のとき y は？`; answer = k * x; distractors = [k + x, k * x + 1, x]; theme = '比例'; }
      else if (lane === 2) { const denominator = [3, 4, 5, 6][chance(4)], numerator = 1 + chance(denominator - 1), multiple = 2 + chance(4); prompt = `${numerator}/${denominator} × ${multiple} = ?`; answer = `${numerator * multiple}/${denominator}`; distractors = [`${numerator}/${denominator * multiple}`, `${numerator + multiple}/${denominator}`, `${numerator * multiple}/${denominator + 1}`]; theme = '分数の乗法'; }
      else if (lane === 3) { const values = shuffleCopy([2, 3, 3, 4, 4, 4, 5, 5, 6, 7]); prompt = `資料 ${values.join('、')} の最頻値は？`; answer = 4; distractors = [3, 5, 7]; theme = '統計・データ'; }
      else { const square = Math.random() < 0.35; prompt = `${square ? '正方形' : '長方形'}の対称の軸は何本？`; answer = square ? 4 : 2; distractors = square ? [1, 2, 3] : [0, 1, 4]; theme = '対称な図形'; }
    }
    return { prompt, theme, ...this.makeChoice(answer, distractors) };
  }
}

// =========================================================================
// 3. 算数：宇宙船エネルギーてんびん (PanBalanceScaleGame)
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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. Check tap on weight tray at bottom
    const trayY = getLogicalCanvasHeight(this.canvas) - 50;
    const trayStartX = 80;
    const stepX = (getLogicalCanvasWidth(this.canvas) - 160) / Math.max(1, this.weightTray.length - 1);

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
    if (x > getLogicalCanvasWidth(this.canvas) - 90 && y > getLogicalCanvasHeight(this.canvas) - 50) {
      audio.playClick();
      this.rightWeightsPlaced = [];
      this.recalcBalance();
      return;
    }

    // 3. Check tap on right pan to remove last weight
    const cx = getLogicalCanvasWidth(this.canvas) / 2;
    const cy = getLogicalCanvasHeight(this.canvas) / 2 - 20;
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
      fx.spawnStarBurst(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2, 35, '#10b981');
      fx.showFloatingScore(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2 - 40, '天秤完全平衡！', '#34d399');
      guidance.registerSuccess({ questionId: 'PAN_BALANCE' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 300);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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
    this.ctx.fillText(`${withKidsReading('宇宙船てんびん', 'うちゅうせんてんびん')}：左の結晶（${this.targetLeftWeight}g）とおもりを釣り合わせよう！`, cx, 40);

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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
    const cx = getLogicalCanvasWidth(this.canvas) / 2 - 40;
    const cy = getLogicalCanvasHeight(this.canvas) / 2 + 10;

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
      fx.spawnStarBurst(getLogicalCanvasWidth(this.canvas) - 80, 90, 30, '#fbbf24');
      fx.showFloatingScore(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2, `観察成功！【${this.targetPhase}】`, '#34d399');
      guidance.registerSuccess({ questionId: 'COSMIC_ORBIT' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 280);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const cx = getLogicalCanvasWidth(this.canvas) / 2;

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
        fx.spawnStarBurst(cx + clickedSlot * 30, getLogicalCanvasHeight(this.canvas) / 2 + 50, 30, '#10b981');
        fx.showFloatingScore(cx, getLogicalCanvasHeight(this.canvas) / 2 - 30, 'モーメント完全平衡！', '#34d399');
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
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. Click switch area
    if (Math.abs(x - (getLogicalCanvasWidth(this.canvas) / 2)) < 60 && Math.abs(y - 120) < 40) {
      this.switchClosed = !this.switchClosed;
      audio.playClick();

      if (this.switchClosed) {
        audio.playLaser();
        fx.spawnSparkBurst(getLogicalCanvasWidth(this.canvas) / 2, 120, 15, '#38bdf8');
        this.checkWinCondition();
      }
      return;
    }

    // 2. Click battery mode toggle button
    if (x > getLogicalCanvasWidth(this.canvas) - 150 && y > getLogicalCanvasHeight(this.canvas) - 70) {
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
      fx.spawnStarBurst(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2 + 60, 30, '#fbbf24');
      fx.showFloatingScore(getLogicalCanvasWidth(this.canvas) / 2, getLogicalCanvasHeight(this.canvas) / 2, '回路開通！豆電球点灯！', '#34d399');
      guidance.registerSuccess({ questionId: 'CIRCUIT_SANDBOX' });

      setTimeout(() => {
        this.destroy();
        this.onWin(3, 260);
      }, 500);
    }
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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
    this.ctx.fillText(this.switchClosed ? 'スイッチ：入' : 'スイッチ：切', cx, cy - 110);

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

let PREFECTURES_47_CACHE = null;
async function fetchPrefectures47() {
  if (!PREFECTURES_47_CACHE) {
    try {
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const dataPath = path.resolve(__dirname, 'data', 'prefectures_47.json');
          if (fs.existsSync(dataPath)) {
            PREFECTURES_47_CACHE = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return PREFECTURES_47_CACHE;
          }
        } catch (err) {
          // ignore
        }
      }
      if (typeof fetch === 'function') {
        PREFECTURES_47_CACHE = await loadPrefecturesDatabase();
      }
    } catch (e) {
      // Fallback
    }
  }
  return PREFECTURES_47_CACHE;
}

// =========================================================================
// 7. 社会：小学校3〜6年 学年別総合社会科学習システム (PrefectureJigsawGame / ShakaiQuest)
// =========================================================================
export class PrefectureJigsawGame {
  constructor(canvas, gameData, onWin, grade = 4, level = 1) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = Number(grade) || 4;
    this.level = Number(level) || 1;
    this.gameData = gameData;
    this.running = false;

    // 学年に応じた出題モード（小3: 地図記号・安全, 小4: 47都道府県・特産品, 小5: 国土産業・太平洋ベルト, 小6: 歴史・憲法公民）
    this.mode = gameData?.mode || (this.grade === 3 ? 'MAP_SYMBOLS' : (this.grade === 5 ? 'INDUSTRY' : (this.grade === 6 ? 'HISTORY_CIVICS' : 'PREFECTURES')));

    // 8大地方区分と代表座標（小学4年用）
    this.regions = [
      { id: 'hokkaido', aliases: ['hokkaido', '北海道', '北海道地方'], name: '北海道地方', mapX: 430, mapY: 90, color: '#38bdf8' },
      { id: 'tohoku', aliases: ['tohoku', '東北', '東北地方'], name: '東北地方', mapX: 385, mapY: 150, color: '#34d399' },
      { id: 'kanto', aliases: ['kanto', '関東', '関東地方'], name: '関東地方', mapX: 345, mapY: 210, color: '#fbbf24' },
      { id: 'chubu', aliases: ['chubu', '中部', '中部地方', '北陸', '甲信越', '東海'], name: '中部地方', mapX: 285, mapY: 215, color: '#f87171' },
      { id: 'kinki', aliases: ['kinki', '近畿', '近畿地方', '関西', '関西地方'], name: '近畿地方', mapX: 225, mapY: 225, color: '#a78bfa' },
      { id: 'chugoku', aliases: ['chugoku', '中国', '中国地方', '山陰', '山陽'], name: '中国地方', mapX: 165, mapY: 220, color: '#fb923c' },
      { id: 'shikoku', aliases: ['shikoku', '四国', '四国地方'], name: '四国地方', mapX: 170, mapY: 260, color: '#4ade80' },
      { id: 'kyushu_okinawa', aliases: ['kyushu', 'kyushu_okinawa', 'okinawa', '九州', '沖縄', '九州地方', '九州・沖縄', '九州・沖縄地方'], name: '九州・沖縄', mapX: 105, mapY: 270, color: '#e879f9' }
    ];

    // 小学3年：地図記号・方位・消防警察・まち探検（10ステージ）
    this.grade3Stages = [
      { id: 'G3_1', title: '1. 小中学校の記号 🏫', q: '教科書を開いた「文」の文字からできた小中学校の記号は？', correct: '🏫 文 (小中学校)', options: ['🏫 文 (小中学校)', '🚒 Y (消防署)', '🚓 X (警察署・交番)', '🏣 〒 (郵便局)'] },
      { id: 'G3_2', title: '2. 消防署の記号 🚒', q: '昔の火消し道具「さすまた」の形からできた消防署の記号は？', correct: '🚒 Y (消防署)', options: ['🚒 Y (消防署)', '🚓 X (警察署)', '🏥 十 (病院)', '🏛️ ◎ (市役所)'] },
      { id: 'G3_3', title: '3. 警察署・交番の記号 🚓', q: '交差した2本の警棒の形から生まれた警察署・交番の記号は？', correct: '🚓 X (警察署・交番)', options: ['🚓 X (警察署・交番)', '🏫 文 (学校)', '🏭 ⚙ (工場)', '⛩️ ⛩ (神社)'] },
      { id: 'G3_4', title: '4. 病院・診療所の記号 🏥', q: '救急・赤十字マークを表す病院・診療所の地図記号はどれ？', correct: '🏥 十 (病院・診療所)', options: ['🏥 十 (病院・診療所)', '卍 卍 (寺院)', '🌾 ⊞ (田んぼ)', '🌽 ᐯ (畑)'] },
      { id: 'G3_5', title: '5. 郵便局の記号 🏣', q: '手紙でおなじみの「テイシン」マークからできた郵便局の記号は？', correct: '🏣 〒 (郵便局)', options: ['🏣 〒 (郵便局)', '🏛️ ◎ (市役所)', '🏫 文 (学校)', '🚒 Y (消防署)'] },
      { id: 'G3_6', title: '6. 市役所・区役所の記号 🏛️', q: 'まちの行政の中心となる市役所・区役所を表す二重丸の記号は？', correct: '🏛️ ◎ (市役所・区役所)', options: ['🏛️ ◎ (市役所・区役所)', '〇 〇 (町村役場)', '🏣 〒 (郵便局)', '🏥 十 (病院)'] },
      { id: 'G3_7', title: '7. 神社と寺院の記号 ⛩️', q: '神社の入口にある鳥居の形をした「神社」の地図記号は？', correct: '⛩️ ⛩ (神社)', options: ['⛩️ ⛩ (神社)', '卍 卍 (寺院)', '⛪ ✝ (教会)', '🏰 ⛫ (城跡)'] },
      { id: 'G3_8', title: '8. 田んぼと畑の記号 🌾', q: 'お米を作る水田を表す「田」の漢字からできた地図記号は？', correct: '🌾 ⊞ (田んぼ・水田)', options: ['🌾 ⊞ (田んぼ・水田)', '🌽 ᐯ (畑)', '🌲 ☨ (針葉樹林)', '🌳 ⚲ (広葉樹林)'] },
      { id: 'G3_9', title: '9. 工場・発電所の記号 🏭', q: '製品や機械を作る歯車の形をした「工場」の地図記号はどれ？', correct: '🏭 ⚙ (工場)', options: ['🏭 ⚙ (工場)', '♨ ♨ (温泉)', '🗼 ⛯ (電波塔)', '⛰️ ▲ (山頂・三角点)'] },
      { id: 'G3_10', title: '10. 東西南北の方位 🧭', q: '太陽が昇る方角（東）と沈む方角（西）、地図の上（北）と下（南）の並びは？', correct: '🧭 東西南北（北が上・東が右）', options: ['🧭 東西南北（北が上・東が右）', '🧭 南北東西（南が上）', '🧭 西東南北', '🧭 北南東西'] }
    ];

    // 小学5年：国土・米作り・太平洋ベルト・工業地帯探検（10ステージ）
    this.grade5Stages = [
      { id: 'G5_1', title: '1. 日本の気候区分と季節風', q: '冬に大雪が降る「日本海側」と、冬に晴れて乾燥する「太平洋側」の特徴は？', correct: '❄️ 冬の北西季節風が日本海に雪をもたらす', options: ['❄️ 冬の北西季節風が日本海に雪をもたらす', '☀️ 夏の南東季節風のみ', '🌧️ 梅雨前線のみ', '🌀 年中同じ気候'] },
      { id: 'G5_2', title: '2. 米作りの工夫と品種改良', q: '山形県の庄内平野や新潟県の越後平野で行われている稲作の工夫は？', correct: '🌾 客土・かんがい施設とコシヒカリ等の品種改良', options: ['🌾 客土・かんがい施設とコシヒカリ等の品種改良', '🍎 りんごの促成栽培', '🍊 みかんの段々畑', '🍵 茶畑の霜よけ'] },
      { id: 'G5_3', title: '3. 近郊農業と促成栽培', q: '大都市に近い近郊農業に対し、温暖な気候を生かした高知・宮崎の栽培法は？', correct: '🍆 ビニールハウスを使う促成栽培（なす・ピーマン）', options: ['🍆 ビニールハウスを使う促成栽培（なす・ピーマン）', '🥬 高原での抑制栽培', '🌲 人工林の間伐', '🐄 酪農の放牧'] },
      { id: 'G5_4', title: '4. 抑制栽培と高原野菜', q: '長野県の野辺山原や群馬県の嬬恋村で、涼しい夏の気候を生かして出荷する野菜は？', correct: '🥬 キャベツやレタスなどの高原野菜（抑制栽培）', options: ['🥬 キャベツやレタスなどの高原野菜（抑制栽培）', '🍇 温室ぶどう栽培', '🌾 秋まき小麦', '🍉 促成スイカ'] },
      { id: 'G5_5', title: '5. 中京工業地帯 (愛知・三重・岐阜)', q: '日本一の工業生産額を誇り、豊田市を中心とする主力の工業分野は？', correct: '🚗 自動車・機械・航空宇宙産業', options: ['🚗 自動車・機械・航空宇宙産業', '🚢 造船・鉄鋼のみ', '📰 印刷・出版のみ', '🛢️ 石油化学のみ'] },
      { id: 'G5_6', title: '6. 阪神工業地帯 (大阪・兵庫)', q: '東大阪の中小企業技術や神戸港を背景に発展した工業地帯の特色は？', correct: '⚙️ 金属・一般機械・化学工業が盛ん', options: ['⚙️ 金属・一般機械・化学工業が盛ん', '🚗 自動車専業', '🌾 農業関連のみ', '📰 出版・印刷専業'] },
      { id: 'G5_7', title: '7. 京浜工業地帯 (東京・神奈川)', q: '巨大な大消費地を背景に、印刷・出版や精密機械が集まる工業地帯は？', correct: '📰 京浜工業地帯（印刷・精密機械・情報通信）', options: ['📰 京浜工業地帯（印刷・精密機械・情報通信）', '🚢 阪神工業地帯', '🚗 中京工業地帯', '🛢️ 瀬戸内工業地域'] },
      { id: 'G5_8', title: '8. 瀬戸内工業地域とコンビナート', q: '岡山（水島）や山口（周南）などにパイプラインで結ばれて広がる施設は？', correct: '🛢️ 石油化学コンビナートと製鉄・造船業', options: ['🛢️ 石油化学コンビナートと製鉄・造船業', '🚗 自動車組み立て工場群', '📰 印刷・出版会社群', '🌲 製材・木工所群'] },
      { id: 'G5_9', title: '9. 日本の水産業と潮目の漁場', q: '暖流（黒潮）と寒流（親潮）がぶつかり、プランクトンが豊富な好漁場は？', correct: '🐟 潮目（しおめ）と三陸沖の豊かな好漁場', options: ['🐟 潮目（しおめ）と三陸沖の豊かな好漁場', '🏜️ 内陸砂漠地帯', '🏞️ 閉鎖性湖沼', '🏔️ 高山植物帯'] },
      { id: 'G5_10', title: '10. 日本の貿易港と国際コンテナ船', q: '原油・鉄鉱石・大豆を輸入し、高品質な工業製品を世界へ輸出する仕組みは？', correct: '🚢 加工貿易と名古屋港・東京港などの国際拠点港湾', options: ['🚢 加工貿易と名古屋港・東京港などの国際拠点港湾', '✈️ 観光のみの島国', '🚆 鉄道輸送専業', '🚚 国内完結型流通'] }
    ];

    // 小学6年：日本の歴史年表＆日本国憲法・三権分立（10ステージ）
    this.grade6Stages = [
      { id: 'G6_1', title: '1. 縄文・弥生・古墳時代', q: '狩猟採集の縄文土器から、稲作が始まった弥生、大仙古墳（仁徳天皇陵）の時代は？', correct: '🏺 縄文土器・弥生稲作・卑弥呼・大仙古墳', options: ['🏺 縄文土器・弥生稲作・卑弥呼・大仙古墳', '🏯 江戸幕府の参勤交代', '📜 聖徳太子の法隆寺', '🏛️ 明治維新の富岡製糸場'] },
      { id: 'G6_2', title: '2. 飛鳥・奈良時代', q: '聖徳太子の十七条の憲法、現存最古の木造建築・法隆寺、聖武天皇の大仏建立は？', correct: '📜 聖徳太子・法隆寺・東大寺大仏・鑑真の来日', options: ['📜 聖徳太子・法隆寺・東大寺大仏・鑑真の来日', '⚔️ 源頼朝の鎌倉幕府', '🏯 織田信長の天下布武', '🚢 ペリーの黒船来航'] },
      { id: 'G6_3', title: '3. 平安時代と国風文化', q: '平安京遷都の後、紫式部の『源氏物語』や仮名文字が栄えた文化は？', correct: '📖 紫式部・清少納言・国風文化・平等院鳳凰堂', options: ['📖 紫式部・清少納言・国風文化・平等院鳳凰堂', '🏺 縄文土器の狩猟文化', '⚔️ 武家政権の成立', '🏛️ 大日本帝国憲法の制定'] },
      { id: 'G6_4', title: '4. 鎌倉・室町時代', q: '源頼朝の武家政権、足利義満の金閣寺、足利義政の銀閣寺や水墨画の雪舟の時代は？', correct: '⚔️ 源頼朝（鎌倉幕府）・金閣寺・銀閣寺・雪舟', options: ['⚔️ 源頼朝（鎌倉幕府）・金閣寺・銀閣寺・雪舟', '📜 聖徳太子（飛鳥）', '🏯 豊臣秀吉（安土桃山）', '🏛️ 日本国憲法の制定'] },
      { id: 'G6_5', title: '5. 戦国・安土桃山時代', q: '織田信長の楽市楽座、豊臣秀吉の太閤検地・刀狩と天下統一の偉業は？', correct: '🏯 織田信長・豊臣秀吉・楽市楽座と天下統一', options: ['🏯 織田信長・豊臣秀吉・楽市楽座と天下統一', '📖 紫式部の源氏物語', '📜 鑑真の戒律伝来', '⚖️ 三権分立の確立'] },
      { id: 'G6_6', title: '6. 江戸時代と社会の安定', q: '徳川家康の幕府、参勤交代、鎖国政策、杉田玄白の解体新書、伊能忠敬の日本地図は？', correct: '🗺️ 徳川家康・参勤交代・鎖国・伊能忠敬の地図', options: ['🗺️ 徳川家康・参勤交代・鎖国・伊能忠敬の地図', '🏺 卑弥呼の邪馬台国', '⚔️ 源頼朝の幕府', '🌐 国際連合の設立'] },
      { id: 'G6_7', title: '7. 明治維新と近代国家の建設', q: '坂本龍馬・西郷隆盛らの活躍、富岡製糸場の官営工場、大日本帝国憲法発布の時代は？', correct: '🏭 明治維新・富岡製糸場・文明開化・近代化', options: ['🏭 明治維新・富岡製糸場・文明開化・近代化', '🏯 安土城の築城', '📜 法隆寺の建立', '🏺 縄文土器の製作'] },
      { id: 'G6_8', title: '8. 日本国憲法の三大原則', q: '日本の最高法規である日本国憲法を支える「三大原則」の組み合わせは？', correct: '🕊️ 国民主権・基本的人権の尊重・平和主義', options: ['🕊️ 国民主権・基本的人権の尊重・平和主義', '⚔️ 征夷大将軍・武家諸法度・参勤交代', '👑 君主主権・軍備拡張・階級制度', '📜 律令制・班田収授・租庸調'] },
      { id: 'G6_9', title: '9. 三権分立の仕組み', q: '権力の集中を防ぎ国民の権利を守る「国会」「内閣」「裁判所」の役割分担は？', correct: '🏛️ 国会(立法)・内閣(行政)・裁判所(司法)', options: ['🏛️ 国会(立法)・内閣(行政)・裁判所(司法)', '🏛️ 内閣がすべての権力を持つ', '🏛️ 裁判所が法律を作り実行する', '🏛️ 国会が裁判もすべて行う'] },
      { id: 'G6_10', title: '10. 世界平和と国際連合', q: 'ユニセフやユネスコ、PKO（平和維持活動）とSDGs（持続可能な開発目標）への貢献は？', correct: '🌐 国際連合(UN)と地球規模課題(SDGs)への国際協力', options: ['🌐 国際連合(UN)と地球規模課題(SDGs)への国際協力', '⚔️ 鎖国政策の徹底', '🏰 幕藩体制の維持', '🏺 巨大古墳の築造'] }
    ];

    const removeSocialEmoji = (value) => String(value || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim();
    const semanticSocialAnswer = (value) => {
      const raw = removeSocialEmoji(value);
      const parenthetical = raw.match(/\(([^)]{1,40})\)|（([^）]{1,40})）/);
      return (parenthetical ? (parenthetical[1] || parenthetical[2]) : raw).trim();
    };
    const sanitizeSocialStages = (stages) => stages.map(stage => {
      const correct = removeSocialEmoji(stage.correct);
      const semanticAnswer = semanticSocialAnswer(correct);
      let q = removeSocialEmoji(stage.q);
      if (semanticAnswer.length >= 2 && q.includes(semanticAnswer)) {
        q = q.replaceAll(semanticAnswer, 'この施設・内容');
      }
      return {
        ...stage,
        title: removeSocialEmoji(stage.title),
        q,
        correct,
        options: stage.options.map(removeSocialEmoji)
      };
    });
    this.grade3Stages = sanitizeSocialStages(this.grade3Stages);
    this.grade5Stages = sanitizeSocialStages(this.grade5Stages);
    this.grade6Stages = sanitizeSocialStages(this.grade6Stages);

    this.selectedPref = null;
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.locked = false;
    this.placedCount = 0;
    this.boundPointer = this.handlePointer.bind(this);
  }

  getStagesForCurrentMode() {
    if (this.mode === 'MAP_SYMBOLS' || this.grade === 3) return this.grade3Stages;
    if (this.mode === 'INDUSTRY' || this.grade === 5) return this.grade5Stages;
    if (this.mode === 'HISTORY_CIVICS' || this.grade === 6) return this.grade6Stages;
    // 小4は 8地方ステージ
    return [
      { id: 'G4_1', title: '1. 北海道・東北地方', regionName: '北海道・東北' },
      { id: 'G4_2', title: '2. 関東地方', regionName: '関東地方' },
      { id: 'G4_3', title: '3. 中部地方', regionName: '中部地方' },
      { id: 'G4_4', title: '4. 近畿地方', regionName: '近畿地方' },
      { id: 'G4_5', title: '5. 中国地方', regionName: '中国地方' },
      { id: 'G4_6', title: '6. 四国地方', regionName: '四国地方' },
      { id: 'G4_7', title: '7. 九州・沖縄地方', regionName: '九州・沖縄' },
      { id: 'G4_8', title: '8. 日本列島 オールスター', regionName: '全国' }
    ];
  }

  async start() {
    this.running = true;
    this.selectedPref = null;
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.locked = false;
    this.placedCount = 0;

    const stages = this.getStagesForCurrentMode();
    this.totalStages = stages.length;
    this.currentStageIdx = (this.level - 1) % this.totalStages;

    if (this.mode === 'PREFECTURES' || this.grade === 4) {
      const db = await fetchPrefectures47();
      const allPrefList = db?.prefectures || [
        { name: '北海道', region: '北海道地方', regionId: 'hokkaido', specialty: '夕張メロン・じゃがいも' },
        { name: '青森県', region: '東北地方', regionId: 'tohoku', specialty: 'りんご・ねぶた祭' },
        { name: '東京都', region: '関東地方', regionId: 'kanto', specialty: '江戸切子・雷おこし' },
        { name: '静岡県', region: '中部地方', regionId: 'chubu', specialty: 'お茶・うなぎ・富士山' },
        { name: '京都府', region: '近畿地方', regionId: 'kinki', specialty: '西陣織・宇治茶・八ツ橋' },
        { name: '香川県', region: '四国地方', regionId: 'shikoku', specialty: '讃岐うどん' },
        { name: '福岡県', region: '九州・沖縄地方', regionId: 'kyushu_okinawa', specialty: '博多明太子・あまおう' },
        { name: '沖縄県', region: '九州・沖縄地方', regionId: 'kyushu_okinawa', specialty: 'ゴーヤ・ちんすこう' }
      ];

      const stageInfo = stages[this.currentStageIdx];
      let pool = allPrefList;
      if (this.currentStageIdx < 7) {
        const targetReg = this.regions[this.currentStageIdx];
        const regPool = allPrefList.filter(p => this.isRegionMatch(p, targetReg));
        if (regPool.length > 0) pool = regPool;
      }

      const count = Math.min(pool.length, Math.min(6, 4 + this.level));
      this.targetPrefs = [...pool].sort(() => Math.random() - 0.5).slice(0, count).map((p, idx) => ({
        ...p,
        id: `pref_${idx}`,
        placed: false,
        slotIdx: idx
      }));
    } else {
      // クイズ形式（小3, 小5, 小6）
      const stage = stages[this.currentStageIdx];
      this.currentQuiz = stage;
      this.shuffledOptions = [...stage.options].sort(() => Math.random() - 0.5);
    }

    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  setStage(newStage) {
    this.level = Math.max(1, Math.min(this.totalStages, newStage));
    const audio = getAudioSynthesizer();
    audio.playClick();
    this.destroy();
    this.start();
  }

  isRegionMatch(pref, reg) {
    if (!pref || !reg) return false;
    const pRegion = (pref.region || '').toLowerCase();
    const pRegionId = (pref.regionId || '').toLowerCase();
    const rId = (reg.id || '').toLowerCase();
    const rName = (reg.name || '').toLowerCase();

    if (pRegion === rName || pRegionId === rId) return true;
    if (reg.aliases && reg.aliases.some(a => a.toLowerCase() === pRegion || a.toLowerCase() === pRegionId)) return true;

    const cleanP = pRegion.replace(/地方|・/g, '');
    const cleanR = rName.replace(/地方|・/g, '');
    if (cleanP && cleanR && (cleanP.includes(cleanR) || cleanR.includes(cleanP))) return true;
    return false;
  }

  handlePointer(e) {
    if (!this.running || this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);

    // 0. 上部ステージ進行バー (y: 4 ~ 26)
    if (y >= 4 && y <= 26) {
      const btnW = Math.min(28, (w - 40) / this.totalStages);
      const clickedStage = Math.floor((x - 20) / btnW) + 1;
      if (clickedStage >= 1 && clickedStage <= this.totalStages) {
        this.setStage(clickedStage);
        return;
      }
    }

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    // 1. 小学4年モード：47都道府県 列島パズル
    if (this.mode === 'PREFECTURES' || this.grade === 4) {
      const dockY = h - 45;
      const stepX = (w - 40) / (this.targetPrefs?.length || 4);

      for (let i = 0; i < (this.targetPrefs?.length || 0); i++) {
        const p = this.targetPrefs[i];
        if (p.placed) continue;
        const px = 20 + i * stepX + stepX / 2;
        if (Math.abs(px - x) < 42 && Math.abs(dockY - y) < 28) {
          this.selectedPref = p;
          audio.playClick();
          return;
        }
      }

      if (this.selectedPref) {
        for (let i = 0; i < this.regions.length; i++) {
          const reg = this.regions[i];
          if (Math.hypot(reg.mapX - x, reg.mapY - y) < 50) {
            if (this.isRegionMatch(this.selectedPref, reg)) {
              this.selectedPref.placed = true;
              this.placedCount++;
              audio.playPositive(4, 1);
              fx.spawnStarBurst(reg.mapX, reg.mapY, 25, '#4ade80');
              fx.showFloatingScore(reg.mapX, reg.mapY, `正解！【${this.selectedPref.name}】(${this.selectedPref.specialty || ''})`, '#fbbf24');
              guidance.registerSuccess({ questionId: 'SHAKAI_' + this.selectedPref.name });

              this.selectedPref = null;

              if (this.placedCount >= this.targetPrefs.length) {
                audio.playVictory();
                setTimeout(() => {
                  this.destroy();
                  this.onWin(3, 300);
                }, 600);
              }
            } else {
              audio.playGentleError();
              guidance.registerError({
                subject: '社会',
                questionId: 'SHAKAI_' + this.selectedPref.name,
                questionData: { prefecture: this.selectedPref.name, correctRegion: this.selectedPref.region || reg.name },
                targetElement: this.canvas
              });
              fx.triggerScreenShake(this.canvas, 'wobble', 250);
            }
            return;
          }
        }
      }
      return;
    }

    // 2. 小学3年, 5年, 6年モード：学年特化型インタラクティブクイズ
    if (this.shuffledOptions) {
      const optW = w - 80;
      const optH = 42;
      const startY = 100;

      for (let i = 0; i < this.shuffledOptions.length; i++) {
        const optText = this.shuffledOptions[i];
        const oy = startY + i * 50;

        if (x >= 40 && x <= 40 + optW && y >= oy && y <= oy + optH) {
          this.locked = true;
          this.selectedOption = optText;
          this.selectionCorrect = optText === this.currentQuiz.correct;
          if (optText === this.currentQuiz.correct) {
            audio.playPositive(this.grade, 1);
            fx.spawnStarBurst(w / 2, oy + optH / 2, 30, '#4ade80');
            fx.showFloatingScore(w / 2, oy, '正解！ Perfect!', '#fbbf24');
            guidance.registerSuccess({ questionId: 'SHAKAI_' + this.currentQuiz.id });

            setTimeout(() => {
              this.destroy();
              this.onWin(3, 280);
            }, 650);
          } else {
            audio.playGentleError();
            guidance.registerError({
              subject: '社会',
              questionId: 'SHAKAI_' + this.currentQuiz.id,
              questionData: { q: this.currentQuiz.q, wrong: optText, correct: this.currentQuiz.correct },
              targetElement: this.canvas
            });
            fx.triggerScreenShake(this.canvas, 'wobble', 250);
            setTimeout(() => {
              this.locked = false;
              this.selectedOption = null;
              this.selectionCorrect = null;
            }, 800);
          }
          return;
        }
      }
    }
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
    this.ctx.clearRect(0, 0, w, h);

    // 0. 上部ステージ進行バー
    const btnW = Math.min(28, (w - 40) / this.totalStages);
    for (let s = 1; s <= this.totalStages; s++) {
      const sx = 20 + (s - 1) * btnW;
      const isCurrent = s === this.level;
      this.ctx.fillStyle = isCurrent ? '#f59e0b' : '#334155';
      this.ctx.beginPath();
      this.ctx.roundRect(sx, 6, btnW - 3, 16, 4);
      this.ctx.fill();

      this.ctx.fillStyle = isCurrent ? '#0f172a' : '#94a3b8';
      this.ctx.font = 'bold 9px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${s}`, sx + (btnW - 3) / 2, 17);
    }

    // 1. 小4：47都道府県 日本列島パズル描画
    if (this.mode === 'PREFECTURES' || this.grade === 4) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 15px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${withKidsReading('4年 社会：日本47都道府県 列島パズル', 'にほんれっとう・ちほうくぶん')}　ステージ${this.level}`, w / 2, 44);

      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = '11px sans-serif';
      this.ctx.fillText('下の都道府県カードをタップし、日本地図の正しい地域枠を選んではめ込もう！', w / 2, 62);

      // 日本列島の背景輪郭
      this.ctx.fillStyle = '#1e293b';
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 2;

      // 北海道
      this.ctx.beginPath();
      this.ctx.ellipse(430, 90, 36, 26, Math.PI / 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 本州・東北
      this.ctx.beginPath();
      this.ctx.ellipse(385, 150, 24, 38, -Math.PI / 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 本州・関東〜中部
      this.ctx.beginPath();
      this.ctx.ellipse(315, 212, 45, 26, -Math.PI / 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 本州・近畿〜中国
      this.ctx.beginPath();
      this.ctx.ellipse(195, 222, 44, 20, -Math.PI / 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 四国
      this.ctx.beginPath();
      this.ctx.ellipse(170, 260, 30, 16, Math.PI / 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 九州・沖縄
      this.ctx.beginPath();
      this.ctx.ellipse(105, 270, 32, 24, Math.PI / 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 8大地方ターゲットスロット描画
      this.regions.forEach((reg) => {
        this.ctx.strokeStyle = reg.color || '#38bdf8';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.arc(reg.mapX, reg.mapY, 26, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(reg.name, reg.mapX, reg.mapY + 38);
      });

      // 既に配置された都道府県バッジ
      this.targetPrefs?.forEach((p) => {
        if (p.placed) {
          const reg = this.regions.find(r => this.isRegionMatch(p, r)) || this.regions[0];
          this.ctx.fillStyle = '#10b981';
          this.ctx.beginPath();
          this.ctx.roundRect(reg.mapX - 34, reg.mapY - 14, 68, 28, 6);
          this.ctx.fill();

          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 11px sans-serif';
          this.ctx.fillText(p.name, reg.mapX, reg.mapY + 4);
        }
      });

      // 下部ドックの都道府県カード
      const dockY = h - 45;
      const stepX = (w - 40) / (this.targetPrefs?.length || 4);

      this.targetPrefs?.forEach((p, idx) => {
        if (!p.placed) {
          const px = 20 + idx * stepX + stepX / 2;
          const isSel = this.selectedPref === p;

          this.ctx.fillStyle = isSel ? '#f59e0b' : '#1e293b';
          this.ctx.strokeStyle = isSel ? '#fef08a' : '#38bdf8';
          this.ctx.lineWidth = isSel ? 3 : 1.5;
          this.ctx.beginPath();
          this.ctx.roundRect(px - 34, dockY - 18, 68, 36, 8);
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.fillStyle = isSel ? '#0f172a' : '#ffffff';
          this.ctx.font = 'bold 11px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(p.name, px, dockY + 4);
        }
      });
    } else {
      // 2. 小3, 小5, 小6：学年特化型インタラクティブクイズ描画
      const stage = this.currentQuiz;
      const gradeTitle = this.grade === 3 ? '3年 社会：地図記号・方位・まち探検' : (this.grade === 5 ? '5年 社会：日本の国土・産業・太平洋ベルト' : '6年 社会：日本歴史クロニクル・日本国憲法');

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 15px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${withKidsReading(gradeTitle, 'しゃかい')}：${stage.title}`, w / 2, 44);

      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText(stage.q, w / 2, 70);

      // 4択選択肢カード
      const optW = w - 80;
      const optH = 42;
      const startY = 100;

      this.shuffledOptions?.forEach((optText, i) => {
        const oy = startY + i * 50;

        const isSelected = optText === this.selectedOption;
        const isCorrectReveal = this.locked && optText === stage.correct;
        const isWrongSelected = isSelected && this.selectionCorrect === false;
        this.ctx.fillStyle = isCorrectReveal ? '#065f46' : (isWrongSelected ? '#9f1239' : (isSelected ? '#075985' : '#1e293b'));
        this.ctx.strokeStyle = isCorrectReveal ? '#6ee7b7' : (isWrongSelected ? '#fda4af' : (isSelected ? '#ffffff' : '#38bdf8'));
        this.ctx.lineWidth = isSelected || isCorrectReveal ? 4 : 1.5;
        if (isSelected) {
          this.ctx.shadowColor = isWrongSelected ? '#fb7185' : '#38bdf8';
          this.ctx.shadowBlur = 14;
        }
        this.ctx.beginPath();
        this.ctx.roundRect(40, oy, optW, optH, 10);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(optText, w / 2, oy + optH / 2 + 5);
      });
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.loop());
    }
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}

// =========================================================================
// 8. 英語：場面別ペア選択 (ContextMatchGame)
// =========================================================================
const ENGLISH_SESSION_SIZE = 10;

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
    ['join the game', '試合に参加する'], ['share my idea', '考えを伝える'], ['plant a seed', '種を植える'], ['write my name', '名前を書く']
  ];
  const basicFrames = [
    ['I like to {action}.', '私は{action}ことが好きです。'], ['I want to {action}.', '私は{action}たいです。'], ['I can {action}.', '私は{action}ことができます。'],
    ['Let us {action}.', 'いっしょに{action}ましょう。'], ['We often {action}.', '私たちはよく{action}ます。']
  ];
  const eiken3Actions = [
    ['study for the test', 'テストに向けて勉強する'], ['visit the history museum', '歴史博物館を訪れる'], ['help an elderly neighbor', '近所の高齢者を手伝う'], ['join the science club', '科学部に入る'],
    ['finish the report', '報告書を仕上げる'], ['practice for the concert', '演奏会に向けて練習する'], ['take an earlier train', '早い電車に乗る'], ['prepare a healthy lunch', '健康的な昼食を用意する'],
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
    ['I decided to {action}.', '私は{action}ことにしました。'], ['We plan to {action}.', '私たちは{action}予定です。'], ['I tried to {action}.', '私は{action}ようとしました。'],
    ['We need to {action}.', '私たちは{action}必要があります。'], ['I hope to {action}.', '私は{action}たいと思っています。']
  ];
  const eiken2Actions = [
    ['reduce plastic waste', 'プラスチックごみを減らす'], ['improve public transportation', '公共交通を改善する'], ['protect local forests', '地域の森林を守る'], ['support elderly residents', '高齢の住民を支援する'],
    ['save energy at home', '家庭でエネルギーを節約する'], ['share reliable information', '信頼できる情報を共有する'], ['prepare for natural disasters', '自然災害に備える'], ['encourage healthy habits', '健康的な習慣を促す'],
    ['welcome students from abroad', '海外からの生徒を歓迎する'], ['solve community problems', '地域の問題を解決する'], ['develop useful technology', '有用な技術を開発する'], ['respect different opinions', '異なる意見を尊重する'],
    ['increase urban green spaces', '都市の緑地を増やす'], ['improve air quality', '大気の質を改善する'], ['make education more accessible', '教育をより受けやすくする'], ['preserve traditional culture', '伝統文化を保存する'],
    ['respond to climate change', '気候変動に対応する'], ['build safer cities', 'より安全な都市を築く'], ['promote international cooperation', '国際協力を促進する'], ['use natural resources responsibly', '天然資源を責任をもって利用する'],
    ['prevent food waste', '食品ロスを防ぐ'], ['protect personal information', '個人情報を守る'], ['provide equal opportunities', '平等な機会を提供する'], ['strengthen local businesses', '地域企業を強化する'],
    ['improve working conditions', '労働条件を改善する'], ['expand renewable energy', '再生可能エネルギーを拡大する'], ['support scientific research', '科学研究を支援する'], ['maintain public facilities', '公共施設を維持する'],
    ['restore damaged ecosystems', '損なわれた生態系を回復する'], ['increase media literacy', 'メディアリテラシーを高める'], ['reduce economic inequality', '経済格差を縮小する'], ['prepare students for future careers', '生徒の将来の職業に備える'],
    ['make tourism more sustainable', '観光をより持続可能にする'], ['improve emergency communication', '緊急時の情報伝達を改善する'], ['protect endangered species', '絶滅危惧種を守る'], ['encourage civic participation', '市民参加を促す'],
    ['design inclusive public spaces', '誰もが使いやすい公共空間を設計する'], ['improve access to medical care', '医療へのアクセスを改善する'], ['support responsible consumption', '責任ある消費を支援する'], ['preserve clean water sources', 'きれいな水源を守る']
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

export class ContextMatchGame extends CurriculumQuizGame {
  constructor(canvas, gameData, onWin, grade = 3, level = 1) {
    const difficulty = gameData?.difficulty || gameData?.selectedMode || 'BASIC';
    const bank = getEnglishQuestionBank(difficulty);
    super(canvas, { ...gameData, selectedMode: difficulty, questionBank: bank }, onWin, grade, level, '外国語・英語');
    this.difficulty = difficulty;
    this.questions = shuffleCopy(bank).slice(0, ENGLISH_SESSION_SIZE).map((question, index) => ({
      ...question,
      id: question.id || `ENGLISH_${difficulty}_${index}`,
      options: shuffleCopy([...new Set(question.options)]).slice(0, 4)
    }));
  }
}

class LegacyContextMatchGame {
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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const leftX = 120;
    const rightX = getLogicalCanvasWidth(this.canvas) - 120;
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
            fx.showFloatingScore(getLogicalCanvasWidth(this.canvas) / 2, cy, 'Match!', '#fbbf24');
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
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${withKidsReading('英語の場面別ペア', 'えいごのばめんべつぺあ')}：左の英語と右の日本語をタップしてつなごう！`, w / 2, 38);

    const leftX = 120;
    const rightX = w - 120;

    this.pairs.forEach((p, idx) => {
      const cy = 90 + idx * 60;
      const isSelected = this.selectedLeft?.id === p.id;

      // Left Card
      this.ctx.save();
      this.ctx.fillStyle = p.matched ? '#064e3b' : (isSelected ? '#075985' : '#1e293b');
      this.ctx.strokeStyle = p.matched ? '#10b981' : (isSelected ? '#ffffff' : '#475569');
      this.ctx.lineWidth = isSelected ? 4 : 2;
      if (isSelected) {
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 16;
      }
      this.ctx.beginPath();
      this.ctx.roundRect(leftX - 85, cy - 22, 170, 44, 12);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

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
  constructor(canvas, gameData, onWin, grade = 1, level = 1) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = Math.max(1, Math.min(2, Number(grade) || 1));
    this.level = Math.max(1, Number(level) || 1);
    this.running = false;

    this.categories = gameData?.categories || [
      { id: 'morning', title: 'あさの じゅんび' },
      { id: 'safety', title: 'あんぜんな こうどう' }
    ];

    this.items = shuffleCopy((gameData?.items || [
      { text: 'ランドセルを せおう', category: 'morning', sorted: false },
      { text: 'みぎ・ひだりを よくみる', category: 'safety', sorted: false },
      { text: 'おはようと あいさつする', category: 'morning', sorted: false },
      { text: 'てを あげて わたる', category: 'safety', sorted: false }
    ]).map(it => ({ ...it, sorted: false })));

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
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const w = getLogicalCanvasWidth(this.canvas);
    const catW = 160;
    const catStartX = (w - (this.categories.length * (catW + 20))) / 2 + catW / 2;

    // 1. Select item from bottom
    const itemStartX = 80;
    const itemStepX = (w - 160) / Math.max(1, this.items.length - 1);
    this.items.forEach((it, idx) => {
      const ix = itemStartX + idx * itemStepX;
      const iy = getLogicalCanvasHeight(this.canvas) - 60;
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
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
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

      this.ctx.save();
      this.ctx.fillStyle = isSel ? '#075985' : '#1e293b';
      this.ctx.strokeStyle = isSel ? '#ffffff' : '#64748b';
      this.ctx.lineWidth = isSel ? 4 : 2;
      if (isSel) {
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 16;
      }
      this.ctx.beginPath();
      this.ctx.roundRect(ix - 55, iy - 25, 110, 50, 12);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

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

// =========================================================================
// 10. 全教科総合：学年総合チャレンジ (GradeComprehensiveExamGame)
// =========================================================================
export class GradeComprehensiveExamGame {
  constructor(canvas, gameData, onWin, grade = 1, level = 1) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = onWin;
    this.grade = Number(grade) || 1;
    this.level = Number(level) || 1;
    this.score = 0;
    this.combo = 0;
    this.running = false;
    this.qIndex = 0;
    this.locked = false;
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.boundPointer = this.handlePointer.bind(this);

    // 文部科学省各学年カリキュラム準拠の全教科総合横断問題バンク（各学年6問：国・算・理・社・英・生）
    const EXAM_QUESTION_BANK = {
      1: [
        { subject: '国語', q: '「やま」を漢字で書くとどれ？', correct: '山', options: ['山', '川', '日', '木'] },
        { subject: '算数', q: '5 ＋ 3 は いくつ？', correct: '8', options: ['8', '7', '9', '6'] },
        { subject: '生活', q: 'あさ、おきたときに かわす あいさつは？', correct: 'おはようございます', options: ['おはようございます', 'こんにちは', 'さようなら', 'おやすみなさい'] },
        { subject: '算数', q: '10 から 4 を ひくと いくつ？', correct: '6', options: ['6', '5', '7', '4'] },
        { subject: '国語', q: '「雨」の正しい読み方はどれ？', correct: 'あめ', options: ['あめ', 'ゆき', 'かぜ', 'そら'] },
        { subject: '生活', q: 'どうろを わたるとき、ただしい こうどうは？', correct: 'みぎ・ひだりを よくみて てをあげる', options: ['みぎ・ひだりを よくみて てをあげる', 'はしって わたる', 'したを むいて わたる', 'めを つむる'] }
      ],
      2: [
        { subject: '算数', q: '九九の「しちに（7×2）」の答えは？', correct: '14', options: ['14', '16', '21', '12'] },
        { subject: '国語', q: '「日」と「月」を合体させてできる漢字は？', correct: '明', options: ['明', '休', '林', '秋'] },
        { subject: '算数', q: '1メートル（1m）は何センチメートル（cm）？', correct: '100cm', options: ['100cm', '10cm', '1000cm', '50cm'] },
        { subject: '生活', q: '春にきれいな花を咲かせる植物はどれ？', correct: 'チューリップ', options: ['チューリップ', 'アサガオ', 'ヒマワリ', 'コスモス'] },
        { subject: '国語', q: '「話」の部首（へん）はどれ？', correct: '言（ごんべん）', options: ['言（ごんべん）', '氵（さんずい）', '木（きへん）', '亻（にんべん）'] },
        { subject: '算数', q: '九九の「はっく（8×9）」の答えは？', correct: '72', options: ['72', '64', '56', '81'] }
      ],
      3: [
        { subject: '国語', q: '「太陽」の「陽」の音読みは？', correct: 'よう', options: ['よう', 'たい', 'こう', 'さん'] },
        { subject: '算数', q: '56 ÷ 7 の計算の答えは？', correct: '8', options: ['8', '7', '9', '6'] },
        { subject: '理科', q: '豆電球に明かりをつけるために必要な回路の条件は？', correct: '導線が輪のようにつながっていること', options: ['導線が輪のようにつながっていること', 'スイッチが開いていること', '導線が途中で切れていること', '電池を外すこと'] },
        { subject: '社会', q: '地図記号で、教科書を開いた「文」の形は何を表す？', correct: '小・中学校', options: ['小・中学校', '消防署', '警察署', '郵便局'] },
        { subject: '英語', q: '「こんにちは」を英語で言うと？', correct: 'Hello', options: ['Hello', 'Good night', 'Thank you', 'Goodbye'] },
        { subject: '理科', q: 'じしゃくの N極 と S極 を近づけるとどうなる？', correct: '引きつけ合う', options: ['引きつけ合う', 'しりぞけ合う', 'なにも起きない', '回転し続ける'] }
      ],
      4: [
        { subject: '算数', q: '3/7 ＋ 2/7 の分数の計算の答えは？', correct: '5/7', options: ['5/7', '5/14', '6/7', '1'] },
        { subject: '理科', q: '月の形が毎日変わって見える理由は？', correct: '月が地球のまわりを公転しているから', options: ['月が地球のまわりを公転しているから', '月が形を変形させているから', '雲が隠しているから', '太陽が自転しているから'] },
        { subject: '社会', q: '日本で一番面積が広い都道府県はどこ？', correct: '北海道', options: ['北海道', '岩手県', '東京都', '沖縄県'] },
        { subject: '国語', q: 'ことわざ「猿も木から◯◯」に入る言葉は？', correct: '落ちる', options: ['落ちる', 'すべる', '飛ぶ', '登る'] },
        { subject: '英語', q: '「りんご」を英語で書くと？', correct: 'Apple', options: ['Apple', 'Orange', 'Banana', 'Peach'] },
        { subject: '社会', q: '日本列島のまわりを取り囲む4つの海に含まれないのは？', correct: '大西洋', options: ['大西洋', '太平洋', '日本海', 'オホーツク海'] }
      ],
      5: [
        { subject: '算数', q: '割合の公式「割合 ＝ 比べられる量 ÷ ◯◯」に入るのは？', correct: 'もとにする量', options: ['もとにする量', '全体の量', '残りの量', '単位量'] },
        { subject: '理科', q: '植物の葉で行われる、光を受けてデンプンを作るはたらきは？', correct: '光合成', options: ['光合成', '呼吸', '蒸散', '受粉'] },
        { subject: '社会', q: '愛知県の豊田市を中心に発達した日本一の工業分野は？', correct: '自動車工業（中京工業地帯）', options: ['自動車工業（中京工業地帯）', '石油化学のみ', '造船業のみ', '伝統工芸のみ'] },
        { subject: '国語', q: '敬語で「先生が本を◯◯」の尊敬語として適切なのは？', correct: 'お読みになる', options: ['お読みになる', '拝読する', '読まれる', '読む'] },
        { subject: '英語', q: '「私は野球が好きです」の正しい英文は？', correct: 'I like baseball.', options: ['I like baseball.', 'I am baseball.', 'I play likes baseball.', 'He likes baseball.'] },
        { subject: '社会', q: '暖流の黒潮と寒流の親潮がぶつかる好漁場を何と呼ぶ？', correct: '潮目（しおめ）', options: ['潮目（しおめ）', '海溝', '砂浜', '干潟'] }
      ],
      6: [
        { subject: '算数', q: '比の計算で、2 : 3 ＝ 6 : □ の □ に入る数は？', correct: '9', options: ['9', '8', '12', '6'] },
        { subject: '理科', q: 'てこの規則性で、つり合う条件は？', correct: '（左のおもり×支点からの距離）＝（右のおもり×支点からの距離）', options: ['（左のおもり×支点からの距離）＝（右のおもり×支点からの距離）', '左のおもりの重さ ＝ 右のおもりの重さ', '支点の位置が中央にあること', '棒の長さが等しいこと'] },
        { subject: '社会', q: '日本国憲法の三大原則に含まれないものはどれ？', correct: '君主主権', options: ['君主主権', '国民主権', '基本的人権の尊重', '平和主義'] },
        { subject: '社会', q: '三権分立で「法律を定める」役割を持つ機関はどこ？', correct: '国会（立法）', options: ['国会（立法）', '内閣（行政）', '裁判所（司法）', '都道府県庁'] },
        { subject: '国語', q: '「温故知新」の四字熟語の意味として正しいものは？', correct: '昔のことを調べて新しい知識や見解を得ること', options: ['昔のことを調べて新しい知識や見解を得ること', '新しいことだけを学ぶこと', '昔のやり方をそのまま守ること', '友達と仲良く助け合うこと'] },
        { subject: '英語', q: '"Where are you from?" に対する適切な返答は？', correct: 'I am from Japan.', options: ['I am from Japan.', 'I like apples.', 'Yes, I do.', 'It is 3 o\'clock.'] }
      ]
    };

    const qPool = EXAM_QUESTION_BANK[this.grade] || EXAM_QUESTION_BANK[1];
    this.questions = [...qPool].sort(() => Math.random() - 0.5);
    this.shuffledOptions = [];
  }

  start() {
    this.running = true;
    this.score = 0;
    this.combo = 0;
    this.qIndex = 0;
    this.locked = false;
    this.selectedOption = null;
    this.selectionCorrect = null;
    this.setupQuestion();
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.loop();
  }

  setupQuestion() {
    if (this.qIndex >= this.questions.length) {
      this.destroy();
      // 総合チャレンジをクリア：満点スコア350とスター3個
      const audio = getAudioSynthesizer();
      if (audio) audio.playVictory();
      this.onWin(3, 350);
      return;
    }
    const cur = this.questions[this.qIndex];
    this.shuffledOptions = [...cur.options].sort(() => Math.random() - 0.5);
    this.locked = false;
    this.selectedOption = null;
    this.selectionCorrect = null;
  }

  handlePointer(e) {
    if (!this.running || this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (getLogicalCanvasWidth(this.canvas) / rect.width);
    const y = (e.clientY - rect.top) * (getLogicalCanvasHeight(this.canvas) / rect.height);
    const w = getLogicalCanvasWidth(this.canvas);

    const audio = getAudioSynthesizer();
    const fx = getFXSystem();
    const guidance = getErrorGuidanceSystem();

    const optW = Math.min(480, w - 60);
    const optH = 46;
    const startY = 110;
    const curQ = this.questions[this.qIndex];

    for (let i = 0; i < this.shuffledOptions.length; i++) {
      const optText = this.shuffledOptions[i];
      const oy = startY + i * 54;
      const ox = (w - optW) / 2;

      if (x >= ox && x <= ox + optW && y >= oy && y <= oy + optH) {
        this.locked = true;
        this.selectedOption = optText;
        this.selectionCorrect = optText === curQ.correct;
        if (optText === curQ.correct) {
          this.combo++;
          this.score += 50 * this.combo;
          const scoreEl = document.getElementById('game-score');
          if (scoreEl) scoreEl.innerText = this.score;

          if (audio) audio.playPositive(this.grade, this.combo);
          if (fx) {
            fx.spawnStarBurst(w / 2, oy + optH / 2, 30, '#fbbf24');
            fx.showFloatingScore(w / 2, oy, `正解！+${50 * this.combo}pt!`, '#34d399');
          }
          if (guidance) guidance.registerSuccess({ questionId: `EXAM_G${this.grade}_Q${this.qIndex}` });

          setTimeout(() => {
            this.qIndex++;
            this.setupQuestion();
          }, 700);
        } else {
          this.combo = 0;
          if (audio) audio.playGentleError();
          if (guidance) {
            guidance.registerError({
              subject: curQ.subject,
              questionId: `EXAM_G${this.grade}_Q${this.qIndex}`,
              targetElement: this.canvas
            });
          }
          if (fx) fx.triggerScreenShake(this.canvas, 'bounce', 250);
          setTimeout(() => {
            this.locked = false;
            this.selectedOption = null;
            this.selectionCorrect = null;
          }, 800);
        }
        return;
      }
    }
  }

  loop() {
    if (!this.running) return;
    const w = getLogicalCanvasWidth(this.canvas);
    const h = getLogicalCanvasHeight(this.canvas);
    this.ctx.clearRect(0, 0, w, h);

    const curQ = this.questions[this.qIndex];
    if (!curQ) return;

    // Header & Progress
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`🌟 小学${this.grade}年 全教科総合チャレンジ 🌟`, w / 2, 26);

    // Subject badge + Question Title
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText(`【教科: ${curQ.subject}】 問 ${this.qIndex + 1} / ${this.questions.length}`, w / 2, 48);

    // Question body
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 15px sans-serif';
    this.ctx.fillText(curQ.q, w / 2, 82);

    // Options
    const optW = Math.min(480, w - 60);
    const optH = 46;
    const startY = 110;

    this.shuffledOptions.forEach((optText, i) => {
      const oy = startY + i * 54;
      const ox = (w - optW) / 2;

      const isSelected = optText === this.selectedOption;
      const isCorrectReveal = this.locked && optText === curQ.correct;
      const isWrongSelected = isSelected && this.selectionCorrect === false;
      this.ctx.fillStyle = isCorrectReveal ? '#065f46' : (isWrongSelected ? '#9f1239' : (isSelected ? '#075985' : '#1e293b'));
      this.ctx.strokeStyle = isCorrectReveal ? '#6ee7b7' : (isWrongSelected ? '#fda4af' : (isSelected ? '#ffffff' : '#38bdf8'));
      this.ctx.lineWidth = isSelected || isCorrectReveal ? 4 : 1.5;
      if (isSelected) {
        this.ctx.shadowColor = isWrongSelected ? '#fb7185' : '#38bdf8';
        this.ctx.shadowBlur = 14;
      }
      this.ctx.beginPath();
      safeRoundRect(this.ctx, ox, oy, optW, optH, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = optText.length > 25 ? '11px sans-serif' : 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(optText, w / 2, oy + optH / 2);
      this.ctx.shadowBlur = 0;
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
  window.CurriculumQuizGame = CurriculumQuizGame;
  window.MathCurriculumGame = MathCurriculumGame;
  window.PanBalanceScaleGame = PanBalanceScaleGame;
  window.CosmicOrbitGame = CosmicOrbitGame;
  window.LeverPhysicsGame = LeverPhysicsGame;
  window.CircuitSandboxGame = CircuitSandboxGame;
  window.PrefectureJigsawGame = PrefectureJigsawGame;
  window.ContextMatchGame = ContextMatchGame;
  window.CategorySortGame = CategorySortGame;
  window.GradeComprehensiveExamGame = GradeComprehensiveExamGame;
  window.miniGameModal = getMiniGameModal();
}
