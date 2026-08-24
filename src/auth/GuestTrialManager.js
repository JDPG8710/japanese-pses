import { createDeviceFingerprint } from './DeviceFingerprint.js';

const TRIAL_DURATION_MS = 10 * 60 * 1000;
const TRIAL_BLOCK_MS = 30 * 24 * 60 * 60 * 1000;

export class GuestTrialManager extends EventTarget {
  constructor({ apiBase = '/api', storage, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.timer = null;
    this.fingerprintHash = null;
    this.expiresAt = 0;
  }

  async getAvailability() {
    this.fingerprintHash ||= await createDeviceFingerprint();
    let local = await this.storage.getGuestTracker(this.fingerprintHash);
    if (local && (local.status === 'EXPIRED' || Number(local.expires_at) <= Date.now())) {
      const blockUntil = Number(local.block_until || Number(local.start_time) + TRIAL_BLOCK_MS);
      if (blockUntil > Date.now()) return { allowed: false, status: 'EXPIRED', blockExpiresAt: blockUntil };
      local = null;
    }
    if (!this.fetchImpl || navigator.onLine === false) {
      return local?.status === 'ACTIVE'
        ? { allowed: true, status: 'ACTIVE', startTime: local.start_time, expiresAt: local.expires_at }
        : { allowed: !local, status: local ? 'EXPIRED' : 'AVAILABLE' };
    }
    const response = await this.fetchImpl(`${this.apiBase}/guest/status`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fingerprintHash: this.fingerprintHash })
    });
    if (!response.ok) return { allowed: false, status: 'UNAVAILABLE' };
    const remote = await response.json();
    if (remote.status === 'EXPIRED') {
      await this.storage.saveGuestTracker({ fingerprint_hash: this.fingerprintHash, status: 'EXPIRED', start_time: remote.startTime || 0, expires_at: remote.expiresAt || Date.now(), block_until: remote.blockExpiresAt || Number(remote.startTime || 0) + TRIAL_BLOCK_MS });
      return remote;
    }
    if (remote.status === 'ACTIVE') {
      await this.storage.saveGuestTracker({ fingerprint_hash: this.fingerprintHash, status: 'ACTIVE', start_time: remote.startTime, expires_at: remote.expiresAt, block_until: remote.blockExpiresAt || Number(remote.startTime) + TRIAL_BLOCK_MS });
      return remote;
    }
    return local?.status === 'ACTIVE'
      ? { allowed: true, status: 'ACTIVE', startTime: local.start_time, expiresAt: local.expires_at }
      : remote;
  }

  async start(turnstileToken) {
    this.fingerprintHash ||= await createDeviceFingerprint();
    const availability = await this.getAvailability();
    if (availability.status === 'ACTIVE') return this.resume(availability);
    if (!availability.allowed) throw new Error('この端末のゲスト体験は終了しています。ログインしてください。');
    const response = await this.fetchImpl(`${this.apiBase}/guest/start`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fingerprintHash: this.fingerprintHash, 'cf-turnstile-response': turnstileToken })
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.allowed) {
      if (result.error === 'TURNSTILE_FAILED') throw new Error('人間確認の有効期限が切れました。もう一度確認してください。');
      if (result.status === 'ACTIVE') return this.resume(result);
      if (result.status === 'EXPIRED') throw new Error('この端末のゲスト体験は終了しています。Google でログインしてください。');
      throw new Error('ゲスト体験を開始できませんでした。もう一度お試しください。');
    }
    await this.storage.saveGuestTracker({ fingerprint_hash: this.fingerprintHash, status: 'ACTIVE', start_time: result.startTime, expires_at: result.expiresAt, block_until: result.blockExpiresAt || Number(result.startTime) + TRIAL_BLOCK_MS });
    return this.resume(result);
  }

  resume(record) {
    this.expiresAt = Number(record.expiresAt || record.expires_at || (Number(record.startTime || record.start_time) + TRIAL_DURATION_MS));
    if (this.expiresAt <= Date.now()) { this.expire(); return { mode: 'guest', expired: true }; }
    this.renderCountdown();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
    return { mode: 'guest', expiresAt: this.expiresAt };
  }

  tick() {
    const remaining = Math.max(0, this.expiresAt - Date.now());
    const label = document.getElementById('guest-trial-countdown');
    if (label) {
      const totalSeconds = Math.ceil(remaining / 1000);
      label.textContent = `体験残り ${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
    }
    if (remaining <= 0) this.expire();
  }

  async expire() {
    clearInterval(this.timer);
    if (this.fingerprintHash) {
      const startTime = this.expiresAt - TRIAL_DURATION_MS;
      await this.storage.saveGuestTracker({ fingerprint_hash: this.fingerprintHash, status: 'EXPIRED', start_time: startTime, expires_at: this.expiresAt, block_until: startTime + TRIAL_BLOCK_MS });
    }
    document.getElementById('guest-trial-countdown')?.remove();
    this.dispatchEvent(new CustomEvent('expired'));
  }

  renderCountdown() {
    if (document.getElementById('guest-trial-countdown')) return;
    const chip = document.createElement('div');
    chip.id = 'guest-trial-countdown';
    chip.setAttribute('role', 'timer');
    chip.className = 'fixed top-3 right-3 z-[90] rounded-full border border-amber-300/60 bg-slate-950/95 px-4 py-2 text-sm font-black text-amber-200 shadow-xl';
    document.body.appendChild(chip);
  }

  destroy() { clearInterval(this.timer); }
}

async function readJsonResponse(response) {
  try { return await response.json(); } catch { return {}; }
}
