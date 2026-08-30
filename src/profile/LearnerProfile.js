export const LEARNER_AGE_MIN = 5;
export const LEARNER_AGE_MAX = 15;

export const LEARNER_GENDER_OPTIONS = Object.freeze([
  { value: 'female', label: '女の子' },
  { value: 'male', label: '男の子' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' }
]);

const GENDER_VALUES = new Set(LEARNER_GENDER_OPTIONS.map(option => option.value));

export function normalizeLearnerProfile(source = {}) {
  source ||= {};
  const rawName = source.learner_name ?? source.display_name ?? source.name ?? '';
  const rawAge = source.learner_age ?? source.age;
  const rawGender = source.learner_gender ?? source.gender ?? '';
  const name = String(rawName).trim().replace(/\s+/g, ' ');
  const numericAge = Number(rawAge);
  return {
    name,
    age: Number.isInteger(numericAge) ? numericAge : null,
    gender: GENDER_VALUES.has(String(rawGender)) ? String(rawGender) : ''
  };
}

export function validateLearnerProfile(source = {}) {
  source ||= {};
  const profile = normalizeLearnerProfile(source);
  let error = '';
  if (!profile.name) error = 'おなまえを入力してください。';
  else if ([...profile.name].length > 20) error = 'おなまえは20文字までだよ。少し短くしてね。';
  else if (!Number.isInteger(profile.age) || profile.age < LEARNER_AGE_MIN || profile.age > LEARNER_AGE_MAX) {
    error = `${LEARNER_AGE_MIN}〜${LEARNER_AGE_MAX}歳から選んでください。`;
  } else if (!profile.gender) error = 'あてはまるものを選んでね。答えたくないときは「回答しない」で大丈夫だよ。';
  return { valid: !error, error, profile };
}

export function isLearnerProfileComplete(source = {}) {
  return validateLearnerProfile(source).valid;
}

export function learnerGenderLabel(value) {
  return LEARNER_GENDER_OPTIONS.find(option => option.value === value)?.label || '未設定';
}

export class LearnerProfileModal {
  constructor() {
    this.element = null;
    this.resolvePrompt = null;
    this.createDOM();
  }

  createDOM() {
    if (typeof document === 'undefined' || !document.createElement) return;
    const element = document.createElement('div');
    element.id = 'learner-profile-modal';
    element.className = 'fixed inset-0 z-[110] hidden items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl';
    element.innerHTML = `
      <form id="learner-profile-form" class="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-cyan-400/40 bg-slate-900 p-5 shadow-2xl sm:p-8" novalidate>
        <p class="text-xs font-black tracking-[0.2em] text-cyan-300">プロフィール</p>
        <h1 class="mt-2 text-2xl font-black leading-tight text-white">あそぶ人のことを教えてね</h1>
        <p class="mt-2 text-sm leading-6 text-slate-300">おなまえ・年齢・性別は、いつでも「わたしの学習きろく」から変えられるよ。</p>
        <div class="mt-6 space-y-4">
          <label class="block text-sm font-bold text-white">おなまえ
            <input id="learner-profile-name" name="learnerName" type="text" maxlength="20" autocomplete="nickname" required
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="例：さくら" />
          </label>
          <label class="block text-sm font-bold text-white">年齢
            <select id="learner-profile-age" name="learnerAge" required
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400">
              <option value="">年齢を選ぶ</option>
              ${Array.from({ length: LEARNER_AGE_MAX - LEARNER_AGE_MIN + 1 }, (_, index) => {
                const age = LEARNER_AGE_MIN + index;
                return `<option value="${age}">${age}歳</option>`;
              }).join('')}
            </select>
          </label>
          <label class="block text-sm font-bold text-white">性別
            <select id="learner-profile-gender" name="learnerGender" required
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400">
              <option value="">項目を選ぶ</option>
              ${LEARNER_GENDER_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
            </select>
          </label>
        </div>
        <p id="learner-profile-error" role="alert" class="mt-4 hidden rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200"></p>
        <button type="submit" class="mt-6 min-h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-5 font-black text-slate-950 shadow-lg transition hover:brightness-110">
          これで始める！
        </button>
      </form>`;
    document.body.appendChild(element);
    element.querySelector('#learner-profile-form')?.addEventListener('submit', event => this.handleSubmit(event));
    this.element = element;
  }

  collect({ existingProfile = null, suggestedName = '' } = {}) {
    const existing = normalizeLearnerProfile(existingProfile || {});
    if (isLearnerProfileComplete(existing)) return Promise.resolve(existing);
    if (!this.element) return Promise.reject(new Error('学習者プロフィール画面を表示できません。'));
    const nameInput = this.element.querySelector('#learner-profile-name');
    const ageInput = this.element.querySelector('#learner-profile-age');
    const genderInput = this.element.querySelector('#learner-profile-gender');
    nameInput.value = existing.name || String(suggestedName || '').trim().slice(0, 20);
    ageInput.value = existing.age || '';
    genderInput.value = existing.gender || '';
    this.showError('');
    this.element.classList.remove('hidden');
    this.element.classList.add('flex');
    queueMicrotask(() => nameInput.focus?.());
    return new Promise(resolve => { this.resolvePrompt = resolve; });
  }

  handleSubmit(event) {
    event.preventDefault();
    const result = validateLearnerProfile({
      name: this.element.querySelector('#learner-profile-name')?.value,
      age: this.element.querySelector('#learner-profile-age')?.value,
      gender: this.element.querySelector('#learner-profile-gender')?.value
    });
    if (!result.valid) {
      this.showError(result.error);
      return;
    }
    this.element.classList.add('hidden');
    this.element.classList.remove('flex');
    const resolve = this.resolvePrompt;
    this.resolvePrompt = null;
    resolve?.(result.profile);
  }

  showError(message) {
    const box = this.element?.querySelector('#learner-profile-error');
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('hidden', !message);
  }
}
