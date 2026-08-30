export const MEMBERSHIP_PRICE_JPY = 500;

export class MembershipManager extends EventTarget {
  constructor({ apiBase = '/api', session = null, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    super();
    this.apiBase = apiBase.replace(/\/$/, '');
    this.session = session || { authenticated: false, mode: 'anonymous' };
    this.fetchImpl = fetchImpl;
    this.status = {
      plan: 'FREE',
      adFree: false,
      priceJpy: MEMBERSHIP_PRICE_JPY,
      paymentAvailable: false,
      googleH5AdsPublisherId: null
    };
  }

  async initialize() {
    if (!this.fetchImpl || this.session.mode === 'local') return this.status;
    try {
      const response = await this.fetchImpl(`${this.apiBase}/membership`, { credentials: 'include' });
      const result = await response.json();
      if (response.ok) this.status = { ...this.status, ...result };
    } catch {
      // オフライン時も無料ゲームは止めない。
    }
    this.dispatchEvent(new CustomEvent('change', { detail: this.status }));
    return this.status;
  }

  get isAdFree() {
    return Boolean(this.status.adFree);
  }

  async startCheckout() {
    if (!this.session.authenticated || this.session.mode !== 'authenticated') {
      const error = new Error('購入するにはGoogleログインが必要です。');
      error.code = 'LOGIN_REQUIRED';
      throw error;
    }
    const response = await this.fetchImpl(`${this.apiBase}/membership/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.checkoutUrl) {
      const error = new Error(result.error === 'PAYMENT_NOT_CONFIGURED'
        ? 'お支払いの準備中です。管理者がStripeを設定すると購入できます。'
        : 'お支払いページを開けませんでした。少し待ってもう一度お試しください。');
      error.code = result.error || 'CHECKOUT_FAILED';
      throw error;
    }
    location.assign(result.checkoutUrl);
  }
}
