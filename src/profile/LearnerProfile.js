import { validateNickname, NICKNAME_MAX_LENGTH } from '../privacy/NicknameFilter.mjs';

export const DEFAULT_LEARNER_NAME = 'まなびくん';

/** Age bands replace precise ages. Legacy integer ages map via mapLegacyAgeToBand. */
export const LEARNER_AGE_BANDS = Object.freeze([
  { value: 'under_6', label: '6さい未満' },
  { value: '6_8', label: '6〜8さい' },
  { value: '9_11', label: '9〜11さい' },
  { value: '12_14', label: '12〜14さい' },
  { value: 'prefer_not', label: '答えたくない' }
]);

const AGE_BAND_VALUES = new Set(LEARNER_AGE_BANDS.map(option => option.value));

export const LEARNER_GENDER_OPTIONS = Object.freeze([
  { value: '', label: 'スキップ（任意）' },
  { value: 'female', label: '女の子' },
  { value: 'male', label: '男の子' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' }
]);

const GENDER_VALUES = new Set(LEARNER_GENDER_OPTIONS.map(option => option.value).filter(Boolean));

export function mapLegacyAgeToBand(age) {
  const numericAge = Number(age);
  if (!Number.isInteger(numericAge)) return '';
  if (numericAge < 6) return 'under_6';
  if (numericAge <= 8) return '6_8';
  if (numericAge <= 11) return '9_11';
  if (numericAge <= 14) return '12_14';
  return 'prefer_not';
}

export function normalizeLearnerProfile(source = {}) {
  source ||= {};
  const rawName = source.learner_name ?? source.display_name ?? source.name ?? '';
  const rawBand = source.learner_age_band ?? source.age_band ?? source.ageBand;
  const rawAge = source.learner_age ?? source.age;
  const rawGender = source.learner_gender ?? source.gender ?? '';
  const nickname = validateNickname(rawName);
  let ageBand = AGE_BAND_VALUES.has(String(rawBand || '')) ? String(rawBand) : '';
  if (!ageBand && rawAge != null && rawAge !== '') ageBand = mapLegacyAgeToBand(rawAge);
  const genderRaw = String(rawGender);
  return {
    name: nickname.name,
    ageBand,
    // Precise age integers are no longer stored for new writes.
    age: null,
    gender: GENDER_VALUES.has(genderRaw) ? genderRaw : ''
  };
}

export function validateLearnerProfile(source = {}) {
  source ||= {};
  const profile = normalizeLearnerProfile(source);
  const nick = validateNickname(profile.name);
  let error = '';
  if (!nick.valid) {
    if (nick.error === 'TOO_LONG') error = `おなまえは${NICKNAME_MAX_LENGTH}文字までだよ。少し短くしてね。`;
    else if (nick.error === 'CONTACT_OR_URL' || nick.error === 'BLOCKED_TERM') error = 'そのおなまえはつかえないよ。べつのなまえにしてね。';
    else error = 'おなまえを入力してください。';
  } else if (!AGE_BAND_VALUES.has(profile.ageBand)) {
    error = 'ねんれいのくみを選んでください。';
  }
  // Gender is optional; empty is allowed.
  return { valid: !error, error, profile: { ...profile, name: nick.name } };
}

export function isLearnerProfileComplete(source = {}) {
  return validateLearnerProfile(source).valid;
}

export function learnerAgeBandLabel(value) {
  return LEARNER_AGE_BANDS.find(option => option.value === value)?.label || '未設定';
}

export function learnerGenderLabel(value) {
  if (!value) return '未設定（任意）';
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
        <p class="mt-2 text-sm leading-6 text-slate-300">おなまえ・ねんれいのくみは、いつでも「わたしの学習きろく」から変えられるよ。性別は任意だよ。</p>
        <div class="mt-6 space-y-4">
          <label class="block text-sm font-bold text-white">おなまえ
            <input id="learner-profile-name" name="learnerName" type="text" maxlength="${NICKNAME_MAX_LENGTH}" autocomplete="nickname" required
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="例：さくら" />
          </label>
          <label class="block text-sm font-bold text-white">ねんれいのくみ
            <select id="learner-profile-age-band" name="learnerAgeBand" required
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400">
              <option value="">くみを選ぶ</option>
              ${LEARNER_AGE_BANDS.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
            </select>
          </label>
          <label class="block text-sm font-bold text-white">性別（任意・スキップできるよ）
            <select id="learner-profile-gender" name="learnerGender"
              class="mt-2 min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base font-bold text-white outline-none focus:border-cyan-400">
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
    const ageInput = this.element.querySelector('#learner-profile-age-band');
    const genderInput = this.element.querySelector('#learner-profile-gender');
    nameInput.value = existing.name || String(suggestedName || '').trim().slice(0, NICKNAME_MAX_LENGTH);
    ageInput.value = existing.ageBand || '';
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
      ageBand: this.element.querySelector('#learner-profile-age-band')?.value,
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
