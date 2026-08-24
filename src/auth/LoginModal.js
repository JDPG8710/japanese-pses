export class LoginModal extends EventTarget {
  constructor({ siteKey }) {
    super();
    this.siteKey = siteKey;
    this.token = '';
    this.widgetId = null;
    this.render();
  }

  render() {
    this.element = document.createElement('div');
    this.element.id = 'auth-modal';
    this.element.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl';
    this.element.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" class="w-full max-w-md rounded-3xl border border-indigo-300/30 bg-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <p class="mb-2 text-xs font-bold tracking-[0.25em] text-indigo-300">JAPANESE PSES</p>
        <h1 id="auth-title" class="text-2xl font-black">星図学習へようこそ</h1>
        <p id="auth-message" class="mt-3 text-sm leading-6 text-slate-200">安全確認を完了してログインするか、10分間のゲスト体験を開始してください。</p>
        <div id="auth-turnstile" class="mt-5 flex min-h-[70px] justify-center"></div>
        <p id="auth-error" role="alert" class="mt-2 hidden rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm font-bold text-rose-200"></p>
        <div class="mt-5 grid gap-3">
          <button data-provider="google" class="min-h-14 rounded-2xl border border-slate-500 bg-white px-4 font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-40">Sign in with Google</button>
          <button data-provider="apple" class="min-h-14 rounded-2xl border border-white bg-black px-4 font-bold text-white transition hover:bg-slate-950 disabled:opacity-40">Sign in with Apple</button>
          <button data-action="guest" class="min-h-14 rounded-2xl border border-amber-300/50 bg-amber-400/15 px-4 font-black text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-40">10分間ゲスト体験</button>
        </div>
        <p class="mt-5 text-xs leading-5 text-slate-400">ゲスト体験は端末ごとに30日間で1回です。端末情報とIPは不可逆ハッシュに変換し、元データは保存しません。</p>
      </section>`;
    document.body.appendChild(this.element);
    this.element.querySelectorAll('[data-provider]').forEach(button => button.addEventListener('click', () => this.submit('oauth', button.dataset.provider)));
    this.element.querySelector('[data-action="guest"]').addEventListener('click', () => this.submit('guest'));
  }

  async show({ message } = {}) {
    this.element.classList.remove('hidden');
    this.element.classList.add('flex');
    document.body.style.overflow = 'hidden';
    if (message) this.element.querySelector('#auth-message').textContent = message;
    await this.ensureTurnstile();
  }

  hide() {
    this.element.classList.add('hidden');
    this.element.classList.remove('flex');
    document.body.style.overflow = '';
  }

  setBusy(busy) { this.element.querySelectorAll('button').forEach(button => { button.disabled = busy; }); }
  showError(message) { const box = this.element.querySelector('#auth-error'); box.textContent = message; box.classList.remove('hidden'); this.resetChallenge(); }

  submit(kind, provider = null) {
    if (!this.token) { this.showError('人間であることの確認を完了してください。'); return; }
    this.dispatchEvent(new CustomEvent('submit', { detail: { kind, provider, turnstileToken: this.token } }));
  }

  async ensureTurnstile() {
    if (!this.siteKey) { this.showError('Turnstile sitekey が設定されていません。運営者へ連絡してください。'); return; }
    await loadTurnstileScript();
    if (this.widgetId != null) return;
    this.widgetId = window.turnstile.render(this.element.querySelector('#auth-turnstile'), {
      sitekey: this.siteKey, action: 'auth', theme: 'dark', appearance: 'interaction-only',
      callback: token => { this.token = token; this.element.querySelector('#auth-error').classList.add('hidden'); },
      'expired-callback': () => { this.token = ''; }, 'error-callback': () => { this.token = ''; }
    });
  }

  resetChallenge() { this.token = ''; if (this.widgetId != null && window.turnstile) window.turnstile.reset(this.widgetId); }
}

let turnstileLoader;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileLoader) return turnstileLoader;
  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true;
    script.onload = resolve; script.onerror = () => reject(new Error('Turnstile の読み込みに失敗しました。'));
    document.head.appendChild(script);
  });
  return turnstileLoader;
}
