import { LoginModal } from './LoginModal.js?v=3';
import { GuestTrialManager } from './GuestTrialManager.js?v=2';
import { isLocalDevelopmentHost } from '../runtime/LocalEnvironment.js';

export class AuthManager extends EventTarget {
  constructor({ apiBase = '/api', turnstileSiteKey, storage, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.localMode = isLocalDevelopmentHost(location.hostname);
    this.modal = this.localMode ? null : new LoginModal({ siteKey: turnstileSiteKey });
    this.guest = new GuestTrialManager({ apiBase: this.apiBase, storage, fetchImpl });
    this.guest.addEventListener('expired', event => this.blockExpiredGuest(event.detail));
    this.modal?.addEventListener('submit', event => this.handleSubmit(event.detail));
  }

  async initialize() {
    if (this.localMode) return { mode: 'local', authenticated: true, user: { id: 'local-offline', provider: 'local', displayName: 'ローカル学習者' } };
    const session = await this.getSession();
    if (session?.authenticated) return { mode: 'authenticated', ...session };
    const availability = await this.guest.getAvailability().catch(() => ({ allowed: false, status: 'UNAVAILABLE' }));
    if (availability.status === 'ACTIVE') return this.guest.resume(availability);
    await this.modal.show({ message: availability.allowed ? undefined : '今週のゲスト時間を使い切りました。つづきはGoogleでログインしてね。' });
    return new Promise(resolve => { this.resolveAccess = resolve; });
  }

  async getSession() {
    try {
      const response = await this.fetchImpl(`${this.apiBase}/auth/session`, { credentials: 'include' });
      return response.ok ? response.json() : null;
    } catch { return null; }
  }

  async handleSubmit({ kind, provider, turnstileToken }) {
    this.modal.setBusy(true);
    try {
      if (kind === 'oauth') {
        if (provider !== 'google') throw new Error('いま使えるログイン方法はGoogleだけです。');
        const response = await this.fetchImpl(`${this.apiBase}/auth/${provider}`, {
          method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'cf-turnstile-response': turnstileToken })
        });
        const result = await readJson(response);
        if (!response.ok || !result.authorizeUrl) throw new Error(authErrorMessage(result));
        location.assign(result.authorizeUrl);
        return;
      }
      const guestSession = await this.guest.start(turnstileToken);
      this.modal.hide();
      this.resolveAccess?.(guestSession);
    } catch (error) {
      this.modal.showError(error.message || 'うまくログインできませんでした。もう一度ためしてみてね。');
    } finally {
      this.modal.setBusy(false);
    }
  }

  blockExpiredGuest({ reason } = {}) {
    window.dispatchEvent(new CustomEvent('GUEST_TRIAL_EXPIRED'));
    const message = reason === 'PERIOD_ENDED'
      ? '新しい1週間が始まりました。安全チェックを終えると、またゲストで遊べるよ。'
      : '今週のゲスト時間を使い切りました。つづきはGoogleでログインしてね。';
    this.modal?.show({ message });
  }
}

async function readJson(response) {
  try { return await response.json(); } catch { return {}; }
}

function authErrorMessage(result) {
  if (result?.error === 'TURNSTILE_FAILED') return '安全チェックの時間が切れました。もう一度チェックしてね。';
  if (result?.error === 'SERVER_MISCONFIGURED') return 'ログインの準備をしています。少し待ってから、もう一度ためしてみてね。';
  return 'Googleログインを始められませんでした。もう一度ためしてみてね。';
}
