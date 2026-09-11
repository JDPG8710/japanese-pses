import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  advertisingAllowedForCurrentVisitor,
  hasAdvertisingConsent,
  PRIVACY_CHOICE_STORAGE_KEY,
  PRIVACY_NOTICE_VERSION,
  readPrivacyChoice,
  savePrivacyChoice
} from '../src/privacy/ConsentManager.mjs';
import { saveParentalAck, clearParentalAck, PARENTAL_GATE_VERSION } from '../src/privacy/ParentalGate.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
assert.equal(readPrivacyChoice(storage, 1_000), null);
assert.equal(hasAdvertisingConsent(storage, 1_000), false, 'Advertising must stay disabled before a choice');
const allowed = savePrivacyChoice(true, storage, 2_000);
assert.deepEqual(allowed, { optionalAds: true, savedAt: 2_000, version: PRIVACY_NOTICE_VERSION });
assert.equal(hasAdvertisingConsent(storage, 2_001), true);
assert.equal(JSON.parse(storage.getItem(PRIVACY_CHOICE_STORAGE_KEY)).optionalAds, true);

savePrivacyChoice(false, storage, 3_000);
assert.equal(hasAdvertisingConsent(storage, 3_001), false, 'Necessary-only must withdraw advertising consent');
assert.equal(readPrivacyChoice(storage, 181 * 24 * 60 * 60 * 1000 + 3_000), null, 'The notice must ask again after 180 days');

savePrivacyChoice(true, storage, Date.now());
clearParentalAck(storage);
const locationResponse = (country, extra = {}) => async () => Response.json({ country, cnSafeMode: country === 'CN', cnSafeModeEnabled: true, ...extra });
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('JP'), requireParental: true }), false, 'Ads require parental gate');
saveParentalAck('ads', storage);
assert.equal(PARENTAL_GATE_VERSION, 1);
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('JP') }), true);
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('US') }), true);
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('DE') }), false, 'EEA ads require a certified CMP');
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('GB') }), false, 'UK ads require a certified CMP');
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('CH') }), false, 'Swiss ads require a certified CMP');
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: locationResponse('CN') }), false, 'CN safe mode blocks ads');
assert.equal(await advertisingAllowedForCurrentVisitor({ storage, fetchImpl: async () => { throw new Error('offline'); } }), false, 'Unknown locations must fail closed');

const publicPages = ['index.html', 'world.html', 'grades.html', 'learn.html', 'privacy.html', 'terms.html', 'en/index.html', 'ja/index.html', 'zh/index.html'];
for (const file of publicPages) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.ok(html.includes('/src/privacy/ConsentManager.mjs'), `${file} must load the privacy choices`);
}

const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(!home.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), 'The page must not load Google ads before consent');
assert.ok(home.includes('advertisingAllowed:'));
assert.ok(home.includes('data-tag-for-child-directed-treatment="1"'));
assert.ok(home.includes('data-tag-for-under-age-of-consent="1"'));
assert.ok(home.includes('ParentalGate.mjs'));
const countryHomeCss = await readFile(new URL('../src/location/home.css', import.meta.url), 'utf8');
assert.ok(countryHomeCss.includes(':not([data-piko-consent-root])'), 'The country entry must not hide the privacy dialog');

for (const file of ['privacy.html', 'terms.html']) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.ok(html.includes('mailto:j565718319@gmail.com'), `${file} must publish the requested contact email`);
}
const terms = await readFile(new URL('../terms.html', import.meta.url), 'utf8');
assert.ok(terms.includes('id="purchases"') && terms.includes('Piko Game Ad-Free Membership'));
const privacy = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');
assert.ok(privacy.includes('age band') || privacy.includes('ageBand') || privacy.includes('年齢帯') || privacy.includes('年龄段'));
assert.ok(privacy.includes('DELETE /api/state'));

console.log('Privacy choices: default deny, parental gate, CN/EEA rules, HTML child tags, purchases terms passed.');
