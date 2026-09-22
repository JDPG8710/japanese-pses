/** 3D ninja typing — floating word panels approaching the camera. */
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, THREE
} from './Arcade3D.mjs?v=1';

export const NINJA_DIFFICULTY = Object.freeze({
  lives: 4,
  clearWords: 24,
  fallSpeedStart: 3.2,
  fallSpeedMax: 7.5,
  spawnIntervalStart: 1.8,
  spawnIntervalMin: 0.9,
  maxActive: 3,
  mistakeLifeCost: 1
});

const WORDS = {
  en: [
    'blade', 'shadow', 'swift', 'focus', 'quiet', 'strike', 'ember', 'frost', 'pulse', 'orbit',
    'vector', 'cipher', 'flux', 'prism', 'quartz', 'rhythm', 'signal', 'thunder', 'velvet', 'whisper',
    'zenith', 'arcade', 'cascade', 'drift', 'echo', 'falcon', 'glyph', 'harbor', 'ivory', 'jungle',
    'karma', 'lunar', 'mirage', 'nebula', 'onyx', 'phoenix', 'quark', 'raven', 'solar', 'tempo'
  ],
  zh: [
    'ninja', 'piko', 'arcade', 'focus', 'swift', 'blade', 'combo', 'score', 'wave', 'clear',
    'drift', 'pulse', 'orbit', 'flux', 'prism', 'echo', 'solar', 'lunar', 'storm', 'quiet',
    'hua', 'shan', 'feng', 'yun', 'xing', 'yue', 'guang', 'su', 'ji', 'dong',
    'kai', 'guan', 'sheng', 'li', 'qiang', 'ruo', 'kuai', 'man', 'gao', 'di'
  ],
  ja: [
    'ninja', 'katana', 'sakura', 'ramen', 'sushi', 'tokyo', 'osaka', 'kaze', 'yuki', 'tsuki',
    'hoshi', 'hayai', 'shizuka', 'kiru', 'tatakau', 'mamoru', 'hikari', 'kage', 'mizu', 'hi',
    'sora', 'umi', 'yama', 'mori', 'hana', 'tori', 'neko', 'inu', 'ashi', 'te',
    'kokoro', 'chikara', 'hayate', 'raimei', 'shinobi', 'bujutsu', 'seishin', 'kakugo', 'shinken', 'musou'
  ]
};

export function wordsForLocale(locale = 'en') {
  return WORDS[locale] || WORDS.en;
}

function makeWordPanel(text) {
  const g = new THREE.Group();
  const plate = boxMesh(Math.max(2.2, text.length * 0.32), 0.7, 0.12, 0x2a1f3a);
  g.add(plate);
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1b1524';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f4e8ff';
    ctx.font = 'bold 64px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64, 480);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, transparent: true}));
    sprite.scale.set(Math.max(2.2, text.length * 0.32), 0.7, 1);
    sprite.position.z = 0.1;
    g.add(sprite);
    g.userData.sprite = sprite;
  }
  return g;
}

export function createNinjaTypeGame({canvas, onHud, onEnd, locale = 'en', autoStart = true} = {}) {
  const D = NINJA_DIFFICULTY;
  const graphics = createArcadeRenderer(canvas, {clear: 0x0c0814});
  const bag = [...wordsForLocale(locale)];
  let lives = D.lives;
  let score = 0;
  let typedCount = 0;
  let buffer = '';
  let active = [];
  let spawnTimer = 0;
  let speed = D.fallSpeedStart;
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let streak = 0;
  let wordGroup = null;

  function hud() {
    onHud?.({
      score,
      lives,
      extra: `${typedCount}/${D.clearWords} · ${buffer || '…'}`
    });
  }

  function pickWord() {
    if (!bag.length) bag.push(...wordsForLocale(locale));
    const i = Math.floor(Math.random() * bag.length);
    return bag.splice(i, 1)[0];
  }

  function buildScene() {
    if (!graphics.ok) return;
    const {scene, camera} = graphics;
    while (scene.children.length) scene.remove(scene.children[0]);
    scene.fog = new THREE.Fog(0x0c0814, 8, 40);
    scene.add(new THREE.HemisphereLight(0xd0b8ff, 0x1a1028, 1.1));
    const moon = new THREE.DirectionalLight(0xc8d8ff, 0.9);
    moon.position.set(-4, 10, -6);
    scene.add(moon);
    const floor = boxMesh(20, 0.2, 40, 0x1a1224);
    floor.position.set(0, -1.5, -10);
    scene.add(floor);
    // dojo pillars
    for (const x of [-6, 6]) {
      const p = boxMesh(0.6, 4, 0.6, 0x3a2a18);
      p.position.set(x, 0.5, -8);
      scene.add(p);
    }
    wordGroup = new THREE.Group();
    scene.add(wordGroup);
    camera.position.set(0, 1.2, 6);
    camera.lookAt(0, 0.8, -8);
    resizeArcade3D(graphics, canvas);
  }

  function spawn() {
    if (active.length >= D.maxActive) return;
    const text = pickWord();
    const used = new Set(active.map(w => Math.round(w.x)));
    let col = Math.floor(Math.random() * 5) - 2;
    for (let t = 0; t < 8 && used.has(col); t++) col = Math.floor(Math.random() * 5) - 2;
    const mesh = graphics.ok ? makeWordPanel(text) : null;
    const x = col * 1.6;
    const z = -28;
    if (mesh) {
      mesh.position.set(x, 1.2 + Math.random() * 0.6, z);
      wordGroup.add(mesh);
    }
    active.push({text, typed: 0, x, z, mesh});
  }

  function destroyWord(w, ok) {
    if (w.mesh) wordGroup?.remove(w.mesh);
    active = active.filter(a => a !== w);
    if (ok) {
      typedCount += 1;
      streak += 1;
      score += 20 + streak * 3;
      speed = Math.min(D.fallSpeedMax, D.fallSpeedStart + typedCount * 0.12);
      if (typedCount >= D.clearWords) finish(true);
    }
    buffer = '';
    hud();
  }

  function tick(dt) {
    if (!running || ended) return;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      const t = Math.max(D.spawnIntervalMin, D.spawnIntervalStart - typedCount * 0.02);
      spawnTimer = t;
    }
    for (const w of [...active]) {
      w.z += speed * dt;
      if (w.mesh) {
        w.mesh.position.z = w.z;
        w.mesh.position.y = 1.2 + Math.sin(w.z * 0.2) * 0.15;
      }
      if (w.z > 4.5) {
        lives -= D.mistakeLifeCost;
        streak = 0;
        destroyWord(w, false);
        if (lives <= 0) return finish(false);
      }
    }
    hud();
  }

  function finish(cleared) {
    ended = true; running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `${typedCount} words`});
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

  function onKey(e) {
    if (!running || ended) return;
    if (e.key === 'Backspace') {
      buffer = buffer.slice(0, -1);
      hud();
      e.preventDefault();
      return;
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    const ch = e.key.toLowerCase();
    if (!/[a-z]/.test(ch)) return;
    e.preventDefault();
    buffer += ch;
    const match = active.find(w => w.text.startsWith(buffer));
    if (!match) {
      lives -= D.mistakeLifeCost;
      streak = 0;
      buffer = '';
      hud();
      if (lives <= 0) return finish(false);
      return;
    }
    if (match.text === buffer) destroyWord(match, true);
    else hud();
  }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    typeof window !== 'undefined' && window.addEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.addEventListener('resize', onResize);
  }
  function unbind() {
    typeof window !== 'undefined' && window.removeEventListener('keydown', onKey);
    typeof window !== 'undefined' && window.removeEventListener('resize', onResize);
  }

  function start() {
    lives = D.lives; score = 0; typedCount = 0; buffer = ''; active = [];
    spawnTimer = 0.4; speed = D.fallSpeedStart; streak = 0; ended = false;
    if (wordGroup) while (wordGroup.children.length) wordGroup.remove(wordGroup.children[0]);
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
  return {
    start, pause, resume, destroy, tick, draw,
    getState: () => ({lives, score, typedCount, buffer, active: active.length, ended, speed, gl: graphics.ok})
  };
}
