/** Hard ninja typing: fast falling words, mistakes cost lives, aggressive speed ramp. */
export const NINJA_DIFFICULTY = Object.freeze({
  lives: 3,
  clearWords: 36,
  fallSpeedStart: 78,
  fallSpeedMax: 230,
  spawnIntervalStart: 1.35,
  spawnIntervalMin: 0.55,
  maxActive: 4,
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

export function createNinjaTypeGame({canvas, onHud, onEnd, locale = 'en', autoStart = true} = {}) {
  const W = canvas?.width || 360;
  const H = canvas?.height || 640;
  const ctx = canvas?.getContext?.('2d');
  const D = NINJA_DIFFICULTY;
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

  function spawn() {
    if (active.length >= D.maxActive) return;
    const text = pickWord();
    const used = new Set(active.map(w => Math.round(w.x / 40)));
    let col = Math.floor(Math.random() * 7);
    for (let t = 0; t < 8 && used.has(col); t++) col = Math.floor(Math.random() * 7);
    active.push({
      text,
      typed: 0,
      x: 28 + col * ((W - 56) / 6),
      y: -20,
      speed: speed * (0.9 + Math.random() * 0.25)
    });
  }

  function matchBuffer() {
    if (!buffer) return;
    // Prefer the word that already has progress or starts with buffer
    const candidates = active.filter(w => w.text.startsWith(buffer));
    if (!candidates.length) {
      // mistake
      buffer = '';
      streak = 0;
      lives -= D.mistakeLifeCost;
      hud();
      if (lives <= 0) finish(false);
      return;
    }
    candidates.sort((a, b) => a.y - b.y);
    const target = candidates[0];
    target.typed = buffer.length;
    if (buffer === target.text) {
      score += 100 + streak * 30 + Math.floor(target.text.length * 15);
      streak += 1;
      typedCount += 1;
      active = active.filter(w => w !== target);
      buffer = '';
      speed = Math.min(D.fallSpeedMax, speed + 4.5);
      if (typedCount >= D.clearWords) return finish(true);
    }
    hud();
  }

  function tick(dt) {
    if (!running || ended) return;
    speed = Math.min(D.fallSpeedMax, speed + dt * 3.2);
    const interval = Math.max(D.spawnIntervalMin, D.spawnIntervalStart - typedCount * 0.02);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      spawnTimer = interval * (0.8 + Math.random() * 0.4);
    }
    for (const w of active) {
      w.y += w.speed * dt;
      if (w.y > H - 36) {
        w.dead = true;
        streak = 0;
        buffer = '';
        lives -= 1;
        if (lives <= 0) return finish(false);
      }
    }
    active = active.filter(w => !w.dead);
    hud();
  }

  function finish(cleared) {
    ended = true;
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    onEnd?.({cleared, score, detail: `${typedCount} words`});
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#0a1222';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff5c7a55';
    ctx.fillRect(0, H - 36, W, 36);
    for (const w of active) {
      const done = w.text.slice(0, w.typed);
      const rest = w.text.slice(w.typed);
      ctx.font = '700 20px ui-monospace,Menlo,Consolas,monospace';
      ctx.textAlign = 'left';
      const total = ctx.measureText(w.text).width;
      const x = w.x - total / 2;
      ctx.fillStyle = '#6ff0ad';
      ctx.fillText(done, x, w.y);
      ctx.fillStyle = '#e8f2ff';
      ctx.fillText(rest, x + ctx.measureText(done).width, w.y);
    }
    ctx.fillStyle = '#9ad7ff';
    ctx.font = '700 16px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(buffer ? `› ${buffer}` : 'type…', W / 2, H - 12);
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
    if (!running || ended) return;
    if (e.key === 'Backspace') {
      buffer = buffer.slice(0, -1);
      hud();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      buffer = '';
      hud();
      return;
    }
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      buffer += e.key.toLowerCase();
      matchBuffer();
      e.preventDefault();
    }
  }

  function bind() { typeof window !== 'undefined' && window.addEventListener('keydown', onKey); }
  function unbind() { typeof window !== 'undefined' && window.removeEventListener('keydown', onKey); }

  function start() {
    lives = D.lives; score = 0; typedCount = 0; buffer = ''; active = [];
    spawnTimer = 0.4; speed = D.fallSpeedStart; streak = 0; ended = false;
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
  return {
    start, pause, resume, destroy, tick, draw,
    /** test helper */
    type(ch) { buffer += ch; matchBuffer(); },
    getState: () => ({lives, score, typedCount, buffer, active: active.length, ended, speed})
  };
}
