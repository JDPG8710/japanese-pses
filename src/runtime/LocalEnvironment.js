/**
 * ローカル開発用ホストを一か所で判定する。
 * ループバックだけでなく、同一LANから利用するRFC1918 IPv4もオフラインモードに含める。
 */
export function isLocalDevelopmentHost(hostname = globalThis.location?.hostname || '') {
  const host = String(hostname).trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return false;
  if (['localhost', '127.0.0.1', '::1'].includes(host) || host.endsWith('.localhost') || host.endsWith('.local')) return true;

  const octets = host.split('.').map(Number);
  const validIPv4 = octets.length === 4 && octets.every(part => Number.isInteger(part) && part >= 0 && part <= 255);
  if (!validIPv4) return false;
  const [first, second] = octets;
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 169 && second === 254)
    || first === 127;
}
