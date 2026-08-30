import { LoginModal } from './LoginModal.js?v=4';
import { isLocalDevelopmentHost } from '../runtime/LocalEnvironment.js';

export class AuthManager extends EventTarget {
  constructor({ apiBase = '/api', turnstileSiteKey, storage, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.localMode = isLocalDevelopmentHost(location.hostname);
    this.modal = this.localMode ? null : new LoginModal({ siteKey: turnstileSiteKey });
    this.modal?.addEventListener('submit', event => this.handleSubmit(event.detail));
  }

  async initialize() {
    if (this.localMode) {
      this.session = { mode: 'local', authenticated: true, user: { id: 'local-offline', provider: 'local', displayName: 'まなびくん' } };
      return this.session;
    }
    const session = await this.getSession();
    this.session = session?.authenticated
      ? { mode: 'authenticated', ...session }
      : { mode: 'anonymous', authenticated: false, user: null };
    return this.session;
  }

  async getSession() {
    try {
      const response = await this.fetchImpl(`${this.apiBase}/auth/session`, { credentials: 'include' });
      return response.ok ? response.json() : null;
    } catch { return null; }
  }

  async showLogin({ message } = {}) {
    if (this.localMode) return this.session;
    await this.modal.show({ message });
    return null;
  }

  async handleSubmit({ provider, turnstileToken }) {
    this.modal.setBusy(true);
    try {
      if (provider !== 'google') throw new Error('いま使えるログイン方法はGoogleだけです。');
      const response = await this.fetchImpl(`${this.apiBase}/auth/${provider}`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'cf-turnstile-response': turnstileToken })
      });
      const result = await readJson(response);
      if (!response.ok || !result.authorizeUrl) throw new Error(authErrorMessage(result));
      location.assign(result.authorizeUrl);
    } catch (error) {
      this.modal.showError(error.message || 'うまくログインできませんでした。もう一度ためしてみてね。');
      this.modal.setBusy(false);
    }
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
