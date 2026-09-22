// World coordinates; open-front buildings are entered from the north promenade (approach from south).
// Sprawl map: educational + casual venues sit in distinct districts with roomy spacing.
const EDU_COLORS = [0xe9b862, 0xab95d8, 0x77bddd, 0xe799ac, 0x94bd68, 0x73baaf];
const EDU = [
  {id: 'obby', x: -50, z: 36, color: EDU_COLORS[0]},
  {id: 'tower', x: -18, z: 52, color: EDU_COLORS[1]},
  {id: 'runner', x: 16, z: 40, color: EDU_COLORS[2]},
  {id: 'memory', x: 46, z: 28, color: EDU_COLORS[3]},
  {id: 'garden', x: 66, z: 50, color: EDU_COLORS[4]},
  {id: 'gear', x: -40, z: -16, color: EDU_COLORS[5]}
];
const CASUAL = [
  {id: 'fruit', x: -64, z: 10, color: 0xffd45e},
  {id: 'ninja', x: 60, z: -40, color: 0xc791ff},
  {id: 'breakout', x: 50, z: 70, color: 0x57dfff},
  {id: 'race', x: -60, z: -44, color: 0xff6b4a}
];
export const CASUAL_ARCADE_IDS = Object.freeze(CASUAL.map(b => b.id));
export const TOWN_BUILDINGS = [...EDU, ...CASUAL];
export const buildingAt = (x, z) => TOWN_BUILDINGS.find(b => Math.abs(x - b.x) < 1.35 && z > b.z - 2.2 && z < b.z + 0.5);
export function buildingBlocks(x, z) {
  return TOWN_BUILDINGS.some(b => Math.abs(x - b.x) < 3 && Math.abs(z - b.z) < 3 && (Math.abs(x - b.x) > 2.3 || z > b.z + 2.3));
}
export const frameSeconds = (now, last) => Number.isFinite(now - last) ? Math.max(0, Math.min((now - last) / 1000, 0.04)) : 0;
