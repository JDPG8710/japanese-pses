import {scheduleAutoAdvance,autoAdvanceText} from '../town/AutoAdvance.mjs';
import {rankingMarkup} from './ArcadeRanking.mjs';
import {arcadeText} from './ArcadeText.mjs';
import {progressionLabel,townPointsLabel} from '../town/TownProgression.mjs';

const BEST_PREFIX = 'piko-arcade-best:';
const scoreId=id=>id==='bubble'?'designer-v1':id==='rhythm'?'rhythm-v2':id;


export function readBest(gameId) {
  try {
    const n = Number(localStorage.getItem(BEST_PREFIX + scoreId(gameId)) || 0);
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
    localStorage.setItem(BEST_PREFIX + scoreId(gameId), String(next));
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
          <span class="arcade-hard">${esc(progressionLabel({level:1},locale))}</span>
        </div>
        <div class="arcade-hud-stats" aria-live="polite">
          <span data-hud="score">${esc(t.score)} 0</span>
          <span data-hud="lives">${esc(t.lives)} —</span>
          <span data-hud="extra"></span>
          <span data-hud="best">${esc(t.best)} ${readBest(gameId)}</span>
        </div>
        <div class="arcade-hud-actions">
          <button type="button" data-shell="board">${esc({zh:'排行榜',en:'Ranking',ja:'ランキング'}[locale])}</button>
          <button type="button" data-shell="pause">${esc(t.pause)}</button>
          <button type="button" data-shell="back">${esc(t.back)}</button>
        </div>
      </header>
      <p class="arcade-tip"><b>${esc(t.tip)}</b> · ${esc(copy.tip)}</p>
      <div class="arcade-stage">
        <canvas class="arcade-canvas" width="960" height="540" aria-label="${esc(copy.title)}"></canvas>
        <div class="arcade-overlay hidden" data-overlay>
          <div class="arcade-overlay-card">
            <p class="arcade-overlay-kicker" data-overlay-kicker></p>
            <h2 data-overlay-title></h2>
            <p data-overlay-body></p>
            <div class="arcade-overlay-actions">
              ${gameId==='bubble'?`<button type="button" data-shell="download">${esc({zh:'下载作品',ja:'ほぞん',en:'Download'}[locale])}</button>`:''}
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
  const stage = root.querySelector('.arcade-stage');
  const overlay = root.querySelector('[data-overlay]');
  const pauseBtn = root.querySelector('[data-shell="pause"]');
  let progressLevel=1,rankStatus=null;
  let paused = false;
  let ended = false;
  let cancelAdvance=()=>{};
  let destroyed = false;
  let enteredFullscreen = false;
  const board=document.createElement('div');root.querySelector('.arcade-overlay-actions').before(board);

  function requestFs() {
    const target = root;
    const req = target.requestFullscreen || target.webkitRequestFullscreen || document.documentElement.requestFullscreen;
    try {
      const p = req?.call(target) || req?.call(document.documentElement);
      if (p && typeof p.then === 'function') {
        p.then(() => { enteredFullscreen = true; }).catch(() => {});
      } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        enteredFullscreen = true;
      }
    } catch {/* graceful fallback: CSS full-bleed already covers viewport */}
  }
  requestFs();

  function setHud({score, lives, best, extra} = {}) {
    if (destroyed) return;
    if (score != null) root.querySelector('[data-hud="score"]').textContent = `${t.score} ${Math.floor(score)}`;
    if (lives != null) root.querySelector('[data-hud="lives"]').textContent = `${t.lives} ${lives}`;
    if (extra != null) root.querySelector('[data-hud="extra"]').textContent = extra;
    if (best != null) root.querySelector('[data-hud="best"]').textContent = `${t.best} ${best}`;
  }

  async function refreshRanking(){const level=progressLevel;board.innerHTML={zh:'加载排行榜…',ja:'よみこみ…',en:'Loading ranking…'}[locale];const markup=await rankingMarkup(gameId,level,locale);if(!destroyed&&level===progressLevel){board.innerHTML=markup;if(rankStatus)setRankStatus(rankStatus);}}
  function setRankStatus(status){if(destroyed)return;rankStatus=status;board.querySelector('[data-rank-status]')?.remove();const text=status==='login'?{zh:'登录后成绩才会进入玩家排行榜',ja:'ログインすると ランキングに のります',en:'Sign in to enter the player ranking'}:{zh:'成绩上传失败，本机成绩已保存',ja:'スコアの そうしんに しっぱいしました',en:'Upload failed; score saved on this device'};const p=document.createElement('p');p.dataset.rankStatus='';p.textContent=text[locale];board.append(p);}
  function setProgress(difficulty) {
    progressLevel=difficulty.level;
    root.querySelector('.arcade-hard').textContent = progressionLabel(difficulty,locale);
  }

  function restart(){
    if(destroyed)return;cancelAdvance();rankStatus=null;overlay.classList.add('hidden');ended=false;paused=false;pauseBtn.disabled=false;pauseBtn.textContent=t.pause;root.querySelector('[data-shell="retry"]').hidden=false;root.querySelector('[data-auto-next]')?.remove();onRetry?.();
  }

  function showResult({cleared, score, detail = '', reward, next}) {
    if (destroyed || ended) return;
    ended = true;
    overlay.dataset.outcome = cleared ? 'success' : 'retry';
    paused = false;
    pauseBtn.disabled = true;
    void refreshRanking();
    const saved = writeBest(gameId, score);
    setHud({score, best: saved});
    overlay.classList.remove('hidden');
    root.querySelector('[data-overlay-kicker]').textContent = cleared ? '★' : '×';
    root.querySelector('[data-overlay-title]').textContent = cleared ? t.cleared : t.gameOver;
    root.querySelector('[data-overlay-body]').textContent = `${t.score} ${Math.floor(score)}${detail ? ` · ${detail}` : ''} · ${t.best} ${saved}${reward?.awarded ? ` · +${townPointsLabel(reward.points,locale)} · ${progressionLabel(next,locale)}` : ''}`;
    root.querySelector('[data-shell="retry"]').hidden=!!cleared;
    if(cleared){const message=document.createElement('p');message.dataset.autoNext='';message.setAttribute('role','status');message.textContent=autoAdvanceText(locale);root.querySelector('.arcade-overlay-actions').before(message);cancelAdvance=scheduleAutoAdvance(restart);}
    root.querySelector('[data-shell="retry"]').textContent = cleared ? ({zh:'下一关 →',ja:'つぎのレベル →',en:'Next challenge →'}[locale] || 'Next challenge →') : t.retry;
  }

  function setPaused(next) {
    if (destroyed || ended) return;
    paused = !!next;
    if(paused)void refreshRanking();else board.innerHTML='';
    pauseBtn.textContent = paused ? t.resume : t.pause;
    if (paused) {
      overlay.classList.remove('hidden');
      root.querySelector('[data-overlay-kicker]').textContent = 'Ⅱ';
      root.querySelector('[data-overlay-title]').textContent = t.paused;
      root.querySelector('[data-overlay-body]').textContent = copy.tip;
      root.querySelector('[data-shell="retry"]').textContent = t.retry;
    } else {
      overlay.classList.add('hidden');
    }
  }

  function exitFs() {
    try {
      if (enteredFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      }
    } catch {/* ignore */}
    enteredFullscreen = false;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAdvance();
    exitFs();
    resizeObs?.disconnect?.();
    window.removeEventListener('resize', fit);
    root.removeEventListener('click', onShellClick);
    root.remove();
    document.body.classList.remove('arcade-open');
  }

  function onShellClick(event) {
    const action = event.target.closest('[data-shell]')?.dataset.shell;
    if (!action) return;
    event.preventDefault();
    if(action==='download'){if(gameId==='bubble'){canvas.dispatchEvent(new Event('arcade-export'));return;}const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='my-design.png';a.click();return;}
    if (action === 'back') {
      destroy();
      onExit?.();
      return;
    }
    if (action === 'retry') {
      restart();
      return;
    }
    if (action === 'board'){if(ended){void refreshRanking();return;}setPaused(!paused);return;}
    if (action === 'pause') setPaused(!paused);
  }

  root.addEventListener('click', onShellClick);

  // Fill the stage; buffer matches CSS size * dpr for sharp Three.js / canvas.
  function fit() {
    const w = Math.max(2, stage.clientWidth || window.innerWidth);
    const h = Math.max(2, stage.clientHeight || Math.floor(window.innerHeight * 0.72));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.dispatchEvent(new Event('arcade-resize'));
  }
  fit();
  const resizeObs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  resizeObs?.observe(stage);
  window.addEventListener('resize', fit);

  return {
    root,
    canvas,
    get paused() { return paused; },
    get ended() { return ended; },
    setHud,
    refreshRanking,
    setRankStatus,
    setProgress,
    showResult,
    setPaused,
    destroy() {
      window.removeEventListener('resize', fit);
      root.removeEventListener('click', onShellClick);
      destroy();
    },
    fit
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

/** Minimal canvas stub for node smoke tests (no DOM / no WebGL). */
export function createStubCanvas(width = 960, height = 540) {
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
    getContext(type) {
      if (type === 'webgl' || type === 'webgl2') return null;
      return ctx;
    }
  };
}
