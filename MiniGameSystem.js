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

import { FULL_CURRICULUM_DAG } from './CurriculumData.js';
import { KukuLinkGame } from './KukuLinkGame.js';
import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';
import { getErrorGuidanceSystem } from './ErrorGuidanceSystem.js';

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
    name: '漢字闖関',
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
    name: '星艦天秤',
    subject: '算数',
    grades: [1, 2, 3, 4, 5, 6],
    disabledNotice: '全学年対応'
  },
  RATIO_SCALE: {
    id: 'RATIO_SCALE',
    name: '星艦天秤',
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
    name: '英語配対',
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

  constructor() {
    this.createModalDOM();
    this.currentGame = null;
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
      return Math.min(10, Math.max(4, Math.ceil(cnt / 15)));
    }
    if (subj.includes('英語') || subj === '外国語・英語') return 10;
    if (subj === '算数') return 6;
    if (subj === '理科') return 5;
    if (subj === '社会') return 8;
    if (subj === '生活') return 4;
    return 6;
  }

  // 知識ノードからゲームを開始
  open(nodeInfo, stageNum = 1) {
    if (this.modal) this.modal.classList.remove('hidden');
    this.currentLevel = stageNum;

    const targetNode = FULL_CURRICULUM_DAG.find(n => n.id === nodeInfo?.id) ||
                       FULL_CURRICULUM_DAG.find(n => n.subject === nodeInfo?.subject) ||
                       FULL_CURRICULUM_DAG[0];

    const gradeText = targetNode.grade ? `小学${targetNode.grade}年` : '全学年';
    const gradeBadge = document.getElementById('game-grade-badge');
    if (gradeBadge) gradeBadge.innerText = gradeText;
    const subjBadge = document.getElementById('game-subject-badge');
    if (subjBadge) subjBadge.innerText = targetNode.subject || '全般';
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.innerText = `${targetNode.name || '学習ステージ'} (Stage ${stageNum})`;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    if (canvas && container) {
      canvas.width = container.clientWidth || 640;
      canvas.height = container.clientHeight || 384;
    }

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    const gameType = targetNode.gameType || this.inferGameTypeBySubject(targetNode);
    if (canvas) {
      this.initGameInstance(gameType, targetNode, canvas, targetNode.grade, stageNum);
    }
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

  isGameSupportedForGrade(gameType, grade) {
    if (!grade || Number(grade) === 0) return true;
    const info = GAME_GRADE_SUPPORT_MAP[gameType];
    if (!info || !info.grades) return true;
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
          name: `${g}年 漢字偏旁部首拼装 (部首合成)`,
          desc: `小学${g}年生配当漢字の部首・かんむり・へんパーツを合体させて正しい漢字を完成させよう！`,
          bloomDepth: 1.0 + g * 0.2,
          gameType: 'RADICAL_BUILDER'
        };
      case 'KUKU_LINK':
        return {
          id: `POPULAR_KUKU_G${g}`,
          subject: '算数',
          grade: g,
          name: g === 2 ? '2年 かけ算九九 星際マッチング' : `${g}年 わり算・計算応用 星際マッチング`,
          desc: g === 2 ? '2〜9の段の九九暗唱。式と積を2曲がり以内の星際レーザーでつなごう！' : `小学${g}年生の計算応用。式と値を星際レーザーでつなごう！`,
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
          name: g <= 2 ? `${g}年 数の合成分解・星艦天秤` : (g <= 4 ? `${g}年 小数・分数 星艦天秤` : `${g}年 割合・方程式 星艦天秤`),
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
          gameData: { grade: g, level: level }
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
          gameData: { targetLeft: 50, armLeft: 2, targetRight: 20, correctSlot: 5, grade: g, level: level }
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
          gameData: { grade: g, level: level }
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
          gameData: { mode: 'PREFECTURES', region: 'ALL_JAPAN', grade: g, level: level }
        };
      case 'CONTEXT_MATCH':
        return {
          id: `POPULAR_CONTEXT_G${g}`,
          subject: '外国語・英語',
          grade: g,
          name: `${g}年 英語情景趣味配対 (Word & Scene Match)`,
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
      default:
        return {
          id: `POPULAR_CUSTOM_G${g}`,
          subject: '国語',
          grade: g,
          name: `${g}年 特訓ステージ`,
          desc: '学年に応じた特訓ステージに挑戦しよう！',
          bloomDepth: 1.0 + g * 0.2,
          gameType: 'KANJI_SLASH',
          gameData: { grade: g, level: level }
        };
    }
  }

  // 特訓・人気ミニゲームから直接起動 (学年指定対応)
  openPopularGame(gameType, level = 1, requestedGrade = null) {
    if (this.modal) this.modal.classList.remove('hidden');
    this.currentLevel = level;

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

    const matchingNode = this.generatePopularGameNode(gameType, effectiveGrade, level);

    const gradeBadge = document.getElementById('game-grade-badge');
    if (gradeBadge) gradeBadge.innerText = matchingNode.grade ? `小学${matchingNode.grade}年` : '特訓モード';
    const subjBadge = document.getElementById('game-subject-badge');
    if (subjBadge) subjBadge.innerText = matchingNode.subject;
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.innerText = `【特訓】${matchingNode.name} (Stage ${level})`;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    if (canvas && container) {
      canvas.width = container.clientWidth || 640;
      canvas.height = container.clientHeight || 384;
    }

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    if (canvas) {
      this.initGameInstance(gameType, matchingNode, canvas, effectiveGrade, level);
    }
  }

  // 国語 漢字1026字 学年別闖関モード
  openKanjiGradeChallenge(grade = 1) {
    if (this.modal) this.modal.classList.remove('hidden');

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

    const gBadge = document.getElementById('game-grade-badge');
    if (gBadge) gBadge.innerText = `小学${grade}年`;
    const sBadge = document.getElementById('game-subject-badge');
    if (sBadge) sBadge.innerText = '国語 (漢字1026字)';
    const tEl = document.getElementById('game-title');
    if (tEl) tEl.innerText = virtualNode.name;

    const canvas = document.getElementById('game-canvas') || (typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null);
    const container = document.getElementById('game-stage');
    if (canvas && container) {
      canvas.width = container.clientWidth || 640;
      canvas.height = container.clientHeight || 384;
    }

    if (this.currentGame) {
      this.currentGame.destroy();
    }

    if (canvas) {
      this.initGameInstance('KANJI_SLASH', virtualNode, canvas, grade);
    }
  }

  initGameInstance(gameType, targetNode, canvas, customGrade = null, customLevel = 1) {
    const hintBtn = document.getElementById('game-hint-btn');
    const shuffleBtn = document.getElementById('game-shuffle-btn');

    // Reset buttons safely
    if (hintBtn) hintBtn.classList.add('hidden');
    if (shuffleBtn) shuffleBtn.classList.add('hidden');

    const onWinCallback = (stars, score) => this.onGameOver(targetNode, stars, score);
    const hintEl = document.getElementById('game-hint');
    const effectiveGrade = customGrade || targetNode.grade || 1;

    switch (gameType) {
      case 'KUKU_LINK':
        if (hintBtn) hintBtn.classList.remove('hidden');
        if (shuffleBtn) shuffleBtn.classList.remove('hidden');
        this.currentGame = new KukuLinkGame(canvas, {
          rows: targetNode.gameData?.rows || 4,
          cols: targetNode.gameData?.cols || 4,
          timeLimit: targetNode.gameData?.timeLimit || 75,
          onWin: onWinCallback
        });
        if (hintEl) hintEl.innerText = '操作ヒント：式（例: 7×8）と積（56）を2曲がり以内の星際レーザーでつなげよう！';
        break;

      case 'RADICAL_BUILDER':
        this.currentGame = new RadicalBuilderGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade);
        if (hintEl) hintEl.innerText = '操作ヒント：下の部首パーツをタップして上のスロットに合体させよう！';
        break;

      case 'AETHER_SCALE':
      case 'RATIO_SCALE':
        this.currentGame = new PanBalanceScaleGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = targetNode.gameData?.hint || '操作ヒント：右側の皿におもりを置いて天秤を釣り合わせよう！';
        break;

      case 'COSMIC_ORBIT':
      case 'CELESTIAL_ORBIT':
        this.currentGame = new CosmicOrbitGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = '操作ヒント：月をドラッグして、目標の月相（三日月・上弦・満月など）に合わせよう！';
        break;

      case 'LEVER_PHYSICS':
        this.currentGame = new LeverPhysicsGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = '操作ヒント：右側のおもりを選んで目盛りに吊るし、てこを釣り合わせよう！';
        break;

      case 'CIRCUIT_SANDBOX':
      case 'SCIENCE_SANDBOX':
        this.currentGame = new CircuitSandboxGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = '操作ヒント：スイッチを閉じて回路を通電させ、豆電球を点灯させよう！';
        break;

      case 'PREFECTURE_JIGSAW':
        this.currentGame = new PrefectureJigsawGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade, customLevel);
        if (hintEl) hintEl.innerText = '操作ヒント：都道府県ピースをマップの正しい位置にはめ込もう！';
        break;

      case 'CONTEXT_MATCH':
        this.currentGame = new ContextMatchGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = '操作ヒント：左の英語表現と右の日本語・情景カードをタップしてペアにしよう！';
        break;

      case 'CATEGORY_SORT':
        this.currentGame = new CategorySortGame(canvas, targetNode.gameData, onWinCallback);
        if (hintEl) hintEl.innerText = '操作ヒント：下のアイテムをタップまたはドラッグして正しい仕分け箱に入れよう！';
        break;

      case 'KANJI_SLASH':
      default:
        this.currentGame = new KanjiSlashGame(canvas, targetNode.gameData, onWinCallback, effectiveGrade);
        if (hintEl) hintEl.innerText = `操作ヒント：小学${effectiveGrade}年の漢字が落ちる前に正しい読みをタップまたはスワイプ斬撃！`;
        break;
    }

    if (this.currentGame && typeof this.currentGame.start === 'function') {
      this.currentGame.start();
    }
  }

  onGameOver(node, stars = 3, score = 100) {
    const accuracy = Number((stars / 3).toFixed(2));
    window.dispatchEvent(new CustomEvent('GAME_CLEAR_SUCCESS', {
      detail: { nodeId: node.id, subject: node.subject, grade: node.grade, stars, score, accuracy }
    }));

    const overlay = document.getElementById('game-overlay-ui');
    if (overlay) {
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
      const confirmBtn = document.getElementById('settle-confirm-btn');
      if (confirmBtn) confirmBtn.onclick = () => this.close();
    }
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
        const res = await fetch('./data/kanji_1026.json');
        if (res.ok) KANJI_1026_CACHE = await res.json();
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
      if (!text) safeSetLineDash(this.ctx, [6, 6]);

      this.ctx.beginPath();
      safeRoundRect(this.ctx, sx - slotSize / 2, slotY - slotSize / 2, slotSize, slotSize, 14);
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
      safeRoundRect(this.ctx, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size, 14);
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
        const res = await fetch('./data/prefectures_47.json');
        if (res.ok) PREFECTURES_47_CACHE = await res.json();
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

    this.selectedPref = null;
    this.selectedOption = null;
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
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const w = this.canvas.width;
    const h = this.canvas.height;

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
          }
          return;
        }
      }
    }
  }

  loop() {
    if (!this.running) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
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
      this.ctx.fillText(`${withKidsReading('4年 社会：日本47都道府県 列島パズル', 'にほんれっとう・ちほうくぶん')} (Stage ${this.level})`, w / 2, 44);

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

        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(40, oy, optW, optH, 10);
        this.ctx.fill();
        this.ctx.stroke();

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
