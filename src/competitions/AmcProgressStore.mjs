// AMC hub progress store: account-bound when signed in, browser-local when not.
//
// Signed in : progress is loaded from /api/amc/progress on page open and every
//             change is queued as an event and POSTed (debounced, retried with
//             backoff, flushed with keepalive on pagehide). The server copy is
//             the source of truth; the local cache (per user, key derived from a
//             hash of the user id) only gives a fast first paint and holds the
//             unsent queue.
// Signed out: progress lives in the guest key. On the first sign-in on this
//             browser it is merged into the account once (best score wins,
//             completed lessons are united) via /api/amc/import and then
//             removed, so it can never merge into a second account.
// Privacy   : when nobody is signed in, cached copies of earlier users'
//             progress are deleted (only an unsent queue is kept, without any
//             progress snapshot), so the next person on this browser never
//             sees the previous user's results.
import {
  emptyProgress, normalizeProgress, validateEvent, applyEvent, applySnapshot, snapshotOf, snapshotIsEmpty,
  readLegacySnapshot, legacyKeyList, EVENT_ID
} from './AmcProgressModel.mjs';

export const GUEST_KEY = 'piko-amc-guest:v1';
export const USER_PREFIX = 'piko-amc-user:v1:';
export const MIGRATED_KEY = 'piko-amc-migrated:v1';
const BATCH = 20;

export function userCacheKey(userId) {
  // Two 32-bit FNV-1a passes: a stable, non-reversible-at-a-glance key per account.
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (const char of String(userId)) {
    const code = char.codePointAt(0);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x01000193) >>> 0;
    b = (b ^ (b >>> 13)) >>> 0;
  }
  return `${USER_PREFIX}${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

function safeStorage(storage) {
  const memory = new Map();
  let ok = !!storage;
  if (ok) { try { const probe = 'piko-amc-storage-check'; storage.setItem(probe, '1'); storage.removeItem(probe); } catch { ok = false; } }
  return {
    get ok() { return ok; },
    get(key) { try { return ok ? storage.getItem(key) : memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
    set(key, value) { memory.set(key, value); try { if (ok) storage.setItem(key, value); } catch { ok = false; } },
    remove(key) { memory.delete(key); try { if (ok) storage.removeItem(key); } catch { /* ignore */ } },
    keys() { try { if (ok) return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(Boolean); } catch { /* ignore */ } return [...memory.keys()]; }
  };
}

const readJson = (store, key) => { try { const value = JSON.parse(store.get(key) || 'null'); return value && typeof value === 'object' ? value : null; } catch { return null; } };

function randomId(prefix) {
  const bytes = new Uint8Array(12);
  try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); }
  return `${prefix}${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}

export class AmcProgressStore extends EventTarget {
  constructor({ storage = globalThis.localStorage, fetchImpl = globalThis.fetch?.bind(globalThis), apiBase = '/api', debounceMs = 800, retryDelays = [2000, 5000, 15000, 30000, 60000], now = () => Date.now(), timers = globalThis } = {}) {
    super();
    this.store = safeStorage((() => { try { return storage; } catch { return undefined; } })());
    this.fetch = fetchImpl;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.debounceMs = debounceMs;
    this.retryDelays = retryDelays;
    this.now = now;
    this.timers = timers;
    this.mode = 'loading';
    this.status = 'loading';
    this.user = null;
    this.server = emptyProgress();
    this.queue = [];
    this.pendingImport = null;
    this.merged = false;
    this.retryIndex = 0;
    this.timer = null;
    this.inflight = null;
    this.again = false;
    this.guest = this.loadGuest();
  }

  get storageOK() { return this.store.ok; }

  // ---------- guest ----------
  loadGuest() {
    const saved = readJson(this.store, GUEST_KEY);
    const guest = { progress: normalizeProgress(saved?.progress), importId: typeof saved?.importId === 'string' && EVENT_ID.test(saved.importId) ? saved.importId : null };
    const legacy = readLegacySnapshot(key => this.store.get(key));
    if (!snapshotIsEmpty(legacy)) applySnapshot(guest.progress, legacy, this.now());
    const hadLegacy = legacyKeyList().some(key => this.store.get(key) !== null);
    if (hadLegacy || saved) {
      for (const key of legacyKeyList()) this.store.remove(key);
      this.saveGuest(guest);
    }
    return guest;
  }
  saveGuest(guest = this.guest) {
    if (snapshotIsEmpty(snapshotOf(guest.progress))) { this.store.remove(GUEST_KEY); return; }
    if (!guest.importId) guest.importId = randomId('imp');
    this.store.set(GUEST_KEY, JSON.stringify({ v: 1, progress: guest.progress, importId: guest.importId }));
  }

  // ---------- session ----------
  /** One request answers both "who is signed in" and "what is their progress". */
  async init() {
    let result = null;
    try {
      const response = await this.fetch(`${this.apiBase}/amc/progress`, { credentials: 'same-origin', cache: 'no-store' });
      if (response.ok) result = await response.json();
    } catch { result = null; }
    if (result?.authenticated && result.user?.id) await this.signIn(result.user, result.progress);
    // Only a definite "signed out" answer purges other accounts' caches; an
    // unreachable API (offline, 5xx, not deployed yet) just works locally.
    else this.signOut({ purge: result?.authenticated === false });
    return this;
  }

  signOut({ purge = true } = {}) {
    this.cancelTimer();
    this.mode = 'guest'; this.user = null; this.server = emptyProgress(); this.queue = []; this.pendingImport = null;
    this.status = 'local';
    // Never keep another account's progress readable on a signed-out browser.
    if (purge) for (const key of this.store.keys()) {
      if (!key.startsWith(USER_PREFIX)) continue;
      const cache = readJson(this.store, key);
      const queue = Array.isArray(cache?.queue) ? cache.queue : [];
      if (queue.length) this.store.set(key, JSON.stringify({ v: 1, queue })); else this.store.remove(key);
    }
    this.emit();
  }

  async signIn(user, serverProgress) {
    this.mode = 'user';
    this.user = { id: String(user.id), displayName: String(user.displayName || '').slice(0, 60) };
    this.cacheKey = userCacheKey(this.user.id);
    const cache = readJson(this.store, this.cacheKey);
    // Server copy is the source of truth; the cache only matters for its unsent queue.
    this.server = normalizeProgress(serverProgress ?? cache?.progress);
    this.queue = (Array.isArray(cache?.queue) ? cache.queue : []).map(event => validateEvent(event, this.now())).filter(Boolean);
    const snapshot = snapshotOf(this.guest.progress);
    this.pendingImport = snapshotIsEmpty(snapshot) ? null : { importId: this.guest.importId || randomId('imp'), snapshot };
    this.saveCache();
    if (this.queue.length || this.pendingImport || !serverProgress) {
      this.status = this.queue.length || this.pendingImport ? 'saving' : 'loading';
      this.emit();
      await this.sync();
    } else {
      this.status = 'synced';
      this.emit();
    }
  }

  saveCache() {
    if (this.mode !== 'user') return;
    this.store.set(this.cacheKey, JSON.stringify({ v: 1, progress: this.server, queue: this.queue }));
  }

  // ---------- reading ----------
  /** Progress to display: server copy + unsent changes (+ guest data not yet merged). */
  view() {
    if (this.mode !== 'user') return this.guest.progress;
    const progress = normalizeProgress(JSON.parse(JSON.stringify(this.server)));
    if (this.pendingImport) applySnapshot(progress, this.pendingImport.snapshot, this.now());
    for (const event of this.queue) applyEvent(progress, event);
    return progress;
  }
  realBest(level, area) { return this.view().real[`${level}:${area}`]?.best || 0; }
  mockBest(level) { return this.view().mock[level]?.best || 0; }
  mockHistory(level) { return this.view().mock[level]?.history || []; }
  drillBest(topic) { return this.view().drill[topic]?.best || 0; }
  lessonsDone(level) { return new Set(Object.entries(this.view().lessons[level] || {}).filter(([, value]) => value.done).map(([id]) => id)); }

  // ---------- writing ----------
  record(input) {
    const event = validateEvent({ ...input, id: randomId('e'), at: this.now() }, this.now());
    if (!event) return false;
    if (this.mode === 'user') {
      this.queue.push(event);
      this.saveCache();
      this.status = 'saving';
      this.emit();
      this.schedule(this.debounceMs);
    } else {
      applyEvent(this.guest.progress, event);
      this.saveGuest();
      this.emit();
    }
    return true;
  }
  recordReal(level, area, score) { return this.record({ type: 'real', key: `${level}:${area}`, score }); }
  recordMock(level, { points, correct, blank, wrong }) { return this.record({ type: 'mock', key: level, score: points, correct, blank, wrong }); }
  recordDrill(topic, score) { return this.record({ type: 'drill', key: topic, score }); }
  setLesson(level, id, done) { return this.record({ type: 'lesson', key: `${level}:${id}`, done: !!done }); }

  // ---------- sync ----------
  cancelTimer() { if (this.timer) { this.timers.clearTimeout(this.timer); this.timer = null; } }
  schedule(delay) {
    if (this.mode !== 'user') return;
    this.cancelTimer();
    this.timer = this.timers.setTimeout(() => { this.timer = null; void this.sync(); }, delay);
  }

  async post(path, body, keepalive) {
    return this.fetch(`${this.apiBase}${path}`, {
      method: 'POST', credentials: 'same-origin', keepalive: !!keepalive,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
  }

  /** Send queued events and any pending guest import, or just refresh from the server. */
  sync({ keepalive = false } = {}) {
    if (this.mode !== 'user') return Promise.resolve(false);
    if (this.inflight) { this.again = true; return this.inflight; }
    this.cancelTimer();
    this.inflight = this.runSync(keepalive).finally(() => {
      this.inflight = null;
      if (this.again && this.mode === 'user') { this.again = false; this.schedule(0); }
    });
    return this.inflight;
  }

  async runSync(keepalive) {
    const userAtStart = this.user?.id;
    let refreshed = false;
    try {
      while (this.queue.length) {
        const batch = this.queue.slice(0, BATCH);
        const response = await this.post('/amc/progress', { events: batch }, keepalive);
        if (this.user?.id !== userAtStart) return false;
        if (response.status === 401) return this.expired();
        if (response.ok) {
          const result = await response.json();
          this.server = normalizeProgress(result.progress); refreshed = true;
        } else if (response.status !== 400 && response.status !== 413) {
          throw new Error(`HTTP ${response.status}`);
        } // 400/413: the batch can never succeed; drop it instead of blocking the queue.
        const sent = new Set(batch.map(event => event.id));
        this.queue = this.queue.filter(event => !sent.has(event.id));
        this.saveCache();
      }
      if (this.pendingImport) {
        const response = await this.post('/amc/import', this.pendingImport, keepalive);
        if (this.user?.id !== userAtStart) return false;
        if (response.status === 401) return this.expired();
        if (!response.ok && response.status !== 400) throw new Error(`HTTP ${response.status}`);
        if (response.ok) { this.server = normalizeProgress((await response.json()).progress); refreshed = true; this.merged = true; }
        this.store.set(MIGRATED_KEY, JSON.stringify({ account: this.cacheKey.slice(USER_PREFIX.length), importId: this.pendingImport.importId, at: this.now() }));
        this.pendingImport = null;
        this.guest = { progress: emptyProgress(), importId: null };
        this.store.remove(GUEST_KEY);
      }
      if (!refreshed) {
        const response = await this.fetch(`${this.apiBase}/amc/progress`, { credentials: 'same-origin', cache: 'no-store' });
        if (this.user?.id !== userAtStart) return false;
        if (response.status === 401) return this.expired();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.server = normalizeProgress((await response.json()).progress);
      }
      this.saveCache();
      this.retryIndex = 0;
      this.status = this.queue.length ? 'saving' : 'synced';
      this.emit();
      return true;
    } catch {
      if (this.user?.id !== userAtStart) return false;
      this.status = globalThis.navigator?.onLine === false ? 'offline' : 'retrying';
      const delay = this.retryDelays[Math.min(this.retryIndex, this.retryDelays.length - 1)];
      this.retryIndex++;
      this.emit();
      this.schedule(delay);
      return false;
    }
  }

  expired() {
    // Keep the unsent queue in this user's cache; it is sent after the next sign-in.
    this.saveCache();
    this.status = 'expired';
    this.emit();
    return false;
  }

  emit() { this.dispatchEvent(new Event('change')); }
}
