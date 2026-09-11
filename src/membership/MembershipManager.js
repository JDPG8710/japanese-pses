import { hasParentalAck, requireParentalGate } from '../privacy/ParentalGate.mjs';

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
      checkoutAllowed: false,
      cnSafeMode: false,
      country: null,
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

  /**
   * @param {{ termsAccepted?: boolean, locale?: string, skipParentalGate?: boolean }} [options]
   */
  async startCheckout({ termsAccepted = false, locale = 'ja', skipParentalGate = false } = {}) {
    if (!this.session.authenticated || this.session.mode !== 'authenticated') {
      const error = new Error('購入するにはGoogleログインが必要です。');
      error.code = 'LOGIN_REQUIRED';
      throw error;
    }
    if (this.status.cnSafeMode) {
      const error = new Error('この地域ではオンライン購入を利用できません。ゲストのまま本機で学習できます。');
      error.code = 'CN_SAFE_MODE';
      throw error;
    }
    if (!this.status.paymentAvailable || this.status.checkoutAllowed === false) {
      const error = new Error('お支払いの準備中か、この地域では購入できません。');
      error.code = 'CHECKOUT_UNAVAILABLE';
      throw error;
    }
    if (!termsAccepted) {
      const error = new Error('購入条款を確認してチェックしてください。');
      error.code = 'TERMS_REQUIRED';
      throw error;
    }
    if (!skipParentalGate) {
      const gateOk = hasParentalAck() || await requireParentalGate({ purpose: 'checkout', locale });
      if (!gateOk) {
        const error = new Error('保護者の確認が必要です。購入はキャンセルされました。');
        error.code = 'PARENTAL_GATE_REQUIRED';
        throw error;
      }
    }
    const response = await this.fetchImpl(`${this.apiBase}/membership/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parentalGateAck: true, termsAccepted: true })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.checkoutUrl) {
      const error = new Error(checkoutErrorMessage(result.error));
      error.code = result.error || 'CHECKOUT_FAILED';
      throw error;
    }
    location.assign(result.checkoutUrl);
  }
}

function checkoutErrorMessage(code) {
  if (code === 'PAYMENT_NOT_CONFIGURED') return 'お支払いの準備中です。管理者がStripeを設定すると購入できます。';
  if (code === 'CN_SAFE_MODE') return 'この地域ではオンライン購入を利用できません。';
  if (code === 'PARENTAL_GATE_REQUIRED') return '保護者の確認が必要です。';
  if (code === 'TERMS_REQUIRED') return '購入条款への同意が必要です。';
  return 'お支払いページを開けませんでした。少し待ってもう一度お試しください。';
}
