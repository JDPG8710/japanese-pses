/** 3D perspective breakout — paddle, ball, brick wall. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, sphereMesh, THREE
} from './Arcade3D.mjs?v=1';

export const BREAKOUT_DIFFICULTY = Object.freeze({
  lives: 3,
  paddleWidth: 2.8,
  ballRadius: 0.28,
  ballSpeed: 9.5,
  ballSpeedMax: 14,
  rows: 5,
  cols: 8,
  brickHitsMin: 1,
  brickHitsMax: 2,
  playWidth: 10,
  playDepth: 14
});

export function createBreakoutGame({canvas, onHud, onEnd, autoStart = true} = {}) {
  const D = BREAKOUT_DIFFICULTY;
  const graphics = createArcadeRenderer(canvas, {clear: 0x102038});
  let paddleX = 0;
  let ball = {x: 0, y: 0.4, z: 4, vx: 3, vz: -D.ballSpeed};
  let lives = D.lives;
  let score = 0;
  let bricks = [];
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let launched = false;
  let pointerId = null;
  let paddleMesh = null;
  let ballMesh = null;
  let brickGroup = null;

  function remaining() { return bricks.filter(b => b.hits > 0).length; }
  function hud() { onHud?.({score, lives, extra: `🧱 ${remaining()}`}); }

  function buildBricks() {
    bricks = [];
    if (brickGroup) while (brickGroup.children.length) brickGroup.remove(brickGroup.children[0]);
    const gap = 0.12;
    const bw = (D.playWidth - gap * (D.cols - 1)) / D.cols;
    const bd = 0.7;
    const startZ = -4;
    for (let r = 0; r < D.rows; r++) {
      for (let c = 0; c < D.cols; c++) {
        let hits = D.brickHitsMin;
        if ((r + c) % 4 === 0) hits = D.brickHitsMax;
        if (r < 1) hits = D.brickHitsMax;
        const color = [0xff6b8a, 0xffd45e, 0x7dffb3, 0x57dfff, 0xc791ff][r % 5];
        const mesh = graphics.ok ? boxMesh(bw * 0.92, 0.45, bd * 0.9, color) : null;
        const x = -D.playWidth / 2 + bw / 2 + c * (bw + gap);
        const z = startZ - r * (bd + gap);
        if (mesh) {
          mesh.position.set(x, 0.4, z);
          brickGroup.add(mesh);
        }
        bricks.push({x, z, w: bw, d: bd, hits, max: hits, mesh});
      }
    }
  }

  function buildScene() {
    if (!graphics.ok) return;
    const {scene, camera} = graphics;
    while (scene.children.length) scene.remove(scene.children[0]);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 12, 8);
    scene.add(sun);
    const floor = boxMesh(D.playWidth + 2, 0.1, D.playDepth + 4, 0x1a2a44);
    floor.position.set(0, -0.05, 2);
    scene.add(floor);
    for (const x of [-D.playWidth / 2 - 0.3, D.playWidth / 2 + 0.3]) {
      const wall = boxMesh(0.35, 1.2, D.playDepth + 2, 0x2a4060);
      wall.position.set(x, 0.5, 1);
      scene.add(wall);
    }
    const back = boxMesh(D.playWidth + 1, 1.2, 0.35, 0x2a4060);
    back.position.set(0, 0.5, -6.2);
    scene.add(back);
    brickGroup = new THREE.Group();
    scene.add(brickGroup);
    paddleMesh = boxMesh(D.paddleWidth, 0.35, 0.7, 0x6ff0ad);
    paddleMesh.position.set(0, 0.3, 6.2);
    scene.add(paddleMesh);
    ballMesh = sphereMesh(D.ballRadius, 0xfff1a8, {segments: 14});
    ballMesh.position.set(0, 0.4, 5.2);
    scene.add(ballMesh);
    camera.position.set(0, 11, 12);
    camera.lookAt(0, 0, 0);
    resizeArcade3D(graphics, canvas);
  }

  function resetBall() {
    ball.x = paddleX;
    ball.y = 0.4;
    ball.z = 5.2;
    const angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
    const spd = Math.min(D.ballSpeedMax, D.ballSpeed + score * 0.01);
    ball.vx = Math.cos(angle) * spd;
    ball.vz = Math.sin(angle) * spd;
    launched = false;
  }

  function tick(dt) {
    if (!running || ended) return;
    if (!launched) {
      ball.x = paddleX;
      ball.z = 5.2;
      if (paddleMesh) paddleMesh.position.x = paddleX;
      if (ballMesh) ballMesh.position.set(ball.x, ball.y, ball.z);
      hud();
      return;
    }
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;
    const half = D.playWidth / 2 - D.ballRadius;
    if (ball.x < -half) { ball.x = -half; ball.vx *= -1; }
    if (ball.x > half) { ball.x = half; ball.vx *= -1; }
    if (ball.z < -6) { ball.z = -6; ball.vz *= -1; }

    // paddle
    if (ball.z > 5.7 && ball.z < 6.6 && Math.abs(ball.x - paddleX) < D.paddleWidth / 2 + D.ballRadius) {
      ball.z = 5.7;
      const offset = (ball.x - paddleX) / (D.paddleWidth / 2);
      const spd = Math.min(D.ballSpeedMax, Math.hypot(ball.vx, ball.vz) * 1.03);
      ball.vx = offset * spd * 0.85;
      ball.vz = -Math.abs(Math.sqrt(Math.max(0.1, spd * spd - ball.vx * ball.vx)));
    }

    for (const b of bricks) {
      if (b.hits <= 0) continue;
      if (Math.abs(ball.x - b.x) < b.w / 2 + D.ballRadius && Math.abs(ball.z - b.z) < b.d / 2 + D.ballRadius) {
        b.hits -= 1;
        score += 10 * (b.max);
        if (Math.abs(ball.x - b.x) / b.w > Math.abs(ball.z - b.z) / b.d) ball.vx *= -1;
        else ball.vz *= -1;
        if (b.hits <= 0 && b.mesh) {
          b.mesh.visible = false;
        } else if (b.mesh) {
          b.mesh.scale.y = 0.55 + 0.45 * (b.hits / b.max);
        }
        break;
      }
    }

    if (ball.z > 7.5) {
      lives -= 1;
      hud();
      if (lives <= 0) return finish(false);
      resetBall();
    }
    if (remaining() === 0) return finish(true);

    if (paddleMesh) paddleMesh.position.x = paddleX;
    if (ballMesh) ballMesh.position.set(ball.x, ball.y, ball.z);
    hud();
  }

  function finish(cleared) {
    ended = true; running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: cleared ? 'wall clear' : ''});
  }

  function draw() {
    if (!graphics.ok) return;
    graphics.renderer.render(graphics.scene, graphics.camera);
  }
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts; tick(dt); draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    paddleX = (t - 0.5) * D.playWidth;
    paddleX = Math.max(-D.playWidth / 2 + D.paddleWidth / 2, Math.min(D.playWidth / 2 - D.paddleWidth / 2, paddleX));
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
  function onPointerUp(e) { if (e.pointerId === pointerId) pointerId = null; }
  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') paddleX = Math.max(-D.playWidth / 2 + D.paddleWidth / 2, paddleX - 0.7);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') paddleX = Math.min(D.playWidth / 2 - D.paddleWidth / 2, paddleX + 0.7);
    if (e.key === ' ' || e.key === 'Enter') launched = true;
  }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onPointerDown);
    canvas?.addEventListener?.('pointermove', onPointerMove);
    canvas?.addEventListener?.('pointerup', onPointerUp);
    typeof window !== 'undefined' && window.addEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.addEventListener('resize', onResize);
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onPointerDown);
    canvas?.removeEventListener?.('pointermove', onPointerMove);
    canvas?.removeEventListener?.('pointerup', onPointerUp);
    typeof window !== 'undefined' && window.removeEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.removeEventListener('resize', onResize);
  }

  function start() {
    lives = D.lives; score = 0; ended = false; paddleX = 0;
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
  function destroy() {
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unbind();
    disposeArcade3D(graphics);
  }

  buildScene();
  bind();
  if (autoStart) start();
  return {start, pause, resume, destroy, tick, draw, getState: () => ({lives, score, remaining: remaining(), ended, bricks: bricks.length, gl: graphics.ok})};
}
