import {arcadeText} from './ArcadeText.mjs?v=3';
import {openArcadeShell, readBest, createStubCanvas} from './ArcadeShell.mjs';
import {createRaceGame, RACE_DIFFICULTY, RACE_TRACKS, RACE_CARS, RACE_POWERUPS} from './RaceGame.mjs?v=4';
import {createBreakoutGame, BREAKOUT_DIFFICULTY} from './BreakoutGame.mjs?v=2';
import {createFruitSlashGame, FRUIT_DIFFICULTY} from './FruitSlashGame.mjs';
import {createNinjaTypeGame, NINJA_DIFFICULTY} from './NinjaTypeGame.mjs';
import {recordPlay} from '../stats/PlayCounts.js';
import {getTownAudio} from '../town/TownAudio.mjs?v=1';

export const ARCADE_IDS = Object.freeze(['race', 'breakout', 'fruit', 'ninja']);

export const ARCADE_DIFFICULTY = Object.freeze({
  race: RACE_DIFFICULTY,
  breakout: BREAKOUT_DIFFICULTY,
  fruit: FRUIT_DIFFICULTY,
  ninja: NINJA_DIFFICULTY
});

const ART = {
  race: ['🏎️ 🌙', '#ff6b4a'],
  breakout: ['🧱 ⚡', '#57dfff'],
  fruit: ['🍉 ✂️', '#ffd45e'],
  ninja: ['🥷 ⌨️', '#c791ff']
};

const FACTORIES = {
  race: createRaceGame,
  breakout: createBreakoutGame,
  fruit: createFruitSlashGame,
  ninja: createNinjaTypeGame
};

export function playKeyForArcade(id) {
  return `arcade:${id}`;
}

export function arcadeSectionMarkup(locale = 'en', {esc = s => s, button = (a, t, c = '') => `<button type="button" data-action="${a}" class="${c}">${esc(t)}</button>`} = {}) {
  const t = arcadeText(locale);
  const cards = ARCADE_IDS.map(id => {
    const g = t.games[id];
    const best = typeof localStorage !== 'undefined' ? readBest(id) : 0;
    return `<article class="card arcade-card" data-arcade="${id}">
      <div class="card-art" style="--tint:${ART[id][1]}" aria-hidden="true">${ART[id][0]}</div>
      <div class="card-body">
        <span class="tag">${esc(g.tag)} · ${esc(t.hardHint)}</span>
        <h3>${esc(g.title)}</h3>
        <p>${esc(g.blurb)}</p>
        <p class="muted arcade-best">${esc(t.best)}: ${best}</p>
        <div class="actions">${button(`arcade:${id}`, t.play, 'primary')}</div>
      </div>
    </article>`;
  }).join('');
  return `<section class="arcade-section" aria-labelledby="arcade-heading">
    <div class="section-top arcade-section-top">
      <div>
        <p class="eyebrow">${esc(t.sectionKicker)}</p>
        <h2 id="arcade-heading">${esc(t.section)}</h2>
        <p class="muted">${esc(t.sectionIntro)}</p>
      </div>
    </div>
    <div class="cards arcade-cards">${cards}</div>
  </section>`;
}

let activeSession = null;

export function startArcade(id, {locale = 'en', onExit} = {}) {
  if (!ARCADE_IDS.includes(id)) return null;
  activeSession?.destroy?.();
  void recordPlay(playKeyForArcade(id));
  const audio = typeof window !== 'undefined' ? getTownAudio() : null;
  audio?.unlock?.();
  audio?.enterArcade?.(id);

  let game = null;
  let wasPaused = false;
  const shell = openArcadeShell({
    gameId: id,
    locale,
    onExit() {
      game?.destroy?.();
      activeSession = null;
      audio?.exitToTown?.();
      onExit?.();
    },
    onRetry() {
      game?.destroy?.();
      wasPaused = false;
      game = boot();
    }
  });

  function boot() {
    return FACTORIES[id]({
      canvas: shell.canvas,
      locale,
      audio,
      autoStart: true,
      onHud(stats) {
        if (shell.paused || shell.ended) return;
        shell.setHud({...stats, best: readBest(id)});
      },
      onEnd(result) {
        game?.pause?.();
        shell.showResult(result);
      }
    });
  }

  game = boot();

  // Keep the canvas loop in sync with the shell pause toggle.
  shell.root.addEventListener('click', event => {
    if (!event.target.closest('[data-shell="pause"]')) return;
    queueMicrotask(() => {
      if (shell.ended) return;
      if (shell.paused && !wasPaused) {
        game?.pause?.();
        wasPaused = true;
      } else if (!shell.paused && wasPaused) {
        game?.resume?.();
        wasPaused = false;
      }
    });
  });

  activeSession = {
    destroy() {
      game?.destroy?.();
      shell.destroy();
      activeSession = null;
    }
  };
  return activeSession;
}

/** Headless construction helper for smoke tests. */
export function createArcadeHeadless(id, {locale = 'en'} = {}) {
  const canvas = createStubCanvas();
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`unknown arcade game: ${id}`);
  const game = factory({canvas, locale, autoStart: false, onHud() {}, onEnd() {}});
  game.start();
  game.tick(1 / 60);
  game.draw?.();
  const state = game.getState();
  game.destroy();
  return state;
}

export {ART, RACE_TRACKS, RACE_CARS, RACE_POWERUPS};
