/** Player-driven circuit racing with track/car select, power-ups, and AI traffic. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, sphereMesh, THREE,
  spawnParticleBurst, updateParticles
} from './Arcade3D.mjs?v=3';
import {arcadeText} from './ArcadeText.mjs?v=3';
import {
  RACE_TRACKS, getRaceTrack, buildPathMetrics, projectOnPath, pointAtProgress
} from './RaceTracks.mjs?v=1';
import {RACE_CARS, getRaceCar, makeRaceCarMesh} from './RaceCars.mjs?v=1';

export {RACE_TRACKS, RACE_CARS};
export const RACE_POWERUPS = Object.freeze(['boost', 'shield', 'oil', 'magnet']);

export const RACE_DIFFICULTY = Object.freeze({
  laps: 3,
  aiCount: 2,
  lives: 4,
  clearDistance: 0, // lap-based; kept for smoke-test compat
  spawnIntervalMin: 0.5, // kept for smoke-test compat (item respawn floor)
  itemRespawn: 6.5,
  offTrackSlow: 0.55,
  boostDuration: 1.6,
  shieldDuration: 4.0,
  oilDuration: 2.2,
  magnetDuration: 3.5,
  finishGraceMs: 400
});

const POWER_COLORS = {
  boost: 0xff9f43,
  shield: 0x57dfff,
  oil: 0x6b5b4a,
  magnet: 0xc791ff
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function wrapDelta(a, b) {
  let d = a - b;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

export function createRaceGame({
  canvas,
  onHud,
  onEnd,
  audio = null,
  autoStart = true,
  locale = 'en',
  trackId = null,
  carId = null,
  skipLobby = false
} = {}) {
  const D = RACE_DIFFICULTY;
  const tCopy = arcadeText(locale);
  const raceCopy = tCopy.race || {};
  const graphics = createArcadeRenderer(canvas, {clear: 0x0a1224});

  let selectedTrackId = trackId || RACE_TRACKS[0].id;
  let selectedCarId = carId || RACE_CARS[0].id;
  let track = getRaceTrack(selectedTrackId);
  let carDef = getRaceCar(selectedCarId);
  let metrics = buildPathMetrics(track.path);

  let phase = 'lobby'; // lobby | racing | ended
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let score = 0;
  let lives = D.lives;
  let lap = 1;
  let raceTime = 0;
  let distance = 0; // cumulative meters along path (compat)
  let speed = 0;
  let heading = 0;
  let px = 0;
  let pz = 0;
  let progress = 0;
  let lastProgress = 0;
  let crossedMid = false;
  let invuln = 0;
  let boostT = 0;
  let shieldT = 0;
  let oilT = 0;
  let magnetT = 0;
  let heldItem = null;
  let particles = [];
  let items = [];
  let hazards = [];
  let aiCars = [];
  let playerMesh = null;
  let worldGroup = null;
  let itemGroup = null;
  let trafficGroup = null;
  let fxGroup = null;
  let lobbyEl = null;
  let touchEl = null;
  let camX = 0, camY = 8, camZ = -12;

  const keys = {throttle: false, brake: false, left: false, right: false};
  const touch = {throttle: 0, brake: 0, steer: 0};

  function hasDom() {
    return typeof document !== 'undefined' && canvas && typeof canvas.getBoundingClientRect === 'function'
      && canvas.parentElement;
  }

  function shouldShowLobby() {
    if (skipLobby) return false;
    if (trackId && carId) return false;
    if (!hasDom()) return false;
    // Stub canvases used in headless tests have no real parent with class arcade-stage
    const parent = canvas.parentElement;
    if (!parent || parent.nodeType !== 1) return false;
    return true;
  }

  function labelTrack(id) {
    return raceCopy.tracks?.[id]?.name || id;
  }
  function labelCar(id) {
    return raceCopy.cars?.[id]?.name || id;
  }
  function labelPower(id) {
    return raceCopy.powerups?.[id] || id;
  }

  function mountLobby() {
    if (!shouldShowLobby()) return false;
    const stage = canvas.parentElement;
    lobbyEl = document.createElement('div');
    lobbyEl.className = 'race-lobby';
    lobbyEl.innerHTML = `
      <div class="race-lobby-card">
        <p class="race-lobby-kicker">${esc(raceCopy.lobbyKicker || 'CIRCUIT')}</p>
        <h2>${esc(raceCopy.lobbyTitle || tCopy.games.race.title)}</h2>
        <p class="muted">${esc(raceCopy.lobbyHint || '')}</p>
        <h3>${esc(raceCopy.pickTrack || 'Track')}</h3>
        <div class="race-lobby-grid" data-pick="track">
          ${RACE_TRACKS.map(tr => `
            <button type="button" class="race-pick ${tr.id === selectedTrackId ? 'active' : ''}" data-track="${tr.id}">
              <strong>${esc(labelTrack(tr.id))}</strong>
              <small>${esc(raceCopy.tracks?.[tr.id]?.blurb || '')}</small>
            </button>`).join('')}
        </div>
        <h3>${esc(raceCopy.pickCar || 'Car')}</h3>
        <div class="race-lobby-grid" data-pick="car">
          ${RACE_CARS.map(c => `
            <button type="button" class="race-pick ${c.id === selectedCarId ? 'active' : ''}" data-car="${c.id}">
              <strong>${esc(labelCar(c.id))}</strong>
              <small>${esc(raceCopy.cars?.[c.id]?.blurb || '')}</small>
            </button>`).join('')}
        </div>
        <button type="button" class="primary wide race-lobby-play" data-race-play>${esc(tCopy.play)}</button>
      </div>`;
    stage.append(lobbyEl);
    lobbyEl.addEventListener('click', onLobbyClick);
    phase = 'lobby';
    return true;
  }

  function onLobbyClick(e) {
    const trackBtn = e.target.closest('[data-track]');
    if (trackBtn) {
      selectedTrackId = trackBtn.dataset.track;
      lobbyEl.querySelectorAll('[data-track]').forEach(b => b.classList.toggle('active', b.dataset.track === selectedTrackId));
      return;
    }
    const carBtn = e.target.closest('[data-car]');
    if (carBtn) {
      selectedCarId = carBtn.dataset.car;
      lobbyEl.querySelectorAll('[data-car]').forEach(b => b.classList.toggle('active', b.dataset.car === selectedCarId));
      return;
    }
    if (e.target.closest('[data-race-play]')) {
      beginRace();
    }
  }

  function unmountLobby() {
    if (!lobbyEl) return;
    lobbyEl.removeEventListener('click', onLobbyClick);
    lobbyEl.remove();
    lobbyEl = null;
  }

  function mountTouch() {
    if (!hasDom()) return;
    const stage = canvas.parentElement;
    touchEl = document.createElement('div');
    touchEl.className = 'race-touch';
    touchEl.innerHTML = `
      <div class="race-touch-steer">
        <button type="button" data-touch="left" aria-label="left">◀</button>
        <button type="button" data-touch="right" aria-label="right">▶</button>
      </div>
      <div class="race-touch-pedals">
        <button type="button" data-touch="brake" aria-label="brake">ブレーキ<br>Brake</button>
        <button type="button" data-touch="throttle" class="primary" aria-label="throttle">アクセル<br>Go</button>
      </div>
      <button type="button" class="race-touch-item" data-touch="item" aria-label="item">${esc(raceCopy.useItem || 'Item')}</button>`;
    stage.append(touchEl);
    const setPad = (name, on) => {
      if (name === 'left') touch.steer = on ? -1 : (touch.steer < 0 ? 0 : touch.steer);
      if (name === 'right') touch.steer = on ? 1 : (touch.steer > 0 ? 0 : touch.steer);
      if (name === 'throttle') touch.throttle = on ? 1 : 0;
      if (name === 'brake') touch.brake = on ? 1 : 0;
      if (name === 'item' && on) useHeldItem();
    };
    const down = e => {
      const b = e.target.closest('[data-touch]');
      if (!b) return;
      e.preventDefault();
      setPad(b.dataset.touch, true);
    };
    const up = e => {
      const b = e.target.closest?.('[data-touch]') || (e.changedTouches && touchEl.querySelector(`[data-touch].active`));
      // release all if pointer left
      const name = e.target.closest?.('[data-touch]')?.dataset?.touch;
      if (name) setPad(name, false);
      else {
        touch.throttle = 0; touch.brake = 0; touch.steer = 0;
      }
    };
    touchEl.addEventListener('pointerdown', down);
    touchEl.addEventListener('pointerup', up);
    touchEl.addEventListener('pointercancel', up);
    touchEl.addEventListener('pointerleave', e => {
      if (e.target === touchEl) { touch.throttle = 0; touch.brake = 0; touch.steer = 0; }
    });
    touchEl._raceHandlers = {down, up};
  }

  function unmountTouch() {
    if (!touchEl) return;
    const h = touchEl._raceHandlers;
    if (h) {
      touchEl.removeEventListener('pointerdown', h.down);
      touchEl.removeEventListener('pointerup', h.up);
      touchEl.removeEventListener('pointercancel', h.up);
    }
    touchEl.remove();
    touchEl = null;
    touch.throttle = 0; touch.brake = 0; touch.steer = 0;
  }

  function clearScene() {
    if (!graphics.ok) return;
    const {scene} = graphics;
    while (scene.children.length) scene.remove(scene.children[0]);
  }

  function buildTrackMesh(group) {
    const theme = track.theme;
    const path = track.path;
    const half = track.width / 2;
    const n = path.length;
    for (let i = 0; i < n; i++) {
      const a = path[i];
      const b = path[(i + 1) % n];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const ang = Math.atan2(dx, dz);
      const road = boxMesh(track.width, 0.12, len + 0.15, theme.asphalt);
      road.position.set(mx, 0, mz);
      road.rotation.y = ang;
      // fake banking
      road.rotation.z = Math.sin(i / n * Math.PI * 2) * (theme.banking || 0);
      group.add(road);
      const shL = boxMesh(1.1, 0.1, len + 0.1, theme.shoulder);
      shL.position.set(mx + Math.cos(ang) * (half + 0.55), 0.02, mz - Math.sin(ang) * (half + 0.55));
      shL.rotation.y = ang;
      const shR = boxMesh(1.1, 0.1, len + 0.1, theme.shoulder);
      shR.position.set(mx - Math.cos(ang) * (half + 0.55), 0.02, mz + Math.sin(ang) * (half + 0.55));
      shR.rotation.y = ang;
      group.add(shL, shR);
    }
    // finish line
    const start = pointAtProgress(path, metrics, 0);
    const finish = boxMesh(track.width * 0.95, 0.08, 1.2, 0xffffff);
    finish.position.set(start.x, 0.08, start.z);
    finish.rotation.y = start.heading;
    group.add(finish);

    // décor
    const deco = theme.deco;
    for (let i = 0; i < 24; i++) {
      const p = pointAtProgress(path, metrics, i / 24);
      const side = i % 2 ? 1 : -1;
      const ox = p.x + p.nx * side * (half + 2.2 + (i % 3) * 0.4);
      const oz = p.z + p.nz * side * (half + 2.2 + (i % 3) * 0.4);
      if (deco === 'trees') {
        const trunk = boxMesh(0.35, 1.2, 0.35, 0x5a3a22);
        trunk.position.set(ox, 0.6, oz);
        const leaf = boxMesh(1.1, 1.4, 1.1, 0x3d8f5a);
        leaf.position.set(ox, 1.7, oz);
        group.add(trunk, leaf);
      } else if (deco === 'docks') {
        const crate = boxMesh(1.2, 1.0, 1.2, 0x8b6914);
        crate.position.set(ox, 0.5, oz);
        group.add(crate);
      } else if (deco === 'rocks') {
        const rock = boxMesh(1.4, 1.6 + (i % 3) * 0.4, 1.2, 0x6a7068);
        rock.position.set(ox, 0.8, oz);
        group.add(rock);
      } else {
        const pole = boxMesh(0.25, 2.4, 0.25, theme.accent);
        pole.position.set(ox, 1.2, oz);
        const lamp = sphereMesh(0.35, theme.accent, {emissive: theme.accent, emissiveIntensity: 0.8, segments: 8});
        lamp.position.set(ox, 2.5, oz);
        group.add(pole, lamp);
      }
    }
    // ground plane
    const ground = boxMesh(120, 0.05, 120, theme.clear === 0x0a0618 ? 0x120a20 : 0x3d5a40);
    ground.position.y = -0.1;
    group.add(ground);
  }

  function buildScene() {
    if (!graphics.ok) {
      worldGroup = null;
      return;
    }
    clearScene();
    const {scene, camera, renderer} = graphics;
    const theme = track.theme;
    renderer.setClearColor(theme.clear, 1);
    scene.background = new THREE.Color(theme.clear);
    scene.fog = new THREE.Fog(theme.fog, 35, 110);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));
    const sun = new THREE.DirectionalLight(0xfff2d8, theme.deco === 'neon' ? 0.7 : 1.5);
    sun.position.set(8, 18, 6);
    scene.add(sun);
    if (theme.deco === 'neon') {
      const neon = new THREE.PointLight(theme.accent, 1.4, 80);
      neon.position.set(0, 8, 0);
      scene.add(neon);
    }

    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    buildTrackMesh(worldGroup);

    itemGroup = new THREE.Group();
    scene.add(itemGroup);
    trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    fxGroup = new THREE.Group();
    scene.add(fxGroup);

    playerMesh = makeRaceCarMesh(THREE, boxMesh, carDef);
    scene.add(playerMesh);

    camera.position.set(0, 10, -14);
    camera.lookAt(0, 0, 0);
    resizeArcade3D(graphics, canvas);
  }

  function spawnItems() {
    items = [];
    if (itemGroup) while (itemGroup.children.length) itemGroup.remove(itemGroup.children[0]);
    const types = RACE_POWERUPS;
    track.itemSlots.forEach((s, i) => {
      const lateral = (i % 2 ? 1 : -1) * (track.width * 0.28);
      const p = pointAtProgress(track.path, metrics, s);
      const type = types[i % types.length];
      const mesh = graphics.ok
        ? (() => {
          const m = sphereMesh(0.45, POWER_COLORS[type], {emissive: POWER_COLORS[type], emissiveIntensity: 0.7, segments: 10});
          m.position.set(p.x + p.nx * lateral, 0.7, p.z + p.nz * lateral);
          itemGroup.add(m);
          return m;
        })()
        : null;
      items.push({s, lateral, type, mesh, alive: true, respawn: 0});
    });
  }

  function spawnAi() {
    aiCars = [];
    if (trafficGroup) while (trafficGroup.children.length) trafficGroup.remove(trafficGroup.children[0]);
    const count = D.aiCount;
    for (let i = 0; i < count; i++) {
      const def = RACE_CARS[(i + 1) % RACE_CARS.length];
      const s0 = 0.08 + i * 0.07;
      const lat = (i % 2 ? 1 : -1) * 1.4;
      const p = pointAtProgress(track.path, metrics, s0);
      const mesh = graphics.ok ? makeRaceCarMesh(THREE, boxMesh, def, {ghost: false}) : null;
      if (mesh) {
        mesh.position.set(p.x + p.nx * lat, 0.2, p.z + p.nz * lat);
        mesh.rotation.y = p.heading;
        trafficGroup.add(mesh);
      }
      aiCars.push({
        def,
        s: s0,
        lat,
        speed: def.topSpeed * (0.62 + i * 0.08),
        mesh,
        lap: 1,
        progress: s0
      });
    }
  }

  function resetPlayerPose() {
    const start = pointAtProgress(track.path, metrics, 0.02);
    px = start.x + start.nx * -1.2;
    pz = start.z + start.nz * -1.2;
    heading = start.heading;
    speed = 0;
    progress = 0.02;
    lastProgress = progress;
    crossedMid = false;
    if (playerMesh) {
      playerMesh.position.set(px, 0.2, pz);
      playerMesh.rotation.y = heading;
      playerMesh.visible = true;
    }
  }

  function hud() {
    const pos = racePosition();
    const itemLabel = heldItem ? labelPower(heldItem) : '—';
    const spd = Math.floor(Math.abs(speed) * 3.6);
    onHud?.({
      score,
      lives,
      extra: `${tCopy.games?.race ? '' : ''}${raceCopy.lap || 'Lap'} ${Math.min(lap, track.laps)}/${track.laps} · #${pos} · ${spd} · ${itemLabel}`
    });
  }

  function racePosition() {
    const playerScore = (lap - 1) + progress;
    let better = 0;
    for (const ai of aiCars) {
      const aiScore = (ai.lap - 1) + ai.progress;
      if (aiScore > playerScore + 1e-4) better++;
    }
    return better + 1;
  }

  function inputThrottle() {
    return (keys.throttle ? 1 : 0) || touch.throttle;
  }
  function inputBrake() {
    return (keys.brake ? 1 : 0) || touch.brake;
  }
  function inputSteer() {
    let s = 0;
    if (keys.left) s -= 1;
    if (keys.right) s += 1;
    if (touch.steer) s += touch.steer;
    return Math.max(-1, Math.min(1, s));
  }

  function useHeldItem() {
    if (!heldItem || phase !== 'racing') return;
    const type = heldItem;
    heldItem = null;
    try { audio?.powerup?.(); } catch {}
    if (type === 'boost') {
      boostT = D.boostDuration;
    } else if (type === 'shield') {
      shieldT = D.shieldDuration;
    } else if (type === 'oil') {
      const behind = pointAtProgress(track.path, metrics, (progress - 0.04 + 1) % 1);
      const hx = behind.x;
      const hz = behind.z;
      const mesh = graphics.ok
        ? (() => {
          const m = boxMesh(2.2, 0.06, 2.2, 0x2a2218);
          m.position.set(hx, 0.05, hz);
          m.material.transparent = true;
          m.material.opacity = 0.75;
          fxGroup.add(m);
          return m;
        })()
        : null;
      hazards.push({x: hx, z: hz, mesh, life: 8, kind: 'oil'});
    } else if (type === 'magnet') {
      magnetT = D.magnetDuration;
    }
    hud();
  }

  function tick(dt) {
    if (!running || ended || phase !== 'racing') return;
    raceTime += dt;
    invuln = Math.max(0, invuln - dt * 1000);
    boostT = Math.max(0, boostT - dt);
    shieldT = Math.max(0, shieldT - dt);
    oilT = Math.max(0, oilT - dt);
    magnetT = Math.max(0, magnetT - dt);

    const proj = projectOnPath(track.path, metrics, px, pz);
    const onTrack = proj.dist <= track.width * 0.55;
    const gripMul = (onTrack ? 1 : D.offTrackSlow) * (oilT > 0 ? 0.35 : 1) * carDef.grip;
    const top = carDef.topSpeed * (onTrack ? 1 : 0.7) * (boostT > 0 ? 1.35 : 1);
    const thr = inputThrottle();
    const brk = inputBrake();
    const steerIn = inputSteer();

    if (thr > 0) {
      speed += carDef.accel * thr * dt / carDef.mass;
    } else {
      speed *= Math.pow(0.25, dt); // coast friction
    }
    if (brk > 0) {
      if (speed > 0.8) speed -= carDef.brake * brk * dt;
      else speed -= carDef.brake * 0.35 * brk * dt; // light reverse
    }
    speed = Math.max(-carDef.topSpeed * 0.25, Math.min(top, speed));

    const steerRate = carDef.handling * (1.1 - Math.min(0.75, Math.abs(speed) / Math.max(1, carDef.topSpeed))) * gripMul;
    heading += steerIn * steerRate * dt * Math.sign(speed || 1) * (Math.abs(speed) > 0.4 ? 1 : 0.35);

    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    px += forwardX * speed * dt;
    pz += forwardZ * speed * dt;

    // soft pull back toward asphalt when far off
    if (proj.dist > track.width * 0.85) {
      const pull = Math.min(1, (proj.dist - track.width * 0.85) * 0.8) * dt * 6;
      px += (proj.x - px) * pull;
      pz += (proj.z - pz) * pull;
      speed *= 1 - 0.4 * dt;
    }

    const proj2 = projectOnPath(track.path, metrics, px, pz);
    progress = proj2.s;
    const delta = wrapDelta(progress, lastProgress);
    if (metrics.total > 0) distance += Math.abs(delta) * metrics.total;
    // Mid-track checkpoint prevents finish-line cheese.
    if (progress > 0.4 && progress < 0.6) crossedMid = true;
    // Lap complete when crossing the finish forward after the mid checkpoint.
    if (crossedMid && lastProgress > 0.75 && progress < 0.25 && speed >= -0.5) {
      lap += 1;
      crossedMid = false;
      score += 500 + Math.floor(Math.max(0, 40 - raceTime) * 8);
      try { audio?.correct?.(); } catch {}
      if (lap > track.laps) {
        lastProgress = progress;
        return finish(true);
      }
    }
    lastProgress = progress;

    // items
    for (const it of items) {
      if (!it.alive) {
        it.respawn -= dt;
        if (it.respawn <= 0) {
          it.alive = true;
          if (it.mesh) it.mesh.visible = true;
        }
        continue;
      }
      const ip = pointAtProgress(track.path, metrics, it.s);
      const ix = ip.x + ip.nx * it.lateral;
      const iz = ip.z + ip.nz * it.lateral;
      let attract = false;
      if (magnetT > 0 && Math.hypot(px - ix, pz - iz) < 8) attract = true;
      if (attract && it.mesh) {
        it.mesh.position.x += (px - it.mesh.position.x) * dt * 4;
        it.mesh.position.z += (pz - it.mesh.position.z) * dt * 4;
      }
      const mx = it.mesh ? it.mesh.position.x : ix;
      const mz = it.mesh ? it.mesh.position.z : iz;
      if (Math.hypot(px - mx, pz - mz) < 1.6) {
        it.alive = false;
        it.respawn = Math.max(D.spawnIntervalMin, D.itemRespawn);
        if (it.mesh) it.mesh.visible = false;
        heldItem = it.type;
        score += 40;
        try { audio?.powerup?.(); } catch {}
        if (fxGroup && graphics.ok) {
          particles = particles.concat(spawnParticleBurst(fxGroup, new THREE.Vector3(mx, 0.8, mz), {
            count: 8, color: POWER_COLORS[it.type], speed: 3, life: 0.35, size: 0.1
          }));
        }
      }
      if (it.mesh && it.alive) {
        it.mesh.position.y = 0.7 + Math.sin(raceTime * 4 + it.s * 10) * 0.15;
        it.mesh.rotation.y += dt * 2;
      }
    }

    // oil hazards
    hazards = hazards.filter(h => {
      h.life -= dt;
      if (h.life <= 0) {
        if (h.mesh) fxGroup?.remove(h.mesh);
        return false;
      }
      if (Math.hypot(px - h.x, pz - h.z) < 1.8 && oilT <= 0) {
        oilT = D.oilDuration;
        try { audio?.raceHit?.(); } catch {}
      }
      for (const ai of aiCars) {
        if (!ai.mesh) continue;
        if (Math.hypot(ai.mesh.position.x - h.x, ai.mesh.position.z - h.z) < 1.8) {
          ai.speed *= 0.5;
        }
      }
      return true;
    });

    // AI
    for (const ai of aiCars) {
      const targetSpeed = ai.def.topSpeed * (0.68 + 0.1 * Math.sin(raceTime + ai.s));
      ai.speed += (targetSpeed - ai.speed) * dt * 1.2;
      const ds = (ai.speed * dt) / Math.max(1, metrics.total);
      const prev = ai.progress;
      ai.progress = (ai.progress + ds) % 1;
      if (prev > 0.8 && ai.progress < 0.2) ai.lap += 1;
      ai.s = ai.progress;
      const p = pointAtProgress(track.path, metrics, ai.progress);
      const x = p.x + p.nx * ai.lat;
      const z = p.z + p.nz * ai.lat;
      if (ai.mesh) {
        ai.mesh.position.set(x, 0.2, z);
        ai.mesh.rotation.y = p.heading;
      }
      // collide with player
      if (Math.hypot(px - x, pz - z) < 1.7 && invuln <= 0) {
        if (shieldT > 0) {
          shieldT = 0;
          invuln = 600;
        } else {
          lives -= 1;
          invuln = 1000;
          speed *= 0.4;
          try { audio?.raceHit?.(); } catch {}
          if (lives <= 0) return finish(false);
        }
      }
    }

    if (playerMesh) {
      playerMesh.position.set(px, 0.2, pz);
      playerMesh.rotation.y = heading;
      const flash = invuln > 0 && Math.floor(invuln / 80) % 2 === 0;
      playerMesh.visible = !flash;
    }

    score = Math.max(score, Math.floor(distance * 0.5 + raceTime * 2));
    particles = updateParticles(particles, dt, fxGroup);
    hud();
  }

  function finish(cleared) {
    ended = true;
    running = false;
    phase = 'ended';
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unmountTouch();
    const detail = cleared
      ? `${raceCopy.lap || 'Lap'} ${track.laps} · ${raceTime.toFixed(1)}s · #${racePosition()}`
      : `${raceCopy.dnf || 'DNF'} · ${raceTime.toFixed(1)}s`;
    if (cleared) {
      try { audio?.victory?.(); } catch {}
    }
    onEnd?.({cleared, score, detail});
  }

  function draw() {
    if (!graphics.ok || !playerMesh) return;
    const {camera, renderer, scene} = graphics;
    const backX = px - Math.sin(heading) * 10;
    const backZ = pz - Math.cos(heading) * 10;
    const targetX = backX;
    const targetY = 6.5 + Math.min(2, Math.abs(speed) * 0.04);
    const targetZ = backZ;
    camX += (targetX - camX) * 0.12;
    camY += (targetY - camY) * 0.1;
    camZ += (targetZ - camZ) * 0.12;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(px + Math.sin(heading) * 6, 1.0, pz + Math.cos(heading) * 6);
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

  function onKeyDown(e) {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.throttle = true; e.preventDefault(); }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.brake = true; e.preventDefault(); }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
    if (k === ' ' || k === 'e' || k === 'E') { useHeldItem(); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.throttle = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.brake = false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
  }
  function unbind() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
  }

  function beginRace() {
    unmountLobby();
    track = getRaceTrack(selectedTrackId);
    carDef = getRaceCar(selectedCarId);
    metrics = buildPathMetrics(track.path);
    buildScene();
    spawnItems();
    spawnAi();
    resetPlayerPose();
    lap = 1;
    lives = D.lives;
    score = 0;
    raceTime = 0;
    distance = 0;
    boostT = shieldT = oilT = magnetT = 0;
    heldItem = null;
    hazards = [];
    particles = [];
    ended = false;
    phase = 'racing';
    mountTouch();
    running = true;
    last = performance.now?.() || 0;
    hud();
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }

  function start() {
    // retry / explicit start
    unmountTouch();
    unmountLobby();
    ended = false;
    running = false;
    phase = 'lobby';
    if (shouldShowLobby() && !(trackId && carId)) {
      mountLobby();
      // keep a static preview scene
      track = getRaceTrack(selectedTrackId);
      carDef = getRaceCar(selectedCarId);
      metrics = buildPathMetrics(track.path);
      buildScene();
      resetPlayerPose();
      draw();
      return;
    }
    beginRace();
  }

  function pause() {
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
  }
  function resume() {
    if (ended || phase !== 'racing') return;
    running = true;
    last = performance.now?.() || 0;
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }
  function destroy() {
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unbind();
    unmountLobby();
    unmountTouch();
    disposeArcade3D(graphics);
  }

  /** Test / external control hook. */
  function setControls({throttle = 0, brake = 0, steer = 0} = {}) {
    keys.throttle = throttle > 0.1;
    keys.brake = brake > 0.1;
    keys.left = steer < -0.1;
    keys.right = steer > 0.1;
  }

  bind();
  // Initial setup: headless / defaults skip lobby
  if (autoStart) {
    if (shouldShowLobby() && !(trackId && carId)) {
      mountLobby();
      track = getRaceTrack(selectedTrackId);
      carDef = getRaceCar(selectedCarId);
      metrics = buildPathMetrics(track.path);
      buildScene();
      resetPlayerPose();
      draw();
    } else {
      beginRace();
    }
  } else {
    // prepare defaults without running
    track = getRaceTrack(selectedTrackId);
    carDef = getRaceCar(selectedCarId);
    metrics = buildPathMetrics(track.path);
    buildScene();
    resetPlayerPose();
  }

  return {
    start,
    pause,
    resume,
    destroy,
    tick,
    draw,
    setControls,
    useItem: useHeldItem,
    getState: () => ({
      lane: 0,
      lives,
      score,
      distance,
      speed,
      lap,
      progress,
      trackId: track.id,
      carId: carDef.id,
      heldItem,
      phase,
      cars: aiCars.length,
      ended,
      gl: graphics.ok
    })
  };
}
