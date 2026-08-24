import { LoginModal } from './LoginModal.js';
import { GuestTrialManager } from './GuestTrialManager.js';

export class AuthManager extends EventTarget {
  constructor({ apiBase = '/api', turnstileSiteKey, storage, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.localMode = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
    this.modal = this.localMode ? null : new LoginModal({ siteKey: turnstileSiteKey });
    this.guest = new GuestTrialManager({ apiBase: this.apiBase, storage, fetchImpl });
    this.guest.addEventListener('expired', () => this.blockExpiredGuest());
    this.modal?.addEventListener('submit', event => this.handleSubmit(event.detail));
  }

  async initialize() {
    if (this.localMode) return { mode: 'local', authenticated: true, user: { id: 'local-offline', provider: 'local', displayName: 'ローカル学習者' } };
    const session = await this.getSession();
    if (session?.authenticated) return { mode: 'authenticated', ...session };
    const availability = await this.guest.getAvailability().catch(() => ({ allowed: false, status: 'UNAVAILABLE' }));
    if (availability.status === 'ACTIVE') return this.guest.resume(availability);
    await this.modal.show({ message: availability.allowed ? undefined : 'この端末のゲスト体験は終了しています。Google または Apple でログインしてください。' });
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
        const response = await this.fetchImpl(`${this.apiBase}/auth/${provider}`, {
          method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'cf-turnstile-response': turnstileToken })
        });
        const result = await response.json();
        if (!response.ok || !result.authorizeUrl) throw new Error('ログインを開始できませんでした。');
        location.assign(result.authorizeUrl);
        return;
      }
      const guestSession = await this.guest.start(turnstileToken);
      this.modal.hide();
      this.resolveAccess?.(guestSession);
    } catch (error) {
      this.modal.showError(error.message || '認証に失敗しました。');
    } finally {
      this.modal.setBusy(false);
    }
  }

  blockExpiredGuest() {
    window.dispatchEvent(new CustomEvent('GUEST_TRIAL_EXPIRED'));
    this.modal?.show({ message: '10分間のゲスト体験が終了しました。続けるにはログインしてください。' });
  }
}
