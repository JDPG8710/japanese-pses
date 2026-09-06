import { tutorialCopy } from './TutorialContent.js';

// 本番の問題や正解を受け取らず、操作専用の見本だけを表示する。
export class GameTutorial {
  static supported() { return typeof document !== 'undefined' && typeof document.createElement('dialog').showModal === 'function'; }

  show({ title, locale = 'ja', steps, demo, rule, kind = 'choice' }) {
    this.cancel();
    if (!GameTutorial.supported()) return Promise.resolve(true);
    const words = tutorialCopy(locale);
    this.returnFocus = document.activeElement;
    this.element = document.createElement('dialog');
    this.element.className = 'piko-tutorial';
    this.element.setAttribute('aria-labelledby', 'piko-tutorial-title');
    this.element.innerHTML = `<style>
      .piko-tutorial{box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;margin:auto;padding:24px;border:3px solid #76bfa3;border-radius:28px;background:#fffcf3;color:#183c38;box-shadow:0 20px 90px #102d3560;font-family:system-ui,sans-serif;line-height:1.6;overflow-wrap:anywhere}
      .piko-tutorial::backdrop{background:#102c39f5}.piko-tutorial *{box-sizing:border-box}.piko-tutorial header{display:flex;align-items:start;gap:12px}.piko-tutorial h2{font-size:clamp(22px,5vw,30px);margin:0;flex:1;line-height:1.4;color:#183c38}.piko-tutorial p{margin:12px 0;white-space:pre-line;color:#183c38}.piko-tutorial button{font:inherit;font-weight:750;min-width:48px;min-height:48px;border:2px solid #287568;border-radius:14px;background:#fff;color:#164d43;padding:8px 14px;cursor:pointer;white-space:normal;overflow-wrap:anywhere}.piko-tutorial button:focus-visible{outline:4px solid #df941b;outline-offset:3px}.piko-tutorial .pt-start{width:100%;background:#1c6c59;color:white;margin-top:12px}.piko-tutorial .pt-demo{position:relative;display:grid;place-items:center;min-height:130px;border-radius:20px;background:linear-gradient(135deg,#dcf6de,#d7eef9);margin:18px 0;font-size:clamp(28px,8vw,44px);font-weight:800;overflow:hidden}.piko-tutorial .pt-token{padding:10px;white-space:pre-line;text-align:center;transition:transform .4s,color .4s}.piko-tutorial [data-step="1"] .pt-token{animation:pt-move 1.8s ease-in-out infinite;color:#195fc0}.piko-tutorial [data-kind="rotate"][data-step="1"] .pt-token{animation:pt-rotate 1.8s ease-in-out infinite}.piko-tutorial [data-step="2"] .pt-token{color:#106742;animation:pt-pop 1s ease-out}.piko-tutorial .pt-steps{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.piko-tutorial [aria-pressed="true"]{background:#195f51;color:white}.piko-tutorial .pt-instruction{min-height:5em;font-size:18px;font-weight:650}.piko-tutorial .pt-note{font-size:13px}.piko-tutorial .pt-rule{padding:12px;background:#fff0c9;border-radius:14px}.piko-tutorial .pt-animation{font-size:13px;display:block;margin:10px auto}.piko-help-button{margin-left:auto;min-height:48px;border:2px solid #307f6b;border-radius:14px;padding:8px 14px;background:#fff9d9;color:#153f35;font-weight:800;white-space:normal;line-height:1.4;cursor:pointer}.piko-help-button[hidden]{display:none!important}
      @keyframes pt-move{50%{transform:translateX(18px) scale(1.08)}}@keyframes pt-rotate{50%{transform:rotate(90deg)}}@keyframes pt-pop{50%{transform:scale(1.12)}}@media(prefers-reduced-motion:reduce){.piko-tutorial *{animation:none!important;transition:none!important}}@media(max-height:540px){.piko-tutorial{padding:14px}.piko-tutorial .pt-demo{min-height:64px;margin:8px 0}.piko-tutorial .pt-instruction{min-height:0}}
    </style><header><h2 id="piko-tutorial-title"></h2><button type="button" data-close aria-label="${words.close}">×</button></header>
    <p class="pt-note"></p><div class="pt-demo" aria-hidden="true"><span class="pt-token"></span></div>
    <div class="pt-steps" role="group" aria-label="${words.steps}">${[0, 1, 2].map(i => `<button type="button" data-step-button="${i}" aria-label="${words.step} ${i + 1}">${i + 1}</button>`).join('')}</div>
    <p class="pt-instruction" aria-live="off"></p><button type="button" class="pt-animation"></button><p class="pt-rule"></p><button type="button" data-close class="pt-start">${words.play}</button>`;
    this.element.querySelector('h2').textContent = `${words.title} · ${title}`;
    const stylesheet = this.element.querySelector('style');
    if (!document.getElementById('piko-tutorial-style')) { stylesheet.id = 'piko-tutorial-style'; document.head.appendChild(stylesheet); }
    else stylesheet.remove();
    this.element.querySelector('.pt-note').textContent = words.example;
    this.element.querySelector('.pt-rule').textContent = rule;
    this.element.querySelector('.pt-demo').dataset.kind = kind;
    this.steps = steps; this.demo = demo; this.step = 0;
    this.element.querySelectorAll('[data-close]').forEach(button => button.onclick = () => this.finish(true));
    this.element.querySelectorAll('[data-step-button]').forEach(button => button.onclick = () => { this.stopAnimation(); this.paint(Number(button.dataset.stepButton)); });
    this.element.addEventListener('cancel', event => { event.preventDefault(); this.finish(true); });
    this.element.querySelector('.pt-animation').onclick = () => this.interval ? this.stopAnimation() : this.animate();
    this.words = words;
    document.body.appendChild(this.element);
    this.paint(0);
    this.element.showModal();
    this.element.querySelector('[data-close]').focus();
    if (!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.animate();
    else this.stopAnimation();
    return new Promise(resolve => { this.resolve = resolve; });
  }

  paint(step) {
    this.step = step;
    this.element.querySelector('.pt-demo').dataset.step = String(step);
    this.element.querySelector('.pt-token').textContent = this.demo[step];
    this.element.querySelector('.pt-instruction').textContent = this.steps[step];
    this.element.querySelectorAll('[data-step-button]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stepButton) === step)));
  }
  animate() {
    this.stopAnimation();
    this.element.querySelector('.pt-token').style.animationPlayState = 'running';
    this.element.querySelector('.pt-animation').textContent = this.words.pause;
    this.interval = setInterval(() => { if (!document.hidden) this.paint((this.step + 1) % 3); }, 3500);
  }
  stopAnimation() { clearInterval(this.interval); this.interval = null; if (this.element) { this.element.querySelector('.pt-animation').textContent = this.words.animate; this.element.querySelector('.pt-token').style.animationPlayState = 'paused'; } }
  finish(continueGame) {
    this.stopAnimation();
    this.element?.close(); this.element?.remove(); this.element = null;
    const resolve = this.resolve; this.resolve = null;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    resolve?.(continueGame);
  }
  cancel() { this.finish(false); }
}

export function helpButton(parent, locale, onOpen) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'piko-help-button'; button.dataset.tutorialHelp = '';
  button.textContent = tutorialCopy(locale).title;
  button.onclick = onOpen;
  parent.appendChild(button);
  return button;
}
