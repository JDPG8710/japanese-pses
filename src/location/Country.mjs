export const COUNTRY_KEY = 'manabi-country-v1';
export function normalizeCountry(value) {
  const code = typeof value === 'string' ? value.toUpperCase() : '';
  return /^[A-Z]{2}$/.test(code) && !['XX','ZZ','T1'].includes(code) ? code : null;
}
export function languageForCountry(code) { return code === 'JP' ? 'ja' : code === 'CN' ? 'zh' : 'en'; }
export function nativeRegionName(value) {
  const code = normalizeCountry(value);
  if (!code) return '';
  try {
    const language = new Intl.Locale(`und-${code}`).maximize().language;
    return new Intl.DisplayNames([language], {type:'region'}).of(code) || code;
  } catch { return code; }
}
export function readCountry(storage) {
  try { return normalizeCountry(JSON.parse(storage.getItem(COUNTRY_KEY))?.country); } catch { return null; }
}
export function saveCountry(storage, country) {
  const code = normalizeCountry(country);
  if (!code) return false;
  try { storage.setItem(COUNTRY_KEY, JSON.stringify({country:code})); storage.setItem('world-locale',languageForCountry(code)); return true; } catch { return false; }
}
export function countryResponse(request) {
  const country = normalizeCountry(request.cf?.country);
  return Response.json({country,locale:languageForCountry(country),source:country?'ip':'unavailable'}, {
    headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}
  });
}
