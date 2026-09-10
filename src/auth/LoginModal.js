import { authText, localizeAuth } from './AuthText.js';

export class LoginModal extends EventTarget {
  constructor({ siteKey }) {
    super();
    this.siteKey = siteKey;
    this.token = '';
    this.widgetId = null;
    this.busy = false;
    this._hideResolve = null;
    this.render();
  }

  render() {
    this.element = document.createElement('div');
    this.element.id = 'auth-modal';
    this.element.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl';
    this.element.innerHTML = `
      <style>
        #auth-modal section{box-sizing:border-box;max-height:calc(100dvh - 32px);overflow:auto;overflow-wrap:anywhere}
        #auth-upcoming[hidden],#auth-upcoming.hidden{display:none!important}
        #auth-modal [data-upcoming]{background:#eaf5ee;color:#193e37;border:2px solid #44836d;min-height:56px;padding:10px 14px;white-space:normal;line-height:1.5}
        #auth-modal #auth-upcoming{background:#edf5ff;color:#193953;border:1px solid #5995b7}
        #auth-modal .auth-benefit-grid{display:grid;gap:10px;margin-top:16px}
        @media (min-width:420px){#auth-modal .auth-benefit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        #auth-modal .auth-benefit-card{border-radius:16px;border:1px solid rgba(129,140,248,.35);background:rgba(99,102,241,.12);padding:12px;min-height:96px}
        #auth-modal .auth-benefit-card strong{display:block;font-size:13px;line-height:1.4}
        #auth-modal .auth-benefit-card span{display:block;margin-top:6px;font-size:11px;line-height:1.5;color:#cbd5e1}
        #auth-modal .auth-privacy-link{display:inline-flex;margin-top:14px;font-size:12px;font-weight:700;color:#a5b4fc;text-decoration:underline}
      </style>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" class="w-full max-w-md rounded-3xl border border-indigo-300/30 bg-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <p class="mb-2 text-xs font-bold tracking-[0.2em] text-indigo-300">Piko Game アカウント</p>
        <h1 id="auth-title" class="text-2xl font-black">学習きろくを保存しよう</h1>
        <p id="auth-message" class="mt-3 text-sm leading-6 text-slate-200">ゲームはログインなしでも遊べます。Googleでログインすると、別の端末でも学習きろくを引き継げます。</p>
        <div class="auth-benefit-grid" aria-label="ログインの特典">
          <article class="auth-benefit-card">
            <strong>クラウドに学習きろくを保存</strong>
            <span>別の端末でもつづきから遊べるよ</span>
          </article>
          <article class="auth-benefit-card">
            <strong>保護者向けの学習概要</strong>
            <span>ログイン後に学習概要（保護者向け）を見られるよ</span>
          </article>
          <article class="auth-benefit-card">
            <strong>修了証の番号を保存</strong>
            <span>ログイン後に修了証番号を保存し、あとでシェアしやすくするよ</span>
          </article>
        </div>
        <div id="auth-turnstile" class="mt-5 flex min-h-[70px] justify-center" aria-label="安全チェック"></div>
        <p id="auth-verification-status" class="mt-2 text-center text-sm font-bold text-amber-200" aria-live="polite">安全チェックを準備しているよ…</p>
        <p id="auth-error" role="alert" class="mt-2 hidden rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm font-bold text-rose-200"></p>
        <div class="mt-5 grid gap-3">
          <button type="button" data-provider="google" disabled class="min-h-14 rounded-2xl border border-slate-500 bg-white px-4 font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">Googleでログイン</button>
          <button type="button" data-upcoming="email" class="min-h-14 rounded-2xl border border-slate-500 bg-slate-800 px-4 font-bold text-white">メールで登録・ログイン（準備中）</button>
          <button type="button" data-upcoming="wechat" class="min-h-14 rounded-2xl border border-emerald-500 bg-emerald-950 px-4 font-bold text-white">WeChatで登録・ログイン（準備中）</button>
          <p id="auth-upcoming" role="status" class="hidden rounded-xl border border-sky-400 bg-slate-800 p-3 text-sm leading-6 text-white"></p>
          <button type="button" data-action="close" class="min-h-12 rounded-2xl border border-slate-600 bg-slate-800 px-4 font-bold text-slate-100 transition hover:bg-slate-700">この端末でつづける</button>
        </div>
        <a class="auth-privacy-link" href="privacy.html" target="_blank" rel="noopener" data-piko-privacy-settings>プライバシー・データの扱い</a>
        <p class="mt-5 text-xs leading-5 text-slate-400">ログイン時だけ、安全のために人間による操作かを確認します。ゲームを始めるための時間制限はありません。</p>
      </section>`;
    document.body.appendChild(this.element);
    localizeAuth(this.element);
    this.element.querySelector('[data-provider="google"]').addEventListener('click', () => this.submit('google'));
    this.element.querySelectorAll('[data-upcoming]').forEach(button => button.addEventListener('click', () => {
      const status = this.element.querySelector('#auth-upcoming');
      status.textContent = authText(button.dataset.upcoming === 'email'
        ? 'メールの登録・ログインは準備中です。今はGoogleでログインするか、そのまま遊んでね。'
        : 'WeChatの登録・ログインは準備中です。今はGoogleでログインするか、そのまま遊んでね。');
      status.classList.remove('hidden');
    }));
    this.element.querySelector('[data-action="close"]').addEventListener('click', () => this.hide());
  }

  async show({ message } = {}) {
    localizeAuth(this.element);
    this.element.classList.remove('hidden');
    this.element.classList.add('flex');
    document.body.style.overflow = 'hidden';
    this.element.querySelector('#auth-upcoming').classList.add('hidden');
    if (message) this.element.querySelector('#auth-message').textContent = authText(message);
    else this.element.querySelector('#auth-message').textContent = authText('ゲームはログインなしでも遊べます。Googleでログインすると、別の端末でも学習きろくを引き継げます。');
    await this.ensureTurnstile();
    return new Promise(resolve => {
      this._hideResolve = resolve;
    });
  }

  hide() {
    this.element.classList.add('hidden');
    this.element.classList.remove('flex');
    document.body.style.overflow = '';
    const resolve = this._hideResolve;
    this._hideResolve = null;
    if (resolve) resolve({ dismissed: true });
  }

  setBusy(busy) {
    this.busy = busy;
    this.updateButtonState();
  }

  updateButtonState() {
    const googleButton = this.element.querySelector('[data-provider="google"]');
    if (googleButton) googleButton.disabled = this.busy || !this.token;
    const closeButton = this.element.querySelector('[data-action="close"]');
    if (closeButton) closeButton.disabled = this.busy;
  }

  setVerificationStatus(message, tone = 'pending') {
    const status = this.element.querySelector('#auth-verification-status');
    status.textContent = authText(message);
    status.className = `mt-2 text-center text-sm font-bold ${tone === 'ready' ? 'text-emerald-300' : tone === 'error' ? 'text-rose-200' : 'text-amber-200'}`;
  }

  showError(message, { reset = true } = {}) {
    const box = this.element.querySelector('#auth-error');
    box.textContent = authText(message);
    box.classList.remove('hidden');
    if (reset) this.resetChallenge();
  }

  submit(provider) {
    if (!this.token) {
      this.showError('もう少し待ってね。上の安全チェックが終わるとログインできます。', { reset: false });
      return;
    }
    this.dispatchEvent(new CustomEvent('submit', { detail: { provider, turnstileToken: this.token } }));
  }

  async ensureTurnstile() {
    if (!this.siteKey) { this.showError('安全チェックを用意できませんでした。管理者に知らせてください。'); return; }
    try {
      await loadTurnstileScript();
      if (this.widgetId != null) return;
      this.setVerificationStatus('上の安全チェックを終えてね。');
      this.widgetId = window.turnstile.render(this.element.querySelector('#auth-turnstile'), {
        sitekey: this.siteKey,
        language: document.documentElement.lang === 'zh' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja',
        action: 'access',
        theme: 'dark',
        appearance: 'always',
        'refresh-expired': 'auto',
        callback: token => {
          this.token = token;
          this.element.querySelector('#auth-error').classList.add('hidden');
          this.setVerificationStatus('ログインの準備ができたよ！', 'ready');
          this.updateButtonState();
        },
        'expired-callback': () => {
          this.token = '';
          this.setVerificationStatus('時間がたったので、もう一度チェックしてね。');
          this.updateButtonState();
        },
        'error-callback': () => {
          this.token = '';
          this.setVerificationStatus('安全チェックを開けませんでした。ページを読み直してみてね。', 'error');
          this.updateButtonState();
        }
      });
    } catch (error) {
      this.setVerificationStatus('安全チェックを開けませんでした。ページを読み直してみてね。', 'error');
      this.showError(error.message || '安全チェックを開けませんでした。', { reset: false });
      this.updateButtonState();
    }
  }

  resetChallenge() {
    this.token = '';
    this.setVerificationStatus('新しい安全チェックを準備しているよ…');
    this.updateButtonState();
    if (this.widgetId != null && window.turnstile) window.turnstile.reset(this.widgetId);
  }
}

let turnstileLoader;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileLoader) return turnstileLoader;
  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      turnstileLoader = null;
      script.remove();
      reject(new Error('安全チェックを開けませんでした。'));
    };
    document.head.appendChild(script);
  });
  return turnstileLoader;
}
