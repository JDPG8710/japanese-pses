// 9/19 boards, Chinese/Japanese scoring presets, shared positional superko.
export const SIZE = 9;
export const neighbors = (p, size = 9) => [p % size ? p - 1 : -1, p % size < size - 1 ? p + 1 : -1, p >= size ? p - size : -1, p < size * (size - 1) ? p + size : -1].filter(x => x >= 0);
export function group(board, start) {
  const stones = new Set([start]), liberties = new Set(), stack = [start];
  while (stack.length) for (const n of neighbors(stack.pop(), Math.sqrt(board.length))) {
    if (!board[n]) liberties.add(n);
    else if (board[n] === board[start] && !stones.has(n)) { stones.add(n); stack.push(n); }
  }
  return { stones: [...stones], liberties: [...liberties] };
}
export function newGame(size = 9, rules = 'chinese') {
  if (![9, 19].includes(size) || !['chinese', 'japanese'].includes(rules)) throw new Error('INVALID_SETTINGS');
  const board = Array(size * size).fill(0);
  return { size, rules, komi: rules === 'japanese' ? 6.5 : 7.5, board, turn: 1, history: [board.join('')], moves: [], passes: 0, phase: 'playing', dead: [], seki: [], accepted: [], captures: [0, 0], result: null };
}
export function play(state, point) {
  if (state.phase !== 'playing') throw new Error('NOT_PLAYING');
  // History strings are immutable: trial moves must not deep-copy every old board.
  const next = { ...state, board: [...state.board], history: [...state.history], moves: [...state.moves], captures: [...state.captures] }, color = state.turn;
  if (point === null) {
    next.passes++;
    if (next.passes === 2) next.phase = 'scoring';
  } else {
    if (!Number.isInteger(point) || point < 0 || point >= next.board.length || next.board[point]) throw new Error('OCCUPIED');
    next.board[point] = color;
    for (const n of neighbors(point, state.size || 9)) if (next.board[n] === 3 - color) {
      const g = group(next.board, n);
      if (!g.liberties.length) { g.stones.forEach(p => { next.board[p] = 0; }); next.captures[color - 1] += g.stones.length; }
    }
    if (!group(next.board, point).liberties.length) throw new Error('SUICIDE');
    const key = next.board.join('');
    if (state.history.includes(key)) throw new Error('SUPERKO');
    next.history.push(key); next.passes = 0;
  }
  next.moves.push({ color, point }); next.turn = 3 - color;
  return next;
}
export function score(state) {
  const board = [...state.board], japanese = state.rules === 'japanese';
  const points = japanese ? [...state.captures] : [0, 0];
  points[1] += state.komi ?? 7.5;
  state.dead.forEach(p => { if (japanese && board[p]) points[2 - board[p]]++; board[p] = 0; });
  const seen = new Set(), seki = new Set(state.seki || []), size = state.size || 9;
  for (let p = 0; p < board.length; p++) {
    if (board[p]) { if (!japanese) points[board[p] - 1]++; continue; }
    if (seen.has(p)) continue;
    const region = [p], stack = [p], border = new Set(); let sekiBorder = false; seen.add(p);
    while (stack.length) for (const n of neighbors(stack.pop(), size)) {
      if (board[n]) { border.add(board[n]); if (seki.has(n)) sekiBorder = true; }
      else if (!seen.has(n)) { seen.add(n); region.push(n); stack.push(n); }
    }
    if (border.size === 1 && !(japanese && sekiBorder)) points[[...border][0] - 1] += region.length;
  }
  return { black: points[0], white: points[1], winner: points[0] > points[1] ? 1 : 2, reason: 'score' };
}
export function markDead(state, point) {
  if (state.phase !== 'scoring' || !Number.isInteger(point) || !state.board[point]) throw new Error('INVALID_DEAD');
  const next = structuredClone(state), stones = group(state.board, point).stones, remove = state.dead.includes(point);
  next.dead = remove ? state.dead.filter(p => !stones.includes(p)) : [...new Set([...state.dead, ...stones])];
  next.seki = (state.seki || []).filter(p => !stones.includes(p));
  next.accepted = []; return next;
}
export function markSeki(state, point) {
  if (state.rules !== 'japanese' || state.phase !== 'scoring' || !Number.isInteger(point) || !state.board[point]) throw new Error('INVALID_DEAD');
  const stones = group(state.board, point).stones, seki = state.seki || [];
  return { ...state, seki: seki.includes(point) ? seki.filter(p => !stones.includes(p)) : [...new Set([...seki, ...stones])], dead: state.dead.filter(p => !stones.includes(p)), accepted: [] };
}
export function resume(state) { return { ...state, phase: 'playing', passes: 0, dead: [], seki: [], accepted: [] }; }
export function sgf(state) {
  const size = state.size || 9;
  return `(;GM[1]FF[4]SZ[${size}]KM[${state.komi ?? 7.5}]RU[${state.rules === 'japanese' ? 'Japanese-style territory' : 'Chinese-style area'} / positional superko]${state.moves.map(m => `;${m.color === 1 ? 'B' : 'W'}[${m.point === null ? '' : String.fromCharCode(97 + m.point % size, 97 + Math.floor(m.point / size))}]`).join('')})`;
}
