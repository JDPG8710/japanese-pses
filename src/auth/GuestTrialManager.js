import { createDeviceFingerprint } from './DeviceFingerprint.js';

const GUEST_POLICY_VERSION = 2;
const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000;
const TRIAL_BLOCK_MS = 7 * 24 * 60 * 60 * 1000;

export class GuestTrialManager extends EventTarget {
  constructor({ apiBase = '/api', storage, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.timer = null;
    this.fingerprintHash = null;
    this.expiresAt = 0;
    this.startTime = 0;
    this.blockExpiresAt = 0;
    this.expired = false;
  }

  async getAvailability() {
    this.fingerprintHash ||= await createDeviceFingerprint();
    let local = await this.storage.getGuestTracker(this.fingerprintHash);
    if (local && Number(local.policy_version) !== GUEST_POLICY_VERSION) local = null;
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
      await this.saveTracker(remote, 'EXPIRED');
      return remote;
    }
    if (remote.status === 'ACTIVE') {
      await this.saveTracker(remote, 'ACTIVE');
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
    if (!availability.allowed) throw new Error('この端末の今週のゲスト体験は終了しています。Google でログインしてください。');
    const response = await this.fetchImpl(`${this.apiBase}/guest/start`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fingerprintHash: this.fingerprintHash, 'cf-turnstile-response': turnstileToken })
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.allowed) {
      if (result.error === 'TURNSTILE_FAILED') throw new Error('人間確認の有効期限が切れました。もう一度確認してください。');
      if (result.status === 'ACTIVE') return this.resume(result);
      if (result.status === 'EXPIRED') throw new Error('この端末の今週のゲスト体験は終了しています。Google でログインしてください。');
      throw new Error('ゲスト体験を開始できませんでした。もう一度お試しください。');
    }
    await this.saveTracker(result, 'ACTIVE');
    return this.resume(result);
  }

  resume(record) {
    this.startTime = Number(record.startTime || record.start_time || Date.now());
    this.expiresAt = Number(record.expiresAt || record.expires_at || (this.startTime + TRIAL_DURATION_MS));
    this.blockExpiresAt = Number(record.blockExpiresAt || record.block_until || (this.startTime + TRIAL_BLOCK_MS));
    this.expired = false;
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
      label.textContent = `体験残り ${formatGuestRemaining(remaining)}`;
    }
    if (remaining <= 0) this.expire();
  }

  async expire() {
    if (this.expired) return;
    this.expired = true;
    clearInterval(this.timer);
    if (this.fingerprintHash) {
      await this.saveTracker({ startTime: this.startTime, expiresAt: this.expiresAt, blockExpiresAt: this.blockExpiresAt }, 'EXPIRED');
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

  async saveTracker(record, status) {
    const startTime = Number(record.startTime || record.start_time || Date.now());
    return this.storage.saveGuestTracker({
      fingerprint_hash: this.fingerprintHash,
      policy_version: GUEST_POLICY_VERSION,
      status,
      start_time: startTime,
      expires_at: Number(record.expiresAt || record.expires_at || startTime + TRIAL_DURATION_MS),
      block_until: Number(record.blockExpiresAt || record.block_until || startTime + TRIAL_BLOCK_MS)
    });
  }
}

export function formatGuestRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function readJsonResponse(response) {
  try { return await response.json(); } catch { return {}; }
}
