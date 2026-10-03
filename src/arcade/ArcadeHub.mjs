import {rankedAttempt} from './ArcadeRanking.mjs';
import {arcadeText} from './ArcadeText.mjs';
import {openArcadeShell, readBest, createStubCanvas} from './ArcadeShell.mjs';
import {createRaceGame, RACE_DIFFICULTY, RACE_TRACKS, RACE_CARS, RACE_POWERUPS} from './RaceGame.mjs';
import {createBreakoutGame, BREAKOUT_DIFFICULTY} from './BreakoutGame.mjs';
import {createFruitSlashGame, FRUIT_DIFFICULTY} from './FruitSlashGame.mjs';
import {createNinjaTypeGame, NINJA_DIFFICULTY} from './NinjaTypeGame.mjs';
import {createBubbleGame, BUBBLE_DIFFICULTY} from './BubbleGame.mjs';
import {createRhythmGame, RHYTHM_DIFFICULTY} from './RhythmGame.mjs';
import {beginTownChallenge,cancelTownChallenge,settleTownChallenge,townDifficulty} from '../town/TownProgression.mjs';
import {loadState,saveState} from '../town/TownRules.mjs';
import {recordPlay} from '../stats/PlayCounts.js';
import {getTownAudio} from '../town/TownAudio.mjs';

export const ARCADE_IDS = Object.freeze(['race', 'breakout', 'fruit', 'ninja', 'bubble', 'rhythm']);

export const ARCADE_DIFFICULTY = Object.freeze({
  race: RACE_DIFFICULTY,
  breakout: BREAKOUT_DIFFICULTY,
  fruit: FRUIT_DIFFICULTY,
  ninja: NINJA_DIFFICULTY,
  bubble: BUBBLE_DIFFICULTY,
  rhythm: RHYTHM_DIFFICULTY
});

const ART = {
  race: ['🏎️ 🌙', '#ff6b4a'],
  breakout: ['🧱 ⚡', '#57dfff'],
  fruit: ['🍉 ✂️', '#ffd45e'],
  ninja: ['🥷 ⌨️', '#c791ff'],
  bubble: ['🎨 ✈️', '#8adcf6'],
  rhythm: ['🥁 🎵', '#ffb8d9']
};

const FACTORIES = {
  race: createRaceGame,
  breakout: createBreakoutGame,
  fruit: createFruitSlashGame,
  ninja: createNinjaTypeGame,
  bubble: createBubbleGame,
  rhythm: createRhythmGame
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
        <span class="tag">${esc(g.tag)}</span>
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

export function startArcade(id, {locale = 'en', onExit, state, persist, onProgress, seed} = {}) {
  if (!ARCADE_IDS.includes(id)) return null;
  activeSession?.destroy?.();
  let storage;try { storage = globalThis.localStorage; } catch {}
  state ||= loadState(storage);
  const save = () => { if (persist) persist(); else saveState(storage,state); };
  let ticket = null;
  let attempt = 0;
  let firstSeed = seed;
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
      ++attempt;
      game?.destroy?.();
      cancelTownChallenge(state,ticket);save();
      activeSession = null;
      audio?.exitToTown?.();
      onExit?.();
    },
    onRetry() {
      game?.destroy?.();
      cancelTownChallenge(state,ticket);
      wasPaused = false;
      audio?.resumeBgm?.();
      game = boot();
    }
  });

  function boot() {
    const thisAttempt = ++attempt;
    const difficulty = townDifficulty(state);
    ticket = beginTownChallenge(state,id,{seed:firstSeed ?? Date.now()});
    firstSeed = undefined;
    const thisTicket = ticket;
    const ranked=typeof window!=='undefined'?rankedAttempt(id,difficulty.level):null;
    save();
    shell.setProgress(difficulty);
    return FACTORIES[id]({
      difficulty,
      seed:thisTicket.seed,
      canvas: shell.canvas,
      locale,
      audio,
      autoStart: true,
      onHud(stats) {
        if (shell.paused || shell.ended) return;
        shell.setHud({...stats, best: readBest(id)});
      },
      onEnd(result) {
        if (thisAttempt !== attempt || shell.ended) return;
        game?.pause?.();
        audio?.pauseBgm?.();
        const reward = settleTownChallenge(state,thisTicket,result);
        save();
        onProgress?.(reward);
        shell.showResult({...result,reward,next:townDifficulty(state)});
        if(ranked)ranked.finish(result.score).then(()=>shell.refreshRanking()).catch(e=>shell.setRankStatus(e.status===401?'login':'error'));
      }
    });
  }

  game = boot();

  // Keep the canvas loop in sync with the shell pause toggle.
  shell.root.addEventListener('click', event => {
    if (!event.target.closest('[data-shell="pause"],[data-shell="board"]')) return;
    queueMicrotask(() => {
      if (shell.ended) return;
      if (shell.paused && !wasPaused) {
        game?.pause?.();
        audio?.pauseBgm?.();
        wasPaused = true;
      } else if (!shell.paused && wasPaused) {
        game?.resume?.();
        audio?.resumeBgm?.();
        wasPaused = false;
      }
    });
  });

  activeSession = {
    destroy() {
      ++attempt;
      game?.destroy?.();
      cancelTownChallenge(state,ticket);save();
      shell.destroy();
      activeSession = null;
    }
  };
  return activeSession;
}

/** Headless construction helper for smoke tests. */
export function createArcadeHeadless(id, {locale = 'en', difficulty, seed} = {}) {
  const canvas = createStubCanvas();
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`unknown arcade game: ${id}`);
  const game = factory({canvas, locale, difficulty, seed, autoStart: false, onHud() {}, onEnd() {}});
  game.start();
  game.tick(1 / 60);
  game.draw?.();
  const state = game.getState();
  game.destroy();
  return state;
}

export {ART, RACE_TRACKS, RACE_CARS, RACE_POWERUPS};
