/** Player-driven circuit racing with track/car select, power-ups, and AI traffic. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, sphereMesh, THREE,
  spawnParticleBurst, updateParticles
} from './Arcade3D.mjs?v=3';
import {arcadeText} from './ArcadeText.mjs?v=3';
import {
  RACE_TRACKS, getRaceTrack, buildPathMetrics, projectOnPath, pointAtProgress
} from './RaceTracks.mjs?v=1';
import {buildRaceScenery, disposeRaceScene} from './RaceScenery.mjs?v=1';
import {RACE_CARS, getRaceCar, makeRaceCarMesh} from './RaceCars.mjs?v=2';

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
  let steering = 0;
  let cameraHeading = 0;
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
    const labels = locale === 'zh' ? ['向左','向右','刹车','油门'] : locale === 'ja' ? ['ひだり','みぎ','ブレーキ','アクセル'] : ['Left','Right','Brake','Go'];
    touchEl = document.createElement('div');
    touchEl.className = 'race-touch';
    touchEl.innerHTML = `
      <div class="race-touch-steer">
        <button type="button" data-touch="left" aria-label="${labels[0]}">◀</button>
        <button type="button" data-touch="right" aria-label="${labels[1]}">▶</button>
      </div>
      <div class="race-touch-pedals">
        <button type="button" data-touch="brake" aria-label="${labels[2]}">${labels[2]}</button>
        <button type="button" data-touch="throttle" class="primary" aria-label="${labels[3]}">${labels[3]}</button>
      </div>
      <button type="button" class="race-touch-item" data-touch="item" aria-label="item">${esc(raceCopy.useItem || 'Item')}</button>`;
    stage.append(touchEl);
    const pointers = new Map();
    const update = () => {
      const pressed = new Set(pointers.values());
      touch.steer = Number(pressed.has('right')) - Number(pressed.has('left'));
      touch.throttle = Number(pressed.has('throttle'));
      touch.brake = Number(pressed.has('brake'));
      touchEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', pressed.has(b.dataset.touch)));
    };
    const down = e => {
      const b = e.target.closest('[data-touch]');
      if (!b) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, b.dataset.touch);
      if (b.dataset.touch === 'item') useHeldItem();
      update();
    };
    const up = e => { pointers.delete(e.pointerId); update(); };
    touchEl.addEventListener('pointerdown', down);
    touchEl.addEventListener('pointerup', up);
    touchEl.addEventListener('pointercancel', up);
    touchEl.addEventListener('lostpointercapture', up);
    touchEl._raceHandlers = {down, up, pointers};
  }

  function unmountTouch() {
    if (!touchEl) return;
    const h = touchEl._raceHandlers;
    if (h) {
      touchEl.removeEventListener('pointerdown', h.down);
      touchEl.removeEventListener('pointerup', h.up);
      touchEl.removeEventListener('pointercancel', h.up);
      touchEl.removeEventListener('lostpointercapture', h.up);
    }
    touchEl.remove();
    touchEl = null;
    touch.throttle = 0; touch.brake = 0; touch.steer = 0;
  }

  function buildScene() {
    if (!graphics.ok) {
      worldGroup = null;
      return;
    }
    disposeRaceScene(graphics.scene);
    const {scene, camera, renderer} = graphics;
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    buildRaceScenery({scene, renderer, group: worldGroup, track, metrics});

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
    steering = 0;
    cameraHeading = heading;
    camX = px - Math.sin(heading) * 9;
    camY = 4.3;
    camZ = pz - Math.cos(heading) * 9;
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
      speed += carDef.accel * 0.62 * thr * dt / carDef.mass;
    } else {
      speed *= Math.pow(0.25, dt); // coast friction
    }
    if (brk > 0) {
      if (speed > 0.8) speed -= carDef.brake * brk * dt;
      else speed -= carDef.brake * 0.35 * brk * dt; // light reverse
    }
    speed = Math.max(-carDef.topSpeed * 0.25, Math.min(top, speed));

    // With +Z forward, positive yaw turns LEFT in the chase camera.
    // Smooth key presses, return promptly to neutral, and keep corners reachable at speed.
    steering += (steerIn - steering) * (1 - Math.exp(-dt * (steerIn ? 12 : 18)));
    const speedRatio = Math.min(1, Math.abs(speed) / carDef.topSpeed);
    const steerRate = carDef.handling * (1 - speedRatio * 0.15) * gripMul;
    heading -= steering * steerRate * dt * Math.sign(speed) * Math.min(1, Math.abs(speed) / 6);

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
      playerMesh.rotation.z = steering * Math.min(Math.abs(speed) / 35, 1) * 0.035;
      for (const wheel of playerMesh.userData.wheels || []) {
        wheel.rotation.y = wheel.userData.front ? -steering * 0.34 : 0;
        wheel.children[0].rotation.x += speed * dt / 0.27;
      }
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

  function draw(dt = 1 / 60) {
    if (!graphics.ok || !playerMesh) return;
    const {camera, renderer, scene} = graphics;
    const angleDelta = Math.atan2(Math.sin(heading - cameraHeading), Math.cos(heading - cameraHeading));
    cameraHeading += angleDelta * (1 - Math.exp(-8 * dt));
    const follow = 1 - Math.exp(-12 * dt);
    const back = 9 + Math.min(2, Math.abs(speed) * 0.035);
    camX += (px - Math.sin(cameraHeading) * back - camX) * follow;
    camY += (4.3 + Math.abs(speed) * 0.012 - camY) * follow;
    camZ += (pz - Math.cos(cameraHeading) * back - camZ) * follow;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(px + Math.sin(cameraHeading) * 9, 1.5, pz + Math.cos(cameraHeading) * 9);
    renderer.render(scene, camera);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw(dt);
    if (running) raf = requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    const k = ({KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyE:'e',Space:' '})[e.code] || e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.throttle = true; e.preventDefault(); }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.brake = true; e.preventDefault(); }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
    if (k === ' ' || k === 'e' || k === 'E') { useHeldItem(); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const k = ({KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyE:'e',Space:' '})[e.code] || e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.throttle = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.brake = false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  }
  function clearInput() {
    for (const key of Object.keys(keys)) keys[key] = false;
    touch.throttle = touch.brake = touch.steer = 0;
    steering = 0;
    touchEl?._raceHandlers?.pointers.clear();
    touchEl?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  }
  function onVisibility() { if (document.hidden) clearInput(); }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    window.addEventListener('blur', clearInput);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  }
  function unbind() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('blur', clearInput);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  }

  function beginRace() {
    clearInput();
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
    clearInput();
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
    if (graphics.ok) disposeRaceScene(graphics.scene);
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
      heading,
      x: px, z: pz, steering,
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
