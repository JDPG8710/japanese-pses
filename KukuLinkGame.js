/**
 * KukuLinkGame.js - 九九星際マッチング（日本語対応）
 */

import { getAudioSynthesizer } from './AudioSynthesizer.js';
import { getFXSystem } from './FXSystem.js';
import { getErrorGuidanceSystem } from './ErrorGuidanceSystem.js';

export class KukuLinkGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onWin = options.onWin || (() => {});
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
    this.timeLeft = options.timeLimit || 75;
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

    this.generateKukuGrid();

    this.canvas.addEventListener('pointerdown', this.boundPointer);

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const timerEl = document.getElementById('game-timer');
      if (timerEl) timerEl.innerText = `⏱ ${this.timeLeft}s`;

      if (this.timeLeft <= 0) {
        this.destroy();
        this.finishGame(false);
      }
    }, 1000);

    this.renderLoop();
  }

  generateKukuGrid() {
    const formulas = [];
    while (formulas.length < this.totalPairs) {
      const a = Math.floor(2 + Math.random() * 8); // 2~9
      const b = Math.floor(1 + Math.random() * 9); // 1~9
      const product = a * b;
      const key = `${a}×${b}`;

      if (!formulas.some((f) => f.expr === key)) {
        formulas.push({
          id: `pair-${formulas.length}`,
          expr: key,
          product: product,
          val: product
        });
      }
    }

    const cardDeck = [];
    formulas.forEach((item) => {
      cardDeck.push({ pairId: item.id, text: item.expr, val: item.val, matched: false });
      cardDeck.push({ pairId: item.id, text: String(item.product), val: item.val, matched: false });
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

    const layout = this.getCardLayout();
    const { startX, startY, cardW, cardH, gap } = layout;

    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const tile = this.grid[r][c];
        if (!tile || tile.matched) continue;

        const x = startX + (c - 1) * (cardW + gap);
        const y = startY + (r - 1) * (cardH + gap);

        if (clientX >= x && clientX <= x + cardW && clientY >= y && clientY <= y + cardH) {
          this.onTileClicked(tile);
          return;
        }
      }
    }
  }

  onTileClicked(tile) {
    this.hintPair = null;
    this.audio.playClick();

    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }

    if (this.selectedTile === tile) {
      this.selectedTile = null;
      return;
    }

    const path = this.checkPath(this.selectedTile, tile);
    if (path) {
      this.selectedTile.matched = true;
      tile.matched = true;
      this.matchedPairsCount++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      const pairBase = 100;
      const comboAdd = (this.combo - 1) * 25;
      this.basePoints += pairBase;
      this.comboBonus += comboAdd;

      // Audio & Particle FX
      this.audio.playLaser();
      this.audio.playCombo(this.combo);

      const layout = this.getCardLayout();
      const toScreen = (pt) => ({
        x: layout.startX + (pt.c - 1) * (layout.cardW + layout.gap) + layout.cardW / 2,
        y: layout.startY + (pt.r - 1) * (layout.cardH + layout.gap) + layout.cardH / 2
      });

      for (let i = 0; i < path.length - 1; i++) {
        const p1 = toScreen(path[i]);
        const p2 = toScreen(path[i + 1]);
        this.fx.spawnLaserSparks(p1.x, p1.y, p2.x, p2.y, 16);
      }

      const pTarget = toScreen(tile);
      const pStart = toScreen(this.selectedTile);
      this.fx.spawnStarBurst(pTarget.x, pTarget.y, 20, '#fbbf24');
      this.fx.showFloatingScore(
        (pStart.x + pTarget.x) / 2,
        (pStart.y + pTarget.y) / 2,
        this.combo > 1 ? `🔥 ${this.combo} Combo! +${pairBase + comboAdd}pt` : `+${pairBase}pt`,
        '#38bdf8'
      );

      this.guidance.registerSuccess({ questionId: 'KUKU_LINK' });

      this.triggerLaserEffect(path);
      this.selectedTile = null;

      if (this.matchedPairsCount >= this.totalPairs) {
        setTimeout(() => this.finishGame(true), 600);
      }
    } else {
      // Child-friendly error scaffolding
      this.guidance.registerError({
        subject: '算数',
        questionId: 'KUKU_LINK',
        questionData: {
          formula: `${this.selectedTile.text} と ${tile.text}`
        },
        targetElement: this.canvas
      });
      this.fx.triggerScreenShake(this.canvas, 'bounce', 250);

      this.combo = 0;
      this.selectedTile = tile;
    }
  }

  useHint() {
    if (this.hintsRemaining <= 0) return false;
    const pair = this.findConnectablePair();
    if (pair) {
      this.hintsRemaining--;
      this.hintPair = pair;
      this.audio.playClue();
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
    this.audio.playSlash();
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
        const path = this.checkPath(activeTiles[i], activeTiles[j]);
        if (path) return [activeTiles[i], activeTiles[j]];
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
    const maxAvailableW = w - 40;
    const maxAvailableH = h - 70;

    let cardW = Math.min(isSmallMobile ? 64 : 88, Math.floor((maxAvailableW - (this.cols - 1) * gap) / this.cols));
    let cardH = Math.min(isSmallMobile ? 54 : 68, Math.floor((maxAvailableH - (this.rows - 1) * gap) / this.rows));
    // Lower-elementary min tap target (Reviewer 2): never shrink below 56px on small viewports
    cardW = Math.max(cardW, 56);
    cardH = Math.max(cardH, 56);

    const totalGridW = this.cols * cardW + (this.cols - 1) * gap;
    const totalGridH = this.rows * cardH + (this.rows - 1) * gap;

    const startX = (w - totalGridW) / 2;
    const startY = (h - totalGridH) / 2 + 10;

    return { startX, startY, cardW, cardH, gap, isSmallMobile };
  }

  renderLoop(time = 0) {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const layout = this.getCardLayout();
    const { startX, startY, cardW, cardH, gap, isSmallMobile } = layout;

    // ヘッダー情報描画
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`ペア達成: ${this.matchedPairsCount}/${this.totalPairs}`, 20, 25);

    if (this.combo > 1) {
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText(`🔥 ${this.combo} 連続コンボ!`, 150, 25);
    }

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText(`💡 ヒント (${this.hintsRemaining})   🌀 シャッフル (${this.shufflesRemaining})`, this.canvas.width - 20, 25);

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
          this.ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
          this.ctx.strokeStyle = '#eab308';
          this.ctx.lineWidth = 3 + pulse * 0.3;
          this.ctx.shadowColor = '#eab308';
          this.ctx.shadowBlur = 12;
        } else if (isHint) {
          this.ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 2.5;
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = 10;
        } else {
          this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          this.ctx.lineWidth = 1.5;
        }

        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.fillStyle = isSelected ? '#fef08a' : '#f8fafc';
        const fontSize = isSmallMobile ? (tile.text.length > 3 ? 13 : 16) : (tile.text.length > 3 ? 16 : 20);
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

    requestAnimationFrame(() => this.renderLoop());
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
      subject: '算数（九九）',
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
