/** Compact corner joseki book for practice AI (not a full dictionary).
 * Patterns are stored in NW-corner coordinates (0 = first line from top/left),
 * then mirrored into all four corners. Color 1/2 are absolute Black/White.
 */

import { play } from './GoRules.mjs';

function xy(size, x, y) {
  return y * size + x;
}

/** Map NW-relative (x,y) into a corner. */
function mapCorner(x, y, size, corner) {
  if (corner === 'NW') return [x, y];
  if (corner === 'NE') return [size - 1 - x, y];
  if (corner === 'SW') return [x, size - 1 - y];
  return [size - 1 - x, size - 1 - y]; // SE
}

const CORNERS = ['NW', 'NE', 'SW', 'SE'];

/**
 * Each entry: stones that must match, empty points that must be empty,
 * replies ranked for the side to move (color must match state.turn).
 * `replyAs` is the color that plays the reply in the diagram (1 or 2).
 */
const BOOK = [
  // 4-4 + one-space low approach → tip (小飞挂 → 尖)
  {
    id: '44-low-approach-tip',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2]],
    empty: [[5, 2], [4, 2], [4, 3], [5, 4]],
    replies: [{ at: [5, 2], as: 1, w: 24 }, { at: [2, 5], as: 1, w: 18 }],
  },
  // same with colors flipped (White owns 4-4)
  {
    id: '44-low-approach-tip-w',
    minSize: 9,
    stones: [[3, 3, 2], [5, 3, 1]],
    empty: [[5, 2], [4, 2], [4, 3], [5, 4]],
    replies: [{ at: [5, 2], as: 2, w: 24 }, { at: [2, 5], as: 2, w: 18 }],
  },
  // 4-4 + one-space high approach → attach/extend style
  {
    id: '44-high-approach-extend',
    minSize: 9,
    stones: [[3, 3, 1], [5, 2, 2]],
    empty: [[5, 3], [4, 2], [6, 2]],
    replies: [{ at: [5, 3], as: 1, w: 22 }, { at: [4, 1], as: 1, w: 14 }],
  },
  {
    id: '44-high-approach-extend-w',
    minSize: 9,
    stones: [[3, 3, 2], [5, 2, 1]],
    empty: [[5, 3], [4, 2], [6, 2]],
    replies: [{ at: [5, 3], as: 2, w: 22 }, { at: [4, 1], as: 2, w: 14 }],
  },
  // knight approach to 4-4 → kosumi / press
  {
    id: '44-knight-approach',
    minSize: 9,
    stones: [[3, 3, 1], [5, 4, 2]],
    empty: [[4, 3], [5, 3], [4, 4]],
    replies: [{ at: [5, 3], as: 1, w: 20 }, { at: [4, 5], as: 1, w: 14 }],
  },
  {
    id: '44-knight-approach-w',
    minSize: 9,
    stones: [[3, 3, 2], [5, 4, 1]],
    empty: [[4, 3], [5, 3], [4, 4]],
    replies: [{ at: [5, 3], as: 2, w: 20 }, { at: [4, 5], as: 2, w: 14 }],
  },
  // 3-4 + one-space high approach → kick (靠退 / 扳踢系列入口)
  {
    id: '34-approach-kick',
    minSize: 9,
    stones: [[2, 3, 1], [5, 3, 2]],
    empty: [[3, 3], [4, 3], [5, 2], [5, 4]],
    replies: [{ at: [5, 2], as: 1, w: 21 }, { at: [3, 5], as: 1, w: 15 }],
  },
  {
    id: '34-approach-kick-w',
    minSize: 9,
    stones: [[2, 3, 2], [5, 3, 1]],
    empty: [[3, 3], [4, 3], [5, 2], [5, 4]],
    replies: [{ at: [5, 2], as: 2, w: 21 }, { at: [3, 5], as: 2, w: 15 }],
  },
  // 3-3 under 4-4 → hane
  {
    id: '44-33-invasion-hane',
    minSize: 9,
    stones: [[3, 3, 1], [2, 2, 2]],
    empty: [[2, 3], [3, 2], [1, 2], [2, 1]],
    replies: [{ at: [2, 3], as: 1, w: 26 }, { at: [3, 2], as: 1, w: 26 }],
  },
  {
    id: '44-33-invasion-hane-w',
    minSize: 9,
    stones: [[3, 3, 2], [2, 2, 1]],
    empty: [[2, 3], [3, 2], [1, 2], [2, 1]],
    replies: [{ at: [2, 3], as: 2, w: 26 }, { at: [3, 2], as: 2, w: 26 }],
  },
  // After tip vs low approach: White often slides / extends — Black seals
  {
    id: '44-low-after-tip',
    minSize: 9,
    stones: [[3, 3, 1], [5, 3, 2], [5, 2, 1]],
    empty: [[6, 2], [6, 3], [4, 2]],
    replies: [{ at: [6, 3], as: 2, w: 18 }, { at: [4, 1], as: 2, w: 12 }],
  },
  {
    id: '44-low-after-tip-b',
    minSize: 9,
    stones: [[3, 3, 2], [5, 3, 1], [5, 2, 2]],
    empty: [[6, 2], [6, 3], [4, 2]],
    replies: [{ at: [6, 3], as: 1, w: 18 }, { at: [4, 1], as: 1, w: 12 }],
  },
  // Two-space high approach to 4-4 (一间高挂) → press or tip
  {
    id: '44-two-space-high',
    minSize: 9,
    stones: [[3, 3, 1], [6, 2, 2]],
    empty: [[5, 2], [5, 3], [4, 2], [6, 3]],
    replies: [{ at: [5, 2], as: 1, w: 19 }, { at: [4, 1], as: 1, w: 13 }],
  },
  {
    id: '44-two-space-high-w',
    minSize: 9,
    stones: [[3, 3, 2], [6, 2, 1]],
    empty: [[5, 2], [5, 3], [4, 2], [6, 3]],
    replies: [{ at: [5, 2], as: 2, w: 19 }, { at: [4, 1], as: 2, w: 13 }],
  },
  // 19×19-friendly: 4-4 + keima approach further out
  {
    id: '44-wide-keima',
    minSize: 13,
    stones: [[3, 3, 1], [6, 4, 2]],
    empty: [[5, 3], [4, 4], [5, 4], [6, 3]],
    replies: [{ at: [5, 3], as: 1, w: 17 }, { at: [4, 5], as: 1, w: 12 }],
  },
  {
    id: '44-wide-keima-w',
    minSize: 13,
    stones: [[3, 3, 2], [6, 4, 1]],
    empty: [[5, 3], [4, 4], [5, 4], [6, 3]],
    replies: [{ at: [5, 3], as: 2, w: 17 }, { at: [4, 5], as: 2, w: 12 }],
  },
];

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
    } catch { /* illegal under ko/suicide */ }
  }
  return hits;
}

/** Returns Map<point, {weight, ids}> of joseki suggestions for the side to move. */
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

/** Best single joseki move, or null. */
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
