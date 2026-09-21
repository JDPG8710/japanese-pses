import assert from 'node:assert/strict';
import {ARCADE_TEXT, arcadeText} from '../src/arcade/ArcadeText.mjs';
import {createStubCanvas, readBest, writeBest} from '../src/arcade/ArcadeShell.mjs';
import {ARCADE_IDS, ARCADE_DIFFICULTY, createArcadeHeadless, playKeyForArcade, arcadeSectionMarkup} from '../src/arcade/ArcadeHub.mjs';
import {createRaceGame, RACE_DIFFICULTY} from '../src/arcade/RaceGame.mjs';
import {createBreakoutGame, BREAKOUT_DIFFICULTY} from '../src/arcade/BreakoutGame.mjs';
import {createFruitSlashGame, FRUIT_DIFFICULTY} from '../src/arcade/FruitSlashGame.mjs';
import {createNinjaTypeGame, NINJA_DIFFICULTY, wordsForLocale} from '../src/arcade/NinjaTypeGame.mjs';
import {validPlayKey} from '../src/stats/PlayKeys.mjs';
import {readFile} from 'node:fs/promises';

assert.deepEqual([...ARCADE_IDS], ['race', 'breakout', 'fruit', 'ninja']);
for (const locale of ['en', 'zh', 'ja']) {
  const t = arcadeText(locale);
  assert.ok(t.section && t.play && t.games.race.title);
  for (const id of ARCADE_IDS) assert.ok(t.games[id].title && t.games[id].blurb);
}
assert.equal(ARCADE_TEXT.zh.section, '休闲街机');
assert.equal(ARCADE_TEXT.ja.section, 'アーケード');

for (const id of ARCADE_IDS) {
  assert.equal(playKeyForArcade(id), `arcade:${id}`);
  assert.equal(validPlayKey(`arcade:${id}`), true);
  assert.ok(ARCADE_DIFFICULTY[id]);
}

// Difficulty knobs stay hard (not baby-mode).
assert.ok(RACE_DIFFICULTY.clearDistance >= 4500);
assert.ok(RACE_DIFFICULTY.lives <= 2);
assert.ok(RACE_DIFFICULTY.spawnIntervalMin <= 0.35);
assert.ok(BREAKOUT_DIFFICULTY.paddleWidth <= 60);
assert.ok(BREAKOUT_DIFFICULTY.lives <= 2);
assert.ok(BREAKOUT_DIFFICULTY.brickHitsMax >= 2);
assert.ok(FRUIT_DIFFICULTY.bombChanceStart >= 0.25);
assert.ok(FRUIT_DIFFICULTY.minComboToCreditWave >= 3);
assert.ok(NINJA_DIFFICULTY.clearWords >= 30);
assert.ok(NINJA_DIFFICULTY.fallSpeedMax >= 200);

for (const id of ARCADE_IDS) {
  const state = createArcadeHeadless(id, {locale: 'en'});
  assert.equal(typeof state.score, 'number');
  assert.equal(state.ended, false);
}

const race = createRaceGame({canvas: createStubCanvas(), autoStart: false, onHud() {}, onEnd() {}});
race.start();
for (let i = 0; i < 30; i++) race.tick(1 / 60);
assert.ok(race.getState().distance > 0);
race.destroy();

const ninja = createNinjaTypeGame({canvas: createStubCanvas(), locale: 'ja', autoStart: false, onHud() {}, onEnd() {}});
ninja.start();
ninja.tick(0.5);
assert.ok(wordsForLocale('ja').length >= 20);
ninja.destroy();

const html = arcadeSectionMarkup('zh');
assert.match(html, /休闲街机/);
assert.match(html, /data-action="arcade:race"/);
assert.match(html, /data-action="arcade:ninja"/);

const worldPlay = await readFile(new URL('../src/world/WorldPlay.mjs', import.meta.url), 'utf8');
assert.match(worldPlay, /arcadeSectionMarkup/);
assert.match(worldPlay, /startArcade/);
assert.match(worldPlay, /action==='arcade'/);
const worldHtml = await readFile(new URL('../world.html', import.meta.url), 'utf8');
assert.match(worldHtml, /src\/arcade\/arcade\.css/);
assert.match(worldHtml, /WorldPlay\.mjs\?v=/);

// Logic lab games list unchanged.
const {GAMES} = await import('../src/world/WorldRules.mjs');
assert.deepEqual(GAMES, ['circuit', 'sudoku', 'code', 'robot', 'set', 'balance', 'order', 'water', 'network']);

console.log(`Arcade smoke: ${ARCADE_IDS.length} games + i18n + difficulty knobs + headless ticks OK`);
