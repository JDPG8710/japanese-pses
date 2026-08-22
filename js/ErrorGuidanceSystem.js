/**
 * ErrorGuidanceSystem.js - 3-Tier Child-Friendly Error Scaffolding & Mascot Guidance Engine
 * 
 * Implements developmental psychology-aligned error feedback for Japanese elementary schoolers (Grades 1-6):
 * - Tier 1 (1st Error): Gentle wobble + soft boop + positive encouragement (zero harsh score penalty)
 * - Tier 2 (2nd Error): Clue highlighting (golden pulse ring) + distractor elimination/dimming
 * - Tier 3 (3rd+ Error / Hint): Mascot "星の子ピコ" cartoon speech bubble with step-by-step guidance
 */

import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';

export class ErrorGuidanceSystem {
  constructor(options = {}) {
    this.audio = options.audio || getAudioSynthesizer();
    this.fx = options.fx || getFXSystem();
    this.errorCounts = new Map(); // questionId / nodeId -> count
    this.activeGuidanceBubble = null;
    this.bubbleTimeout = null;

    if (typeof document !== 'undefined') {
      this.initGuidanceDOM();
    }
  }

  /**
   * Initializes the mascot speech bubble container in DOM if not present.
   */
  initGuidanceDOM() {
    let bubble = document.getElementById('guidance-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = 'guidance-bubble';
      bubble.className = 'fixed bottom-24 right-6 z-50 flex items-end gap-3 max-w-sm pointer-events-none transition-all duration-300 transform translate-y-8 opacity-0';
      bubble.innerHTML = `
        <div class="glass-panel p-4 rounded-3xl rounded-br-none border border-amber-400/50 bg-slate-900/95 shadow-2xl text-slate-100 text-xs relative animate-bounce-gentle pointer-events-auto">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-1.5 text-amber-300 font-bold">
              <span>💡</span>
              <span id="guidance-title">星の子ピコからのヒント</span>
            </div>
            <button id="guidance-close-btn" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800 transition">✕</button>
          </div>
          <p id="guidance-text" class="leading-relaxed text-slate-200 text-xs mb-3"></p>
          <div class="flex justify-end">
            <button id="guidance-ok-btn" class="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-[11px] shadow-md transition">
              わかった！
            </button>
          </div>
          <!-- Speech bubble tail pointer -->
          <div class="absolute -bottom-2 right-4 w-4 h-4 bg-slate-900 border-r border-b border-amber-400/50 transform rotate-45 pointer-events-none"></div>
        </div>
        <!-- Procedural Mascot Avatar (星の子ピコ) -->
        <div id="guidance-avatar" class="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-600 border-2 border-amber-300 flex items-center justify-center text-2xl shadow-xl flex-shrink-0 animate-pulse pointer-events-auto cursor-pointer">
          🛸
        </div>
      `;
      document.body.appendChild(bubble);

      const closeHandler = () => this.dismissGuidance();
      const closeBtn = document.getElementById('guidance-close-btn');
      const okBtn = document.getElementById('guidance-ok-btn');
      const avatarBtn = document.getElementById('guidance-avatar');

      if (closeBtn) closeBtn.addEventListener('click', closeHandler);
      if (okBtn) okBtn.addEventListener('click', closeHandler);
      if (avatarBtn) avatarBtn.addEventListener('click', () => {
        this.audio.playClick();
        this.fx.spawnStarBurst(
          avatarBtn.getBoundingClientRect().left + 25,
          avatarBtn.getBoundingClientRect().top + 25,
          15,
          '#fbbf24'
        );
      });
    }
    this.activeGuidanceBubble = bubble;
  }

  /**
   * Registers an error on a specific question/context and triggers appropriate tier feedback.
   * @param {Object} context - { questionId, nodeId, subject, questionData, targetElement, coords }
   * @param {Object} options - Custom overrides
   * @returns {Object} Tier result: { tier: 1|2|3, message, action }
   */
  registerError(context = {}, options = {}) {
    const key = context.questionId || context.nodeId || 'default';
    const currentErrors = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, currentErrors);

    if (currentErrors === 1) {
      // Tier 1: Gentle wobble + soft sound + transient positive cheer
      return this.handleTier1(context, options);
    } else if (currentErrors === 2) {
      // Tier 2: Clue highlighting + distractor fade + supportive toast
      return this.handleTier2(context, options);
    } else {
      // Tier 3: Full Mascot "星の子ピコ" explanation bubble
      return this.handleTier3(context, options);
    }
  }

  /**
   * Resets error count upon correct answer
   */
  registerSuccess(context = {}) {
    const key = context.questionId || context.nodeId || 'default';
    this.errorCounts.delete(key);
    this.dismissGuidance();
  }

  /**
   * Tier 1 Feedback: Gentle wobble + soft sound + non-punitive toast
   */
  handleTier1(context, options = {}) {
    // 1. Soft friendly audio boop (no buzzer)
    this.audio.playGentleError();

    // 2. Cartoon wobble on tapped element or container
    if (context.targetElement) {
      this.fx.triggerCartoonWobble(context.targetElement);
    } else {
      this.fx.triggerScreenShake('#game-modal', 'bounce', 300);
    }

    // 3. Encouraging floating text
    const encouragements = [
      'おしい！ もう一度！',
      'どんまい！ もう一回！',
      '大丈夫、焦らずいこう！',
      'あと一歩だよ！'
    ];
    const cheer = options.message || encouragements[Math.floor(Math.random() * encouragements.length)];

    if (context.coords) {
      this.fx.showFloatingScore(context.coords.x, context.coords.y, cheer, '#38bdf8', 18);
    }

    this.showTransientToast(`🌱 ${cheer}`);

    return {
      tier: 1,
      errorCount: 1,
      message: cheer,
      action: 'WOBBLE_AND_RETRY'
    };
  }

  /**
   * Tier 2 Feedback: Clue highlighting + distractor elimination
   */
  handleTier2(context, options = {}) {
    // 1. Clue sound
    this.audio.playClue();

    // 2. Highlight clue element or area
    if (context.clueElement || context.targetElement) {
      this.showClueHighlight(context.clueElement || context.targetElement);
    }

    const clueMsg = options.message || this.generateSubjectClue(context);
    this.showTransientToast(`💡 ヒント：${clueMsg}`);

    if (context.coords) {
      this.fx.showFloatingScore(context.coords.x, context.coords.y, 'ヒントが出現！', '#fbbf24', 18);
      this.fx.spawnStarBurst(context.coords.x, context.coords.y, 12, '#fbbf24');
    }

    return {
      tier: 2,
      errorCount: 2,
      message: clueMsg,
      action: 'CLUE_HIGHLIGHTED'
    };
  }

  /**
   * Tier 3 Feedback: Mascot "星の子ピコ" Speech Bubble Guidance
   */
  handleTier3(context, options = {}) {
    this.audio.playClue();

    const title = options.title || '星の子ピコからのヒント 🛸';
    const explanation = options.explanation || this.generatePedagogicalExplanation(context);

    this.showMascotGuidance(title, explanation, options);

    return {
      tier: 3,
      errorCount: this.getConsecutiveErrors(context.questionId || context.nodeId),
      message: explanation,
      action: 'MASCOT_BUBBLE_OPENED'
    };
  }

  /**
   * Displays glowing pulse ring on target element (Tier 2 Scaffolding)
   */
  showClueHighlight(elementOrSelector, durationMs = 3500) {
    if (typeof document === 'undefined') return;
    let target = null;
    if (typeof elementOrSelector === 'string') {
      target = document.querySelector(elementOrSelector);
    } else if (elementOrSelector instanceof HTMLElement) {
      target = elementOrSelector;
    }
    if (!target) return;

    target.classList.remove('animate-clue-pulse');
    void target.offsetWidth;
    target.classList.add('animate-clue-pulse');

    setTimeout(() => {
      if (target) target.classList.remove('animate-clue-pulse');
    }, durationMs);
  }

  /**
   * Shows Mascot Speech Bubble
   */
  showMascotGuidance(title, explanationText, options = {}) {
    if (typeof document === 'undefined') return;
    this.initGuidanceDOM();
    if (!this.activeGuidanceBubble) return;

    const titleEl = document.getElementById('guidance-title');
    const textEl = document.getElementById('guidance-text');

    if (titleEl) titleEl.innerText = title;
    if (textEl) textEl.innerText = explanationText;

    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }

    this.activeGuidanceBubble.classList.remove('opacity-0', 'translate-y-8', 'pointer-events-none');
    this.activeGuidanceBubble.classList.add('opacity-100', 'translate-y-0');

    // Auto-dismiss after timeout unless set to infinite
    const autoDismissMs = options.autoDismissMs ?? 9000;
    if (autoDismissMs > 0) {
      this.bubbleTimeout = setTimeout(() => {
        this.dismissGuidance();
      }, autoDismissMs);
    }
  }

  /**
   * Dismisses Mascot Speech Bubble
   */
  dismissGuidance() {
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }
    if (this.activeGuidanceBubble) {
      this.activeGuidanceBubble.classList.remove('opacity-100', 'translate-y-0');
      this.activeGuidanceBubble.classList.add('opacity-0', 'translate-y-8', 'pointer-events-none');
    }
  }

  /**
   * Shows transient agent/guidance toast at top of viewport
   */
  showTransientToast(msg, durationMs = 3500) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('agent-toast');
    const toastText = document.getElementById('agent-toast-text');
    if (toast && toastText) {
      toastText.innerText = msg;
      toast.classList.remove('opacity-0', '-translate-y-4');
      setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-4');
      }, durationMs);
    }
  }

  /**
   * Returns current consecutive errors for question or node
   */
  getConsecutiveErrors(questionId = 'default') {
    return this.errorCounts.get(questionId) || 0;
  }

  /**
   * Resets error count
   */
  resetConsecutiveErrors(questionId = null) {
    if (questionId) {
      this.errorCounts.delete(questionId);
    } else {
      this.errorCounts.clear();
    }
  }

  /**
   * Generates Tier 2 Subject Clue based on curriculum context
   */
  generateSubjectClue(context = {}) {
    const subject = context.subject || '全般';
    const qData = context.questionData || {};

    switch (subject) {
      case '国語':
        if (qData.kanji) {
          return `「${qData.kanji}」の部首や送り仮名に注目してみよう！`;
        }
        return '言葉の響きや漢字の形をよく見てみよう！';

      case '算数':
        if (qData.formula) {
          return `計算式【 ${qData.formula} 】の九九の段を思い出してみてね！`;
        }
        if (qData.targetRatio) {
          return `割合（%）＝（比べられる量 ÷ もとにする量）× 100 だよ！`;
        }
        return '位取りや数字の組み合わせをもう一度確認しよう！';

      case '理科':
        if (qData.targetLeft && qData.armLeft) {
          const moment = qData.targetLeft * qData.armLeft;
          return `てこのつり合い：（左のおもり × 距離 ＝ ${moment}）になる目盛りを探そう！`;
        }
        return '実験の規則性や条件の変化を確かめてみよう！';

      case '社会':
        if (qData.prefecture) {
          return `「${qData.prefecture}」はどの地方にあるかな？ 形や隣の県を見てみよう！`;
        }
        return '日本の地形や特産品のつながりを思い出してみよう！';

      case '外国語・英語':
      case '英語':
        return 'イラストの場面と英単語の最初の文字をヒントにしてみてね！';

      case '生活':
      default:
        return '季節や身の回りの自然の様子をよく思い出してみてね！';
    }
  }

  /**
   * Generates Tier 3 Mascot Detailed Pedagogical Explanation
   */
  generatePedagogicalExplanation(context = {}) {
    const subject = context.subject || '全般';
    const qData = context.questionData || {};

    if (context.customExplanation) {
      return context.customExplanation;
    }

    switch (subject) {
      case '国語':
        if (qData.kanji && qData.correctAnswer) {
          return `「${qData.kanji}」の正しい読み方は「${qData.correctAnswer}」だよ！${qData.hint ? ' ' + qData.hint : '草かんむりや偏（へん）の形を手がかりに選んでみてね！'}`;
        }
        return 'ゆっくり声に出して読んでみると、正しい言葉のリズムが見つかるよ！ピコと一緒に挑戦しよう！';

      case '算数':
        if (qData.formula && qData.correctAnswer) {
          return `【 ${qData.formula} 】の答えは「${qData.correctAnswer}」だよ！九九の暗唱を落ち着いて思い出してみてね！`;
        }
        if (qData.targetRatio) {
          return `目標割合は【 ${qData.targetRatio}% 】だよ！スライダーの数値を青い目印に合わせてみてね！`;
        }
        return '図や式を順番に整理すると解きやすくなるよ！焦らず落ち着いてやってみよう！';

      case '理科':
        if (qData.targetLeft && qData.armLeft && qData.correctSlot) {
          const moment = qData.targetLeft * qData.armLeft;
          return `左側の力（${qData.targetLeft}g × ${qData.armLeft}cm = ${moment}）と右側を釣り合わせるには、${qData.targetRight || 20}gのおもりを【${qData.correctSlot}番】の目盛りにかけよう！`;
        }
        return '自然のきまりはとても美しいよ！てこの原理や電気の通り道を観察してみよう！';

      case '社会':
        if (qData.prefecture && qData.region) {
          return `「${qData.prefecture}」は【${qData.region}地方】にあるよ！名産品や有名な山・川をヒントに地図にはめ込んでみてね！`;
        }
        return '日本列島の形をパズルのように見てみよう！海に面しているか山があるかが大きな手がかりだよ！';

      default:
        return 'ピコが応援しているよ！落ち着いてもう一度画面をよく見てみよう！きっとできるよ！';
    }
  }
}

// Global Singleton Initialization
let globalGuidanceSystem = null;
export function getErrorGuidanceSystem(options) {
  if (!globalGuidanceSystem) {
    globalGuidanceSystem = new ErrorGuidanceSystem(options);
  }
  return globalGuidanceSystem;
}

if (typeof window !== 'undefined') {
  window.ErrorGuidanceSystem = ErrorGuidanceSystem;
  window.errorGuidanceSystem = getErrorGuidanceSystem();
  window.guidanceSystem = window.errorGuidanceSystem;
}
