/** 3D fruit slash — blade trail, split halves, juice bursts. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, sphereMesh, boxMesh, THREE,
  spawnParticleBurst, updateParticles, createSlashTrail
} from './Arcade3D.mjs?v=2';

export const FRUIT_DIFFICULTY = Object.freeze({
  lives: 4,
  clearWaves: 6,
  minComboToCreditWave: 2,
  throwIntervalStart: 0.85,
  throwIntervalMin: 0.42,
  bombChanceStart: 0.14,
  bombChanceMax: 0.28,
  fruitSpeed: 7.5,
  gravity: 9.5,
  slashRadius: 0.85,
  missLifeCost: true
});

const FRUIT_COLORS = [0xff6b6b, 0xff9f43, 0xffd45e, 0x7dffb3, 0xc791ff, 0xff8fab];

export function createFruitSlashGame({canvas, onHud, onEnd, audio = null, autoStart = true} = {}) {
  const D = FRUIT_DIFFICULTY;
  const graphics = createArcadeRenderer(canvas, {clear: 0x152418});
  let lives = D.lives;
  let score = 0;
  let wave = 1;
  let waveHits = 0;
  let waveNeed = 5;
  let combo = 0;
  let creditedWaves = 0;
  let items = [];
  let halves = [];
  let particles = [];
  let spawnTimer = 0;
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let slicing = false;
  let lastPoint = null;
  let itemGroup = null;
  let fxGroup = null;
  let trail = null;
  const ray = graphics.ok ? new THREE.Raycaster() : null;
  const slashPlane = graphics.ok ? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) : null;

  function hud() {
    onHud?.({
      score,
      lives,
      extra: `${waveHits}/${waveNeed} · ${combo}x · W${creditedWaves}/${D.clearWaves}`
    });
  }
  function bombChance() {
    return Math.min(D.bombChanceMax, D.bombChanceStart + wave * 0.015);
  }

  function buildScene() {
    if (!graphics.ok) return;
    const {scene, camera} = graphics;
    while (scene.children.length) scene.remove(scene.children[0]);
    scene.add(new THREE.HemisphereLight(0xfff5e0, 0x3a5a40, 1.35));
    const sun = new THREE.DirectionalLight(0xffe8b0, 1.4);
    sun.position.set(-3, 10, 6);
    scene.add(sun);
    const ground = boxMesh(16, 0.2, 10, 0x3d7a45);
    ground.position.set(0, -2.2, -1);
    scene.add(ground);
    itemGroup = new THREE.Group();
    scene.add(itemGroup);
    fxGroup = new THREE.Group();
    scene.add(fxGroup);
    trail = createSlashTrail(scene, {color: 0xfff6c8, maxPoints: 16});
    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 0.5, 0);
    resizeArcade3D(graphics, canvas);
  }

  function spawn() {
    const isBomb = Math.random() < bombChance();
    const color = isBomb ? 0x222830 : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)];
    const x = (Math.random() - 0.5) * 8;
    const speed = D.fruitSpeed + wave * 0.35 + Math.random() * 1.5;
    const mesh = graphics.ok
      ? sphereMesh(isBomb ? 0.45 : 0.4, color, {segments: 12})
      : null;
    if (mesh) {
      mesh.position.set(x, -2.5, (Math.random() - 0.5) * 2);
      itemGroup.add(mesh);
    }
    items.push({
      x, y: -2.5, z: mesh?.position.z || 0,
      vx: (Math.random() - 0.5) * 2.5,
      vy: speed,
      vz: (Math.random() - 0.5) * 0.8,
      bomb: isBomb,
      alive: true,
      mesh,
      color,
      spun: Math.random() * Math.PI * 2
    });
  }

  function splitFruit(item, point) {
    if (!graphics.ok || !fxGroup) return;
    const origin = new THREE.Vector3(item.x, item.y, item.z);
    particles = particles.concat(spawnParticleBurst(fxGroup, origin, {
      count: 14, color: item.color || 0xff6b6b, speed: 5, life: 0.42, size: 0.09
    }));
    for (const side of [-1, 1]) {
      const half = sphereMesh(0.28, item.color || 0xff6b6b, {segments: 10});
      half.scale.set(1, 0.55, 1);
      half.position.copy(origin);
      fxGroup.add(half);
      halves.push({
        mesh: half,
        x: item.x, y: item.y, z: item.z,
        vx: item.vx + side * (2.8 + Math.random()),
        vy: item.vy * 0.35 + 1.5 + Math.random(),
        vz: item.vz + (Math.random() - 0.5),
        spin: side * 8,
        life: 0.85
      });
    }
  }

  function slashAt(point) {
    let hit = false;
    for (const item of items) {
      if (!item.alive) continue;
      const dx = item.x - point.x;
      const dy = item.y - point.y;
      const dz = item.z - point.z;
      if (dx * dx + dy * dy + dz * dz > (D.slashRadius) ** 2) continue;
      item.alive = false;
      if (item.mesh) item.mesh.visible = false;
      hit = true;
      if (item.bomb) {
        lives -= 1;
        combo = 0;
        try { audio?.bomb?.(); } catch {}
        if (graphics.ok && fxGroup) {
          particles = particles.concat(spawnParticleBurst(fxGroup, new THREE.Vector3(item.x, item.y, item.z), {
            count: 16, color: 0xff5533, speed: 6, life: 0.35, size: 0.11
          }));
        }
        hud();
        if (lives <= 0) finish(false);
      } else {
        try { audio?.fruitCut?.(); } catch {}
        splitFruit(item, point);
        combo += 1;
        score += 10 + combo * 2;
        waveHits += 1;
        if (waveHits >= waveNeed && combo >= D.minComboToCreditWave) {
          creditedWaves += 1;
          wave += 1;
          waveHits = 0;
          waveNeed = Math.min(8, 4 + wave);
          if (creditedWaves >= D.clearWaves) return finish(true);
        }
      }
    }
    if (hit) hud();
  }

  function pointerToWorld(e) {
    if (!graphics.ok) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    ray.setFromCamera(ndc, graphics.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(slashPlane, hit)) return null;
    return hit;
  }

  function tick(dt) {
    if (!running || ended) return;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      if (Math.random() < 0.25) spawn();
      const t = Math.max(D.throwIntervalMin, D.throwIntervalStart - wave * 0.04);
      spawnTimer = t * (0.8 + Math.random() * 0.4);
    }
    items = items.filter(item => {
      if (!item.alive) {
        if (item.mesh) itemGroup?.remove(item.mesh);
        return false;
      }
      item.vy -= D.gravity * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.z += item.vz * dt;
      item.spun += dt * 4;
      if (item.mesh) {
        item.mesh.position.set(item.x, item.y, item.z);
        item.mesh.rotation.x = item.spun;
        item.mesh.rotation.y = item.spun * 0.7;
      }
      if (item.y < -3.5) {
        if (!item.bomb && D.missLifeCost) combo = 0;
        if (item.mesh) itemGroup?.remove(item.mesh);
        return false;
      }
      return true;
    });
    halves = halves.filter(h => {
      h.life -= dt;
      h.vy -= D.gravity * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.z += h.vz * dt;
      if (h.mesh) {
        h.mesh.position.set(h.x, h.y, h.z);
        h.mesh.rotation.z += h.spin * dt;
        h.mesh.material.transparent = true;
        h.mesh.material.opacity = Math.max(0, h.life / 0.85);
      }
      if (h.life <= 0 || h.y < -4) {
        fxGroup?.remove(h.mesh);
        h.mesh?.geometry?.dispose?.();
        h.mesh?.material?.dispose?.();
        return false;
      }
      return true;
    });
    particles = updateParticles(particles, dt, fxGroup);
    trail?.update(dt);
    hud();
  }

  function finish(cleared) {
    ended = true; running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `${creditedWaves} waves`});
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

  function onDown(e) {
    slicing = true;
    lastPoint = pointerToWorld(e);
    if (lastPoint) {
      try { audio?.slash?.(); } catch {}
      trail?.push(lastPoint);
      slashAt(lastPoint);
    }
  }
  function onMove(e) {
    if (!slicing) return;
    const p = pointerToWorld(e);
    if (p) {
      trail?.push(p);
      slashAt(p);
      lastPoint = p;
    }
  }
  function onUp() { slicing = false; lastPoint = null; }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onDown);
    canvas?.addEventListener?.('pointermove', onMove);
    canvas?.addEventListener?.('pointerup', onUp);
    canvas?.addEventListener?.('pointercancel', onUp);
    typeof window !== 'undefined' && window.addEventListener('resize', onResize);
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onDown);
    canvas?.removeEventListener?.('pointermove', onMove);
    canvas?.removeEventListener?.('pointerup', onUp);
    canvas?.removeEventListener?.('pointercancel', onUp);
    typeof window !== 'undefined' && window.removeEventListener('resize', onResize);
  }

  function start() {
    lives = D.lives; score = 0; wave = 1; waveHits = 0; waveNeed = 5;
    combo = 0; creditedWaves = 0; items = []; halves = []; particles = []; spawnTimer = 0.3; ended = false;
    if (itemGroup) while (itemGroup.children.length) itemGroup.remove(itemGroup.children[0]);
    if (fxGroup) while (fxGroup.children.length) fxGroup.remove(fxGroup.children[0]);
    trail?.clear();
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
    trail?.dispose?.();
    disposeArcade3D(graphics);
  }

  buildScene();
  bind();
  if (autoStart) start();
  return {start, pause, resume, destroy, tick, draw, getState: () => ({lives, score, wave, combo, creditedWaves, ended, gl: graphics.ok})};
}
