import { play, group, neighbors, score } from './GoRules.mjs';

// Bounded tactical practice engine (not MCTS/NN, not rank-calibrated).
// Levels differ by randomness, tactical flags, board estimate, and search width/depth.

const LEVEL = {
  beginner: {
    strength: 0, thinkMs: 20, candidateCap19: 60, randomNoise: 5.5,
    pickPool: 18, temperature: 1.8, blunderChance: 0.38,
    captureWeight: 1.5, selfAtariPenalty: 2, eyeFillPenalty: 4,
    saveAtari: false, threatenAtari: false, replyTop: 0, replyLossWeight: 0,
    openingCenter: 0.15, useStaticEval: false, searchDepth: 0, replyCap: 0,
  },
  easy: {
    strength: 1, thinkMs: 45, candidateCap19: 80, randomNoise: 0.7,
    pickPool: 4, temperature: 0.45, blunderChance: 0.1,
    captureWeight: 8, selfAtariPenalty: 10, eyeFillPenalty: 12,
    saveAtari: true, threatenAtari: true, replyTop: 0, replyLossWeight: 0,
    openingCenter: 0.35, useStaticEval: false, searchDepth: 0, replyCap: 0,
  },
  medium: {
    strength: 2, thinkMs: 140, candidateCap19: 110, randomNoise: 0.15,
    pickPool: 2, temperature: 0.08, blunderChance: 0.02,
    captureWeight: 10, selfAtariPenalty: 12, eyeFillPenalty: 13,
    saveAtari: true, threatenAtari: true, replyTop: 8, replyLossWeight: 8,
    openingCenter: 0.45, useStaticEval: true, searchDepth: 1, replyCap: 28,
  },
  hard: {
    strength: 3, thinkMs: 450, candidateCap19: 160, randomNoise: 0,
    pickPool: 1, temperature: 0, blunderChance: 0,
    captureWeight: 16, selfAtariPenalty: 18, eyeFillPenalty: 18,
    saveAtari: true, threatenAtari: true, replyTop: 18, replyLossWeight: 14,
    openingCenter: 0.5, useStaticEval: true, searchDepth: 2, replyCap: 48,
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

/** Liberty / influence estimate from `color`'s view (higher = better for color). */
export function staticEval(state, color) {
  const size = state.size || 9;
  const seen = new Set();
  let value = (state.captures[color - 1] - state.captures[2 - color]) * 12;
  for (let p = 0; p < state.board.length; p++) {
    if (!state.board[p] || seen.has(p)) continue;
    const g = group(state.board, p);
    g.stones.forEach(s => seen.add(s));
    const libs = g.liberties.length;
    const stones = g.stones.length;
    const mine = state.board[p] === color;
    let term = stones * 1.35;
    if (libs === 1) term -= 22 + stones * 3;
    else if (libs === 2) term -= 5 + stones * 0.6;
    else term += Math.min(libs, 7) * 1.0;
    term += Math.min(libs / Math.max(stones, 1), 3) * 0.5;
    value += mine ? term : -term;
  }
  for (let p = 0; p < state.board.length; p++) {
    if (state.board[p]) continue;
    const adj = neighbors(p, size);
    let mine = 0, opp = 0;
    for (const n of adj) {
      if (state.board[n] === color) mine++;
      else if (state.board[n] === 3 - color) opp++;
    }
    if (mine && !opp) value += 0.65 + mine * 0.2;
    else if (opp && !mine) value -= 0.65 + opp * 0.2;
    else if (mine > opp) value += 0.25;
    else if (opp > mine) value -= 0.25;
  }
  return value;
}

/** Live scoreboard estimate for UI: black/white points including komi (not official). */
export function estimatePosition(state) {
  const size = state.size || 9;
  const komi = state.komi ?? (state.rules === 'japanese' ? 6.5 : 7.5);
  // Map static eval (Black perspective) into a soft point lead, then split around komi.
  const blackLead = staticEval(state, 1);
  const soft = blackLead * 0.55;
  const mid = (size * size) / 2;
  const black = mid + soft / 2;
  const white = mid - soft / 2 + komi;
  return {
    black: Math.round(black * 10) / 10,
    white: Math.round(white * 10) / 10,
    lead: Math.round((black - white) * 10) / 10,
    raw: Math.round(blackLead * 10) / 10,
  };
}

function urgentPoints(state) {
  const seen = new Set();
  const urgent = new Set();
  for (let p = 0; p < state.board.length; p++) {
    if (!state.board[p] || seen.has(p)) continue;
    const g = group(state.board, p);
    g.stones.forEach(s => seen.add(s));
    if (g.liberties.length <= 2) g.liberties.forEach(l => urgent.add(l));
  }
  return urgent;
}

function candidateOrder(state, cfg) {
  const size = state.size || 9;
  const center = (size - 1) / 2;
  const urgent = urgentPoints(state);
  const empties = [];
  for (let p = 0; p < state.board.length; p++) if (!state.board[p]) empties.push(p);
  empties.sort((a, b) => {
    const ua = urgent.has(a) ? 1 : 0;
    const ub = urgent.has(b) ? 1 : 0;
    if (ua !== ub) return ub - ua;
    return nearStonesPriority(b, state, size, center) - nearStonesPriority(a, state, size, center);
  });
  const cap = size === 19 ? cfg.candidateCap19 : empties.length;
  return empties.slice(0, cap);
}

function replyCandidates(state, focus, cfg) {
  const size = state.size || 9;
  const urgent = urgentPoints(state);
  const set = new Set(urgent);
  if (Number.isInteger(focus)) {
    set.add(focus);
    for (const n of neighbors(focus, size)) {
      set.add(n);
      for (const n2 of neighbors(n, size)) set.add(n2);
    }
  }
  for (let p = 0; p < state.board.length; p++) {
    if (!state.board[p]) continue;
    for (const n of neighbors(p, size)) if (!state.board[n]) set.add(n);
  }
  const list = [...set].filter(p => Number.isInteger(p) && p >= 0 && p < state.board.length && !state.board[p]);
  list.sort((a, b) => (urgent.has(b) ? 2 : 0) - (urgent.has(a) ? 2 : 0)
    + neighbors(b, size).filter(n => state.board[n]).length
    - neighbors(a, size).filter(n => state.board[n]).length);
  return list.slice(0, cfg.replyCap || 24);
}

function evaluateMove(state, p, next, cfg, color, size, center) {
  const g = group(next.board, p);
  const adjacent = neighbors(p, size);
  const capture = next.captures[color - 1] - state.captures[color - 1];
  const ownEye = adjacent.length > 0 && adjacent.every(n => state.board[n] === color);
  let value = Math.min(g.liberties.length, 5) * 0.55;
  // Hard floor so real captures beat vague influence noise.
  if (capture > 0) value += 40 + capture * cfg.captureWeight;
  else value += capture * cfg.captureWeight;
  value -= g.liberties.length === 1 ? cfg.selfAtariPenalty : 0;
  value -= g.liberties.length === 2 ? 2.5 : 0;
  value -= ownEye ? cfg.eyeFillPenalty : 0;

  if (cfg.saveAtari || cfg.threatenAtari) {
    for (const n of adjacent) {
      if (!state.board[n]) continue;
      const before = group(state.board, n);
      if (cfg.saveAtari && state.board[n] === color && before.liberties.length === 1) {
        value += 55 + before.stones.length * 4;
      }
      if (cfg.threatenAtari && state.board[n] !== color && next.board[n]) {
        const after = group(next.board, n);
        if (after.liberties.length === 1) value += 8 + after.stones.length * 1.5;
        else if (after.liberties.length === 2 && before.liberties.length > 2) value += 2.5;
      }
    }
  }

  let connect = 0;
  for (const n of adjacent) if (state.board[n] === color) connect++;
  value += connect * 0.9;

  if (state.moves.length < 14) {
    const open = center - Math.abs(p % size - center) * 0.5
      - Math.abs(Math.floor(p / size) - center) * 0.5;
    value += open * cfg.openingCenter;
  }

  if (cfg.useStaticEval) value += staticEval(next, color) * (cfg.strength >= 3 ? 0.85 : 0.55);

  if (cfg.blunderChance && Math.random() < cfg.blunderChance) {
    value = Math.min(g.liberties.length, 4) * 0.3 + Math.random() * 3
      - (ownEye ? 2 : 0) - (g.liberties.length === 1 ? 1 : 0);
  }
  value += Math.random() * cfg.randomNoise;
  return value;
}

function bestOpponentReply(state, color, cfg, deadline, focus) {
  let bestLoss = 0;
  let bestEval = -Infinity;
  let bestState = null;
  for (const p of replyCandidates(state, focus, cfg)) {
    if (performance.now() >= deadline) break;
    try {
      const reply = play(state, p);
      const loss = reply.captures[2 - color] - state.captures[2 - color];
      bestLoss = Math.max(bestLoss, loss);
      // Opponent maximizes their static eval.
      const oppScore = staticEval(reply, 3 - color) + loss * 14;
      if (oppScore > bestEval) {
        bestEval = oppScore;
        bestState = reply;
      }
    } catch { /* illegal */ }
  }
  return { bestLoss, bestState };
}

function refineCandidates(candidates, cfg, color, deadline) {
  if (!cfg.replyTop || !cfg.searchDepth) return candidates;
  const top = candidates.slice(0, cfg.replyTop);
  for (const c of top) {
    if (performance.now() >= deadline) break;
    const { bestLoss, bestState } = bestOpponentReply(c.next, color, cfg, deadline, c.p);
    c.value -= bestLoss * cfg.replyLossWeight;

    if (cfg.searchDepth >= 2 && bestState && cfg.useStaticEval) {
      // Position after opponent's best try, from our side.
      c.value += staticEval(bestState, color) * 0.75;
      // Our best tactical follow-up capture after that reply.
      let ourGain = 0;
      const followCfg = { ...cfg, replyCap: Math.min(20, cfg.replyCap || 20) };
      for (const p of replyCandidates(bestState, null, followCfg)) {
        if (performance.now() >= deadline) break;
        try {
          const follow = play(bestState, p);
          ourGain = Math.max(ourGain, follow.captures[color - 1] - bestState.captures[color - 1]);
        } catch { /* illegal */ }
      }
      c.value += ourGain * (cfg.captureWeight * 0.5);
    }
  }
  top.sort((a, b) => b.value - a.value);
  return top;
}

function pickFromPool(sorted, cfg) {
  const pool = sorted.slice(0, Math.max(1, cfg.pickPool));
  if (pool.length === 1 || cfg.temperature <= 0) return pool[0].p;
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
  const candidates = [];

  for (const p of candidateOrder(state, cfg)) {
    if (candidates.length && performance.now() >= deadline) break;
    let next;
    try { next = play(state, p); } catch { continue; }
    const value = evaluateMove(state, p, next, cfg, color, size, center);
    candidates.push({ p, value, next });
  }

  candidates.sort((a, b) => b.value - a.value);
  if (!candidates.length) return null;

  const ranked = refineCandidates(candidates, cfg, color, deadline);
  const urgent = urgentPoints(state);
  // Never pass while a 1–2 liberty fight is unresolved — hard previously over-penalized saves.
  const fighting = urgent.size > 0;

  if (!fighting && ranked[0].value < -2) return null;
  if (!fighting && state.passes && score(state).winner === color && ranked[0].value < 2) return null;
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
    searchDepth: c.searchDepth,
    useStaticEval: c.useStaticEval,
  };
}
