import { play, group, neighbors, score } from './GoRules.mjs';
// Bounded tactical engine, not a professional-strength engine. Levels increase
// capture/escape awareness and opponent-reply search; randomness only breaks ties.
export function chooseMove(state, level = 'easy') {
  const strength = { beginner: 0, easy: 1, medium: 2, hard: 3 }[level] ?? 1;
  const color = state.turn, candidates = [], size = state.size || 9, center = (size - 1) / 2;
  const deadline = performance.now() + [15, 25, 50, 100][strength];
  const points = Array.from({ length: state.board.length }, (_, p) => p).filter(p => !state.board[p]);
  // Search near existing stones first, plus spread-out opening points. Cap the
  // large-board candidate count and total thinking time independently of capacity.
  const priority = p => neighbors(p, size).filter(n => state.board[n]).length * 3 - Math.abs(p % size - center) * .1 - Math.abs(Math.floor(p / size) - center) * .1;
  points.sort((a, b) => priority(b) - priority(a));
  for (const p of points.slice(0, size === 19 ? 100 : points.length)) {
    if (candidates.length && performance.now() >= deadline) break;
    if (state.board[p]) continue;
    let next; try { next = play(state, p); } catch { continue; }
    const g = group(next.board, p), adjacent = neighbors(p, size);
    const capture = next.captures[color - 1] - state.captures[color - 1];
    const ownEye = adjacent.every(n => state.board[n] === color);
    let value = Math.random() * (strength ? 0.6 : 4) + Math.min(g.liberties.length, 4) * 0.4 - (ownEye ? 12 : 0);
    value += capture * (strength ? 8 : 2) - (g.liberties.length === 1 ? 10 : 0);
    if (strength) for (const n of adjacent) if (state.board[n]) {
      const before = group(state.board, n);
      if (state.board[n] === color && before.liberties.length === 1) value += 7;
      if (state.board[n] !== color && next.board[n] && group(next.board, n).liberties.length === 1) value += 3;
    }
    if (state.moves.length < 14) value += (center - Math.abs(p % size - center) * 0.5 - Math.abs(Math.floor(p / size) - center) * 0.5) * 0.4;
    candidates.push({ p, value, next });
  }
  candidates.sort((a, b) => b.value - a.value);
  if (!candidates.length) return null;
  if (strength >= 2) for (const c of candidates.slice(0, strength === 3 ? 10 : 4)) {
    let loss = 0;
    if (performance.now() >= deadline) break;
    for (let p = 0; p < state.board.length; p++) if (!c.next.board[p]) {
      if (performance.now() >= deadline) break;
      try { const reply = play(c.next, p); loss = Math.max(loss, reply.captures[2 - color] - c.next.captures[2 - color]); } catch { /* illegal reply */ }
    }
    c.value -= loss * 6;
  }
  const finalists = strength >= 2 ? candidates.slice(0, strength === 3 ? 10 : 4).sort((a, b) => b.value - a.value) : candidates;
  if (finalists[0].value < -2 || (state.passes && score(state).winner === color && finalists[0].value < 2)) return null;
  return finalists[0].p;
}
