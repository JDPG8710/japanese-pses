import assert from 'node:assert/strict';
import { newGame, play } from '../src/arena/GoRules.mjs';
import { chooseMove, levelProfile, estimatePosition } from '../src/arena/GoAI.mjs';

let checks = 0;
const check = (v, m) => { assert.ok(v, m); checks++; };

const b = levelProfile('beginner');
const e = levelProfile('easy');
const m = levelProfile('medium');
const h = levelProfile('hard');
check(b.pickPool > e.pickPool && e.pickPool >= m.pickPool && m.pickPool > h.pickPool, 'pick pools widen toward beginner');
check(b.blunderChance > e.blunderChance && e.blunderChance > m.blunderChance && h.blunderChance === 0, 'blunder chance falls with level');
check(!b.saveAtari && e.saveAtari && m.saveAtari && h.saveAtari, 'beginner lacks atari-save flag');
check(b.replyTop === 0 && e.replyTop === 0 && m.replyTop > 0 && h.replyTop > m.replyTop, 'reply search only medium+; hard wider');
check(h.captureWeight > e.captureWeight && e.captureWeight > b.captureWeight, 'capture weight scales up');
check(h.searchDepth >= 2 && m.searchDepth >= 1 && e.searchDepth === 0, 'hard deeper than medium; easy has no search');
check(h.useStaticEval && m.useStaticEval && !e.useStaticEval, 'static eval on medium/hard');
check(h.thinkMs >= 300 && h.thinkMs <= 600, 'hard think budget widened for deeper search');

function capturePosition() {
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
check(capBeginner < 0.85, `beginner misses capture more often (got ${capBeginner})`);

const { savePoint } = atariSavePosition();
const saveBeginner = rate(atariSavePosition, 'beginner', savePoint);
const saveEasy = rate(atariSavePosition, 'easy', savePoint);
const saveHard = rate(atariSavePosition, 'hard', savePoint);
console.log(`save rates beginner=${saveBeginner.toFixed(2)} easy=${saveEasy.toFixed(2)} hard=${saveHard.toFixed(2)}`);
check(saveHard >= 0.85, `hard almost always saves (got ${saveHard})`);
check(saveEasy >= 0.7, `easy often saves (got ${saveEasy})`);
check(saveBeginner < saveHard - 0.25, `beginner saves far less than hard (${saveBeginner} vs ${saveHard})`);

const est = estimatePosition(newGame());
check(Number.isFinite(est.black) && Number.isFinite(est.white) && Number.isFinite(est.lead), 'estimatePosition returns numbers');
check(est.white > est.black, 'empty board white ahead by komi in estimate');

for (const level of ['beginner', 'easy', 'medium', 'hard']) {
  let game = newGame();
  for (let i = 0; i < 12 && game.phase === 'playing'; i++) {
    const p = chooseMove(game, level);
    game = play(game, p);
  }
  check(game.moves.length > 0, `${level} plays legal sequence`);
}


// Opening: hard must not default to tengen; prefer corner/side framework.
{
  const tengen = 4 * 9 + 4;
  let tengenHits = 0;
  const firsts = new Set();
  for (let i = 0; i < 30; i++) {
    const mv = chooseMove(newGame(9), 'hard');
    firsts.add(mv);
    if (mv === tengen) tengenHits++;
  }
  check(tengenHits === 0, `hard first move avoids tengen (hits ${tengenHits})`);
  check(levelProfile('hard').fusekiWeight > levelProfile('easy').fusekiWeight, 'hard uses stronger fuseki prior');
  // Most first moves should sit on 3rd–4th line corners, not center.
  let cornerish = 0;
  for (const mv of firsts) {
    const x = mv % 9, y = Math.floor(mv / 9);
    const line = Math.min(x + 1, y + 1, 9 - x, 9 - y);
    if (line >= 2 && line <= 4) cornerish++;
  }
  check(cornerish >= Math.min(3, firsts.size), `hard opening stays in corner/side framework (${[...firsts]})`);
}

console.log(`Go AI difficulty: ${checks} checks passed.`);
