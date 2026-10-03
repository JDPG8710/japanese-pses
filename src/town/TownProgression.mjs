// Shared town progression. A challenge freezes difficulty at entry and settles at most once.
export const MAX_TOWN_LEVEL = 20;
export const TOWN_GAME_IDS = Object.freeze(['obby','tower','runner','memory','garden','race','breakout','fruit','ninja','bubble','rhythm']);
const cap = 1000000000;
const integer = (v, low, high, fallback) => Number.isSafeInteger(v) && v >= low && v <= high ? v : fallback;
export function normalizeDifficulty(raw = {}) {
  const level = integer(raw.level, 1, MAX_TOWN_LEVEL, 1);
  const infiniteRound = level === MAX_TOWN_LEVEL ? integer(raw.infiniteRound, 0, cap, 0) : 0;
  // Endless rounds keep varying without eventually exceeding child-playable physical limits.
  const scale = (level - 1) / (MAX_TOWN_LEVEL - 1) + (infiniteRound ? .35 * (1 - Math.exp(-infiniteRound / 30)) : 0);
  return Object.freeze({level, infiniteRound, scale});
}
export function challengeRandom(seed=Date.now()) {
 let a=Number(seed)>>>0;
 return ()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function newTownProgress() {
  return {version:1, level:1, infiniteRound:0, points:0, clears:0, nextTicket:1, sessions:{}};
}
export function restoreTownProgress(raw, expansion) {
  const p = newTownProgress();
  if (!raw || raw.version !== 1) {
    const completed = Math.max(0, ...Object.values(expansion?.best || {}).map(v => integer(v, 0, cap, 0)));
    p.level = Math.min(MAX_TOWN_LEVEL, completed + 1);
    p.infiniteRound = completed >= MAX_TOWN_LEVEL ? Math.min(cap, completed - MAX_TOWN_LEVEL + 1) : 0;
    return p;
  }
  Object.assign(p, normalizeDifficulty(raw));
  delete p.scale;
  p.points = integer(raw.points, 0, cap, 0);
  p.clears = integer(raw.clears, 0, cap, 0);
  p.nextTicket = integer(raw.nextTicket, 1, Number.MAX_SAFE_INTEGER, 1);
  for (const gameId of TOWN_GAME_IDS) {
    const t = raw.sessions?.[gameId];
    if (t?.gameId !== gameId || !Number.isSafeInteger(t.id) || t.id < 1 || t.id >= p.nextTicket) continue;
    p.sessions[gameId] = {...normalizeDifficulty(t), id:t.id, gameId, seed:integer(t.seed, 0, 4294967295, 0)};
  }
  return p;
}
export function townDifficulty(state) {
  return normalizeDifficulty(state.townProgress ??= restoreTownProgress(null, state.expansion));
}
export function beginTownChallenge(state, gameId, {seed = Date.now(), difficulty} = {}) {
  if (!TOWN_GAME_IDS.includes(gameId)) return null;
  const p = state.townProgress ??= restoreTownProgress(null, state.expansion);
  if (p.nextTicket >= Number.MAX_SAFE_INTEGER) return null;
  const ticket = Object.freeze({...normalizeDifficulty(difficulty || p), id:p.nextTicket++, gameId, seed:Number(seed) >>> 0});
  p.sessions[gameId] = {...ticket};
  return ticket;
}
export function cancelTownChallenge(state, ticket) {
  const sessions = state.townProgress?.sessions;
  if (!ticket || sessions?.[ticket.gameId]?.id !== ticket.id) return false;
  delete sessions[ticket.gameId];
  return true;
}
export function settleTownChallenge(state, ticket, result = {}) {
  const p = state.townProgress;
  const saved = p?.sessions?.[ticket?.gameId];
  if (!saved || saved.id !== ticket.id || saved.seed !== ticket.seed) return {awarded:false, points:0, coins:0};
  delete p.sessions[ticket.gameId];
  if (result.cleared !== true || !Number.isFinite(result.score) || result.score <= 0) return {awarded:false, points:0, coins:0};
  const points = 5 + saved.level + (saved.infiniteRound ? Math.min(10, saved.infiniteRound) : 0);
  p.points = Math.min(cap, p.points + points);
  state.coins = Math.min(cap, integer(state.coins, 0, cap, 0) + points);
  state.xp = Math.min(cap, integer(state.xp, 0, cap, 0) + 4);
  p.clears = Math.min(cap, p.clears + 1);
  // Concurrent/resumed older challenges can award their clear once, but cannot skip levels.
  const advances = saved.level === p.level && saved.infiniteRound === p.infiniteRound;
  if (advances) {
    if (p.level < MAX_TOWN_LEVEL) p.level++;
    else p.infiniteRound = Math.min(cap, p.infiniteRound + 1);
  }
  return {awarded:true, points, coins:points, advances, level:p.level, infiniteRound:p.infiniteRound};
}
export function progressionLabel(value, locale = 'en') {
  const d = normalizeDifficulty(value?.townProgress || value);
  if (d.infiniteRound) return ({zh:`无尽挑战 · 第 ${d.infiniteRound} 轮`,ja:`エンドレスチャレンジ · ${d.infiniteRound}かいめ`,en:`Endless challenge · Round ${d.infiniteRound}`})[locale] || `Endless · ${d.infiniteRound}`;
  return ({zh:`小镇等级 ${d.level} / 20`,ja:`まちのレベル ${d.level} / 20`,en:`Town level ${d.level} / 20`})[locale] || `Town ${d.level} / 20`;
}
export function townPointsLabel(points, locale = 'en') {
  return ({zh:`小镇积分 ${points}`,ja:`まちポイント ${points}`,en:`${points} town points`})[locale] || `Town points ${points}`;
}
