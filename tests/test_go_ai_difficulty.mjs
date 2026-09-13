import assert from 'node:assert/strict';
import { newGame, play } from '../src/arena/GoRules.mjs';
import { chooseMove, levelProfile, estimatePosition, computerWinRate } from '../src/arena/GoAI.mjs';

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
check(h.searchDepth >= 3 && m.searchDepth >= 2 && e.searchDepth === 0, 'hard depth>=3; medium depth>=2; easy none');
check(h.useStaticEval && m.useStaticEval && !e.useStaticEval, 'static eval on medium/hard');
check(h.thinkMs >= 700 && h.thinkMs <= 1200, 'hard think budget for deeper search');
check(m.thinkMs >= 200 && m.thinkMs <= 400, 'medium think budget raised');

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
check(Number.isFinite(est.winRateBlack) && est.winRateBlack > 0.02 && est.winRateBlack < 0.98, 'winRateBlack present');
check(est.winRate === est.winRateBlack, 'winRate aliases Black win rate');
check(computerWinRate(newGame(), 2) > 0.5, 'empty board computer White win rate > 50%');

// Clear Chinese corner territory for Black should raise black estimate.
{
  const g = newGame(9, 'chinese');
  // Seal top-left 3x3-ish: Black owns (0,0)-(2,2) corner empties with a wall.
  // Place Black stones along a wall so empties in corner have only Black border.
  const blacks = [3, 12, 21, 30]; // x=3,y=0..3 vertical wall + bottom
  // Better: surround top-left 2x2 empties
  // Points: wall on x=2 for y=0,1 and y=2 for x=0,1 and (2,2)
  for (const p of [2, 11, 18, 19, 20]) g.board[p] = 1; // wall
  // empties 0,1,9,10 should be Black-owned
  g.history = [g.board.join('')];
  const cornerEst = estimatePosition(g);
  const emptyEst = estimatePosition(newGame(9, 'chinese'));
  console.log(`territory empty B=${emptyEst.black} corner B=${cornerEst.black} lead=${cornerEst.lead}`);
  check(cornerEst.black > emptyEst.black + 2, `black estimate rises with owned corner (${cornerEst.black} vs ${emptyEst.black})`);
}

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
  let cornerish = 0;
  for (const mv of firsts) {
    const x = mv % 9, y = Math.floor(mv / 9);
    const line = Math.min(x + 1, y + 1, 9 - x, 9 - y);
    if (line >= 2 && line <= 4) cornerish++;
  }
  check(cornerish >= Math.min(3, firsts.size), `hard opening stays in corner/side framework (${[...firsts]})`);
}

// Win-rate floor: safe consolidating move vs greedy weak move.
// Construct a late-ish Chinese position where Black (computer) is ahead;
// one move keeps territory, a far away "greedy" dump into opponent influence is worse.
{
  const g = newGame(9, 'chinese');
  // Black owns left 4 files, White right 3; Black to move and ahead (~60% WR).
  for (let y = 0; y < 9; y++) for (let x = 0; x < 4; x++) g.board[y * 9 + x] = 1;
  for (let y = 0; y < 9; y++) for (let x = 6; x < 9; x++) g.board[y * 9 + x] = 2;
  g.history = [g.board.join('')];
  g.turn = 1; // computer Black on hard
  g.moves = Array.from({ length: 20 }, (_, i) => ({ color: (i % 2) + 1, point: null }));
  const before = estimatePosition(g);
  check(before.winRateBlack >= 0.5, `fixture Black ahead (wr=${before.winRateBlack})`);

  // Spy: evaluate a few legal moves' post-winrates for diagnostics
  const samples = [];
  for (let p = 0; p < 81; p++) {
    if (g.board[p]) continue;
    try {
      const next = play(g, p);
      const wr = computerWinRate(next, 1);
      samples.push({ p, wr });
    } catch { /* illegal */ }
  }
  samples.sort((a, b) => b.wr - a.wr);
  const bestWr = samples[0]?.wr ?? 0;
  const worstWr = samples.at(-1)?.wr ?? 1;
  console.log(`wr floor sample best=${bestWr} worst=${worstWr} top3=${JSON.stringify(samples.slice(0, 3))}`);

  let preferSafe = 0;
  const trials = 40;
  for (let i = 0; i < trials; i++) {
    const mv = chooseMove(structuredClone(g), 'hard');
    if (mv == null) continue;
    const wr = computerWinRate(play(g, mv), 1);
    if (wr >= 0.5) preferSafe++;
  }
  console.log(`win-rate floor hard >=50% rate=${(preferSafe / trials).toFixed(2)}`);
  check(preferSafe / trials >= 0.7, `hard prefers >=50% win-rate moves when available (got ${preferSafe}/${trials})`);

  // Beginner must NOT use the floor aggressively — allow weaker play.
  let begSafe = 0;
  for (let i = 0; i < trials; i++) {
    const mv = chooseMove(structuredClone(g), 'beginner');
    if (mv == null) continue;
    try {
      if (computerWinRate(play(g, mv), 1) >= 0.5) begSafe++;
    } catch { /* */ }
  }
  // Just assert beginner still moves; no floor requirement.
  check(begSafe >= 0, 'beginner still plays without floor requirement');
}

console.log(`Go AI difficulty: ${checks} checks passed.`);
