/**
 * FXSystem.js - 2D Canvas & CSS Particle Explosion, Screen Shake & Visual Feedback Engine
 * 
 * Provides zero-external-dependency visual particle bursts (stars, gold coins, celebratory confetti,
 * laser sparks), dynamic floating score popups, and multi-tier screen shake & cartoon wobble animations.
 */

export class Particle2D {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;

    const angle = options.angle ?? Math.random() * Math.PI * 2;
    const speed = options.speed ?? (2 + Math.random() * 6);
    this.vx = options.vx ?? Math.cos(angle) * speed;
    this.vy = options.vy ?? Math.sin(angle) * speed;

    this.gravity = options.gravity ?? 0.18;
    this.drag = options.drag ?? 0.98;
    this.size = options.size ?? (4 + Math.random() * 6);
    this.color = options.color ?? '#f59e0b';
    this.alpha = 1.0;
    this.decay = options.decay ?? (0.015 + Math.random() * 0.02);
    this.shape = options.shape ?? 'star'; // 'star' | 'coin' | 'confetti' | 'spark' | 'circle'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = options.rotSpeed ?? (Math.random() - 0.5) * 0.25;

    // Confetti flutter oscillation
    this.flutter = Math.random() * Math.PI * 2;
    this.flutterSpeed = 0.1 + Math.random() * 0.15;
    this.widthScale = 1.0;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;

    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    this.rotation += this.rotSpeed;
    this.flutter += this.flutterSpeed;
    this.widthScale = Math.cos(this.flutter);

    this.alpha -= this.decay;
    return this.alpha > 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (this.shape) {
      case 'star':
        this.drawStar(ctx, 0, 0, 5, this.size, this.size * 0.48, this.color);
        break;

      case 'coin':
        this.drawCoin(ctx, this.size, this.color);
        break;

      case 'confetti':
        this.drawConfetti(ctx, this.size, this.color, this.widthScale);
        break;

      case 'spark':
        this.drawSpark(ctx, this.size, this.color);
        break;

      case 'circle':
      default:
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fill();
  }

  drawCoin(ctx, size, color) {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.fill();

    // Inner rim
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Star icon inside coin
    this.drawStar(ctx, 0, 0, 5, size * 0.45, size * 0.22, '#fef08a');
  }

  drawConfetti(ctx, size, color, widthScale) {
    const w = size * 1.6 * widthScale;
    const h = size * 0.8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
  }

  drawSpark(ctx, size, color) {
    const len = size * 2.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, size * 0.35);
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.lineTo(0, len / 2);
    ctx.stroke();
  }
}

export class FloatingText2D {
  constructor(x, y, text, options = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = options.color ?? '#fbbf24';
    this.fontSize = options.fontSize ?? 20;
    this.fontFamily = options.fontFamily ?? 'sans-serif';
    this.alpha = 1.0;
    this.decay = options.decay ?? 0.02;
    this.vy = options.vy ?? -1.8;
    this.scale = options.scale ?? 1.0;
    this.scaleSpeed = options.scaleSpeed ?? 0.01;
  }

  update() {
    this.y += this.vy;
    this.scale += this.scaleSpeed;
    this.alpha -= this.decay;
    return this.alpha > 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text outline / glow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

export class FXSystem {
  constructor(options = {}) {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTime = 0;
    this.shakeMaxTime = 0;
    this.shakeIntensity = 0;
    this.overlayCanvas = null;
    this.overlayCtx = null;
    this.animId = null;

    if (typeof document !== 'undefined') {
      this.initOverlayCanvas();
    }
  }

  /**
   * Initializes full-screen global overlay canvas for screen-wide celebration bursts.
   */
  initOverlayCanvas() {
    if (this.overlayCanvas) return;
    let canvas = document.getElementById('global-fx-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'global-fx-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '999';
      document.body.appendChild(canvas);
    }
    this.overlayCanvas = canvas;
    this.overlayCtx = canvas.getContext('2d');
    this.resizeOverlay();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resizeOverlay());
    }
    this.startOverlayLoop();
  }

  resizeOverlay() {
    if (!this.overlayCanvas) return;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.overlayCanvas.width = (window.innerWidth || 800) * dpr;
    this.overlayCanvas.height = (window.innerHeight || 600) * dpr;
    if (this.overlayCtx) {
      this.overlayCtx.scale(dpr, dpr);
    }
  }

  startOverlayLoop() {
    if (this.animId) return;
    const loop = () => {
      if (this.overlayCtx && this.overlayCanvas) {
        const w = window.innerWidth || 800;
        const h = window.innerHeight || 600;
        this.overlayCtx.clearRect(0, 0, w, h);
        this.updateAndDraw(this.overlayCtx, w, h);
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stopOverlayLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  /**
   * Generic burst creator
   */
  createBurst(x, y, type = 'star', count = 25, options = {}) {
    switch (type) {
      case 'coin':
        return this.spawnCoinBurst(x, y, count, options);
      case 'confetti':
        return this.spawnConfetti(window.innerWidth || 800, window.innerHeight || 600, count, options);
      case 'spark':
        return this.spawnSparkBurst(x, y, count, options);
      case 'star':
      default:
        return this.spawnStarBurst(x, y, count, options.color || '#f59e0b', options);
    }
  }

  /**
   * Spawns radiant star particle burst at coordinate (x, y)
   */
  spawnStarBurst(x, y, count = 30, color = '#f59e0b', options = {}) {
    const colors = ['#f59e0b', '#fbbf24', '#fef08a', '#60a5fa', '#a78bfa', '#34d399'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 6;
      this.particles.push(new Particle2D(x, y, {
        angle,
        speed,
        color: options.multicolor ? colors[i % colors.length] : (options.color || color),
        shape: 'star',
        size: 5 + Math.random() * 6,
        gravity: 0.12,
        decay: 0.018 + Math.random() * 0.015,
        ...options
      }));
    }
  }

  /**
   * Spawns golden coins bursting upward and raining down
   */
  spawnCoinBurst(x, y, count = 15, options = {}) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7; // Upward fountain arc
      const speed = 4 + Math.random() * 7;
      this.particles.push(new Particle2D(x, y, {
        angle,
        speed,
        shape: 'coin',
        size: 8 + Math.random() * 4,
        gravity: 0.25,
        decay: 0.012 + Math.random() * 0.01,
        ...options
      }));
    }
  }

  /**
   * Spawns multi-colored celebratory confetti across the screen
   */
  spawnConfetti(canvasWidth, canvasHeight, count = 60, options = {}) {
    const confettiColors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
      '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4', '#eab308'
    ];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvasWidth;
      const y = (Math.random() * -canvasHeight * 0.3) - 20; // Spawn above top edge
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const speed = 1.5 + Math.random() * 3.5;
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6; // Falling down with sway

      this.particles.push(new Particle2D(x, y, {
        angle,
        speed,
        color,
        shape: 'confetti',
        size: 6 + Math.random() * 6,
        gravity: 0.08,
        drag: 0.99,
        decay: 0.005 + Math.random() * 0.005,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        ...options
      }));
    }
  }

  /**
   * Spawns high-velocity sparks at (x, y)
   */
  spawnSparkBurst(x, y, count = 20, options = {}) {
    const sparkColor = options.color || '#38bdf8';
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle2D(x, y, {
        shape: 'spark',
        color: sparkColor,
        size: 4 + Math.random() * 4,
        speed: 3 + Math.random() * 7,
        gravity: 0.05,
        decay: 0.03 + Math.random() * 0.02,
        ...options
      }));
    }
  }

  /**
   * Spawns laser sparks along a connection segment from (startX, startY) to (endX, endY)
   */
  spawnLaserSparks(startX, startY, endX, endY, count = 20, color = '#38bdf8') {
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      this.particles.push(new Particle2D(x, y, {
        shape: 'spark',
        color,
        size: 3 + Math.random() * 4,
        speed: 2 + Math.random() * 4,
        gravity: 0.02,
        decay: 0.03 + Math.random() * 0.02
      }));
    }
  }

  /**
   * Displays animated floating score text popup
   */
  showFloatingScore(x, y, text, color = '#fbbf24', fontSize = 22) {
    this.floatingTexts.push(new FloatingText2D(x, y, text, { color, fontSize }));
  }

  showFloatingText(x, y, text, options = {}) {
    this.floatingTexts.push(new FloatingText2D(x, y, text, options));
  }

  /**
   * Screen Shake implementation (Canvas transform decay + DOM CSS shake)
   */
  triggerScreenShake(containerOrCanvas, intensity = 'medium', durationMs = 300) {
    const intensityMap = {
      light: { px: 3, css: 'animate-screen-shake-light', frames: 12 },
      medium: { px: 6, css: 'animate-screen-shake-medium', frames: 18 },
      heavy: { px: 12, css: 'animate-screen-shake-heavy', frames: 25 },
      bounce: { px: 5, css: 'animate-cartoon-wobble', frames: 20 },
      wobble: { px: 5, css: 'animate-cartoon-wobble', frames: 20 }
    };

    const config = intensityMap[intensity] || intensityMap.medium;

    // 1. Canvas level internal shake state
    this.shakeIntensity = config.px;
    this.shakeTime = config.frames;
    this.shakeMaxTime = config.frames;

    // 2. DOM level CSS animation
    if (typeof document !== 'undefined') {
      let targetEl = null;
      if (typeof containerOrCanvas === 'string') {
        targetEl = document.querySelector(containerOrCanvas);
      } else if (containerOrCanvas instanceof HTMLElement) {
        targetEl = containerOrCanvas;
      }

      if (!targetEl) {
        targetEl = document.getElementById('game-modal') ||
                   document.getElementById('canvas-container') ||
                   document.body;
      }

      if (targetEl) {
        const cssClass = config.css;
        targetEl.classList.remove('animate-screen-shake-light', 'animate-screen-shake-medium', 'animate-screen-shake-heavy', 'animate-cartoon-wobble');
        void targetEl.offsetWidth; // Trigger reflow
        targetEl.classList.add(cssClass);
        setTimeout(() => {
          if (targetEl) targetEl.classList.remove(cssClass);
        }, durationMs);
      }
    }
  }

  /**
   * Triggers gentle cartoon wobble on a specific DOM element (for Tier 1 error feedback)
   */
  triggerCartoonWobble(elementOrSelector) {
    if (typeof document === 'undefined') return;
    let target = null;
    if (typeof elementOrSelector === 'string') {
      target = document.querySelector(elementOrSelector);
    } else if (elementOrSelector instanceof HTMLElement) {
      target = elementOrSelector;
    }
    if (!target) return;

    target.classList.remove('animate-cartoon-wobble');
    void target.offsetWidth; // Force reflow
    target.classList.add('animate-cartoon-wobble');
    setTimeout(() => {
      if (target) target.classList.remove('animate-cartoon-wobble');
    }, 450);
  }

  /**
   * Interface Contract Alias: triggerShake(intensity, durationMs)
   */
  triggerShake(intensity = 'light', durationMs = 300) {
    return this.triggerScreenShake(null, intensity, durationMs);
  }

  /**
   * Interface Contract Alias: showClueHighlight(elementOrSelector)
   */
  showClueHighlight(elementOrSelector, durationMs = 3500) {
    if (typeof window !== 'undefined' && window.errorGuidanceSystem) {
      return window.errorGuidanceSystem.showClueHighlight(elementOrSelector, durationMs);
    }
  }

  /**
   * Interface Contract Alias: showMascotGuidance(message, targetElement, mascot)
   */
  showMascotGuidance(message, targetElement, mascot = 'pico') {
    if (typeof window !== 'undefined' && window.errorGuidanceSystem) {
      return window.errorGuidanceSystem.showMascotGuidance('星の子ピコからのヒント 🛸', message);
    }
  }

  /**
   * Alias: render(ctx, width, height)
   */
  render(ctx, width, height) {
    return this.updateAndDraw(ctx, width, height);
  }

  /**
   * Updates all particles and floating text; draws them onto context
   */
  updateAndDraw(ctx, width, height) {
    // 1. Screen Shake Canvas Offset (if any)
    if (this.shakeTime > 0) {
      const progress = this.shakeTime / this.shakeMaxTime;
      const currentIntensity = this.shakeIntensity * progress;
      const offsetX = (Math.random() - 0.5) * currentIntensity * 2;
      const offsetY = (Math.random() - 0.5) * currentIntensity * 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      this.shakeTime--;
    }

    // 2. Update and Draw Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.update()) {
        p.draw(ctx);
      } else {
        this.particles.splice(i, 1);
      }
    }

    // 3. Update and Draw Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      if (ft.update()) {
        ft.draw(ctx);
      } else {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.shakeTime > 0) {
      ctx.restore();
    }
  }

  /**
   * Clears all active effects
   */
  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTime = 0;
  }
}

// Global Singleton Initialization
let globalFXSystem = null;
export function getFXSystem(options) {
  if (!globalFXSystem) {
    globalFXSystem = new FXSystem(options);
  }
  return globalFXSystem;
}

if (typeof window !== 'undefined') {
  window.FXSystem = FXSystem;
  window.fxSystem = getFXSystem();
}
