/** 3D fruit slash — blade trail, split halves, juice bursts. */
import {normalizeDifficulty,challengeRandom} from '../town/TownProgression.mjs';
import {createFruitVisuals,FRUIT_TYPES,FRUIT_SIZES,FRUIT_BOMBS} from './FruitVisuals.mjs';
export {FRUIT_TYPES,FRUIT_SIZES,FRUIT_BOMBS} from './FruitVisuals.mjs';
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
  missLifeCost: true,
  timeLimit:55
});


export function fruitDifficultyFor(difficulty) {
 const s=normalizeDifficulty(difficulty).scale;
 return Object.freeze({...FRUIT_DIFFICULTY,clearWaves:6+Math.floor(s*3),throwIntervalStart:.85/(1+.28*s),throwIntervalMin:.42/(1+.2*s),bombChanceStart:.14+.06*s,bombChanceMax:.28+.04*s,fruitSpeed:7.5+.4*s,gravity:9.5+1.2*s,slashRadius:.85-.12*s});
}

export function createFruitSlashGame({canvas, onHud, onEnd, audio = null, autoStart = true, difficulty, seed=Date.now()} = {}) {
  const D = fruitDifficultyFor(difficulty);
  let random=challengeRandom(seed);
  const graphics = createArcadeRenderer(canvas, {clear: 0x152418});
  const visuals=graphics.ok?createFruitVisuals():null;
  let remainingTime=D.timeLimit,frozenFor=0,lastAward=0;
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
      extra: `⏱ ${Math.ceil(remainingTime)}s · ${waveHits}/${waveNeed} · ${combo}x · W${creditedWaves}/${D.clearWaves}${frozenFor>0?' · ❄':''}${lastAward?` · +${lastAward}`:''}`
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
    onResize();
  }

  function spawn() {
    const isBomb=random()<bombChance(),spec=isBomb?FRUIT_BOMBS[Math.floor(random()*FRUIT_BOMBS.length)]:FRUIT_TYPES[Math.floor(random()*FRUIT_TYPES.length)];
    const size=FRUIT_SIZES[Math.floor(random()*FRUIT_SIZES.length)],radius=isBomb?.46:size.radius;
    const x=(random()-.5)*5.4,speed=D.fruitSpeed+Math.min(2,wave*.22)+random()*1.5,z=0;
    const mesh=visuals?(isBomb?visuals.bomb(spec.id,radius):visuals.fruit(spec.id,radius)):null;
    if(mesh){mesh.position.set(x,-2.5,z);itemGroup.add(mesh);}
    items.push({x,y:-2.5,z,vx:(random()-.5)*1.5,vy:speed,vz:0,bomb:isBomb,kind:spec.id,size:size.id,radius,points:isBomb?0:size.points,alive:true,mesh,color:spec.color,spun:random()*Math.PI*2});
  }

  function splitFruit(item, point) {
    if (!graphics.ok || !fxGroup) return;
    const origin = new THREE.Vector3(item.x, item.y, item.z);
    particles = particles.concat(spawnParticleBurst(fxGroup, origin, {
      count: 14, color: item.color || 0xff6b6b, speed: 5, life: 0.42, size: 0.09
    }));
    for (const side of [-1, 1]) {
      const half = visuals.half(item.kind,item.radius,side);
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
    if(!running||ended||frozenFor>0)return;
    let hit = false;
    for (const item of items) {
      if (!item.alive) continue;

      const from=lastPoint||point,sx=point.x-from.x,sy=point.y-from.y,den=sx*sx+sy*sy;
      const t=den?Math.max(0,Math.min(1,((item.x-from.x)*sx+(item.y-from.y)*sy)/den)):0;
      const ex=item.x-from.x-sx*t,ey=item.y-from.y-sy*t;
      if (ex*ex+ey*ey > (item.radius+D.slashRadius*.2) ** 2) continue;
      item.alive = false;
      if (item.mesh) item.mesh.visible = false;
      hit = true;
      if (item.bomb) {
        const effect=FRUIT_BOMBS.find(b=>b.id===item.kind);
        lives-=effect.lives||0;remainingTime=Math.max(0,remainingTime-(effect.seconds||0));frozenFor=effect.freeze||0;lastAward=0;
        combo = 0;
        try { audio?.bomb?.(); } catch {}
        if (graphics.ok && fxGroup) {
          particles = particles.concat(spawnParticleBurst(fxGroup, new THREE.Vector3(item.x, item.y, item.z), {
            count: 16, color: effect.color, speed: 6, life: 0.35, size: 0.11
          }));
        }
        hud();
        if (lives <= 0||remainingTime<=0) return finish(false);
        if(frozenFor>0)break;
      } else {
        try { audio?.fruitCut?.(); } catch {}
        splitFruit(item, point);
        combo += 1;
        lastAward=item.points+Math.min(10,combo*2);score+=lastAward;
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
    const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;remainingTime=Math.max(0,remainingTime-elapsed);frozenFor=Math.max(0,frozenFor-elapsed);dt=Math.min(.05,elapsed);
    if(remainingTime<=0){hud();return finish(false);}
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      if (random() < 0.25) spawn();
      const t = Math.max(D.throwIntervalMin, D.throwIntervalStart - wave * 0.04);
      spawnTimer = t * (0.8 + random() * 0.4);
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
      }
      if (h.life <= 0 || h.y < -4) {
        fxGroup?.remove(h.mesh);
        return false;
      }
      return true;
    });
    particles = updateParticles(particles, dt, fxGroup);
    trail?.update(dt);
    hud();
  }

  function finish(cleared) {
    if(ended)return;
    ended = true; running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `⏱ ${Math.ceil(remainingTime)}s · ${creditedWaves}/${D.clearWaves}`});
  }

  function draw() {
    if (!graphics.ok) return;
    graphics.renderer.render(graphics.scene, graphics.camera);
  }
  function loop(ts) {
    if (!running) return;
    const dt = Math.max(0, (ts - last) / 1000 || 0.016);
    last = ts; tick(dt); draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function onDown(e) {
    if(!running||ended)return;
    slicing = true;
    canvas.setPointerCapture?.(e.pointerId);
    const point = pointerToWorld(e);lastPoint=point;
    if (point) {
      try { audio?.slash?.(); } catch {}
      trail?.push(point);
      slashAt(point);
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
  function onResize() { resizeArcade3D(graphics, canvas);if(graphics.ok){graphics.camera.position.set(0,.6,Math.max(8,3.6/(Math.tan(55*Math.PI/360)*graphics.camera.aspect)));graphics.camera.lookAt(0,.6,0);} }

  function bind() {
    canvas?.addEventListener?.('pointerdown', onDown);
    canvas?.addEventListener?.('pointermove', onMove);
    canvas?.addEventListener?.('pointerup', onUp);
    canvas?.addEventListener?.('pointercancel', onUp);
    canvas?.addEventListener?.('arcade-resize',onResize);
    typeof window !== 'undefined' && window.addEventListener('resize', onResize);
  }
  function unbind() {
    canvas?.removeEventListener?.('pointerdown', onDown);
    canvas?.removeEventListener?.('pointermove', onMove);
    canvas?.removeEventListener?.('pointerup', onUp);
    canvas?.removeEventListener?.('pointercancel', onUp);
    canvas?.removeEventListener?.('arcade-resize',onResize);
    typeof window !== 'undefined' && window.removeEventListener('resize', onResize);
  }

  function start() {
    random=challengeRandom(seed);
    lives = D.lives; score = 0; wave = 1; waveHits = 0; waveNeed = 5;
    combo = 0; creditedWaves = 0; items = []; halves = []; particles = []; spawnTimer = 0.3; ended = false;
    remainingTime=D.timeLimit;frozenFor=0;lastAward=0;lastPoint=null;slicing=false;
    if (itemGroup) while (itemGroup.children.length) itemGroup.remove(itemGroup.children[0]);
    if (fxGroup) while (fxGroup.children.length) fxGroup.remove(fxGroup.children[0]);
    trail?.clear();
    running = true; last = performance.now?.() || 0; hud();
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }
  function pause() { running = false;slicing=false;lastPoint=null; typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf); }
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
    visuals?.dispose();
  }

  buildScene();
  bind();
  if (autoStart) start();
  return {start, pause, resume, destroy, tick, draw, slashAt,
    projectToScreen(point){if(!graphics.ok)return null;const p=new THREE.Vector3(point.x,point.y,point.z||0).project(graphics.camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
    getState: () => ({difficulty:D, lives, score, wave, combo, creditedWaves, remainingTime,frozenFor,lastAward,items:items.filter(i=>i.alive).map(({x,y,z,vx,vy,vz,bomb,kind,radius,size,points})=>({x,y,z,vx,vy,vz,bomb,kind,radius,size,points})), ended, gl: graphics.ok})};
}
