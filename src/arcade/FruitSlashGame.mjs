/** Hard fruit slash: fast throws, many bombs, short window, combo gate to clear waves. */
export const FRUIT_DIFFICULTY = Object.freeze({
  lives: 3,
  clearWaves: 8,
  minComboToCreditWave: 4,
  throwIntervalStart: 0.55,
  throwIntervalMin: 0.22,
  bombChanceStart: 0.28,
  bombChanceMax: 0.48,
  fruitSpeed: 420,
  gravity: 620,
  slashRadius: 28,
  missLifeCost: true
});

const FRUITS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍑', '🥝'];

export function createFruitSlashGame({canvas, onHud, onEnd, autoStart = true} = {}) {
  const W = canvas?.width || 360;
  const H = canvas?.height || 640;
  const ctx = canvas?.getContext?.('2d');
  const D = FRUIT_DIFFICULTY;

  let lives = D.lives;
  let score = 0;
  let wave = 1;
  let waveHits = 0;
  let waveNeed = 6;
  let combo = 0;
  let bestCombo = 0;
  let creditedWaves = 0;
  let items = [];
  let particles = [];
  let spawnTimer = 0;
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let slicing = false;
  let lastX = 0;
  let lastY = 0;
  let trail = [];

  function hud() {
    onHud?.({
      score,
      lives,
      extra: `${waveHits}/${waveNeed} · ${combo}x · W${creditedWaves}/${D.clearWaves}`
    });
  }

  function bombChance() {
    return Math.min(D.bombChanceMax, D.bombChanceStart + wave * 0.02);
  }

  function spawn() {
    const isBomb = Math.random() < bombChance();
    const x = 40 + Math.random() * (W - 80);
    const speed = D.fruitSpeed + wave * 18 + Math.random() * 80;
    const angle = -Math.PI / 2 + (Math.random() * 0.9 - 0.45);
    items.push({
      x,
      y: H + 20,
      vx: Math.cos(angle) * speed * 0.35,
      vy: Math.sin(angle) * speed,
      r: isBomb ? 22 : 20,
      bomb: isBomb,
      glyph: isBomb ? '💣' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
      alive: true,
      spun: Math.random() * Math.PI * 2
    });
  }

  function slashAt(x, y) {
    let hit = false;
    for (const item of items) {
      if (!item.alive) continue;
      const dx = item.x - x;
      const dy = item.y - y;
      if (dx * dx + dy * dy > (item.r + D.slashRadius) ** 2) continue;
      item.alive = false;
      hit = true;
      if (item.bomb) {
        combo = 0;
        lives -= 1;
        burst(item.x, item.y, '#ff5c7a');
        if (lives <= 0) return finish(false);
      } else {
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        waveHits += 1;
        score += 80 + combo * 25;
        burst(item.x, item.y, '#ffe08a');
        if (waveHits >= waveNeed) completeWave();
      }
    }
    if (!hit && slicing) {/* air slash — no combo break for miss while moving */}
    hud();
  }

  function completeWave() {
    const credited = combo >= D.minComboToCreditWave;
    if (credited) {
      creditedWaves += 1;
      score += 400 + wave * 50;
    } else {
      // Harsh: wave not credited without combo — and a soft life sting
      lives = Math.max(0, lives - 1);
      score = Math.max(0, score - 150);
      if (lives <= 0) return finish(false);
    }
    wave += 1;
    waveHits = 0;
    waveNeed = Math.min(12, 6 + Math.floor(wave / 2));
    combo = 0;
    items = items.filter(i => i.alive && i.y < H);
    hud();
    if (creditedWaves >= D.clearWaves) return finish(true);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        life: 0.35 + Math.random() * 0.25,
        color
      });
    }
  }

  function tick(dt) {
    if (!running || ended) return;
    const interval = Math.max(D.throwIntervalMin, D.throwIntervalStart - wave * 0.03);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      if (Math.random() < 0.35 + wave * 0.03) spawn();
      spawnTimer = interval * (0.7 + Math.random() * 0.5);
    }

    for (const item of items) {
      if (!item.alive) continue;
      item.vy += D.gravity * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.spun += dt * 4;
      if (item.y > H + 60 && !item.bomb) {
        item.alive = false;
        combo = 0;
        if (D.missLifeCost && Math.random() < 0.55) {
          lives -= 1;
          if (lives <= 0) return finish(false);
        }
      }
    }
    items = items.filter(i => i.alive && i.y < H + 80);

    particles = particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.life > 0;
    });
    trail = trail.filter(p => (p.life -= dt) > 0);
    hud();
  }

  function finish(cleared) {
    ended = true;
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `combo ${bestCombo}`});
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#101828';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1c2740';
    ctx.fillRect(0, H - 48, W, 48);
    for (const p of trail) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.strokeStyle = '#9ef7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x0, p.y0);
      ctx.lineTo(p.x1, p.y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const item of items) {
      if (!item.alive) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.spun);
      ctx.font = '32px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.glyph, 0, 0);
      ctx.restore();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H
    };
  }

  function onDown(e) {
    slicing = true;
    const p = toLocal(e);
    lastX = p.x; lastY = p.y;
    slashAt(p.x, p.y);
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (!slicing) return;
    const p = toLocal(e);
    trail.push({x0: lastX, y0: lastY, x1: p.x, y1: p.y, life: 0.18});
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - lastX, p.y - lastY) / 12));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      slashAt(lastX + (p.x - lastX) * t, lastY + (p.y - lastY) * t);
    }
    lastX = p.x; lastY = p.y;
  }
  function onUp() { slicing = false; }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onDown);
    canvas?.addEventListener?.('pointermove', onMove);
    canvas?.addEventListener?.('pointerup', onUp);
    canvas?.addEventListener?.('pointercancel', onUp);
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onDown);
    canvas?.removeEventListener?.('pointermove', onMove);
    canvas?.removeEventListener?.('pointerup', onUp);
    canvas?.removeEventListener?.('pointercancel', onUp);
  }

  function start() {
    lives = D.lives; score = 0; wave = 1; waveHits = 0; waveNeed = 6;
    combo = 0; bestCombo = 0; creditedWaves = 0; items = []; particles = []; trail = [];
    spawnTimer = 0.3; ended = false; running = true; last = performance.now?.() || 0; hud();
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }
  function pause() { running = false; typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf); }
  function resume() {
    if (ended) return;
    running = true; last = performance.now?.() || 0;
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }
  function destroy() { running = false; typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf); unbind(); }

  bind();
  if (autoStart) start();
  return {start, pause, resume, destroy, tick, draw, getState: () => ({lives, score, wave, combo, creditedWaves, ended})};
}
