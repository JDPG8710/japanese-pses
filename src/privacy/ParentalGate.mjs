/** Soft parental gate: math challenge + guardian acknowledgement (not COPPA VPC). */

export const PARENTAL_GATE_STORAGE_KEY = 'piko-parental-ack-v1';
export const PARENTAL_GATE_VERSION = 1;

const COPY = {
  en: {
    title: 'Parent or guardian check',
    body: 'Piko Game is for primary-school learners. A parent or guardian must approve ads, purchases, cloud saving, and public multiplayer.',
    confirm: 'I am a parent or guardian',
    prompt: 'Solve this to continue:',
    submit: 'Continue',
    cancel: 'Cancel',
    wrong: 'That answer is not correct. Please try again.'
  },
  zh: {
    title: '家长 / 监护人确认',
    body: 'Piko Game 面向小学生。开启可选广告、购买、云端同步或公开多人玩法前，需要家长或监护人确认。',
    confirm: '我是家长或监护人',
    prompt: '请先完成这道题：',
    submit: '继续',
    cancel: '取消',
    wrong: '答案不正确，请再试一次。'
  },
  ja: {
    title: '保護者の確認',
    body: 'Piko Gameは小学生向けです。任意の広告・購入・クラウド保存・公開のたいせんには、保護者の同意が必要です。',
    confirm: 'わたしは保護者です',
    prompt: 'つづけてよいか、このもんだいをといてね：',
    submit: 'つづける',
    cancel: 'やめる',
    wrong: 'こたえがちがうよ。もういちどためしてね。'
  }
};

export function readParentalAck(storage = safeStorage(), now = Date.now()) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(PARENTAL_GATE_STORAGE_KEY));
    if (value?.version !== PARENTAL_GATE_VERSION || typeof value.ackedAt !== 'number') return null;
    if (!Number.isFinite(value.ackedAt) || value.ackedAt > now + 60_000) return null;
    return { version: value.version, ackedAt: value.ackedAt, purposes: Array.isArray(value.purposes) ? value.purposes : [] };
  } catch {
    return null;
  }
}

export function hasParentalAck(storage = safeStorage(), now = Date.now()) {
  return Boolean(readParentalAck(storage, now));
}

export function saveParentalAck(purpose = 'general', storage = safeStorage(), now = Date.now()) {
  const prior = readParentalAck(storage, now);
  const purposes = new Set(prior?.purposes || []);
  purposes.add(String(purpose || 'general'));
  const record = { version: PARENTAL_GATE_VERSION, ackedAt: now, purposes: [...purposes] };
  try { storage?.setItem(PARENTAL_GATE_STORAGE_KEY, JSON.stringify(record)); } catch { /* private mode */ }
  return record;
}

export function clearParentalAck(storage = safeStorage()) {
  try { storage?.removeItem(PARENTAL_GATE_STORAGE_KEY); } catch { /* ignore */ }
}

export function createChallenge(random = Math.random) {
  const a = 2 + Math.floor(random() * 8);
  const b = 2 + Math.floor(random() * 8);
  return { prompt: `${a} + ${b}`, answer: a + b };
}

export function checkChallengeAnswer(challenge, raw) {
  const value = Number(String(raw ?? '').trim());
  return Number.isInteger(value) && value === challenge.answer;
}

/**
 * Show a modal parental gate. Resolves true only after guardian checkbox + correct challenge.
 * In non-DOM environments, returns false unless `autoPassInTests` is used via options.force.
 */
export async function requireParentalGate({
  purpose = 'general',
  locale = 'ja',
  storage = safeStorage(),
  documentImpl = typeof document !== 'undefined' ? document : null,
  force = false,
  skipIfAcked = true
} = {}) {
  if (force) {
    saveParentalAck(purpose, storage);
    return true;
  }
  if (skipIfAcked && hasParentalAck(storage)) {
    saveParentalAck(purpose, storage);
    return true;
  }
  if (!documentImpl?.body) return false;

  const words = COPY[locale] || COPY.en;
  const challenge = createChallenge();
  injectStyles(documentImpl);

  return new Promise(resolve => {
    const root = documentImpl.createElement('div');
    root.dataset.pikoParentalGate = '';
    root.innerHTML = `
      <section class="piko-gate" role="dialog" aria-modal="true" aria-labelledby="piko-gate-title">
        <h2 id="piko-gate-title"></h2>
        <p data-gate-body></p>
        <label class="piko-gate-check"><input type="checkbox" data-gate-confirm> <span data-gate-confirm-label></span></label>
        <p data-gate-prompt></p>
        <input type="text" inputmode="numeric" autocomplete="off" data-gate-answer aria-label="challenge">
        <p class="piko-gate-error" data-gate-error hidden></p>
        <div class="piko-gate-actions">
          <button type="button" data-gate-cancel></button>
          <button type="button" class="piko-gate-primary" data-gate-submit></button>
        </div>
      </section>`;
    root.querySelector('#piko-gate-title').textContent = words.title;
    root.querySelector('[data-gate-body]').textContent = words.body;
    root.querySelector('[data-gate-confirm-label]').textContent = words.confirm;
    root.querySelector('[data-gate-prompt]').textContent = `${words.prompt} ${challenge.prompt} = ?`;
    root.querySelector('[data-gate-cancel]').textContent = words.cancel;
    root.querySelector('[data-gate-submit]').textContent = words.submit;
    documentImpl.body.appendChild(root);

    const finish = ok => {
      root.remove();
      resolve(ok);
    };
    root.querySelector('[data-gate-cancel]').addEventListener('click', () => finish(false));
    root.querySelector('[data-gate-submit]').addEventListener('click', () => {
      const confirmed = root.querySelector('[data-gate-confirm]').checked;
      const answer = root.querySelector('[data-gate-answer]').value;
      const error = root.querySelector('[data-gate-error]');
      if (!confirmed || !checkChallengeAnswer(challenge, answer)) {
        error.hidden = false;
        error.textContent = words.wrong;
        return;
      }
      saveParentalAck(purpose, storage);
      finish(true);
    });
    queueMicrotask(() => root.querySelector('[data-gate-answer]')?.focus?.());
  });
}

function safeStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function injectStyles(documentImpl) {
  if (documentImpl.querySelector('#piko-parental-gate-style')) return;
  const style = documentImpl.createElement('style');
  style.id = 'piko-parental-gate-style';
  style.textContent = `
    [data-piko-parental-gate]{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(8,25,22,.55);padding:16px}
    .piko-gate{width:min(440px,100%);background:#fffdf8;color:#18332e;border:1px solid #b9cfc8;border-radius:20px;padding:22px;box-shadow:0 18px 55px rgba(8,25,22,.28);font:500 15px/1.55 Inter,"Noto Sans",system-ui,sans-serif}
    .piko-gate h2{margin:0 0 8px;font:850 22px/1.2 Inter,"Noto Sans",system-ui,sans-serif}
    .piko-gate p{margin:0 0 12px;color:#35554e}
    .piko-gate-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;font-weight:700}
    .piko-gate input[type=text]{width:100%;min-height:44px;border:1px solid #7ba49a;border-radius:12px;padding:10px 12px;font:700 16px/1.2 inherit;margin-bottom:10px}
    .piko-gate-error{color:#b42318;font-weight:700}
    .piko-gate-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
    .piko-gate button{border:1px solid #7ba49a;border-radius:999px;padding:11px 16px;min-height:44px;background:#fff;color:#17463c;font:800 14px/1.2 inherit;cursor:pointer}
    .piko-gate-primary{background:#176f5e;color:#fff;border-color:#176f5e}
  `;
  documentImpl.head.appendChild(style);
}

export { COPY as PARENTAL_GATE_COPY };
