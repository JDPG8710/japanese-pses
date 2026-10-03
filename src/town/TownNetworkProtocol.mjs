export const TOWN_CAPACITY = 12;
export const TOWN_GAMES = ['obby','tower','runner','memory','garden','race','breakout','fruit','ninja','bubble','rhythm','shop'];
export const TOWN_CHARACTERS = ['explorer','robot','cat','astro','frog','builder'];
export const TOWN_EMOTES = ['wave','laugh','cheer','heart'];
export const TOWN_ROOM_CODE = /^(?:[a-f0-9]{32}|public-[1-8])$/;
// Strict finite coordinates and fixed choices only; no names, identity or chat from clients.
export function cleanPresence(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (Object.keys(v).some(k => !['x','y','z','heading','avatar','outfit','vehicle','game','level','infiniteRound'].includes(k))) return null;
  for (const k of ['x','y','z','heading']) if (typeof v[k] !== 'number' || !Number.isFinite(v[k])) return null;
  if (Math.abs(v.x)>80 || Math.abs(v.z)>80 || v.y<0 || v.y>48 || Math.abs(v.heading)>Math.PI*8) return null;
  if (!TOWN_CHARACTERS.includes(v.avatar) || !['foot','car','plane'].includes(v.vehicle)) return null;
  if (v.game !== null && !TOWN_GAMES.includes(v.game)) return null;
  if (v.outfit !== undefined && (!Number.isInteger(v.outfit) || v.outfit<0 || v.outfit>5)) return null;
  if (v.level!==undefined&&(!Number.isInteger(v.level)||v.level<1||v.level>20)) return null;
  if (v.infiniteRound!==undefined&&(!Number.isSafeInteger(v.infiniteRound)||v.infiniteRound<0||v.infiniteRound>1000000)) return null;
  return {x:v.x,y:v.y,z:v.z,heading:v.heading,avatar:v.avatar,outfit:v.outfit||0,vehicle:v.vehicle,game:v.game,level:v.level||1,infiniteRound:v.infiniteRound||0};
}
