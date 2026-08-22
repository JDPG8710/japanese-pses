/**
 * KukuLinkGame.js - 九九星際マッチング＆九九わり算除法（日本語・文部科学省学習指導要領対応）
 * 
 * Level 1: 基礎九九（2の段・3の段・5の段）
 * Level 2: 発展九九（4の段・6の段・7の段）
 * Level 3: 上級九九（8の段・9の段 ＆ 全段ランダム）
 * Level 4: 九九わり算除法（割り切れる除法: 56÷7=8, 72÷9=8 等）
 * Level 5: 混合速算マスター（かけ算 ＆ わり算 混合ハイブリッド）
 */

import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';
import { getErrorGuidanceSystem } from './ErrorGuidanceSystem.js';

export class KukuLinkGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = options.onWin || (() => {});
    this.onNextLevel = options.onNextLevel || null;
    this.level = options.level || 1; // 1 ~ 5
    this.rows = options.rows || 4;
    this.cols = options.cols || 4;
    this.totalPairs = (this.rows * this.cols) / 2;

    this.audio = options.audio || getAudioSynthesizer();
    this.fx = options.fx || getFXSystem();
    this.guidance = options.guidance || getErrorGuidanceSystem();

    this.grid = [];
    this.selectedTile = null;
    this.matchedPairsCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timeLeft = options.timeLimit || Math.max(50, 80 - (this.level - 1) * 5);
    this.totalTime = this.timeLeft;
    this.basePoints = 0;
    this.comboBonus = 0;
    this.running = false;

    this.hintsRemaining = 3;
    this.shufflesRemaining = 2;
    this.hintPair = null;

    this.laserPath = null;
    this.laserLife = 0;
    this.laserParticles = [];

    this.boundPointer = this.handlePointer.bind(this);
  }

  start() {
    this.running = true;
    this.matchedPairsCount = 0;
    this.combo = 0;
    this.basePoints = 0;
    this.comboBonus = 0;
    this.selectedTile = null;
    this.laserPath = null;
    this.timeLeft = Math.max(50, 80 - (this.level - 1) * 5);
    this.totalTime = this.timeLeft;

    this.generateKukuGrid();

    this.canvas.addEventListener('pointerdown', this.boundPointer);

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (typeof document !== 'undefined') {
        const timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.innerText = `⏱ ${this.timeLeft}s`;
      }

      if (this.timeLeft <= 0) {
        this.destroy();
        this.finishGame(false);
      }
    }, 1000);

    this.renderLoop();
  }

  setLevel(newLevel) {
    this.level = Math.max(1, Math.min(5, newLevel));
    this.start();
  }

  generateKukuGrid() {
    const formulas = [];
    const usedKeys = new Set();

    // レベルに応じた算式生成ルール
    while (formulas.length < this.totalPairs) {
      let expr = '';
      let resultVal = 0;
      let displayResult = '';

      if (this.level === 1) {
        // Level 1: 2, 3, 5の段
        const table = [2, 3, 5][Math.floor(Math.random() * 3)];
        const b = Math.floor(1 + Math.random() * 9);
        resultVal = table * b;
        expr = `${table}×${b}`;
        displayResult = String(resultVal);
      } else if (this.level === 2) {
        // Level 2: 4, 6, 7の段
        const table = [4, 6, 7][Math.floor(Math.random() * 3)];
        const b = Math.floor(1 + Math.random() * 9);
        resultVal = table * b;
        expr = `${table}×${b}`;
        displayResult = String(resultVal);
      } else if (this.level === 3) {
        // Level 3: 8, 9の段 ＆ 全段ミックス
        const table = Math.random() < 0.6 ? (Math.random() < 0.5 ? 8 : 9) : Math.floor(2 + Math.random() * 8);
        const b = Math.floor(1 + Math.random() * 9);
        resultVal = table * b;
        expr = `${table}×${b}`;
        displayResult = String(resultVal);
      } else if (this.level === 4) {
        // Level 4: 九九わり算除法（割り切れる九九逆算）
        const divisor = Math.floor(2 + Math.random() * 8); // 2~9
        const quotient = Math.floor(1 + Math.random() * 9); // 1~9
        const dividend = divisor * quotient;
        resultVal = quotient;
        expr = `${dividend}÷${divisor}`;
        displayResult = String(quotient);
      } else {
        // Level 5: 混合速算（かけ算 ＆ わり算）
        if (Math.random() < 0.5) {
          const a = Math.floor(2 + Math.random() * 8);
          const b = Math.floor(1 + Math.random() * 9);
          resultVal = a * b;
          expr = `${a}×${b}`;
          displayResult = String(resultVal);
        } else {
          const divisor = Math.floor(2 + Math.random() * 8);
          const quotient = Math.floor(1 + Math.random() * 9);
          const dividend = divisor * quotient;
          resultVal = quotient;
          expr = `${dividend}÷${divisor}`;
          displayResult = String(quotient);
        }
      }

      if (!usedKeys.has(expr)) {
        usedKeys.add(expr);
        formulas.push({
          id: `pair-${formulas.length}`,
          expr: expr,
          displayResult: displayResult,
          val: resultVal
        });
      }
    }

    const cardDeck = [];
    formulas.forEach((item) => {
      cardDeck.push({ pairId: item.id, text: item.expr, val: item.val, matched: false });
      cardDeck.push({ pairId: item.id, text: item.displayResult, val: item.val, matched: false });
    });

    for (let i = cardDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardDeck[i], cardDeck[j]] = [cardDeck[j], cardDeck[i]];
    }

    const paddedRows = this.rows + 2;
    const paddedCols = this.cols + 2;
    this.grid = Array.from({ length: paddedRows }, () => Array(paddedCols).fill(null));

    let deckIdx = 0;
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const card = cardDeck[deckIdx++];
        this.grid[r][c] = {
          row: r,
          col: c,
          pairId: card.pairId,
          text: card.text,
          val: card.val,
          matched: false
        };
      }
    }
  }

  checkPath(tileA, tileB) {
    if (!tileA || !tileB) return null;
    if (tileA.row === tileB.row && tileA.col === tileB.col) return null;
    if (tileA.val !== tileB.val) return null;

    const p1 = { r: tileA.row, c: tileA.col };
    const p2 = { r: tileB.row, c: tileB.col };

    if (this.isDirectLine(p1, p2)) return [p1, p2];

    const oneCornerPath = this.checkOneCorner(p1, p2);
    if (oneCornerPath) return oneCornerPath;

    const twoCornerPath = this.checkTwoCorners(p1, p2);
    if (twoCornerPath) return twoCornerPath;

    return null;
  }

  isDirectLine(p1, p2) {
    if (p1.r === p2.r) {
      const minC = Math.min(p1.c, p2.c);
      const maxC = Math.max(p1.c, p2.c);
      for (let c = minC + 1; c < maxC; c++) {
        if (!this.isEmpty(p1.r, c)) return false;
      }
      return true;
    }
    if (p1.c === p2.c) {
      const minR = Math.min(p1.r, p2.r);
      const maxR = Math.max(p1.r, p2.r);
      for (let r = minR + 1; r < maxR; r++) {
        if (!this.isEmpty(r, p1.c)) return false;
      }
      return true;
    }
    return false;
  }

  checkOneCorner(p1, p2) {
    const c1 = { r: p1.r, c: p2.c };
    if (this.isEmpty(c1.r, c1.c) && this.isDirectLine(p1, c1) && this.isDirectLine(c1, p2)) {
      return [p1, c1, p2];
    }
    const c2 = { r: p2.r, c: p1.c };
    if (this.isEmpty(c2.r, c2.c) && this.isDirectLine(p1, c2) && this.isDirectLine(c2, p2)) {
      return [p1, c2, p2];
    }
    return null;
  }

  checkTwoCorners(p1, p2) {
    const maxR = this.rows + 2;
    const maxC = this.cols + 2;

    for (let r = 0; r < maxR; r++) {
      const k1 = { r: r, c: p1.c };
      const k2 = { r: r, c: p2.c };
      if (this.isEmptyOrSelf(k1, p1) && this.isEmptyOrSelf(k2, p2)) {
        if (this.isDirectLine(p1, k1) && this.isDirectLine(k1, k2) && this.isDirectLine(k2, p2)) {
          return [p1, k1, k2, p2];
        }
      }
    }

    for (let c = 0; c < maxC; c++) {
      const k1 = { r: p1.r, c: c };
      const k2 = { r: p2.r, c: c };
      if (this.isEmptyOrSelf(k1, p1) && this.isEmptyOrSelf(k2, p2)) {
        if (this.isDirectLine(p1, k1) && this.isDirectLine(k1, k2) && this.isDirectLine(k2, p2)) {
          return [p1, k1, k2, p2];
        }
      }
    }

    return null;
  }

  isEmpty(r, c) {
    if (r < 0 || r >= this.rows + 2 || c < 0 || c >= this.cols + 2) return true;
    const tile = this.grid[r][c];
    return !tile || tile.matched;
  }

  isEmptyOrSelf(pt, self) {
    if (pt.r === self.r && pt.c === self.c) return true;
    return this.isEmpty(pt.r, pt.c);
  }

  handlePointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const clientY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // レベル切り替えバーのタップ判定 (上部 y: 5 ~ 32)
    if (clientY >= 5 && clientY <= 32) {
      for (let lvl = 1; lvl <= 5; lvl++) {
        const btnX = 65 + (lvl - 1) * 36;
        if (clientX >= btnX && clientX <= btnX + 32) {
          this.setLevel(lvl);
          this.audio.playClick();
          return;
        }
      }
    }

    const layout = this.getCardLayout();
    const { startX, startY, cardW, cardH, gap } = layout;

    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile || tile.matched) continue;

        const x = startX + (c - 1) * (cardW + gap);
        const y = startY + (r - 1) * (cardH + gap);

        // タッチ範囲の拡張 (+4px)
        if (clientX >= x - 4 && clientX <= x + cardW + 4 && clientY >= y - 4 && clientY <= y + cardH + 4) {
          this.onTileClicked(tile, x + cardW / 2, y + cardH / 2);
          return;
        }
      }
    }
  }

  onTileClicked(tile, cardCenterX, cardCenterY) {
    this.hintPair = null;

    if (!this.selectedTile) {
      this.selectedTile = tile;
      this.audio.playClick();
      if (cardCenterX !== undefined && cardCenterY !== undefined) {
        this.fx.spawnStarBurst(cardCenterX, cardCenterY, 12, '#eab308');
      }
      return;
    }

    if (this.selectedTile === tile) {
      this.selectedTile = null;
      this.audio.playClick();
      return;
    }

    // 数学的な一致（式と積、または積が同じ式同士）の判定
    const isMathMatch = (this.selectedTile.val === tile.val) || (this.selectedTile.pairId === tile.pairId);

    if (isMathMatch) {
      // 1. 連線パスの探索（2折線以内のパスがあればそのパス、内側の場合は直接ビーム）
      let path = this.checkPath(this.selectedTile, tile);
      if (!path) {
        path = [
          { r: this.selectedTile.row, c: this.selectedTile.col },
          { r: tile.row, c: tile.col }
        ];
      }

      // 2. カードを確実に消去（matched = true）
      const tileA = this.selectedTile;
      const tileB = tile;

      tileA.matched = true;
      tileB.matched = true;
      this.matchedPairsCount++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      const pairBase = 100;
      const comboAdd = (this.combo - 1) * 25;
      this.basePoints += pairBase;
      this.comboBonus += comboAdd;

      this.audio.playPositive(2, this.combo);

      const layout = this.getCardLayout();
      const ptA = {
        x: layout.startX + (tileA.col - 1) * (layout.cardW + layout.gap) + layout.cardW / 2,
        y: layout.startY + (tileA.row - 1) * (layout.cardH + layout.gap) + layout.cardH / 2
      };
      const ptB = {
        x: layout.startX + (tileB.col - 1) * (layout.cardW + layout.gap) + layout.cardW / 2,
        y: layout.startY + (tileB.row - 1) * (layout.cardH + layout.gap) + layout.cardH / 2
      };

      // 両方のカード位置で星屑爆発＆レーザー火花エフェクトを発生
      this.fx.spawnStarBurst(ptA.x, ptA.y, 25, '#fbbf24');
      this.fx.spawnStarBurst(ptB.x, ptB.y, 25, '#38bdf8');
      this.fx.spawnLaserSparks(ptA.x, ptA.y, ptB.x, ptB.y, 16, '#38bdf8');
      this.fx.showFloatingScore((ptA.x + ptB.x) / 2, (ptA.y + ptB.y) / 2 - 15, `+${pairBase + comboAdd} pt`, '#34d399');

      this.triggerLaserEffect(path);
      this.selectedTile = null;

      if (this.matchedPairsCount >= this.totalPairs) {
        setTimeout(() => this.finishGame(true), 600);
      }
    } else {
      const prevTile = this.selectedTile;
      this.combo = 0;
      this.audio.playGentleError();
      this.fx.triggerScreenShake(this.canvas, 'wobble', 200);
      this.guidance.registerError({
        subject: '算数',
        questionId: 'KUKU_LINK',
        questionData: {
          context: `${prevTile.text} と ${tile.text}`,
          hint: `「${prevTile.text}」の答えは ${prevTile.val} です`
        },
        targetElement: this.canvas
      });
      this.selectedTile = tile;
    }
  }

  useHint() {
    if (this.hintsRemaining <= 0) return false;
    const pair = this.findConnectablePair();
    if (pair) {
      this.hintsRemaining--;
      this.hintPair = pair;
      this.audio.playPositive(1);
      return true;
    }
    return false;
  }

  useShuffle() {
    if (this.shufflesRemaining <= 0) return false;
    this.shufflesRemaining--;
    this.shuffleRemainingTiles();
    this.selectedTile = null;
    this.hintPair = null;
    this.audio.playClick();
    return true;
  }

  findConnectablePair() {
    const activeTiles = [];
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const t = this.grid[r][c];
        if (t && !t.matched) activeTiles.push(t);
      }
    }

    for (let i = 0; i < activeTiles.length; i++) {
      for (let j = i + 1; j < activeTiles.length; j++) {
        if (activeTiles[i].val === activeTiles[j].val || activeTiles[i].pairId === activeTiles[j].pairId) {
          return [activeTiles[i], activeTiles[j]];
        }
      }
    }
    return null;
  }

  shuffleRemainingTiles() {
    const unMatchedCards = [];
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const t = this.grid[r][c];
        if (t && !t.matched) {
          unMatchedCards.push({ text: t.text, pairId: t.pairId, val: t.val });
        }
      }
    }

    for (let i = unMatchedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unMatchedCards[i], unMatchedCards[j]] = [unMatchedCards[j], unMatchedCards[i]];
    }

    let idx = 0;
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const t = this.grid[r][c];
        if (t && !t.matched) {
          const card = unMatchedCards[idx++];
          t.text = card.text;
          t.pairId = card.pairId;
          t.val = card.val;
        }
      }
    }
  }

  triggerLaserEffect(pathPoints) {
    this.laserPath = pathPoints;
    this.laserLife = 18;
    this.laserParticles = [];
  }

  getCardLayout() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isSmallMobile = w < 480;

    const gap = isSmallMobile ? 6 : 10;
    const maxAvailableW = w - 30;
    const maxAvailableH = h - 75;

    const cardW = Math.min(isSmallMobile ? 68 : 96, Math.floor((maxAvailableW - (this.cols - 1) * gap) / this.cols));
    const cardH = Math.min(isSmallMobile ? 56 : 72, Math.floor((maxAvailableH - (this.rows - 1) * gap) / this.rows));

    const totalGridW = this.cols * cardW + (this.cols - 1) * gap;
    const totalGridH = this.rows * cardH + (this.rows - 1) * gap;

    const startX = (w - totalGridW) / 2;
    const startY = (h - totalGridH) / 2 + 16;

    return { startX, startY, cardW, cardH, gap, isSmallMobile };
  }

  renderLoop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const layout = this.getCardLayout();
    const { startX, startY, cardW, cardH, gap, isSmallMobile } = layout;

    // 上部ヘッダー情報＆レベル切り替えバー描画
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`難易度:`, 15, 22);

    const LEVEL_LABELS = ['Lv1(2/3/5段)', 'Lv2(4/6/7段)', 'Lv3(8/9段)', 'Lv4(わり算)', 'Lv5(混合)'];
    for (let lvl = 1; lvl <= 5; lvl++) {
      const btnX = 65 + (lvl - 1) * 36;
      const isCurrent = this.level === lvl;
      this.ctx.fillStyle = isCurrent ? '#f59e0b' : '#334155';
      this.ctx.beginPath();
      this.ctx.roundRect(btnX, 8, 30, 20, 6);
      this.ctx.fill();

      this.ctx.fillStyle = isCurrent ? '#0f172a' : '#94a3b8';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`L${lvl}`, btnX + 15, 22);
    }

    if (this.combo > 1) {
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`🔥 ${this.combo} 連続!`, 255, 22);
    }

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.fillText(`💡(${this.hintsRemaining}) 🌀(${this.shufflesRemaining})`, this.canvas.width - 15, 22);

    // カード描画
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile || tile.matched) continue;

        const x = startX + (c - 1) * (cardW + gap);
        const y = startY + (r - 1) * (cardH + gap);

        const isSelected = this.selectedTile === tile;
        const isHint = this.hintPair && (this.hintPair[0] === tile || this.hintPair[1] === tile);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, cardW, cardH, 12);

        if (isSelected) {
          const pulse = Math.sin(Date.now() * 0.008) * 4;
          this.ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
          this.ctx.strokeStyle = '#eab308';
          this.ctx.lineWidth = 3 + pulse * 0.3;
          this.ctx.shadowColor = '#eab308';
          this.ctx.shadowBlur = 12;
        } else if (isHint) {
          this.ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 2.5;
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = 10;
        } else {
          this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          this.ctx.lineWidth = 1.5;
        }

        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.fillStyle = isSelected ? '#fef08a' : '#f8fafc';
        const fontSize = isSmallMobile ? (tile.text.length > 4 ? 13 : 16) : (tile.text.length > 4 ? 16 : 20);
        this.ctx.font = `bold ${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.text, x + cardW / 2, y + cardH / 2);
      }
    }

    if (this.laserPath && this.laserLife > 0) {
      this.drawLaserPath(this.laserPath, layout);
      this.laserLife--;
    }

    if (this.fx && typeof this.fx.render === 'function') {
      this.fx.render(this.ctx, this.canvas.width, this.canvas.height);
    }
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.renderLoop());
    }
  }

  drawLaserPath(path, layout) {
    const { startX, startY, cardW, cardH, gap } = layout;

    const toScreen = (pt) => ({
      x: startX + (pt.c - 1) * (cardW + gap) + cardW / 2,
      y: startY + (pt.r - 1) * (cardH + gap) + cardH / 2
    });

    this.ctx.save();
    this.ctx.beginPath();
    const first = toScreen(path[0]);
    this.ctx.moveTo(first.x, first.y);

    for (let i = 1; i < path.length; i++) {
      const p = toScreen(path[i]);
      this.ctx.lineTo(p.x, p.y);
    }

    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 6;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = 15;
    this.ctx.stroke();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  finishGame(isSuccess) {
    this.destroy();

    const timeFactor = Number((1.0 + (this.timeLeft / this.totalTime) * 0.8).toFixed(2));
    const finalScore = isSuccess ? Math.round((this.basePoints + this.comboBonus) * timeFactor) : 0;
    const stars = !isSuccess ? 0 : this.timeLeft > this.totalTime * 0.5 ? 3 : this.timeLeft > this.totalTime * 0.2 ? 2 : 1;

    if (isSuccess) {
      this.audio.playVictory();
      this.fx.spawnConfetti(this.canvas.width, this.canvas.height, 60);
    } else {
      this.audio.playGentleError();
    }

    const resultPayload = {
      game: 'KUKU_LINK_UP',
      grade: '小学2年生',
      subject: '算数（九九・わり算）',
      level: this.level,
      is_success: isSuccess,
      stars: stars,
      time_remaining_sec: this.timeLeft,
      max_combo: this.maxCombo,
      score_breakdown: {
        base_points: this.basePoints,
        combo_bonus: this.comboBonus,
        time_factor: timeFactor,
        final_score: finalScore,
        formula: `(${this.basePoints} + ${this.comboBonus}) × ${timeFactor} = ${finalScore} pt`
      }
    };

    this.onWin(stars, finalScore, resultPayload);
  }

  destroy() {
    this.running = false;
    clearInterval(this.timerInterval);
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
  }
}
