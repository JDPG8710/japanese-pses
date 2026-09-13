import assert from 'node:assert/strict';
import { newGame } from '../src/arena/GoRules.mjs';
import { chooseMove } from '../src/arena/GoAI.mjs';
import { bestJosekiMove, josekiBookSize, josekiSuggestions } from '../src/arena/GoJoseki.mjs';

let checks = 0;
const check = (v, m) => { assert.ok(v, m); checks++; };

check(josekiBookSize() >= 30, `joseki book grew (got ${josekiBookSize()})`);

// Black 4-4, White one-space low approach → Black tip
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 3] = 1;
  g.board[3 * 9 + 5] = 2;
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 30 }, { color: 2, point: 32 }];
  const best = bestJosekiMove(g);
  check(best && best.p === 2 * 9 + 5, `44-low tip expected 23 got ${best && best.p}`);
  const hard = chooseMove(g, 'hard');
  check(hard === 2 * 9 + 5 || hard === 5 * 9 + 2 || hard === 7 * 9 + 3, `hard follows tip/pincer joseki (got ${hard})`);
}

// NE corner still matches
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 5] = 1;
  g.board[3 * 9 + 3] = 2;
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 32 }, { color: 2, point: 30 }];
  check(josekiSuggestions(g).size > 0, 'NE corner joseki matches');
}

// 3-3 invasion → hane
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 3] = 1;
  g.board[2 * 9 + 2] = 2;
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 30 }, { color: 2, point: 20 }];
  const best = bestJosekiMove(g);
  check(best && (best.p === 2 * 9 + 3 || best.p === 3 * 9 + 2), `33 invasion hane got ${best && best.p}`);
  const hard = chooseMove(g, 'hard');
  check(hard === 2 * 9 + 3 || hard === 3 * 9 + 2, `hard hanes vs 3-3 (got ${hard})`);
}

// 小目外靠 → hane/extend
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 2] = 1; // 3-4 at (2,3)
  g.board[5 * 9 + 3] = 2; // outside attach (3,5)
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 29 }, { color: 2, point: 48 }];
  const best = bestJosekiMove(g);
  check(best, `34 outside attach has joseki (got ${best && best.p})`);
  const hard = chooseMove(structuredClone(g), 'hard');
  check([2 * 9 + 2, 5 * 9 + 4, 4 * 9 + 3].includes(hard) || best.p === hard,
    `hard answers 外靠 (got ${hard}, joseki ${best && best.p})`);
}

// 二间高挂 → press
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 3] = 1;
  g.board[2 * 9 + 6] = 2; // (6,2)
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 30 }, { color: 2, point: 24 }];
  const best = bestJosekiMove(g);
  check(best && (best.p === 2 * 9 + 5 || best.p === 1 * 9 + 4), `two-space high joseki got ${best && best.p}`);
}

console.log(`Go joseki: ${checks} checks passed.`);
