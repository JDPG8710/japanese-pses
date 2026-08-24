const DB_NAME = 'japanese-pses-learning';
const DB_VERSION = 3;
const SYNC_INTERVAL_MS = 60_000;

export class StorageAdapter extends EventTarget {
  constructor({ apiBase = '/api', userId = null, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.userId = userId;
    this.cloudEnabled = Boolean(userId);
    this.fetchImpl = fetchImpl;
    this.db = null;
    this.memory = { user_profile: new Map(), node_progress: new Map(), guest_tracker: new Map(), star_graph_cache: new Map() };
    this.syncTimer = null;
    this.syncInFlight = null;
    this.dirty = false;
    this.localMode = isLocalDevelopment();
    this.onOnline = () => this.syncNow('network-restored').catch(() => {});
  }

  async initialize({ sync = true } = {}) {
    this.db = await openDatabase().catch(() => null);
    if (typeof window !== 'undefined') window.addEventListener('online', this.onOnline);
    const local = await this.getLocalSnapshot();
    if (sync && this.userId && !this.localMode && navigator.onLine !== false) return this.syncNow('startup').catch(() => local);
    return local;
  }

  setUser(userId, { cloudEnabled = true } = {}) { this.userId = userId; this.cloudEnabled = Boolean(userId && cloudEnabled); }

  async saveProfile(profile) {
    const record = { ...profile, user_id: profile.user_id || this.userId || 'local', updated_at: Number(profile.updated_at) || Date.now() };
    await this.put('user_profile', record);
    this.markDirty();
    return record;
  }

  async saveNodeProgress(progress) {
    if (!progress?.node_id) throw new TypeError('node_id is required');
    const owner = progress.user_id || this.userId || 'local';
    const record = {
      mastery_score: 0, unlocked_status: false, ...progress, user_id: owner,
      progress_key: `${owner}:${progress.node_id}`, updated_at: Number(progress.updated_at) || Date.now()
    };
    await this.put('node_progress', record);
    this.markDirty();
    return record;
  }

  async getGuestTracker(fingerprintHash) { return this.get('guest_tracker', fingerprintHash); }

  async saveGuestTracker(record) {
    if (!record?.fingerprint_hash) throw new TypeError('fingerprint_hash is required');
    return this.put('guest_tracker', { ...record, updated_at: Number(record.updated_at) || Date.now() });
  }

  async getCachedStarGraph() { return this.get('star_graph_cache', 'star_graph.json'); }

  async cacheStarGraph(graph, etag = null) {
    return this.put('star_graph_cache', { cache_key: 'star_graph.json', graph, etag, updated_at: Date.now() });
  }

  async getLocalSnapshot() {
    const profiles = await this.getAll('user_profile');
    const allNodeProgress = await this.getAll('node_progress');
    const profile = this.userId ? profiles.find(item => item.user_id === this.userId) || null : profiles[0] || null;
    const nodeProgress = this.userId ? allNodeProgress.filter(node => node.user_id === this.userId) : [];
    return { version: 1, userId: this.userId, updatedAt: Math.max(0, Number(profile?.updated_at || 0), ...nodeProgress.map(node => Number(node.updated_at || 0))), profile, nodeProgress };
  }

  markDirty() {
    this.dirty = true;
    clearTimeout(this.syncTimer);
    if (this.cloudEnabled && !this.localMode) this.syncTimer = setTimeout(() => this.syncNow('debounced').catch(() => {}), SYNC_INTERVAL_MS);
  }

  async reportStageClear({ nodeId, masteryScore, unlockedStatus = true, profile = null }) {
    const now = Date.now();
    if (profile) await this.saveProfile({ ...profile, updated_at: now });
    await this.saveNodeProgress({ node_id: nodeId, mastery_score: masteryScore, unlocked_status: unlockedStatus, updated_at: now });
    return this.syncNow('stage-clear');
  }

  async syncNow(reason = 'manual') {
    if (!this.cloudEnabled || !this.userId || this.localMode || !this.fetchImpl || (typeof navigator !== 'undefined' && navigator.onLine === false)) return this.getLocalSnapshot();
    if (this.syncInFlight) return this.syncInFlight;
    clearTimeout(this.syncTimer);
    this.syncInFlight = this.performSync(reason).finally(() => { this.syncInFlight = null; });
    return this.syncInFlight;
  }

  async performSync(reason) {
    const local = await this.getLocalSnapshot();
    let remote = { version: 1, userId: this.userId, updatedAt: 0, profile: null, nodeProgress: [] };
    const read = await this.fetchImpl(`${this.apiBase}/state`, { credentials: 'include', headers: { accept: 'application/json' } });
    if (read.ok) remote = await read.json();
    else if (read.status !== 404) throw new Error(`State read failed: ${read.status}`);
    const merged = mergeSnapshots(local, remote, this.userId);
    await this.persistSnapshot(merged);
    if (this.dirty || merged.updatedAt > Number(remote.updatedAt || 0)) {
      const write = await this.fetchImpl(`${this.apiBase}/state`, {
        method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...merged, syncReason: reason })
      });
      if (!write.ok) throw new Error(`State write failed: ${write.status}`);
      const result = await write.json();
      if (result.state) await this.persistSnapshot(result.state);
    }
    this.dirty = false;
    this.dispatchEvent(new CustomEvent('sync-complete', { detail: { reason, state: merged } }));
    return merged;
  }

  async persistSnapshot(snapshot) {
    if (snapshot.profile) await this.put('user_profile', snapshot.profile);
    for (const node of snapshot.nodeProgress || []) {
      const owner = node.user_id || this.userId || 'local';
      await this.put('node_progress', { ...node, user_id: owner, progress_key: `${owner}:${node.node_id}` });
    }
  }

  async get(store, key) {
    if (!this.db) return this.memory[store].get(key) || null;
    return idbRequest(this.db.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async getAll(store) {
    if (!this.db) return [...this.memory[store].values()];
    return idbRequest(this.db.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async put(store, value) {
    const keyPath = { user_profile: 'user_id', node_progress: 'progress_key', guest_tracker: 'fingerprint_hash', star_graph_cache: 'cache_key' }[store];
    if (!this.db) { this.memory[store].set(value[keyPath], structuredCloneSafe(value)); return value; }
    await idbRequest(this.db.transaction(store, 'readwrite').objectStore(store).put(value));
    return value;
  }

  destroy() {
    clearTimeout(this.syncTimer);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
    this.db?.close?.();
  }
}

export function mergeSnapshots(local, remote, userId) {
  const nodes = new Map();
  for (const node of [...(remote?.nodeProgress || []), ...(local?.nodeProgress || [])]) {
    if (!node?.node_id) continue;
    const previous = nodes.get(node.node_id);
    if (!previous || Number(node.updated_at || 0) >= Number(previous.updated_at || 0)) nodes.set(node.node_id, structuredCloneSafe(node));
  }
  const profile = Number(local?.profile?.updated_at || 0) >= Number(remote?.profile?.updated_at || 0) ? local?.profile : remote?.profile;
  return { version: 1, userId, updatedAt: Math.max(Number(local?.updatedAt || 0), Number(remote?.updatedAt || 0)), profile: profile || null, nodeProgress: [...nodes.values()] };
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('user_profile')) db.createObjectStore('user_profile', { keyPath: 'user_id' });
      if (db.objectStoreNames.contains('node_progress') && request.transaction.objectStore('node_progress').keyPath !== 'progress_key') db.deleteObjectStore('node_progress');
      if (!db.objectStoreNames.contains('node_progress')) db.createObjectStore('node_progress', { keyPath: 'progress_key' });
      if (!db.objectStoreNames.contains('guest_tracker')) db.createObjectStore('guest_tracker', { keyPath: 'fingerprint_hash' });
      if (!db.objectStoreNames.contains('star_graph_cache')) db.createObjectStore('star_graph_cache', { keyPath: 'cache_key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
  });
}

function idbRequest(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); }); }
function structuredCloneSafe(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function isLocalDevelopment() { return typeof location !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(location.hostname); }
