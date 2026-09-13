import { play, group, neighbors, score } from './GoRules.mjs';

// Bounded tactical practice engine (not MCTS/NN, not rank-calibrated).
// Levels differ by randomness, tactical flags, reply search, and budgets.

const LEVEL = {
  beginner: {
    strength: 0,
    thinkMs: 20,
    candidateCap19: 60,
    randomNoise: 5.5,
    pickPool: 18,
    temperature: 1.8,
    blunderChance: 0.38,
    captureWeight: 1.5,
    selfAtariPenalty: 2,
    eyeFillPenalty: 4,
    saveAtari: false,
    threatenAtari: false,
    replyTop: 0,
    replyLossWeight: 0,
    openingCenter: 0.15,
  },
  easy: {
    strength: 1,
    thinkMs: 40,
    candidateCap19: 80,
    randomNoise: 0.7,
    pickPool: 4,
    temperature: 0.45,
    blunderChance: 0.1,
    captureWeight: 8,
    selfAtariPenalty: 10,
    eyeFillPenalty: 12,
    saveAtari: true,
    threatenAtari: true,
    replyTop: 0,
    replyLossWeight: 0,
    openingCenter: 0.35,
  },
  medium: {
    strength: 2,
    thinkMs: 100,
    candidateCap19: 100,
    randomNoise: 0.25,
    pickPool: 2,
    temperature: 0.12,
    blunderChance: 0.02,
    captureWeight: 9,
    selfAtariPenalty: 11,
    eyeFillPenalty: 12,
    saveAtari: true,
    threatenAtari: true,
    replyTop: 4,
    replyLossWeight: 6,
    openingCenter: 0.45,
  },
  hard: {
    strength: 3,
    thinkMs: 200,
    candidateCap19: 100,
    randomNoise: 0.05,
    pickPool: 1,
    temperature: 0,
    blunderChance: 0,
    captureWeight: 11,
    selfAtariPenalty: 14,
    eyeFillPenalty: 14,
    saveAtari: true,
    threatenAtari: true,
    replyTop: 10,
    replyLossWeight: 9,
    openingCenter: 0.5,
  },
};

function cfgFor(level) {
  return LEVEL[level] || LEVEL.easy;
}

function nearStonesPriority(p, state, size, center) {
  return neighbors(p, size).filter(n => state.board[n]).length * 3
    - Math.abs(p % size - center) * 0.1
    - Math.abs(Math.floor(p / size) - center) * 0.1;
}

function evaluateMove(state, p, next, cfg, color, size, center) {
  const g = group(next.board, p);
  const adjacent = neighbors(p, size);
  const capture = next.captures[color - 1] - state.captures[color - 1];
  const ownEye = adjacent.every(n => state.board[n] === color);
  let value = Math.min(g.liberties.length, 4) * 0.4;
  value += capture * cfg.captureWeight;
  value -= g.liberties.length === 1 ? cfg.selfAtariPenalty : 0;
  value -= ownEye ? cfg.eyeFillPenalty : 0;

  if (cfg.saveAtari || cfg.threatenAtari) {
    for (const n of adjacent) {
      if (!state.board[n]) continue;
      const before = group(state.board, n);
      if (cfg.saveAtari && state.board[n] === color && before.liberties.length === 1) value += 9;
      if (cfg.threatenAtari && state.board[n] !== color && next.board[n]
        && group(next.board, n).liberties.length === 1) value += 4;
    }
  }

  if (state.moves.length < 14) {
    const open = center - Math.abs(p % size - center) * 0.5
      - Math.abs(Math.floor(p / size) - center) * 0.5;
    value += open * cfg.openingCenter;
  }

  // Soft blunder: strip tactical bonuses so a weaker level can miss the obvious play.
  if (cfg.blunderChance && Math.random() < cfg.blunderChance) {
    value = Math.min(g.liberties.length, 4) * 0.3
      + Math.random() * 3
      - (ownEye ? 2 : 0)
      - (g.liberties.length === 1 ? 1 : 0);
  }

  value += Math.random() * cfg.randomNoise;
  return value;
}

function applyReplySearch(candidates, cfg, color, deadline) {
  if (!cfg.replyTop) return;
  const top = candidates.slice(0, cfg.replyTop);
  for (const c of top) {
    if (performance.now() >= deadline) break;
    let loss = 0;
    for (let p = 0; p < c.next.board.length; p++) {
      if (c.next.board[p]) continue;
      if (performance.now() >= deadline) break;
      try {
        const reply = play(c.next, p);
        loss = Math.max(loss, reply.captures[2 - color] - c.next.captures[2 - color]);
      } catch { /* illegal reply */ }
    }
    c.value -= loss * cfg.replyLossWeight;
  }
  top.sort((a, b) => b.value - a.value);
}

function pickFromPool(sorted, cfg) {
  const pool = sorted.slice(0, Math.max(1, cfg.pickPool));
  if (pool.length === 1 || cfg.temperature <= 0) return pool[0].p;
  // Softmax among the top pool — beginner samples widely; hard almost always #1.
  const maxV = pool[0].value;
  const weights = pool.map(c => Math.exp((c.value - maxV) / cfg.temperature));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].p;
  }
  return pool[0].p;
}

export function chooseMove(state, level = 'easy') {
  const cfg = cfgFor(level);
  const color = state.turn;
  const size = state.size || 9;
  const center = (size - 1) / 2;
  const deadline = performance.now() + cfg.thinkMs;
  const points = Array.from({ length: state.board.length }, (_, p) => p).filter(p => !state.board[p]);
  points.sort((a, b) => nearStonesPriority(b, state, size, center) - nearStonesPriority(a, state, size, center));
  const cap = size === 19 ? cfg.candidateCap19 : points.length;
  const candidates = [];

  for (const p of points.slice(0, cap)) {
    if (candidates.length && performance.now() >= deadline) break;
    if (state.board[p]) continue;
    let next;
    try { next = play(state, p); } catch { continue; }
    const value = evaluateMove(state, p, next, cfg, color, size, center);
    candidates.push({ p, value, next });
  }

  candidates.sort((a, b) => b.value - a.value);
  if (!candidates.length) return null;

  applyReplySearch(candidates, cfg, color, deadline);
  const ranked = cfg.replyTop
    ? candidates.slice(0, cfg.replyTop).sort((a, b) => b.value - a.value)
    : candidates;

  if (ranked[0].value < -2
    || (state.passes && score(state).winner === color && ranked[0].value < 2)) {
    return null;
  }
  return pickFromPool(ranked, cfg);
}

/** Test hook: level personas for assertions (not used by the room worker). */
export function levelProfile(level) {
  const c = cfgFor(level);
  return {
    strength: c.strength,
    thinkMs: c.thinkMs,
    pickPool: c.pickPool,
    blunderChance: c.blunderChance,
    saveAtari: c.saveAtari,
    replyTop: c.replyTop,
    captureWeight: c.captureWeight,
  };
}
