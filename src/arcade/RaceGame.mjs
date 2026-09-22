/** 3D chase-cam racing on a multi-lane road (easier difficulty than old 2D dodge). */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, THREE,
  spawnParticleBurst, updateParticles
} from './Arcade3D.mjs?v=2';

export const RACE_DIFFICULTY = Object.freeze({
  lanes: 3,
  lives: 4,
  clearDistance: 2800,
  baseSpeed: 160,
  maxSpeed: 320,
  accelPerSecond: 8,
  spawnIntervalStart: 1.15,
  spawnIntervalMin: 0.65,
  hitInvulnMs: 1100,
  laneWidth: 2.4,
  playerLen: 2.2,
  carLen: 2.4
});

const CAR_COLORS = [0xff5c7a, 0xffd45e, 0x57dfff, 0xc791ff, 0xff9f43];

export function createRaceGame({canvas, onHud, onEnd, audio = null, autoStart = true} = {}) {
  const D = RACE_DIFFICULTY;
  const graphics = createArcadeRenderer(canvas, {clear: 0x0a1224});
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
  let ended = false;
  let playerMesh = null;
  let roadGroup = null;
  let trafficGroup = null;
  let fxGroup = null;
  let particles = [];
  let speedLines = [];
  let camX = 0;
  let camY = 4.2;
  let camZ = -5.5;

  function laneX(i) {
    return (i - (D.lanes - 1) / 2) * D.laneWidth;
  }

  function buildScene() {
    if (!graphics.ok) return;
    const {scene, camera} = graphics;
    while (scene.children.length) scene.remove(scene.children[0]);
    scene.add(new THREE.HemisphereLight(0xb8d4ff, 0x243040, 1.2));
    const sun = new THREE.DirectionalLight(0xffe6c0, 1.4);
    sun.position.set(-4, 18, -6);
    scene.add(sun);
    scene.fog = new THREE.Fog(0x0a1224, 40, 120);

    roadGroup = new THREE.Group();
    scene.add(roadGroup);
    const road = boxMesh(D.laneWidth * D.lanes + 1.2, 0.08, 160, 0x1a2438);
    road.position.set(0, 0, 40);
    roadGroup.add(road);
    const shoulderL = boxMesh(1.2, 0.12, 160, 0x2a3548);
    shoulderL.position.set(-(D.laneWidth * D.lanes) / 2 - 0.8, 0.02, 40);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x *= -1;
    roadGroup.add(shoulderL, shoulderR);
    for (let i = 1; i < D.lanes; i++) {
      for (let s = 0; s < 24; s++) {
        const dash = boxMesh(0.12, 0.05, 2.2, 0xfff3c0);
        dash.position.set(laneX(i) - D.laneWidth / 2, 0.06, s * 6 - 10);
        roadGroup.add(dash);
      }
    }
    // side trees
    for (let i = 0; i < 18; i++) {
      const t = boxMesh(0.6, 2.4, 0.6, 0x3d8f5a);
      t.position.set((i % 2 ? 1 : -1) * (D.laneWidth * 2.2), 1.2, i * 8 - 5);
      roadGroup.add(t);
    }

    trafficGroup = new THREE.Group();
    scene.add(trafficGroup);

    playerMesh = makeCar(0x6ff0ad);
    playerMesh.position.set(laneX(lane), 0.55, 4);
    scene.add(playerMesh);

    fxGroup = new THREE.Group();
    scene.add(fxGroup);
    speedLines = [];
    for (let i = 0; i < 18; i++) {
      const line = boxMesh(0.04, 0.04, 1.8 + Math.random(), 0xb8d4ff);
      line.material.transparent = true;
      line.material.opacity = 0.35;
      line.position.set((Math.random() - 0.5) * 8, 0.8 + Math.random() * 2.5, Math.random() * 40);
      fxGroup.add(line);
      speedLines.push(line);
    }
    camera.position.set(0, 4.5, -6);
    camera.lookAt(0, 1, 12);
    resizeArcade3D(graphics, canvas);
  }

  function makeCar(color) {
    const g = new THREE.Group();
    const body = boxMesh(1.4, 0.55, D.playerLen, color);
    body.position.y = 0.35;
    const cabin = boxMesh(1.1, 0.45, 1.0, 0x1a2438);
    cabin.position.set(0, 0.75, -0.1);
    g.add(body, cabin);
    for (const [x, z] of [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]]) {
      const w = boxMesh(0.25, 0.25, 0.4, 0x111820);
      w.position.set(x, 0.15, z);
      g.add(w);
    }
    return g;
  }

  function hud() {
    onHud?.({
      score,
      lives,
      extra: `↕ ${Math.floor(distance)} / ${D.clearDistance}`
    });
  }

  function spawnBurst() {
    const occupied = new Set(cars.map(c => c.lane));
    // Prefer leaving at least one open lane.
    const open = [];
    for (let i = 0; i < D.lanes; i++) if (!occupied.has(i)) open.push(i);
    const count = speed > 260 && Math.random() < 0.35 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      let laneId = Math.floor(Math.random() * D.lanes);
      if (open.length && Math.random() < 0.7) {
        laneId = open[Math.floor(Math.random() * open.length)];
      }
      if (occupied.has(laneId) && occupied.size >= D.lanes - 1) continue;
      occupied.add(laneId);
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      const mesh = graphics.ok ? makeCar(color) : null;
      const z = 55 + Math.random() * 20;
      if (mesh) {
        mesh.position.set(laneX(laneId), 0.55, z);
        trafficGroup.add(mesh);
      }
      cars.push({lane: laneId, z, mesh, color});
    }
  }

  function collide() {
    for (const car of cars) {
      if (car.lane !== lane) continue;
      if (Math.abs(car.z - 4) < (D.playerLen + D.carLen) * 0.42) return true;
    }
    return false;
  }

  function tick(dt) {
    if (!running || ended) return;
    speed = Math.min(D.maxSpeed, speed + D.accelPerSecond * dt);
    distance += speed * dt * 0.55;
    score = Math.floor(distance + speed * 0.15);
    roadOffset = (roadOffset + speed * dt * 0.04) % 6;
    invuln = Math.max(0, invuln - dt * 1000);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnBurst();
      const t = Math.max(D.spawnIntervalMin, D.spawnIntervalStart - (speed - D.baseSpeed) / 700);
      spawnTimer = t * (0.85 + Math.random() * 0.4);
    }

    const relative = speed * 0.045;
    cars = cars.filter(car => {
      car.z -= relative;
      if (car.mesh) car.mesh.position.z = car.z;
      if (car.z < -8) {
        if (car.mesh) trafficGroup?.remove(car.mesh);
        return false;
      }
      return true;
    });

    if (playerMesh) {
      const targetX = laneX(lane);
      playerMesh.position.x += (targetX - playerMesh.position.x) * Math.min(1, dt * 10);
      const flash = invuln > 0 && Math.floor(invuln / 80) % 2 === 0;
      playerMesh.visible = !flash;
    }
    if (roadGroup) roadGroup.position.z = -roadOffset;

    if (fxGroup && Math.random() < Math.min(0.35, speed / 900)) {
      const origin = new THREE.Vector3((playerMesh?.position.x || 0) + (Math.random() - 0.5) * 0.6, 0.15, 3.2);
      particles = particles.concat(spawnParticleBurst(fxGroup, origin, {
        count: 2, color: 0xc4b59a, speed: 1.6, life: 0.28, size: 0.08
      }));
    }
    for (const line of speedLines) {
      line.position.z -= relative * 1.4;
      if (line.position.z < -6) {
        line.position.z = 40 + Math.random() * 10;
        line.position.x = (Math.random() - 0.5) * 8;
        line.scale.z = 0.6 + (speed / D.maxSpeed) * 1.8;
      }
      line.material.opacity = 0.15 + (speed / D.maxSpeed) * 0.45;
    }
    particles = updateParticles(particles, dt, fxGroup);

    if (invuln <= 0 && collide()) {
      lives -= 1;
      try { audio?.raceHit?.(); } catch {}
      invuln = D.hitInvulnMs;
      cars = cars.filter(car => {
        if (car.z < 20) {
          if (car.mesh) trafficGroup?.remove(car.mesh);
          return false;
        }
        return true;
      });
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
    if (!graphics.ok) return;
    const {camera, renderer, scene} = graphics;
    const px = playerMesh?.position.x || 0;
    const targetX = px * 0.42;
    const targetY = 4.0 + Math.min(0.8, (speed - D.baseSpeed) / 400);
    const targetZ = -5.2 - Math.min(1.2, (speed - D.baseSpeed) / 350);
    camX += (targetX - camX) * 0.12;
    camY += (targetY - camY) * 0.1;
    camZ += (targetZ - camZ) * 0.1;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(px * 0.25, 1.15, 14);
    renderer.render(scene, camera);
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
    if (e.type !== 'keydown') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      lane = Math.max(0, lane - 1);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      lane = Math.min(D.lanes - 1, lane + 1);
      e.preventDefault();
    }
  }
  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    lane = x < 0.33 ? 0 : x > 0.66 ? 2 : 1;
  }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    typeof window !== 'undefined' && window.addEventListener('keydown', onKey);
    canvas?.addEventListener?.('pointerdown', onPointer);
    typeof window !== 'undefined' && window.addEventListener('resize', onResize);
  }
  function unbind() {
    typeof window !== 'undefined' && window.removeEventListener('keydown', onKey);
    canvas?.removeEventListener?.('pointerdown', onPointer);
    typeof window !== 'undefined' && window.removeEventListener('resize', onResize);
  }

  function start() {
    lane = 1; lives = D.lives; score = 0; distance = 0; speed = D.baseSpeed;
    spawnTimer = 0.6; invuln = 0; cars = []; roadOffset = 0; ended = false;
    if (trafficGroup) while (trafficGroup.children.length) trafficGroup.remove(trafficGroup.children[0]);
    if (fxGroup) while (fxGroup.children.length > speedLines.length) {
      const c = fxGroup.children[fxGroup.children.length - 1];
      if (!speedLines.includes(c)) fxGroup.remove(c);
      else break;
    }
    particles = [];
    camX = 0; camY = 4.2; camZ = -5.5;
    if (playerMesh) playerMesh.position.set(laneX(lane), 0.55, 4);
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
  function destroy() {
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unbind();
    disposeArcade3D(graphics);
  }

  buildScene();
  bind();
  if (autoStart) start();
  return {start, pause, resume, destroy, tick, draw, getState: () => ({lane, lives, score, distance, speed, cars: cars.length, ended, gl: graphics.ok})};
}
