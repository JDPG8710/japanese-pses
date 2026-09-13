import assert from 'node:assert/strict';
import { newGame, play } from '../src/arena/GoRules.mjs';
import { chooseMove, levelProfile } from '../src/arena/GoAI.mjs';

let checks = 0;
const check = (v, m) => { assert.ok(v, m); checks++; };

// Personas must differ on concrete levers, not just tiny weight tweaks.
const b = levelProfile('beginner');
const e = levelProfile('easy');
const m = levelProfile('medium');
const h = levelProfile('hard');
check(b.pickPool > e.pickPool && e.pickPool >= m.pickPool && m.pickPool > h.pickPool, 'pick pools widen toward beginner');
check(b.blunderChance > e.blunderChance && e.blunderChance > m.blunderChance && h.blunderChance === 0, 'blunder chance falls with level');
check(!b.saveAtari && e.saveAtari && m.saveAtari && h.saveAtari, 'beginner lacks atari-save flag');
check(b.replyTop === 0 && e.replyTop === 0 && m.replyTop > 0 && h.replyTop > m.replyTop, 'reply search only medium+; hard wider');
check(h.captureWeight > e.captureWeight && e.captureWeight > b.captureWeight, 'capture weight scales up');
check(h.thinkMs >= 150 && h.thinkMs <= 250, 'hard think budget bounded ~150-250ms');

/** Build a 9x9 position where Black has an obvious one-stone capture at `capturePoint`. */
function capturePosition() {
  // White alone at 40 (ee), Black at 31/39/41; only liberty is 49 — Black captures there.
  const g = newGame(9, 'chinese');
  g.board[40] = 2;
  g.board[31] = 1;
  g.board[39] = 1;
  g.board[41] = 1;
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 31 }, { color: 2, point: 40 }, { color: 1, point: 39 }, { color: 2, point: null }, { color: 1, point: 41 }, { color: 2, point: null }];
  return { state: g, capturePoint: 49 };
}

/** Black one-stone group at 40 with sole liberty 49; must extend/save there. */
function atariSavePosition() {
  const g = newGame(9, 'chinese');
  g.board[40] = 1;
  g.board[31] = 2;
  g.board[39] = 2;
  g.board[41] = 2;
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 40 }, { color: 2, point: 31 }, { color: 1, point: null }, { color: 2, point: 39 }, { color: 1, point: null }, { color: 2, point: 41 }];
  return { state: g, savePoint: 49 };
}

function rate(fn, level, target, trials = 80) {
  let hit = 0;
  for (let i = 0; i < trials; i++) {
    const { state } = fn();
    const move = chooseMove(state, level);
    if (move === target) hit++;
  }
  return hit / trials;
}

const { capturePoint } = capturePosition();
// Sanity: capture is legal and removes the white stone.
const after = play(capturePosition().state, capturePoint);
check(after.board[40] === 0 && after.captures[0] === 1, 'fixture capture works');

const capBeginner = rate(capturePosition, 'beginner', capturePoint);
const capEasy = rate(capturePosition, 'easy', capturePoint);
const capMedium = rate(capturePosition, 'medium', capturePoint);
const capHard = rate(capturePosition, 'hard', capturePoint);
console.log(`capture rates beginner=${capBeginner.toFixed(2)} easy=${capEasy.toFixed(2)} medium=${capMedium.toFixed(2)} hard=${capHard.toFixed(2)}`);
check(capHard >= 0.85, `hard almost always captures (got ${capHard})`);
check(capMedium >= 0.75, `medium usually captures (got ${capMedium})`);
check(capEasy >= 0.7, `easy usually captures (got ${capEasy})`);
check(capBeginner < capHard - 0.25, `beginner captures far less than hard (${capBeginner} vs ${capHard})`);
check(capBeginner < 0.7, `beginner often misses capture (got ${capBeginner})`);

const { savePoint } = atariSavePosition();
const saveBeginner = rate(atariSavePosition, 'beginner', savePoint);
const saveEasy = rate(atariSavePosition, 'easy', savePoint);
const saveHard = rate(atariSavePosition, 'hard', savePoint);
console.log(`save rates beginner=${saveBeginner.toFixed(2)} easy=${saveEasy.toFixed(2)} hard=${saveHard.toFixed(2)}`);
check(saveHard >= 0.85, `hard almost always saves (got ${saveHard})`);
check(saveEasy >= 0.7, `easy often saves (got ${saveEasy})`);
check(saveBeginner < saveHard - 0.25, `beginner saves far less than hard (${saveBeginner} vs ${saveHard})`);

// Existing contract: all levels return legal moves / null from empty-ish games.
for (const level of ['beginner', 'easy', 'medium', 'hard']) {
  let game = newGame();
  for (let i = 0; i < 12 && game.phase === 'playing'; i++) {
    const p = chooseMove(game, level);
    game = play(game, p);
  }
  check(game.moves.length > 0, `${level} plays legal sequence`);
}

console.log(`Go AI difficulty: ${checks} checks passed.`);
