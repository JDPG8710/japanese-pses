/** Hard night racing: dense traffic, accelerating speed, few hits, long clear distance. */
export const RACE_DIFFICULTY = Object.freeze({
  lanes: 3,
  lives: 2,
  clearDistance: 5200,
  baseSpeed: 290,
  maxSpeed: 560,
  accelPerSecond: 18,
  spawnIntervalStart: 0.52,
  spawnIntervalMin: 0.28,
  hitInvulnMs: 700,
  playerWidth: 34,
  playerHeight: 52,
  carWidth: 36,
  carHeight: 56
});

export function createRaceGame({canvas, onHud, onEnd, autoStart = true} = {}) {
  const W = canvas?.width || 360;
  const H = canvas?.height || 640;
  const ctx = canvas?.getContext?.('2d');
  const D = RACE_DIFFICULTY;
  const laneXs = Array.from({length: D.lanes}, (_, i) => W * (i + 0.5) / D.lanes);

  let lane = 1;
  let lives = D.lives;
  let score = 0;
  let distance = 0;
  let speed = D.baseSpeed;
  let spawnTimer = 0;
  let invuln = 0;
  let cars = [];
  let roadOffset = 0;
  let running = false;
  let raf = 0;
  let last = 0;
  let keys = new Set();
  let ended = false;

  function hud() {
    onHud?.({
      score,
      lives,
      extra: `↕ ${Math.floor(distance)} / ${D.clearDistance}`
    });
  }

  function spawnBurst() {
    const occupied = new Set();
    const count = speed > 420 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      let laneId = Math.floor(Math.random() * D.lanes);
      for (let tries = 0; tries < 6 && occupied.has(laneId); tries++) laneId = Math.floor(Math.random() * D.lanes);
      if (occupied.has(laneId) && Math.random() < 0.55) continue;
      occupied.add(laneId);
      cars.push({
        lane: laneId,
        y: -D.carHeight - Math.random() * 40,
        color: ['#ff5c7a', '#ffd45e', '#57dfff', '#c791ff'][Math.floor(Math.random() * 4)]
      });
    }
  }

  function collide() {
    const px = laneXs[lane] - D.playerWidth / 2;
    const py = H - 110;
    for (const car of cars) {
      const cx = laneXs[car.lane] - D.carWidth / 2;
      if (rectsOverlap(px, py, D.playerWidth, D.playerHeight, cx, car.y, D.carWidth, D.carHeight)) return true;
    }
    return false;
  }

  function tick(dt) {
    if (!running || ended) return;
    speed = Math.min(D.maxSpeed, speed + D.accelPerSecond * dt);
    distance += speed * dt * 0.55;
    score = Math.floor(distance + (D.maxSpeed - (D.maxSpeed - speed)) * 0.2);
    roadOffset = (roadOffset + speed * dt) % 48;
    invuln = Math.max(0, invuln - dt * 1000);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnBurst();
      const t = Math.max(D.spawnIntervalMin, D.spawnIntervalStart - (speed - D.baseSpeed) / 900);
      spawnTimer = t * (0.75 + Math.random() * 0.45);
    }

    const relative = speed * 0.92;
    cars = cars.filter(car => {
      car.y += relative * dt;
      return car.y < H + 80;
    });

    if (invuln <= 0 && collide()) {
      lives -= 1;
      invuln = D.hitInvulnMs;
      cars = cars.filter(car => car.y < H * 0.45);
      hud();
      if (lives <= 0) return finish(false);
    }

    if (distance >= D.clearDistance) return finish(true);
    hud();
  }

  function finish(cleared) {
    ended = true;
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `${Math.floor(distance)}m`});
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#0b1528';
    ctx.fillRect(0, 0, W, H);
    // road
    ctx.fillStyle = '#1a2438';
    ctx.fillRect(W * 0.08, 0, W * 0.84, H);
    ctx.strokeStyle = '#3d4f6e';
    ctx.lineWidth = 3;
    for (let i = 1; i < D.lanes; i++) {
      const x = W * i / D.lanes;
      ctx.beginPath();
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = -roadOffset;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // traffic
    for (const car of cars) {
      drawCar(laneXs[car.lane], car.y + D.carHeight / 2, D.carWidth, D.carHeight, car.color);
    }
    // player
    const flash = invuln > 0 && Math.floor(invuln / 80) % 2 === 0;
    if (!flash) drawCar(laneXs[lane], H - 110 + D.playerHeight / 2, D.playerWidth, D.playerHeight, '#6ff0ad');
    // speed ribbon
    ctx.fillStyle = '#9ad7ff';
    ctx.font = '700 13px system-ui,sans-serif';
    ctx.fillText(`${Math.floor(speed)}`, 12, 22);
  }

  function drawCar(cx, cy, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = '#0b1528aa';
    ctx.fillRect(cx - w / 2 + 6, cy - h / 2 + 8, w - 12, h * 0.28);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function onKey(e) {
    if (e.type === 'keydown') {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { lane = Math.max(0, lane - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { lane = Math.min(D.lanes - 1, lane + 1); e.preventDefault(); }
      keys.add(e.key);
    } else keys.delete(e.key);
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    lane = x < 0.33 ? 0 : x > 0.66 ? 2 : 1;
  }

  function bind() {
    typeof window !== 'undefined' && window.addEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.addEventListener('keyup', onKey);
    canvas?.addEventListener?.('pointerdown', onPointer);
  }
  function unbind() {
    typeof window !== 'undefined' && window.removeEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.removeEventListener('keyup', onKey);
    canvas?.removeEventListener?.('pointerdown', onPointer);
  }

  function start() {
    lane = 1; lives = D.lives; score = 0; distance = 0; speed = D.baseSpeed;
    spawnTimer = 0.35; invuln = 0; cars = []; roadOffset = 0; ended = false;
    running = true; last = performance.now?.() || 0; hud();
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

  return {start, pause, resume, destroy, tick, draw, getState: () => ({lane, lives, score, distance, speed, cars: cars.length, ended})};
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
