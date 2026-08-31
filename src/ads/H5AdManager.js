export const FREE_AD_INTERVAL_MS = 5 * 60 * 1000;

export class H5AdManager extends EventTarget {
  constructor({
    publisherId = null,
    adFree = false,
    intervalMs = FREE_AD_INTERVAL_MS,
    now = () => Date.now(),
    setIntervalImpl = (callback, delay) => globalThis.setInterval(callback, delay),
    clearIntervalImpl = timerId => globalThis.clearInterval(timerId)
  } = {}) {
    super();
    this.publisherId = normalizePublisherId(publisherId);
    this.adFree = Boolean(adFree);
    this.intervalMs = intervalMs;
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.accumulatedMs = 0;
    this.lastTickAt = this.now();
    this.gameActive = false;
    this.adDue = false;
    this.showing = false;
    this.boundPlayState = event => this.setGameActive(event?.detail?.active);
  }

  start() {
    if (typeof window !== 'undefined') window.addEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
    this.lastTickAt = this.now();
    this.timerId = this.setIntervalImpl(() => this.tick(), 1000);
    if (!this.adFree && this.publisherId) loadGoogleH5Ads(this.publisherId).catch(() => {});
    return this;
  }

  setGameActive(active) {
    this.tick();
    this.gameActive = Boolean(active) && !this.adFree;
    this.lastTickAt = this.now();
  }

  setAdFree(adFree) {
    this.tick();
    this.adFree = Boolean(adFree);
    if (this.adFree) {
      this.gameActive = false;
      this.adDue = false;
      this.accumulatedMs = 0;
    }
  }

  tick() {
    const current = this.now();
    const delta = Math.max(0, Math.min(5000, current - this.lastTickAt));
    this.lastTickAt = current;
    if (!this.adFree && this.gameActive && typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
      this.accumulatedMs += delta;
      if (this.accumulatedMs >= this.intervalMs && !this.adDue) {
        this.adDue = true;
        this.emit('due', { accumulatedMs: this.accumulatedMs });
      }
    }
  }

  runAtSafeBreak(continueAction = () => {}) {
    this.tick();
    if (this.adFree || !this.adDue || this.showing) {
      continueAction();
      return false;
    }
    this.showing = true;
    const finish = (detail = {}) => {
      if (!this.showing) return;
      this.showing = false;
      this.adDue = false;
      this.accumulatedMs = 0;
      this.lastTickAt = this.now();
      this.emit('complete', detail);
      continueAction();
    };

    if (typeof window !== 'undefined' && typeof window.adBreak === 'function' && this.publisherId) {
      try {
        window.adBreak({
          type: 'next',
          name: 'five-minute-learning-break',
          beforeAd: () => this.emit('show'),
          afterAd: () => {},
          adBreakDone: placementInfo => finish(placementInfo || {})
        });
        return true;
      } catch (error) {
        finish({ breakStatus: 'error', message: error?.message || 'adBreak failed' });
        return false;
      }
    }

    // 広告ID未設定・ローカル開発・広告在庫なしでも、ゲーム進行を止めない。
    finish({ breakStatus: 'notConfigured' });
    return false;
  }

  destroy() {
    if (this.timerId != null) this.clearIntervalImpl(this.timerId);
    this.timerId = null;
    if (typeof window !== 'undefined') window.removeEventListener('GAME_PLAY_STATE_CHANGED', this.boundPlayState);
  }

  emit(type, detail = {}) {
    try { this.dispatchEvent(new CustomEvent(type, { detail })); } catch { /* Nodeテスト用EventTarget差異 */ }
  }
}

export function normalizePublisherId(value) {
  const candidate = String(value || '').trim();
  return /^ca-pub-\d{10,}$/.test(candidate) ? candidate : null;
}

let adsLoader;
export function loadGoogleH5Ads(publisherId) {
  const client = normalizePublisherId(publisherId);
  if (!client || typeof document === 'undefined') return Promise.resolve(false);
  if (adsLoader) return adsLoader;
  window.adsbygoogle = window.adsbygoogle || [];
  const adPlacementCommand = config => window.adsbygoogle.push(config);
  window.adBreak = typeof window.adBreak === 'function' ? window.adBreak : adPlacementCommand;
  window.adConfig = typeof window.adConfig === 'function' ? window.adConfig : adPlacementCommand;
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  const scriptUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  const existingScript = Array.from(document.scripts || []).find(script => script.src === scriptUrl);
  if (existingScript) {
    adsLoader = Promise.resolve(true);
    return adsLoader;
  }
  adsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = scriptUrl;
    script.onload = () => resolve(true);
    script.onerror = () => { adsLoader = null; reject(new Error('Google H5 ads failed to load')); };
    document.head.appendChild(script);
  });
  return adsLoader;
}
