/** 3D perspective breakout — paddle, ball, brick wall, power-ups + spark VFX. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, sphereMesh, THREE,
  spawnParticleBurst, updateParticles, capsulePowerMesh
} from './Arcade3D.mjs?v=3';

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
  playDepth: 14,
  powerDropChance: 0.38
});

export const BREAKOUT_POWERUPS = Object.freeze(['expand', 'multi', 'slow']);

const POWER_COLORS = {expand: 0x6ff0ad, multi: 0xffd45e, slow: 0x57dfff};

export function createBreakoutGame({canvas, onHud, onEnd, audio = null, autoStart = true} = {}) {
  const D = BREAKOUT_DIFFICULTY;
  const graphics = createArcadeRenderer(canvas, {clear: 0x102038});
  let paddleX = 0;
  let paddleW = D.paddleWidth;
  let paddleTargetX = 0;
  const keyHeld = {left: false, right: false};
  const PADDLE_SPEED = 11;
  let balls = [];
  let lives = D.lives;
  let score = 0;
  let bricks = [];
  let powerups = [];
  let particles = [];
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let launched = false;
  let pointerId = null;
  let paddleMesh = null;
  let brickGroup = null;
  let ballGroup = null;
  let powerGroup = null;
  let fxGroup = null;
  let stickyUntil = 0;
  let slowMul = 1;
  let expandUntil = 0;
  let accum = 0;
  const FIXED = 1 / 60;

  function remaining() { return bricks.filter(b => b.hits > 0).length; }
  function hud() {
    const bits = [];
    if (expandUntil > 0) bits.push('⬌');
    if (balls.length > 1) bits.push(`●×${balls.length}`);
    if (slowMul < 1) bits.push('❄');
    onHud?.({score, lives, extra: `🧱 ${remaining()}${bits.length ? ' · ' + bits.join(' ') : ''}`});
  }

  function makeBallState(x, z, vx, vz) {
    const mesh = graphics.ok ? sphereMesh(D.ballRadius, 0xfff1a8, {segments: 14}) : null;
    if (mesh && ballGroup) {
      mesh.position.set(x, 0.4, z);
      ballGroup.add(mesh);
    }
    return {x, y: 0.4, z, vx, vz, mesh};
  }

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
        bricks.push({x, z, w: bw, d: bd, hits, max: hits, mesh, color});
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
    ballGroup = new THREE.Group();
    scene.add(ballGroup);
    powerGroup = new THREE.Group();
    scene.add(powerGroup);
    fxGroup = new THREE.Group();
    scene.add(fxGroup);
    paddleMesh = boxMesh(D.paddleWidth, 0.35, 0.7, 0x6ff0ad);
    paddleMesh.position.set(0, 0.3, 6.2);
    scene.add(paddleMesh);
    camera.position.set(0, 11, 12);
    camera.lookAt(0, 0, 0);
    resizeArcade3D(graphics, canvas);
  }

  function resetBall() {
    for (const b of balls) {
      if (b.mesh) ballGroup?.remove(b.mesh);
    }
    balls = [makeBallState(paddleX, 5.2, 3, -D.ballSpeed)];
    launched = false;
  }

  function dropPower(x, z) {
    if (Math.random() > D.powerDropChance) return;
    const type = BREAKOUT_POWERUPS[Math.floor(Math.random() * BREAKOUT_POWERUPS.length)];
    const mesh = graphics.ok ? capsulePowerMesh(POWER_COLORS[type]) : null;
    if (mesh && powerGroup) {
      mesh.position.set(x, 0.55, z);
      powerGroup.add(mesh);
    }
    powerups.push({type, x, y: 0.55, z, mesh});
  }

  function applyPower(type) {
    try { audio?.powerup?.(); } catch {}
    if (type === 'expand') {
      expandUntil = 8;
      paddleW = D.paddleWidth * 1.55;
      if (paddleMesh) paddleMesh.scale.x = 1.55;
    } else if (type === 'multi') {
      const base = balls[0] || {x: paddleX, z: 5, vx: 2, vz: -D.ballSpeed};
      balls.push(makeBallState(base.x, base.z, -Math.abs(base.vx || 3) - 1, base.vz || -D.ballSpeed));
      balls.push(makeBallState(base.x, base.z, Math.abs(base.vx || 3) + 1, base.vz || -D.ballSpeed));
    } else if (type === 'slow') {
      slowMul = 0.62;
      stickyUntil = 6;
      for (const b of balls) {
        const spd = Math.hypot(b.vx, b.vz);
        if (spd > 0.1) {
          b.vx = (b.vx / spd) * Math.min(spd, D.ballSpeed * 0.75);
          b.vz = (b.vz / spd) * Math.min(spd, D.ballSpeed * 0.75);
        }
      }
    }
  }

  function breakBrick(b) {
    if (b.mesh) b.mesh.visible = false;
    try { audio?.brick?.(); } catch {}
    if (graphics.ok && fxGroup) {
      const origin = new THREE.Vector3(b.x, 0.5, b.z);
      particles = particles.concat(spawnParticleBurst(fxGroup, origin, {
        count: 12, color: b.color || 0xffd45e, speed: 5.5, life: 0.4, size: 0.1
      }));
    }
    dropPower(b.x, b.z);
  }

  function stepBall(ball, dt) {
    ball.x += ball.vx * dt * slowMul;
    ball.z += ball.vz * dt * slowMul;
    const half = D.playWidth / 2 - D.ballRadius;
    if (ball.x < -half) { ball.x = -half; ball.vx *= -1; }
    if (ball.x > half) { ball.x = half; ball.vx *= -1; }
    if (ball.z < -6) { ball.z = -6; ball.vz *= -1; }

    if (ball.z > 5.7 && ball.z < 6.6 && Math.abs(ball.x - paddleX) < paddleW / 2 + D.ballRadius) {
      ball.z = 5.7;
      const offset = (ball.x - paddleX) / (paddleW / 2);
      const spd = Math.min(D.ballSpeedMax, Math.hypot(ball.vx, ball.vz) * 1.03);
      ball.vx = offset * spd * 0.85;
      ball.vz = -Math.abs(Math.sqrt(Math.max(0.1, spd * spd - ball.vx * ball.vx)));
      if (stickyUntil > 0 && Math.random() < 0.35) {
        launched = false;
        ball.x = paddleX;
        ball.z = 5.2;
      }
    }

    for (const b of bricks) {
      if (b.hits <= 0) continue;
      if (Math.abs(ball.x - b.x) < b.w / 2 + D.ballRadius && Math.abs(ball.z - b.z) < b.d / 2 + D.ballRadius) {
        b.hits -= 1;
        score += 10 * (b.max);
        if (Math.abs(ball.x - b.x) / b.w > Math.abs(ball.z - b.z) / b.d) ball.vx *= -1;
        else ball.vz *= -1;
        if (b.hits <= 0) breakBrick(b);
        else if (b.mesh) b.mesh.scale.y = 0.55 + 0.45 * (b.hits / b.max);
        break;
      }
    }
  }

  function tick(dt) {
    if (!running || ended) return;
    // Keyboard: hold to move continuously (pointer still sets paddleTargetX directly).
    if (keyHeld.left || keyHeld.right) {
      const dir = (keyHeld.right ? 1 : 0) - (keyHeld.left ? 1 : 0);
      paddleTargetX += dir * PADDLE_SPEED * dt;
      const half = D.playWidth / 2 - paddleW / 2;
      paddleTargetX = Math.max(-half, Math.min(half, paddleTargetX));
    }
    paddleX += (paddleTargetX - paddleX) * Math.min(1, dt * 18);
    if (expandUntil > 0) {
      expandUntil -= dt;
      if (expandUntil <= 0) {
        paddleW = D.paddleWidth;
        if (paddleMesh) paddleMesh.scale.x = 1;
      }
    }
    if (stickyUntil > 0) stickyUntil -= dt;
    if (slowMul < 1) {
      slowMul = Math.min(1, slowMul + dt * 0.05);
    }

    if (!launched) {
      for (const ball of balls) {
        ball.x = paddleX;
        ball.z = 5.2;
        if (ball.mesh) ball.mesh.position.set(ball.x, ball.y, ball.z);
      }
      if (paddleMesh) paddleMesh.position.x = paddleX;
      hud();
      particles = updateParticles(particles, dt, fxGroup);
      return;
    }

    for (const ball of balls) stepBall(ball, dt);

    balls = balls.filter(ball => {
      if (ball.z > 7.5) {
        if (ball.mesh) ballGroup?.remove(ball.mesh);
        return false;
      }
      if (ball.mesh) ball.mesh.position.set(ball.x, ball.y, ball.z);
      return true;
    });

    if (!balls.length) {
      lives -= 1;
      try { audio?.raceHit?.(); } catch {}
      hud();
      if (lives <= 0) return finish(false);
      resetBall();
    }

    powerups = powerups.filter(p => {
      p.z += 3.2 * dt;
      p.y = 0.55 + Math.sin((p.z + p.x) * 3) * 0.08;
      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y += dt * 3;
      }
      if (p.z > 5.6 && p.z < 6.8 && Math.abs(p.x - paddleX) < paddleW / 2 + 0.4) {
        applyPower(p.type);
        score += 25;
        if (p.mesh) powerGroup?.remove(p.mesh);
        if (graphics.ok && fxGroup) {
          particles = particles.concat(spawnParticleBurst(fxGroup, new THREE.Vector3(p.x, 0.6, p.z), {
            count: 8, color: POWER_COLORS[p.type], speed: 3.5, life: 0.35, size: 0.12
          }));
        }
        return false;
      }
      if (p.z > 8) {
        if (p.mesh) powerGroup?.remove(p.mesh);
        return false;
      }
      return true;
    });

    particles = updateParticles(particles, dt, fxGroup);
    if (remaining() === 0) return finish(true);
    if (paddleMesh) paddleMesh.position.x = paddleX;
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
    const frame = Math.min(0.05, (ts - last) / 1000 || FIXED);
    last = ts;
    accum += frame;
    let steps = 0;
    while (accum >= FIXED && steps < 5) {
      tick(FIXED);
      accum -= FIXED;
      steps += 1;
    }
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    paddleTargetX = (t - 0.5) * D.playWidth;
    paddleTargetX = Math.max(-D.playWidth / 2 + paddleW / 2, Math.min(D.playWidth / 2 - paddleW / 2, paddleTargetX));
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
  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keyHeld.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keyHeld.right = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter') { launched = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyHeld.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyHeld.right = false;
  }
  function onBlur() { keyHeld.left = false; keyHeld.right = false; }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onPointerDown);
    canvas?.addEventListener?.('pointermove', onPointerMove);
    canvas?.addEventListener?.('pointerup', onPointerUp);
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      window.addEventListener('resize', onResize);
    }
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onPointerDown);
    canvas?.removeEventListener?.('pointermove', onPointerMove);
    canvas?.removeEventListener?.('pointerup', onPointerUp);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
    }
  }

  function start() {
    keyHeld.left = false; keyHeld.right = false;
    lives = D.lives; score = 0; ended = false; paddleX = 0; paddleTargetX = 0;
    paddleW = D.paddleWidth; expandUntil = 0; stickyUntil = 0; slowMul = 1; accum = 0;
    powerups = []; particles = [];
    if (powerGroup) while (powerGroup.children.length) powerGroup.remove(powerGroup.children[0]);
    if (fxGroup) while (fxGroup.children.length) fxGroup.remove(fxGroup.children[0]);
    if (paddleMesh) paddleMesh.scale.x = 1;
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
  return {
    start, pause, resume, destroy, tick, draw,
    getState: () => ({lives, score, remaining: remaining(), ended, bricks: bricks.length, powerups: powerups.length, balls: balls.length, gl: graphics.ok})
  };
}
