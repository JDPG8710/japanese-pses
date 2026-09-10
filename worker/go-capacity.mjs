export const AI_LEASE_MS = 120000;
export const capacity = env => env.GO_LOBBY.getByName('ai-capacity:v1');
export function capacityConfig(env) {
  const number = (key, fallback) => env[key] === undefined ? fallback : /^\d+$/.test(String(env[key])) ? Number(env[key]) : 0;
  return { rooms: number('GO_AI_MAX_ROOMS', 8), units: number('GO_AI_MAX_UNITS', 16), slowMs: number('GO_AI_SLOW_MS', 250) };
}
export const aiWeight = (difficulty, size = 9) => (difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2 : 1) * (size === 19 ? 4 : 1);
