import { createDeviceFingerprint } from './DeviceFingerprint.js';

const GUEST_POLICY_VERSION = 3;
const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000;
const TRIAL_BLOCK_MS = 7 * 24 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const MAX_LOCAL_TICK_MS = 5 * 1000;

export class GuestTrialManager extends EventTarget {
  constructor({
    apiBase = '/api',
    storage,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    now = () => Date.now(),
    setIntervalImpl = (callback, delay) => globalThis.setInterval(callback, delay),
    clearIntervalImpl = timerId => globalThis.clearInterval(timerId),
    isGameStageVisible = defaultGameStageVisible
  } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.isGameStageVisibleImpl = isGameStageVisible;
    this.timer = null;
    this.heartbeatTimer = null;
    this.fingerprintHash = null;
    this.periodStartedAt = 0;
    this.periodEndsAt = 0;
    this.allowanceMs = TRIAL_DURATION_MS;
    this.usedMs = 0;
    this.remainingMs = TRIAL_DURATION_MS;
    this.lastLocalTickAt = 0;
    this.gameActive = false;
    this.pageVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    this.started = false;
    this.expired = false;
    this.boundPlayState = event => this.setGameActive(Boolean(event.detail?.active));
    this.boundVisibility = () => this.handleVisibilityChange();
    this.boundPageHide = () => this.handlePageHide();
    if (typeof window !== 'undefined') {
      window.addEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
      window.addEventListener('pagehide', this.boundPageHide);
    }
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', this.boundVisibility);
  }

  async getAvailability() {
    this.fingerprintHash ||= await createDeviceFingerprint();
    let local = await this.storage.getGuestTracker(this.fingerprintHash);
    if (local && Number(local.policy_version) !== GUEST_POLICY_VERSION) local = null;
    if (local && Number(local.block_until) <= this.now()) local = null;
    if (local && (local.status === 'EXPIRED' || Number(local.remaining_ms) <= 0)) {
      return { allowed: false, status: 'EXPIRED', remainingMs: 0, periodEndsAt: Number(local.block_until) };
    }
    if (!this.fetchImpl || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return local?.status === 'ACTIVE'
        ? localRecordResponse(local)
        : { allowed: !local, status: local ? 'EXPIRED' : 'AVAILABLE', allowanceMs: TRIAL_DURATION_MS };
    }
    const response = await this.fetchImpl(`${this.apiBase}/guest/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fingerprintHash: this.fingerprintHash, usedMs: Number(local?.used_ms || 0) })
    });
    if (!response.ok) return { allowed: false, status: 'UNAVAILABLE' };
    const remote = await readJsonResponse(response);
    if (remote.status === 'EXPIRED') {
      await this.saveTracker(remote, 'EXPIRED');
      return remote;
    }
    if (remote.status === 'ACTIVE') {
      await this.saveTracker(remote, 'ACTIVE');
      return remote;
    }
    return remote;
  }

  async start(turnstileToken) {
    this.fingerprintHash ||= await createDeviceFingerprint();
    const availability = await this.getAvailability();
    if (availability.status === 'ACTIVE') return this.resume(availability);
    if (!availability.allowed) throw new Error('この端末の今週の累積ゲスト体験は終了しています。Google でログインしてください。');
    const response = await this.fetchImpl(`${this.apiBase}/guest/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fingerprintHash: this.fingerprintHash, 'cf-turnstile-response': turnstileToken })
    });
    const result = await readJsonResponse(response);
    if (!response.ok || !result.allowed) {
      if (result.error === 'TURNSTILE_FAILED') throw new Error('人間確認の有効期限が切れました。もう一度確認してください。');
      if (result.status === 'ACTIVE') return this.resume(result);
      if (result.status === 'EXPIRED') throw new Error('この端末の今週の累積ゲスト体験は終了しています。Google でログインしてください。');
      throw new Error('ゲスト体験を開始できませんでした。もう一度お試しください。');
    }
    await this.saveTracker(result, 'ACTIVE');
    return this.resume(result);
  }

  resume(record) {
    this.allowanceMs = Number(record.allowanceMs || record.allowance_ms || TRIAL_DURATION_MS);
    this.periodStartedAt = Number(record.periodStartedAt || record.start_time || this.now());
    this.periodEndsAt = Number(record.periodEndsAt || record.block_until || (this.periodStartedAt + TRIAL_BLOCK_MS));
    this.usedMs = clamp(Number(record.usedMs ?? record.used_ms ?? 0), 0, this.allowanceMs);
    this.remainingMs = clamp(Number(record.remainingMs ?? record.remaining_ms ?? (this.allowanceMs - this.usedMs)), 0, this.allowanceMs);
    this.usedMs = Math.max(this.usedMs, this.allowanceMs - this.remainingMs);
    this.expired = false;
    this.started = true;
    this.gameActive = false;
    this.lastLocalTickAt = this.now();
    if (this.remainingMs <= 0 || this.periodEndsAt <= this.now()) {
      void this.expire({ report: false, reason: this.remainingMs <= 0 ? 'QUOTA_EXHAUSTED' : 'PERIOD_ENDED' });
      return { mode: 'guest', expired: true };
    }
    this.renderCountdown();
    this.clearIntervalImpl(this.timer);
    this.clearIntervalImpl(this.heartbeatTimer);
    this.timer = this.setIntervalImpl(() => this.tick(), 1000);
    this.heartbeatTimer = this.setIntervalImpl(() => {
      if (this.isActivelyPlaying()) void this.reportUsage(true);
    }, HEARTBEAT_INTERVAL_MS);
    this.tick();
    // 前回のタブがゲーム中に閉じられても、星図へ戻った時点でサーバー側の活動フラグを必ず停止する。
    void this.reportUsage(false);
    return { mode: 'guest', remainingMs: this.remainingMs, periodEndsAt: this.periodEndsAt };
  }

  isGameStageVisible() {
    try { return Boolean(this.isGameStageVisibleImpl?.()); } catch { return false; }
  }

  isActivelyPlaying() {
    return Boolean(this.started && !this.expired && this.gameActive && this.pageVisible && this.isGameStageVisible());
  }

  setGameActive(active) {
    const next = Boolean(active) && this.isGameStageVisible();
    if (!this.started || this.expired || this.gameActive === next) return;
    this.accountLocalUsage();
    this.gameActive = next;
    this.lastLocalTickAt = this.now();
    void this.reportUsage(this.isActivelyPlaying());
  }

  handleVisibilityChange() {
    if (!this.started || this.expired) return;
    this.accountLocalUsage();
    this.pageVisible = document.visibilityState !== 'hidden';
    this.lastLocalTickAt = this.now();
    void this.reportUsage(this.isActivelyPlaying());
  }

  handlePageHide() {
    if (!this.started || this.expired) return;
    this.accountLocalUsage();
    this.gameActive = false;
    void this.reportUsage(false, { keepalive: true });
  }

  accountLocalUsage() {
    const now = this.now();
    const elapsed = Math.max(0, now - Number(this.lastLocalTickAt || now));
    if (this.isActivelyPlaying() && elapsed > 0) {
      const playedMs = Math.min(elapsed, MAX_LOCAL_TICK_MS);
      this.usedMs = clamp(this.usedMs + playedMs, 0, this.allowanceMs);
      this.remainingMs = Math.max(0, this.allowanceMs - this.usedMs);
    }
    this.lastLocalTickAt = now;
  }

  tick() {
    if (!this.started || this.expired) return;
    // イベントが欠落しても、ゲーム画面が閉じていれば次のtickで強制停止する。
    if (this.gameActive && !this.isGameStageVisible()) this.setGameActive(false);
    this.accountLocalUsage();
    const label = typeof document !== 'undefined' ? document.getElementById('guest-trial-countdown') : null;
    if (label) {
      const stateLabel = this.isActivelyPlaying() ? 'プレイ中のみ消費' : '星図では停止中';
      label.textContent = `ゲスト残り（${stateLabel}） ${formatGuestRemaining(this.remainingMs)}`;
      label.dataset.playState = this.isActivelyPlaying() ? 'active' : 'paused';
    }
    if (this.remainingMs <= 0) void this.expire({ reason: 'QUOTA_EXHAUSTED' });
    else if (this.periodEndsAt <= this.now()) void this.expire({ reason: 'PERIOD_ENDED' });
  }

  async reportUsage(active, { keepalive = false } = {}) {
    if (!this.started || !this.fingerprintHash) return null;
    this.accountLocalUsage();
    await this.saveTracker(this.currentRecord(), this.remainingMs <= 0 ? 'EXPIRED' : 'ACTIVE');
    if (!this.fetchImpl || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
    try {
      const response = await this.fetchImpl(`${this.apiBase}/guest/usage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive,
        body: JSON.stringify({ fingerprintHash: this.fingerprintHash, active: Boolean(active) && this.isGameStageVisible() && this.pageVisible, usedMs: Math.ceil(this.usedMs) })
      });
      const result = await readJsonResponse(response);
      if (!response.ok && result.status !== 'EXPIRED') return result;
      if (Number.isFinite(Number(result.remainingMs))) {
        this.allowanceMs = Number(result.allowanceMs || this.allowanceMs);
        this.remainingMs = clamp(Number(result.remainingMs), 0, this.allowanceMs);
        this.usedMs = Math.max(this.usedMs, Number(result.usedMs || 0), this.allowanceMs - this.remainingMs);
        this.periodStartedAt = Number(result.periodStartedAt || this.periodStartedAt);
        this.periodEndsAt = Number(result.periodEndsAt || this.periodEndsAt);
        await this.saveTracker(result, result.status || (this.remainingMs <= 0 ? 'EXPIRED' : 'ACTIVE'));
      }
      if (this.remainingMs <= 0 && !this.expired) void this.expire({ report: false, reason: 'QUOTA_EXHAUSTED' });
      return result;
    } catch {
      return null;
    }
  }

  async expire({ report = true, reason = 'QUOTA_EXHAUSTED' } = {}) {
    if (this.expired) return;
    this.accountLocalUsage();
    this.expired = true;
    this.gameActive = false;
    this.clearIntervalImpl(this.timer);
    this.clearIntervalImpl(this.heartbeatTimer);
    if (report) await this.reportUsage(false, { keepalive: true });
    if (this.fingerprintHash) await this.saveTracker(this.currentRecord(), reason === 'PERIOD_ENDED' ? 'PERIOD_ENDED' : 'EXPIRED');
    if (typeof document !== 'undefined') document.getElementById('guest-trial-countdown')?.remove();
    this.dispatchEvent(new CustomEvent('expired', { detail: { reason } }));
  }

  renderCountdown() {
    if (typeof document === 'undefined' || document.getElementById('guest-trial-countdown')) return;
    const chip = document.createElement('div');
    chip.id = 'guest-trial-countdown';
    chip.setAttribute('role', 'timer');
    chip.className = 'fixed top-3 right-3 z-[90] rounded-full border border-amber-300/60 bg-slate-950/95 px-4 py-2 text-sm font-black text-amber-200 shadow-xl';
    document.body.appendChild(chip);
  }

  destroy() {
    if (this.started && !this.expired) {
      this.accountLocalUsage();
      this.gameActive = false;
      void this.reportUsage(false, { keepalive: true });
    }
    this.clearIntervalImpl(this.timer);
    this.clearIntervalImpl(this.heartbeatTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
      window.removeEventListener('pagehide', this.boundPageHide);
    }
    if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', this.boundVisibility);
  }

  currentRecord() {
    return {
      periodStartedAt: this.periodStartedAt,
      periodEndsAt: this.periodEndsAt,
      allowanceMs: this.allowanceMs,
      usedMs: this.usedMs,
      remainingMs: this.remainingMs
    };
  }

  async saveTracker(record, status) {
    const periodStartedAt = Number(record.periodStartedAt || record.start_time || this.periodStartedAt || this.now());
    const allowanceMs = Number(record.allowanceMs || record.allowance_ms || this.allowanceMs || TRIAL_DURATION_MS);
    const usedMs = clamp(Number(record.usedMs ?? record.used_ms ?? (allowanceMs - Number(record.remainingMs ?? record.remaining_ms ?? allowanceMs))), 0, allowanceMs);
    return this.storage.saveGuestTracker({
      fingerprint_hash: this.fingerprintHash,
      policy_version: GUEST_POLICY_VERSION,
      status,
      start_time: periodStartedAt,
      allowance_ms: allowanceMs,
      used_ms: usedMs,
      remaining_ms: Math.max(0, allowanceMs - usedMs),
      block_until: Number(record.periodEndsAt || record.block_until || this.periodEndsAt || periodStartedAt + TRIAL_BLOCK_MS)
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

function localRecordResponse(local) {
  return {
    allowed: true,
    status: 'ACTIVE',
    policyVersion: GUEST_POLICY_VERSION,
    allowanceMs: Number(local.allowance_ms || TRIAL_DURATION_MS),
    periodStartedAt: Number(local.start_time),
    periodEndsAt: Number(local.block_until),
    usedMs: Number(local.used_ms || 0),
    remainingMs: Number(local.remaining_ms ?? TRIAL_DURATION_MS)
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function defaultGameStageVisible() {
  if (typeof document === 'undefined') return true;
  const modal = document.getElementById('game-modal');
  if (!modal || modal.classList?.contains('hidden')) return false;
  if (modal.getAttribute?.('aria-hidden') === 'true') return false;
  const style = typeof globalThis.getComputedStyle === 'function' ? globalThis.getComputedStyle(modal) : null;
  return !style || (style.display !== 'none' && style.visibility !== 'hidden');
}

async function readJsonResponse(response) {
  try { return await response.json(); } catch { return {}; }
}
