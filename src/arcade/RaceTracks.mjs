/** Closed-circuit track definitions for player-driven racing. */

function oval(cx, cz, rx, rz, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz});
  }
  return pts;
}

function figureish(cx, cz, scale = 1, n = 64) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    // Rounded figure-8 / peanut: lemniscate-ish in XZ
    const s = Math.sin(t);
    const c = Math.cos(t);
    const den = 1 + s * s;
    pts.push({
      x: cx + (scale * 22 * c) / den,
      z: cz + (scale * 14 * s * c) / den
    });
  }
  return pts;
}

function mountain(cx, cz, scale = 1, n = 56) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.22 * Math.sin(3 * t) + 0.08 * Math.cos(5 * t);
    pts.push({
      x: cx + Math.cos(t) * 20 * scale * wobble,
      z: cz + Math.sin(t) * 14 * scale * wobble
    });
  }
  return pts;
}

function neonCity(cx, cz, scale = 1, n = 60) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 16 + 6 * Math.sin(2 * t) + 3 * Math.cos(4 * t);
    pts.push({
      x: cx + Math.cos(t) * r * scale,
      z: cz + Math.sin(t) * (r * 0.78) * scale
    });
  }
  return pts;
}

/** Sample item spawn progress (0–1) along the centerline. */
const ITEM_SLOTS = [0.12, 0.28, 0.45, 0.62, 0.78, 0.92];

export const RACE_TRACKS = Object.freeze([
  Object.freeze({
    id: 'sunrise',
    laps: 3,
    width: 7.2,
    difficulty: 1,
    path: oval(0, 0, 28, 18, 48),
    itemSlots: ITEM_SLOTS,
    theme: Object.freeze({
      clear: 0x87b8e8,
      fog: 0xa8c8e8,
      asphalt: 0x2a3140,
      shoulder: 0xd4a574,
      accent: 0xffc857,
      deco: 'trees',
      banking: 0.04
    })
  }),
  Object.freeze({
    id: 'harbor',
    laps: 3,
    width: 7.6,
    difficulty: 2,
    path: figureish(0, 0, 1.05, 64),
    itemSlots: ITEM_SLOTS,
    theme: Object.freeze({
      clear: 0x1a3a52,
      fog: 0x243e55,
      asphalt: 0x243044,
      shoulder: 0x6b8a9e,
      accent: 0x57dfff,
      deco: 'docks',
      banking: 0.06
    })
  }),
  Object.freeze({
    id: 'mountain',
    laps: 3,
    width: 6.4,
    difficulty: 3,
    path: mountain(0, 0, 1, 56),
    itemSlots: ITEM_SLOTS,
    theme: Object.freeze({
      clear: 0x6a8f7a,
      fog: 0x7a9a88,
      asphalt: 0x333840,
      shoulder: 0x5a6b4a,
      accent: 0xc4e09a,
      deco: 'rocks',
      banking: 0.12
    })
  }),
  Object.freeze({
    id: 'neon',
    laps: 3,
    width: 6.8,
    difficulty: 3,
    path: neonCity(0, 0, 1.1, 60),
    itemSlots: ITEM_SLOTS,
    theme: Object.freeze({
      clear: 0x0a0618,
      fog: 0x120a28,
      asphalt: 0x1a1430,
      shoulder: 0x3a2060,
      accent: 0xff4fd8,
      deco: 'neon',
      banking: 0.08
    })
  })
]);

export function getRaceTrack(id) {
  return RACE_TRACKS.find(t => t.id === id) || RACE_TRACKS[0];
}

/** Cumulative lengths + total for progress along a closed path. */
export function buildPathMetrics(path) {
  const n = path.length;
  const seg = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    seg[i] = len;
    total += len;
  }
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + seg[i];
  return {seg, cum, total, n};
}

/** Closest point on closed polyline → {s (0–1), dist, nx, nz, tx, tz, x, z, heading}. */
export function projectOnPath(path, metrics, x, z) {
  const {seg, cum, total, n} = metrics;
  let bestD = Infinity;
  let best = {s: 0, dist: 0, nx: 0, nz: 1, tx: 1, tz: 0, x: path[0].x, z: path[0].z, heading: 0};
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1e-6;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestD) {
      bestD = d;
      const len = seg[i] || Math.sqrt(len2);
      const along = cum[i] + t * len;
      const tx = dx / (len || 1);
      const tz = dz / (len || 1);
      // Left normal (perpendicular)
      const nx = -tz;
      const nz = tx;
      best = {
        s: total > 0 ? along / total : 0,
        dist: d,
        nx, nz, tx, tz,
        x: px, z: pz,
        heading: Math.atan2(tx, tz)
      };
    }
  }
  return best;
}

export function pointAtProgress(path, metrics, s) {
  const {cum, total, n} = metrics;
  const target = ((s % 1) + 1) % 1 * total;
  let i = 0;
  while (i < n - 1 && cum[i + 1] < target) i++;
  const a = path[i];
  const b = path[(i + 1) % n];
  const segLen = cum[i + 1] - cum[i] || 1;
  const t = (target - cum[i]) / segLen;
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return {x, z, heading: Math.atan2(dx / len, dz / len), tx: dx / len, tz: dz / len, nx: -dz / len, nz: dx / len};
}
