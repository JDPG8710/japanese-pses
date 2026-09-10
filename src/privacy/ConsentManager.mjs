const STORAGE_KEY = 'piko-privacy-choice-v1';
const NOTICE_VERSION = 1;
const CHOICE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const GOOGLE_CERTIFIED_CMP_REGIONS = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO','GB','CH'
]);

const COPY = {
  en: {
    title: 'Your privacy choices',
    body: 'Piko Game uses necessary cookies and browser storage for security, requested sign-in, your country and language, and learning progress. With your permission, Google may use optional cookies or similar storage to provide child-directed, non-personalised ads. Please choose with a parent or guardian.',
    necessary: 'Necessary only',
    ads: 'Parent/guardian: allow optional ads',
    details: 'Read the privacy notice',
    settings: 'Privacy choices'
  },
  zh: {
    title: '你的隐私选择',
    body: 'Piko Game 使用必要 Cookie 和浏览器存储来保障安全、完成你主动选择的登录、记住国家与语言并保存学习进度。经你许可后，Google 才可以使用可选 Cookie 或类似存储来提供面向儿童的非个性化广告。请与家长或监护人一起选择。',
    necessary: '仅使用必要存储',
    ads: '家长/监护人允许可选广告',
    details: '阅读隐私说明',
    settings: '隐私选择'
  },
  ja: {
    title: 'プライバシーの選択',
    body: 'Piko Gameは、安全、選択したログイン、国・言語、学習の記録のために必要なCookieとブラウザー保存領域を使います。許可した場合だけ、Googleが子ども向けの非パーソナライズ広告のために任意のCookie等を使うことがあります。保護者といっしょに選んでください。',
    necessary: '必要な保存だけ',
    ads: '保護者が任意の広告を許可',
    details: 'プライバシー通知を読む',
    settings: 'プライバシーの選択'
  }
};

export function readPrivacyChoice(storage = safeStorage(), now = Date.now()) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    if (value?.version !== NOTICE_VERSION || typeof value.optionalAds !== 'boolean') return null;
    if (!Number.isFinite(value.savedAt) || now - value.savedAt > CHOICE_MAX_AGE_MS) return null;
    return { optionalAds: value.optionalAds, savedAt: value.savedAt, version: value.version };
  } catch {
    return null;
  }
}

export function hasAdvertisingConsent(storage = safeStorage(), now = Date.now()) {
  return readPrivacyChoice(storage, now)?.optionalAds === true;
}

export function savePrivacyChoice(optionalAds, storage = safeStorage(), now = Date.now()) {
  const choice = { optionalAds: Boolean(optionalAds), savedAt: now, version: NOTICE_VERSION };
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(choice)); } catch { /* Keep the session private if storage is unavailable. */ }
  return choice;
}

export async function advertisingAllowedForCurrentVisitor({ storage = safeStorage(), fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
  if (!hasAdvertisingConsent(storage) || typeof fetchImpl !== 'function') return false;
  try {
    const response = await fetchImpl('/api/location', { cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (!response.ok) return false;
    const country = String((await response.json())?.country || '').toUpperCase();
    return /^[A-Z]{2}$/.test(country) && !GOOGLE_CERTIFIED_CMP_REGIONS.has(country);
  } catch {
    return false;
  }
}

export async function initConsentManager() {
  if (typeof document === 'undefined' || document.querySelector('[data-piko-consent-root]')) return;
  await domReady();
  const locale = await detectLocale();
  const words = COPY[locale];
  injectStyles();

  const root = document.createElement('div');
  root.dataset.pikoConsentRoot = '';
  root.innerHTML = `
    <section class="piko-consent" hidden role="dialog" aria-labelledby="piko-consent-title" aria-describedby="piko-consent-body">
      <div class="piko-consent-copy">
        <h2 id="piko-consent-title"></h2>
        <p id="piko-consent-body"></p>
        <a href="/privacy.html"></a>
      </div>
      <div class="piko-consent-actions">
        <button type="button" data-consent="necessary"></button>
        <button type="button" class="piko-consent-primary" data-consent="ads"></button>
      </div>
    </section>
    <button type="button" hidden class="piko-consent-settings" data-consent-settings></button>`;
  root.querySelector('h2').textContent = words.title;
  root.querySelector('p').textContent = words.body;
  root.querySelector('a').textContent = words.details;
  root.querySelector('[data-consent="necessary"]').textContent = words.necessary;
  root.querySelector('[data-consent="ads"]').textContent = words.ads;
  root.querySelector('[data-consent-settings]').textContent = words.settings;
  document.body.appendChild(root);

  const panel = root.querySelector('.piko-consent');
  const settings = root.querySelector('[data-consent-settings]');
  const show = () => {
    panel.hidden = false;
    settings.hidden = true;
    panel.querySelector(`[data-consent="${hasAdvertisingConsent() ? 'ads' : 'necessary'}"]`)?.focus();
  };
  const hide = () => { panel.hidden = true; settings.hidden = true; };
  const choose = async optionalAds => {
    const choice = savePrivacyChoice(optionalAds);
    hide();
    const advertisingAllowed = optionalAds ? await advertisingAllowedForCurrentVisitor() : false;
    window.dispatchEvent(new CustomEvent('PIKO_PRIVACY_CHOICE_CHANGED', { detail: { ...choice, advertisingAllowed } }));
  };

  root.querySelector('[data-consent="necessary"]').addEventListener('click', () => { void choose(false); });
  root.querySelector('[data-consent="ads"]').addEventListener('click', () => { void choose(true); });
  settings.addEventListener('click', show);
  document.querySelectorAll('[data-piko-privacy-settings]').forEach(button => button.addEventListener('click', show));
  if (readPrivacyChoice()) hide(); else show();
}

function safeStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function domReady() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
}

async function detectLocale() {
  const htmlLanguage = document.documentElement.lang.toLowerCase();
  if (htmlLanguage.startsWith('zh')) return 'zh';
  if (htmlLanguage.startsWith('ja')) return 'ja';
  try {
    const storedLocale = localStorage.getItem('world-locale');
    if (COPY[storedLocale]) return storedLocale;
    const country = JSON.parse(localStorage.getItem('manabi-country-v1'))?.country;
    if (country === 'CN') return 'zh';
    if (country === 'JP') return 'ja';
  } catch { /* Use connection location or English. */ }
  if (location.pathname === '/' || location.pathname.endsWith('/index.html')) {
    try {
      const response = await fetch('/api/location', { cache: 'no-store', signal: AbortSignal.timeout(2500) });
      const country = response.ok ? (await response.json()).country : null;
      if (country === 'CN') return 'zh';
      if (country === 'JP') return 'ja';
    } catch { /* English is the global fallback. */ }
  }
  return 'en';
}

function injectStyles() {
  if (document.querySelector('#piko-consent-style')) return;
  const style = document.createElement('style');
  style.id = 'piko-consent-style';
  style.textContent = `
    .piko-consent[hidden],.piko-consent-settings[hidden]{display:none!important}
    .piko-consent{position:fixed;z-index:2147483646;left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));max-width:980px;margin:auto;padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:end;color:#18332e;background:#fffdf8;border:1px solid #b9cfc8;border-radius:20px;box-shadow:0 18px 55px rgba(8,25,22,.28);font:500 15px/1.55 Inter,"Noto Sans",system-ui,sans-serif;text-align:left}
    .piko-consent h2{margin:0 0 6px;font:850 21px/1.2 Inter,"Noto Sans",system-ui,sans-serif;color:#173c34}
    .piko-consent p{margin:0 0 6px;max-width:720px;font-size:15px;color:#35554e}
    .piko-consent a{color:#17675a;font-weight:750;text-underline-offset:3px}
    .piko-consent-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .piko-consent button,.piko-consent-settings{border:1px solid #7ba49a;border-radius:999px;padding:11px 16px;min-height:44px;background:#fff;color:#17463c;font:800 14px/1.2 Inter,"Noto Sans",system-ui,sans-serif;cursor:pointer}
    .piko-consent button:hover,.piko-consent button:focus-visible,.piko-consent-settings:hover,.piko-consent-settings:focus-visible{outline:3px solid rgba(25,135,113,.25);outline-offset:2px}
    .piko-consent .piko-consent-primary{background:#176f5e;color:#fff;border-color:#176f5e}
    .piko-consent-settings{position:fixed;z-index:2147483645;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));padding:9px 13px;min-height:40px;background:#fffdf8;box-shadow:0 6px 22px rgba(8,25,22,.2)}
    @media(max-width:760px){.piko-consent{grid-template-columns:1fr;gap:14px;padding:17px}.piko-consent-actions{justify-content:stretch}.piko-consent-actions button{flex:1 1 190px}}
  `;
  document.head.appendChild(style);
}

if (typeof window !== 'undefined') void initConsentManager();

export { STORAGE_KEY as PRIVACY_CHOICE_STORAGE_KEY, NOTICE_VERSION as PRIVACY_NOTICE_VERSION };
