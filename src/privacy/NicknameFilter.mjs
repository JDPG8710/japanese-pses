/** Shared nickname rules for learner profiles and arena playroom. */

const CONTACT_OR_URL = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.\w{2,}|\b(?:line|wechat|discord|telegram|whatsapp|qq)\b|\d{5,})/i;
const CONTROL_OR_MARKUP = /[<>\p{Cc}\p{Cf}]/u;
const BLOCKED_TERMS = [
  '死ね', '殺す', 'クソ', 'fuck', 'shit', 'bitch', 'nazi', 'rape', 'porn',
  'セックス', 'エロ', '死ねよ'
];

export const NICKNAME_MAX_LENGTH = 20;

export function normalizeNickname(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function validateNickname(value, { maxLength = NICKNAME_MAX_LENGTH } = {}) {
  const name = normalizeNickname(value);
  if (!name) return { valid: false, error: 'EMPTY', name: '' };
  if ([...name].length > maxLength) return { valid: false, error: 'TOO_LONG', name };
  if (CONTROL_OR_MARKUP.test(name)) return { valid: false, error: 'INVALID_CHARS', name };
  if (CONTACT_OR_URL.test(name)) return { valid: false, error: 'CONTACT_OR_URL', name };
  const lower = name.toLowerCase();
  if (BLOCKED_TERMS.some(term => lower.includes(term.toLowerCase()))) {
    return { valid: false, error: 'BLOCKED_TERM', name };
  }
  return { valid: true, error: '', name };
}
