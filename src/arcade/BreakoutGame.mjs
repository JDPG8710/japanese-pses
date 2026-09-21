/** Hard breakout: small paddle, fast ball, multi-hit bricks, few lives. */
export const BREAKOUT_DIFFICULTY = Object.freeze({
  lives: 2,
  paddleWidth: 54,
  paddleHeight: 12,
  ballRadius: 5.5,
  ballSpeed: 320,
  ballSpeedMax: 460,
  rows: 7,
  cols: 8,
  brickHitsMin: 2,
  brickHitsMax: 3,
  wallPadding: 16
});

export function createBreakoutGame({canvas, onHud, onEnd, autoStart = true} = {}) {
  const W = canvas?.width || 360;
  const H = canvas?.height || 640;
  const ctx = canvas?.getContext?.('2d');
  const D = BREAKOUT_DIFFICULTY;

  let paddleX = W / 2;
  let ballX = W / 2;
  let ballY = H - 140;
  let vx = D.ballSpeed * 0.55;
  let vy = -D.ballSpeed;
  let lives = D.lives;
  let score = 0;
  let bricks = [];
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let launched = false;
  let pointerId = null;

  function buildBricks() {
    bricks = [];
    const top = 70;
    const gap = 3;
    const bw = (W - D.wallPadding * 2 - gap * (D.cols - 1)) / D.cols;
    const bh = 16;
    for (let r = 0; r < D.rows; r++) {
      for (let c = 0; c < D.cols; c++) {
        // cursed pattern: denser multi-hit center + protected corners
        let hits = D.brickHitsMin;
        if ((r + c) % 3 === 0) hits = D.brickHitsMax;
        if (r < 2) hits = D.brickHitsMax;
        if (c === 0 || c === D.cols - 1) hits = Math.max(hits, D.brickHitsMax);
        bricks.push({
          x: D.wallPadding + c * (bw + gap),
          y: top + r * (bh + gap),
          w: bw,
          h: bh,
          hits,
          max: hits
        });
      }
    }
  }

  function remaining() { return bricks.filter(b => b.hits > 0).length; }

  function hud() {
    onHud?.({score, lives, extra: `🧱 ${remaining()}`});
  }

  function resetBall() {
    ballX = paddleX;
    ballY = H - 140;
    const angle = (-Math.PI / 2) + (Math.random() * 0.7 - 0.35);
    const spd = Math.min(D.ballSpeedMax, D.ballSpeed + score * 0.04);
    vx = Math.cos(angle) * spd;
    vy = Math.sin(angle) * spd;
    launched = false;
  }

  function tick(dt) {
    if (!running || ended) return;
    if (!launched) {
      ballX = paddleX;
      ballY = H - 140;
      hud();
      return;
    }

    ballX += vx * dt;
    ballY += vy * dt;

    if (ballX < D.ballRadius) { ballX = D.ballRadius; vx = Math.abs(vx); }
    if (ballX > W - D.ballRadius) { ballX = W - D.ballRadius; vx = -Math.abs(vx); }
    if (ballY < D.ballRadius + 8) { ballY = D.ballRadius + 8; vy = Math.abs(vy); }

    const py = H - 48;
    if (vy > 0 && ballY + D.ballRadius >= py && ballY - D.ballRadius <= py + D.paddleHeight &&
        ballX >= paddleX - D.paddleWidth / 2 && ballX <= paddleX + D.paddleWidth / 2) {
      const offset = (ballX - paddleX) / (D.paddleWidth / 2);
      const angle = -Math.PI / 2 + offset * 1.05;
      const spd = Math.min(D.ballSpeedMax, Math.hypot(vx, vy) * 1.03);
      vx = Math.cos(angle) * spd;
      vy = Math.sin(angle) * spd;
      ballY = py - D.ballRadius - 0.5;
    }

    for (const b of bricks) {
      if (b.hits <= 0) continue;
      if (ballX + D.ballRadius < b.x || ballX - D.ballRadius > b.x + b.w ||
          ballY + D.ballRadius < b.y || ballY - D.ballRadius > b.y + b.h) continue;
      const overlapL = ballX + D.ballRadius - b.x;
      const overlapR = b.x + b.w - (ballX - D.ballRadius);
      const overlapT = ballY + D.ballRadius - b.y;
      const overlapB = b.y + b.h - (ballY - D.ballRadius);
      const minX = Math.min(overlapL, overlapR);
      const minY = Math.min(overlapT, overlapB);
      if (minX < minY) vx *= -1; else vy *= -1;
      b.hits -= 1;
      score += b.hits === 0 ? 120 : 40;
      break;
    }

    if (ballY > H + 20) {
      lives -= 1;
      hud();
      if (lives <= 0) return finish(false);
      resetBall();
    }

    if (remaining() === 0) return finish(true);
    hud();
  }

  function finish(cleared) {
    ended = true;
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: cleared ? 'wall down' : `${remaining()} left`});
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#081426';
    ctx.fillRect(0, 0, W, H);
    for (const b of bricks) {
      if (b.hits <= 0) continue;
      const t = b.hits / b.max;
      ctx.fillStyle = t > 0.66 ? '#ff6b8a' : t > 0.33 ? '#ffd45e' : '#57dfff';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.fillStyle = '#6ff0ad';
    ctx.fillRect(paddleX - D.paddleWidth / 2, H - 48, D.paddleWidth, D.paddleHeight);
    ctx.beginPath();
    ctx.fillStyle = '#fff6c2';
    ctx.arc(ballX, ballY, D.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    if (!launched) {
      ctx.fillStyle = '#9ad7ff';
      ctx.font = '700 14px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAP / SPACE', W / 2, H - 80);
      ctx.textAlign = 'left';
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    paddleX = Math.max(D.paddleWidth / 2 + 4, Math.min(W - D.paddleWidth / 2 - 4, x));
  }

  function onPointerDown(e) {
    pointerId = e.pointerId;
    canvas.setPointerCapture?.(pointerId);
    movePaddle(e.clientX);
    launched = true;
  }
  function onPointerMove(e) {
    if (pointerId != null && e.pointerId !== pointerId && e.buttons === 0) return;
    movePaddle(e.clientX);
  }
  function onPointerUp(e) {
    if (e.pointerId === pointerId) pointerId = null;
  }
  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') paddleX = Math.max(D.paddleWidth / 2 + 4, paddleX - 28);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') paddleX = Math.min(W - D.paddleWidth / 2 - 4, paddleX + 28);
    if (e.key === ' ' || e.key === 'Enter') launched = true;
  }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onPointerDown);
    canvas?.addEventListener?.('pointermove', onPointerMove);
    canvas?.addEventListener?.('pointerup', onPointerUp);
    typeof window !== 'undefined' && window.addEventListener('keydown', onKey);
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onPointerDown);
    canvas?.removeEventListener?.('pointermove', onPointerMove);
    canvas?.removeEventListener?.('pointerup', onPointerUp);
    typeof window !== 'undefined' && window.removeEventListener('keydown', onKey);
  }

  function start() {
    lives = D.lives; score = 0; ended = false; paddleX = W / 2;
    buildBricks(); resetBall(); running = true; last = performance.now?.() || 0; hud();
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
  return {start, pause, resume, destroy, tick, draw, getState: () => ({lives, score, remaining: remaining(), ended, bricks: bricks.length})};
}
