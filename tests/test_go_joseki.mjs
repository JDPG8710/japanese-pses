import assert from 'node:assert/strict';
import { newGame, play } from '../src/arena/GoRules.mjs';
import { chooseMove } from '../src/arena/GoAI.mjs';
import { bestJosekiMove, josekiBookSize, josekiSuggestions } from '../src/arena/GoJoseki.mjs';

let checks = 0;
const check = (v, m) => { assert.ok(v, m); checks++; };

check(josekiBookSize() >= 10, 'joseki book has entries');

// Black 4-4, White one-space low approach → Black tip joseki
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 3] = 1; // 4-4
  g.board[3 * 9 + 5] = 2; // approach
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 30 }, { color: 2, point: 32 }];
  const best = bestJosekiMove(g);
  check(best && best.p === 2 * 9 + 5, `44-low tip expected 23 got ${best && best.p}`);
  const hard = chooseMove(g, 'hard');
  check(hard === 2 * 9 + 5 || hard === 5 * 9 + 2, `hard follows tip joseki (got ${hard})`);
}

// Mirrored NE corner: Black 4-4 at (5,3) on 9x9 = size-1-3=5, y=3 → p=3*9+5=32? 
// NW 4-4 is (3,3). NE map: (size-1-3, 3)=(5,3)=32. Approach NW (5,3)-> NE (size-1-5,3)=(3,3)=30.
{
  const g = newGame(9, 'chinese');
  g.board[3 * 9 + 5] = 1; // NE 4-4
  g.board[3 * 9 + 3] = 2; // approach from left
  g.history = [g.board.join('')];
  g.turn = 1;
  g.moves = [{ color: 1, point: 32 }, { color: 2, point: 30 }];
  const sug = josekiSuggestions(g);
  check(sug.size > 0, 'NE corner joseki matches');
  const hard = chooseMove(structuredClone(g), 'hard');
  check(Number.isInteger(hard), `hard replies in NE joseki (${hard})`);
}

// 3-3 invasion under 4-4 → hane
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

console.log(`Go joseki: ${checks} checks passed.`);
