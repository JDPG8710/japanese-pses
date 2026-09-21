import {arcadeText} from './ArcadeText.mjs';

const BEST_PREFIX = 'piko-arcade-best:';

export function readBest(gameId) {
  try {
    const n = Number(localStorage.getItem(BEST_PREFIX + gameId) || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeBest(gameId, score) {
  const next = Math.max(0, Math.floor(Number(score) || 0));
  const prev = readBest(gameId);
  if (next <= prev) return prev;
  try {
    localStorage.setItem(BEST_PREFIX + gameId, String(next));
  } catch {/* ignore */}
  return next;
}

/**
 * Fullscreen canvas play shell: HUD, pause, game-over / clear overlays.
 * Games own the canvas draw loop; shell owns chrome + lifecycle.
 */
export function openArcadeShell({gameId, locale = 'en', onExit, onRetry}) {
  const t = arcadeText(locale);
  const copy = t.games[gameId] || {title: gameId, tip: ''};
  const root = document.createElement('div');
  root.className = 'arcade-shell';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', copy.title);
  root.innerHTML = `
    <div class="arcade-frame">
      <header class="arcade-hud">
        <div class="arcade-hud-left">
          <strong class="arcade-title">${esc(copy.title)}</strong>
          <span class="arcade-hard">${esc(t.hardHint)}</span>
        </div>
        <div class="arcade-hud-stats" aria-live="polite">
          <span data-hud="score">${esc(t.score)} 0</span>
          <span data-hud="lives">${esc(t.lives)} —</span>
          <span data-hud="extra"></span>
          <span data-hud="best">${esc(t.best)} ${readBest(gameId)}</span>
        </div>
        <div class="arcade-hud-actions">
          <button type="button" data-shell="pause">${esc(t.pause)}</button>
          <button type="button" data-shell="back">${esc(t.back)}</button>
        </div>
      </header>
      <p class="arcade-tip"><b>${esc(t.tip)}</b> · ${esc(copy.tip)}</p>
      <div class="arcade-stage">
        <canvas class="arcade-canvas" width="360" height="640" aria-label="${esc(copy.title)}"></canvas>
        <div class="arcade-overlay hidden" data-overlay>
          <div class="arcade-overlay-card">
            <p class="arcade-overlay-kicker" data-overlay-kicker></p>
            <h2 data-overlay-title></h2>
            <p data-overlay-body></p>
            <div class="arcade-overlay-actions">
              <button type="button" class="primary" data-shell="retry">${esc(t.retry)}</button>
              <button type="button" data-shell="back">${esc(t.back)}</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.append(root);
  document.body.classList.add('arcade-open');

  const canvas = root.querySelector('.arcade-canvas');
  const overlay = root.querySelector('[data-overlay]');
  const pauseBtn = root.querySelector('[data-shell="pause"]');
  let paused = false;
  let ended = false;
  let destroyed = false;

  function setHud({score, lives, best, extra} = {}) {
    if (destroyed) return;
    if (score != null) root.querySelector('[data-hud="score"]').textContent = `${t.score} ${Math.floor(score)}`;
    if (lives != null) root.querySelector('[data-hud="lives"]').textContent = `${t.lives} ${lives}`;
    if (extra != null) root.querySelector('[data-hud="extra"]').textContent = extra;
    if (best != null) root.querySelector('[data-hud="best"]').textContent = `${t.best} ${best}`;
  }

  function showResult({cleared, score, detail = ''}) {
    if (destroyed) return;
    ended = true;
    paused = false;
    pauseBtn.disabled = true;
    const saved = writeBest(gameId, score);
    setHud({score, best: saved});
    overlay.classList.remove('hidden');
    root.querySelector('[data-overlay-kicker]').textContent = cleared ? '★' : '×';
    root.querySelector('[data-overlay-title]').textContent = cleared ? t.cleared : t.gameOver;
    root.querySelector('[data-overlay-body]').textContent = `${t.score} ${Math.floor(score)}${detail ? ` · ${detail}` : ''} · ${t.best} ${saved}`;
  }

  function setPaused(next) {
    if (destroyed || ended) return;
    paused = !!next;
    pauseBtn.textContent = paused ? t.resume : t.pause;
    if (paused) {
      overlay.classList.remove('hidden');
      root.querySelector('[data-overlay-kicker]').textContent = 'Ⅱ';
      root.querySelector('[data-overlay-title]').textContent = t.paused;
      root.querySelector('[data-overlay-body]').textContent = copy.tip;
    } else {
      overlay.classList.add('hidden');
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    root.remove();
    document.body.classList.remove('arcade-open');
  }

  function onShellClick(event) {
    const action = event.target.closest('[data-shell]')?.dataset.shell;
    if (!action) return;
    event.preventDefault();
    if (action === 'back') {
      destroy();
      onExit?.();
      return;
    }
    if (action === 'retry') {
      overlay.classList.add('hidden');
      ended = false;
      paused = false;
      pauseBtn.disabled = false;
      pauseBtn.textContent = t.pause;
      onRetry?.();
      return;
    }
    if (action === 'pause') setPaused(!paused);
  }

  root.addEventListener('click', onShellClick);

  // Keep canvas sized for mobile while preserving logical 360×640 coords.
  function fit() {
    const stage = root.querySelector('.arcade-stage');
    const maxW = Math.min(stage.clientWidth, 420);
    const maxH = Math.min(window.innerHeight - 160, 720);
    const scale = Math.min(maxW / 360, maxH / 640);
    canvas.style.width = `${Math.floor(360 * scale)}px`;
    canvas.style.height = `${Math.floor(640 * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  const prevDestroy = destroy;
  return {
    root,
    canvas,
    get paused() { return paused; },
    get ended() { return ended; },
    setHud,
    showResult,
    setPaused,
    destroy() {
      window.removeEventListener('resize', fit);
      root.removeEventListener('click', onShellClick);
      prevDestroy();
    },
    fit
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

/** Minimal canvas stub for node smoke tests (no DOM). */
export function createStubCanvas(width = 360, height = 640) {
  const noop = () => {};
  const ctx = {
    fillStyle: '#000',
    strokeStyle: '#fff',
    font: '16px sans-serif',
    textAlign: 'left',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: noop,
    clearRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({width: 8}),
    setLineDash: noop,
    createLinearGradient() {
      return {addColorStop: noop};
    }
  };
  return {
    width,
    height,
    style: {},
    getBoundingClientRect: () => ({left: 0, top: 0, width, height}),
    addEventListener: noop,
    removeEventListener: noop,
    setPointerCapture: noop,
    getContext() { return ctx; }
  };
}
