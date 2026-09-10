import assert from 'node:assert/strict';
import {
  PARENTAL_GATE_STORAGE_KEY,
  PARENTAL_GATE_VERSION,
  checkChallengeAnswer,
  clearParentalAck,
  createChallenge,
  hasParentalAck,
  readParentalAck,
  requireParentalGate,
  saveParentalAck
} from '../src/privacy/ParentalGate.mjs';
import { validateNickname } from '../src/privacy/NicknameFilter.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
assert.equal(hasParentalAck(storage, 1000), false);
const saved = saveParentalAck('ads', storage, 2000);
assert.deepEqual(saved, { version: PARENTAL_GATE_VERSION, ackedAt: 2000, purposes: ['ads'] });
assert.equal(hasParentalAck(storage, 2001), true);
assert.equal(JSON.parse(storage.getItem(PARENTAL_GATE_STORAGE_KEY)).version, PARENTAL_GATE_VERSION);
saveParentalAck('checkout', storage, 3000);
assert.ok(readParentalAck(storage, 3001).purposes.includes('ads'));
assert.ok(readParentalAck(storage, 3001).purposes.includes('checkout'));
clearParentalAck(storage);
assert.equal(hasParentalAck(storage, 4000), false);

const challenge = createChallenge(() => 0.5);
assert.equal(typeof challenge.prompt, 'string');
assert.equal(checkChallengeAnswer(challenge, String(challenge.answer)), true);
assert.equal(checkChallengeAnswer(challenge, '0'), false);

assert.equal(await requireParentalGate({ storage, skipIfAcked: false }), false, 'No DOM => gate fails closed');
assert.equal(await requireParentalGate({ storage, force: true, purpose: 'ads' }), true);
assert.equal(hasParentalAck(storage), true);

assert.equal(validateNickname('さくら').valid, true);
assert.equal(validateNickname('https://evil.test').valid, false);
assert.equal(validateNickname('a'.repeat(21)).valid, false);
assert.equal(validateNickname('line:friend').valid, false);
assert.equal(validateNickname('<script>').valid, false);

console.log('ParentalGate + NicknameFilter unit checks passed.');
