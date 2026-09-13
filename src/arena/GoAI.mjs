import { play, group, neighbors, score } from './GoRules.mjs';

// Bounded tactical practice engine (not MCTS/NN, not rank-calibrated).
// Levels differ by randomness, tactics, board estimate, search, and fuseki priors.

const LEVEL = {
  beginner: {
    strength: 0, thinkMs: 20, candidateCap19: 60, randomNoise: 5.5,
    pickPool: 18, temperature: 1.8, blunderChance: 0.38,
    captureWeight: 1.5, selfAtariPenalty: 2, eyeFillPenalty: 4,
    saveAtari: false, threatenAtari: false, replyTop: 0, replyLossWeight: 0,
    openingCenter: 0.05, fusekiWeight: 0, useStaticEval: false, searchDepth: 0, replyCap: 0,
  },
  easy: {
    strength: 1, thinkMs: 45, candidateCap19: 80, randomNoise: 0.7,
    pickPool: 4, temperature: 0.45, blunderChance: 0.1,
    captureWeight: 8, selfAtariPenalty: 10, eyeFillPenalty: 12,
    saveAtari: true, threatenAtari: true, replyTop: 0, replyLossWeight: 0,
    openingCenter: 0.1, fusekiWeight: 2.5, useStaticEval: false, searchDepth: 0, replyCap: 0,
  },
  medium: {
    strength: 2, thinkMs: 140, candidateCap19: 110, randomNoise: 0.15,
    pickPool: 2, temperature: 0.08, blunderChance: 0.02,
    captureWeight: 10, selfAtariPenalty: 12, eyeFillPenalty: 13,
    saveAtari: true, threatenAtari: true, replyTop: 8, replyLossWeight: 8,
    openingCenter: 0, fusekiWeight: 8, useStaticEval: true, searchDepth: 1, replyCap: 28,
  },
  hard: {
    strength: 3, thinkMs: 450, candidateCap19: 160, randomNoise: 0,
    pickPool: 1, temperature: 0, blunderChance: 0,
    captureWeight: 16, selfAtariPenalty: 18, eyeFillPenalty: 18,
    saveAtari: true, threatenAtari: true, replyTop: 18, replyLossWeight: 14,
    openingCenter: -0.15, fusekiWeight: 14, useStaticEval: true, searchDepth: 2, replyCap: 48,
  },
};

function cfgFor(level) {
  return LEVEL[level] || LEVEL.easy;
}

function xy(size, x, y) {
  return y * size + x;
}

function coords(p, size) {
  return [p % size, Math.floor(p / size)];
}

/** Classic corner / approach points for 9 and 19. Not a full joseki DB — a fuseki prior. */
function fusekiAnchors(size) {
  if (size === 9) {
    // 3-3, 3-4, 4-4 style (0-based: 2,2 / 2,3 / 3,2 / 3,3) and four corners.
    const pts = [];
    for (const [x, y] of [
      [2, 2], [2, 3], [3, 2], [3, 3],
      [2, 5], [2, 6], [3, 5], [3, 6],
      [5, 2], [6, 2], [5, 3], [6, 3],
      [5, 5], [5, 6], [6, 5], [6, 6],
      [2, 4], [4, 2], [4, 6], [6, 4], // side 3-5 / 5-3
    ]) pts.push(xy(size, x, y));
    return pts;
  }
  // 19×19 hoshi + 3-4 / 3-3 / 4-4 around corners + side stars.
  const pts = [];
  const corners = [[3, 3], [3, 15], [15, 3], [15, 15]];
  for (const [cx, cy] of corners) {
    for (const [dx, dy] of [
      [0, 0], // 4-4
      [-1, -1], // 3-3
      [-1, 0], [0, -1], [1, 0], [0, 1], // 3-4 / 4-5
      [-1, 1], [1, -1], [1, 1], [-1, 1],
    ]) {
      const x = cx + dx, y = cy + dy;
      if (x >= 2 && x <= 16 && y >= 2 && y <= 16) pts.push(xy(size, x, y));
    }
  }
  for (const [x, y] of [[3, 9], [9, 3], [9, 15], [15, 9], [9, 9]]) pts.push(xy(size, x, y));
  // Side 10th-line extensions near corners (common early).
  for (const [x, y] of [[3, 6], [6, 3], [3, 12], [12, 3], [15, 6], [6, 15], [15, 12], [12, 15]]) {
    pts.push(xy(size, x, y));
  }
  return [...new Set(pts)];
}

function emptyCorners(state) {
  const size = state.size || 9;
  const boxes = size === 9
    ? [[0, 3, 0, 3], [0, 3, 5, 8], [5, 8, 0, 3], [5, 8, 5, 8]]
    : [[0, 6, 0, 6], [0, 6, 12, 18], [12, 18, 0, 6], [12, 18, 12, 18]];
  return boxes.filter(([x0, x1, y0, y1]) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (state.board[xy(size, x, y)]) return false;
    }
    return true;
  });
}

function approachPoints(state, stone) {
  const size = state.size || 9;
  const [sx, sy] = coords(stone, size);
  const deltas = size === 9
    ? [[-1, -2], [-2, -1], [-1, 2], [-2, 1], [1, -2], [2, -1], [1, 2], [2, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]
    : [[-1, -2], [-2, -1], [-1, 2], [-2, 1], [1, -2], [2, -1], [1, 2], [2, 1],
       [-3, -1], [-1, -3], [-3, 1], [1, -3], [3, -1], [-1, 3], [3, 1], [1, 3],
       [-2, 0], [2, 0], [0, -2], [0, 2]];
  const out = [];
  for (const [dx, dy] of deltas) {
    const x = sx + dx, y = sy + dy;
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const p = xy(size, x, y);
    if (!state.board[p]) out.push(p);
  }
  return out;
}

/** Opening prior: corners first, approaches second; early tengen is discouraged. */
export function fusekiPrior(state, p, cfg) {
  if (!cfg.fusekiWeight) return 0;
  const size = state.size || 9;
  const stones = state.moves.filter(m => m.point != null).length;
  const openUntil = size === 19 ? 24 : 12;
  if (stones >= openUntil) return 0;

  const [x, y] = coords(p, size);
  const center = (size - 1) / 2;
  const distC = Math.hypot(x - center, y - center);
  let bonus = 0;

  // Strong penalty for early tengen / near-center on both boards.
  if (stones < (size === 19 ? 10 : 6)) {
    if (p === xy(size, center, center)) bonus -= 18;
    else if (distC < (size === 19 ? 3.2 : 1.6)) bonus -= 8;
  }

  const anchors = fusekiAnchors(size);
  if (anchors.includes(p)) bonus += 6;

  // Prefer still-empty corners.
  for (const [x0, x1, y0, y1] of emptyCorners(state)) {
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
      bonus += stones < 4 ? 10 : 5;
      break;
    }
  }

  // Approach / enclose when opponent already took a corner stone.
  for (let s = 0; s < state.board.length; s++) {
    if (state.board[s] !== 3 - state.turn) continue;
    const [sx, sy] = coords(s, size);
    // Corner-ish opponent stone.
    const nearCorner = (sx <= 4 || sx >= size - 5) && (sy <= 4 || sy >= size - 5);
    if (!nearCorner) continue;
    if (approachPoints(state, s).includes(p)) bonus += stones < 16 ? 9 : 4;
  }

  // Soft preference for 3rd–4th line (framework) over 1st–2nd early.
  const line = Math.min(x + 1, y + 1, size - x, size - y);
  if (stones < openUntil) {
    if (line === 1) bonus -= 4;
    else if (line === 2) bonus -= 1;
    else if (line === 3 || line === 4) bonus += 3;
    else if (line >= 5 && size === 19 && stones < 8) bonus -= 2;
  }

  return bonus * (cfg.fusekiWeight / 10);
}

function nearStonesPriority(p, state, size, center) {
  return neighbors(p, size).filter(n => state.board[n]).length * 3
    - Math.abs(p % size - center) * 0.1
    - Math.abs(Math.floor(p / size) - center) * 0.1;
}

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

export function estimatePosition(state) {
  const size = state.size || 9;
  const komi = state.komi ?? (state.rules === 'japanese' ? 6.5 : 7.5);
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
  const fuseki = new Set(cfg.fusekiWeight ? fusekiAnchors(size) : []);
  const empties = [];
  for (let p = 0; p < state.board.length; p++) if (!state.board[p]) empties.push(p);
  empties.sort((a, b) => {
    const ua = urgent.has(a) ? 2 : fuseki.has(a) ? 1 : 0;
    const ub = urgent.has(b) ? 2 : fuseki.has(b) ? 1 : 0;
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

  // Mild center term only as tiny residual; fusekiPrior owns the opening.
  if (state.moves.length < 14 && cfg.openingCenter) {
    const open = center - Math.abs(p % size - center) * 0.5
      - Math.abs(Math.floor(p / size) - center) * 0.5;
    value += open * cfg.openingCenter;
  }
  value += fusekiPrior(state, p, cfg);

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
      c.value += staticEval(bestState, color) * 0.75;
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
  const fighting = urgent.size > 0;

  if (!fighting && ranked[0].value < -2) return null;
  if (!fighting && state.passes && score(state).winner === color && ranked[0].value < 2) return null;
  // Early fuseki: sample among near-tied corner/approach moves so hard is not glued to one 3-3.
  const stonesPlayed = state.moves.filter(m => m.point != null).length;
  if (cfg.fusekiWeight && stonesPlayed < 4) {
    const openCfg = { ...cfg, pickPool: Math.max(cfg.pickPool, 4), temperature: Math.max(cfg.temperature, 0.35) };
    return pickFromPool(ranked, openCfg);
  }
  return pickFromPool(ranked, cfg);
}

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
    fusekiWeight: c.fusekiWeight,
  };
}
