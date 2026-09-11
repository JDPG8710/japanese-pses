import { createPlayroom } from './PlayroomUI.mjs';
import { playroomText } from './PlayroomText.mjs';
import { AuthManager } from '../auth/AuthManager.js';

const playroomHost = document.querySelector('#playroom');
const learnHost = document.querySelector('#learn-room');
const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
if (app) {
  app.innerHTML = '';
  app.hidden = true;
}

const params = new URLSearchParams(location.search);
let locale = params.get('lang') || (navigator.language.startsWith('zh') ? 'zh' : navigator.language.startsWith('ja') ? 'ja' : 'en');
if (!['zh', 'ja', 'en'].includes(locale)) locale = 'en';

let identity = null;
const auth = new AuthManager({ turnstileSiteKey: document.querySelector('meta[name="turnstile-site-key"]')?.content || '' });
function message(text = '') { if (notice) notice.textContent = text; }

async function api(path, body) {
  const response = await fetch(`/api/arena/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('UNAVAILABLE'); }
  if (!response.ok || data.error) throw new Error(data.error || 'UNAVAILABLE');
  return data;
}

function updateHeader() {
  document.documentElement.lang = locale;
  const locSelect = document.querySelector('#locale');
  if (locSelect) locSelect.value = locale;
  const title = document.querySelector('#title');
  if (title) title.textContent = 'Piko Playroom';
  const eyebrow = document.querySelector('.eyebrow');
  if (eyebrow) eyebrow.textContent = 'PLAY · CONNECT · LEARN';
  const subtitle = document.querySelector('#subtitle');
  if (subtitle) subtitle.textContent = playroomText[locale]?.hubDesc || playroomText[locale]?.tagline || '';
  const loginBtn = document.querySelector('#login');
  if (loginBtn) {
    loginBtn.textContent = identity?.authenticated ? (locale === 'zh' ? '已登录' : locale === 'ja' ? 'ログイン中' : 'Logged in') : (locale === 'zh' ? '登录' : locale === 'ja' ? 'ログイン' : 'Log in');
    loginBtn.hidden = false;
  }
}

const playroom = createPlayroom({
  host: playroomHost,
  learning: learnHost,
  api,
  getLocale: () => locale,
  getIdentity: () => identity,
  setIdentity: next => { identity = next; playroom.render(); },
  getRoom: () => null,
  notice: message,
  onError: err => message(playroomText[locale]?.errors?.[err.message] || err.message),
  openGame: (type, id) => {
    if (type === 'chess') location.href = `/arena.html?game=chess&lang=${locale}${id ? `&room=${id}` : ''}`;
    else location.href = `/arena.html?game=go&lang=${locale}${id ? `&room=${id}` : ''}`;
  }
});

document.querySelector('#locale')?.addEventListener('change', e => {
  locale = e.target.value;
  updateHeader();
  playroom.render();
});
document.querySelector('#login')?.addEventListener('click', () => {
  if (!identity?.authenticated) void auth.showLogin();
});

async function initialize() {
  try {
    identity = await api('identity', {});
    updateHeader();
    await playroom.initialize();
  } catch (e) {
    message(e.message);
  }
}

void initialize();
