/** Compact corner joseki book for practice AI (not a full dictionary).
 * Patterns are stored in NW-corner coordinates (0 = first line from top/left),
 * then mirrored into all four corners. Color 1/2 are absolute Black/White.
 */

import { play } from './GoRules.mjs';

function xy(size, x, y) {
  return y * size + x;
}

function mapCorner(x, y, size, corner) {
  if (corner === 'NW') return [x, y];
  if (corner === 'NE') return [size - 1 - x, y];
  if (corner === 'SW') return [x, size - 1 - y];
  return [size - 1 - x, size - 1 - y];
}

const CORNERS = ['NW', 'NE', 'SW', 'SE'];

function flipColor(c) { return 3 - c; }

/** Duplicate a Black-as-corner-owner entry with colors swapped. */
function withColorFlip(entry) {
  return {
    ...entry,
    id: entry.id + '-w',
    stones: entry.stones.map(([x, y, c]) => [x, y, flipColor(c)]),
    replies: entry.replies.map(r => ({ ...r, as: flipColor(r.as) })),
  };
}

function expand(entries) {
  const out = [];
  for (const e of entries) {
    out.push(e);
    out.push(withColorFlip(e));
  }
  return out;
}

const BASE = [
  // 4-4 + one-space low approach → tip
  {
    id: '44-low-approach-tip',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2]],
    empty: [[5, 2], [4, 2], [4, 3], [5, 4]],
    replies: [{ at: [5, 2], as: 1, w: 24 }, { at: [2, 5], as: 1, w: 18 }],
  },
  // 4-4 + one-space high approach → press
  {
    id: '44-high-approach-extend',
    minSize: 9,
    stones: [[3, 3, 1], [5, 2, 2]],
    empty: [[5, 3], [4, 2], [6, 2]],
    replies: [{ at: [5, 3], as: 1, w: 22 }, { at: [4, 1], as: 1, w: 14 }],
  },
  // 4-4 + knight approach → press
  {
    id: '44-knight-approach',
    minSize: 9,
    stones: [[3, 3, 1], [5, 4, 2]],
    empty: [[4, 3], [5, 3], [4, 4]],
    replies: [{ at: [5, 3], as: 1, w: 20 }, { at: [4, 5], as: 1, w: 14 }],
  },
  // 3-4 + one-space approach → tip / kick entry
  {
    id: '34-approach-kick',
    minSize: 9,
    stones: [[2, 3, 1], [5, 3, 2]],
    empty: [[3, 3], [4, 3], [5, 2], [5, 4]],
    replies: [{ at: [5, 2], as: 1, w: 21 }, { at: [3, 5], as: 1, w: 15 }],
  },
  // 4-4 invaded at 3-3 → hane
  {
    id: '44-33-invasion-hane',
    minSize: 9,
    stones: [[3, 3, 1], [2, 2, 2]],
    empty: [[2, 3], [3, 2], [1, 2], [2, 1]],
    replies: [{ at: [2, 3], as: 1, w: 26 }, { at: [3, 2], as: 1, w: 26 }],
  },
  // After tip vs low approach: approacher slides
  {
    id: '44-low-after-tip',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2], [5, 2, 1]],
    empty: [[6, 2], [6, 3], [4, 2]],
    replies: [{ at: [6, 3], as: 2, w: 18 }, { at: [4, 1], as: 2, w: 12 }],
  },
  // 4-4 + two-space high approach (二间高挂) → press / tip
  {
    id: '44-two-space-high',
    minSize: 9,
    stones: [[3, 3, 1], [6, 2, 2]],
    empty: [[5, 2], [5, 3], [4, 2], [6, 3]],
    replies: [{ at: [5, 2], as: 1, w: 19 }, { at: [4, 1], as: 1, w: 13 }],
  },
  // 4-4 + two-space low approach (二间低挂) → jump / tip
  {
    id: '44-two-space-low',
    minSize: 9,
    stones: [[3, 3, 1], [6, 3, 2]],
    empty: [[5, 2], [5, 3], [5, 4], [4, 3]],
    replies: [{ at: [5, 3], as: 1, w: 20 }, { at: [5, 2], as: 1, w: 16 }],
  },
  // Wide keima (19-friendly)
  {
    id: '44-wide-keima',
    minSize: 13,
    stones: [[3, 3, 1], [6, 4, 2]],
    empty: [[5, 3], [4, 4], [5, 4], [6, 3]],
    replies: [{ at: [5, 3], as: 1, w: 17 }, { at: [4, 5], as: 1, w: 12 }],
  },

  // --- NEW: 小目外靠 (3-4 + outside attach) ---
  {
    id: '34-outside-attach',
    minSize: 9,
    stones: [[2, 3, 1], [3, 5, 2]],
    empty: [[3, 3], [3, 4], [2, 4], [2, 5], [4, 5]],
    replies: [{ at: [2, 4], as: 1, w: 23 }, { at: [4, 5], as: 1, w: 16 }, { at: [3, 4], as: 1, w: 14 }],
  },
  // 小目内靠
  {
    id: '34-inside-attach',
    minSize: 9,
    stones: [[2, 3, 1], [3, 2, 2]],
    empty: [[2, 2], [3, 3], [4, 2], [1, 2]],
    replies: [{ at: [2, 2], as: 1, w: 22 }, { at: [4, 2], as: 1, w: 15 }],
  },
  // 小目小飞挂 → 尖 / 一间夹
  {
    id: '34-knight-approach',
    minSize: 9,
    stones: [[2, 3, 1], [4, 5, 2]],
    empty: [[3, 3], [3, 4], [3, 5], [2, 5], [4, 4]],
    replies: [{ at: [3, 5], as: 1, w: 20 }, { at: [2, 5], as: 1, w: 17 }, { at: [5, 3], as: 1, w: 14 }],
  },

  // --- NEW: 挂后托退 (attach-block after low approach) ---
  // B 4-4, W low approach, W then attaches under tip threat → B often blocks or hane
  {
    id: '44-approach-attach-block',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2], [5, 2, 2]],
    empty: [[4, 2], [6, 2], [4, 3], [6, 3]],
    replies: [{ at: [4, 2], as: 1, w: 22 }, { at: [6, 2], as: 1, w: 18 }],
  },
  // B tip first, then W attaches → B hane/extend
  {
    id: '44-tip-then-attach',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2], [5, 2, 1], [4, 2, 2]],
    empty: [[4, 1], [3, 2], [4, 3], [6, 2]],
    replies: [{ at: [4, 1], as: 1, w: 23 }, { at: [3, 2], as: 1, w: 16 }],
  },

  // --- NEW: 一间低挂后夹攻 (pincer) ---
  {
    id: '44-low-approach-pincer',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2]],
    empty: [[5, 2], [7, 3], [6, 3], [5, 5], [3, 5]],
    replies: [{ at: [5, 2], as: 1, w: 24 }, { at: [7, 3], as: 1, w: 17 }, { at: [5, 5], as: 1, w: 15 }],
  },
  // After W approached and B pincered high, W often jumps out
  {
    id: '44-pincer-jump',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2], [5, 5, 1]],
    empty: [[6, 3], [6, 4], [4, 3], [5, 4]],
    replies: [{ at: [6, 4], as: 2, w: 18 }, { at: [4, 4], as: 2, w: 14 }],
  },

  // --- NEW: 踢后长 (kick then extend) on 3-4 ---
  {
    id: '34-kick-extend',
    minSize: 9,
    stones: [[2, 3, 1], [5, 3, 2], [5, 2, 1]],
    empty: [[6, 2], [6, 3], [5, 4], [4, 2]],
    replies: [{ at: [6, 3], as: 2, w: 20 }, { at: [5, 4], as: 2, w: 15 }],
  },
  // After kick+extend, corner owner often seals
  {
    id: '34-after-kick-extend-seal',
    minSize: 9,
    stones: [[2, 3, 1], [5, 3, 2], [5, 2, 1], [6, 3, 2]],
    empty: [[4, 2], [4, 3], [3, 2], [6, 2]],
    replies: [{ at: [4, 2], as: 1, w: 19 }, { at: [3, 5], as: 1, w: 14 }],
  },

  // --- NEW: 3-3 后长 / 扳粘入口 ---
  {
    id: '33-after-hane-extend',
    minSize: 9,
    stones: [[3, 3, 1], [2, 2, 2], [2, 3, 1]],
    empty: [[1, 2], [1, 3], [2, 1], [3, 2], [2, 4]],
    replies: [{ at: [2, 1], as: 2, w: 21 }, { at: [1, 2], as: 2, w: 18 }],
  },
  {
    id: '33-after-hane-connect',
    minSize: 9,
    stones: [[3, 3, 1], [2, 2, 2], [2, 3, 1], [2, 1, 2]],
    empty: [[1, 1], [1, 2], [3, 1], [3, 2]],
    replies: [{ at: [3, 2], as: 1, w: 22 }, { at: [1, 2], as: 1, w: 14 }],
  },

  // --- NEW: 星位小目交换后的挂 (4-4 + opposite 3-4 then approach) simplified local ---
  {
    id: '44-side-keima-pincer',
    minSize: 9,
    stones: [[3, 3, 1], [5, 4, 2]],
    empty: [[3, 5], [4, 5], [5, 5], [5, 3]],
    replies: [{ at: [5, 3], as: 1, w: 19 }, { at: [3, 5], as: 1, w: 16 }],
  },
];

const BOOK = expand(BASE);

function inBounds(x, y, size) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function matchEntry(state, entry, corner) {
  const size = state.size || 9;
  if (size < (entry.minSize || 9)) return [];
  for (const [x, y, c] of entry.stones) {
    const [mx, my] = mapCorner(x, y, size, corner);
    if (!inBounds(mx, my, size)) return [];
    if (state.board[xy(size, mx, my)] !== c) return [];
  }
  for (const [x, y] of entry.empty || []) {
    const [mx, my] = mapCorner(x, y, size, corner);
    if (!inBounds(mx, my, size)) return [];
    if (state.board[xy(size, mx, my)]) return [];
  }
  const hits = [];
  for (const r of entry.replies) {
    if (r.as !== state.turn) continue;
    const [mx, my] = mapCorner(r.at[0], r.at[1], size, corner);
    if (!inBounds(mx, my, size)) continue;
    const p = xy(size, mx, my);
    if (state.board[p]) continue;
    try {
      play(state, p);
      hits.push({ p, w: r.w, id: entry.id, corner });
    } catch { /* illegal */ }
  }
  return hits;
}

export function josekiSuggestions(state) {
  const scores = new Map();
  for (const entry of BOOK) {
    for (const corner of CORNERS) {
      for (const hit of matchEntry(state, entry, corner)) {
        const prev = scores.get(hit.p) || { weight: 0, ids: [] };
        prev.weight = Math.max(prev.weight, hit.w);
        if (!prev.ids.includes(hit.id)) prev.ids.push(hit.id);
        scores.set(hit.p, prev);
      }
    }
  }
  return scores;
}

export function bestJosekiMove(state) {
  const sug = josekiSuggestions(state);
  let best = null;
  for (const [p, meta] of sug) {
    if (!best || meta.weight > best.weight) best = { p, ...meta };
  }
  return best;
}

export function josekiBookSize() {
  return BOOK.length;
}
