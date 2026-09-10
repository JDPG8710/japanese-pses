export const LOGIN_REMINDER_INTERVAL_MS = 5 * 60 * 1000;

export const LOGIN_SOFT_PROMPT_REASONS = Object.freeze([
  'interval',
  'stage-clear',
  'learner-name',
  'before-ad'
]);

export class LoginReminderManager {
  constructor({
    sessionMode = 'anonymous',
    intervalMs = LOGIN_REMINDER_INTERVAL_MS,
    onReminder = () => {},
    now = () => Date.now(),
    isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    setIntervalImpl = (callback, delay) => globalThis.setInterval(callback, delay),
    clearIntervalImpl = timerId => globalThis.clearInterval(timerId)
  } = {}) {
    this.sessionMode = sessionMode;
    this.intervalMs = intervalMs;
    this.onReminder = onReminder;
    this.now = now;
    this.isVisible = isVisible;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.accumulatedMs = 0;
    this.lastTickAt = this.now();
    this.gameActive = false;
    this.reminderDue = false;
    this.showing = false;
    this.onceShown = new Set();
    this.boundPlayState = event => this.setGameActive(event?.detail?.active);
  }

  start() {
    if (typeof window !== 'undefined') window.addEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
    this.lastTickAt = this.now();
    this.timerId = this.setIntervalImpl(() => this.tick(), 1000);
    return this;
  }

  setGameActive(active) {
    this.tick();
    this.gameActive = Boolean(active) && this.sessionMode === 'anonymous';
    this.lastTickAt = this.now();
    if (!this.gameActive) this.showIfDue();
  }

  setSessionMode(sessionMode) {
    this.tick();
    this.sessionMode = sessionMode;
    if (sessionMode !== 'anonymous') {
      this.gameActive = false;
      this.reminderDue = false;
      this.accumulatedMs = 0;
      this.onceShown.clear();
    }
  }

  tick() {
    const current = this.now();
    const delta = Math.max(0, Math.min(5000, current - this.lastTickAt));
    this.lastTickAt = current;
    if (this.sessionMode !== 'anonymous' || !this.gameActive || !this.isVisible()) return;
    this.accumulatedMs += delta;
    if (this.accumulatedMs >= this.intervalMs) this.reminderDue = true;
  }

  showIfDue() {
    if (this.sessionMode !== 'anonymous' || !this.reminderDue || this.showing) return false;
    this.reminderDue = false;
    this.accumulatedMs = Math.max(0, this.accumulatedMs - this.intervalMs);
    void this.openPrompt('interval');
    return true;
  }

  /**
   * Soft, dismissible prompts. stage-clear / learner-name / before-ad fire at most once per anonymous session.
   * Returns true when a prompt was opened (awaitable until the UI callback settles).
   */
  async maybePrompt(reason, { force = false } = {}) {
    if (this.sessionMode !== 'anonymous' || this.showing) return false;
    if (!LOGIN_SOFT_PROMPT_REASONS.includes(reason)) return false;
    if (reason !== 'interval' && !force && this.onceShown.has(reason)) return false;
    if (reason !== 'interval') this.onceShown.add(reason);
    await this.openPrompt(reason);
    return true;
  }

  async openPrompt(reason) {
    this.showing = true;
    try {
      await Promise.resolve(this.onReminder(reason));
    } catch {
      // Soft prompts must never break play.
    } finally {
      this.showing = false;
    }
  }

  destroy() {
    if (this.timerId != null) this.clearIntervalImpl(this.timerId);
    this.timerId = null;
    if (typeof window !== 'undefined') window.removeEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
  }
}
