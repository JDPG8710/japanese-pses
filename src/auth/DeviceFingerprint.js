/**
 * 防刷用途の粗粒度シグナルのみを使い、元データを保存・送信しない。
 * Worker 側で Client IP と秘密鍵を追加して再 HMAC 化する。
 */
export async function createDeviceFingerprint() {
  const signals = {
    canvas: canvasSignal(),
    webgl: webGLSignal(),
    screen: `${screen?.width || 0}x${screen?.height || 0}x${screen?.colorDepth || 0}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    language: navigator.language || 'unknown',
    hardware: `${navigator.hardwareConcurrency || 0}:${navigator.deviceMemory || 0}`,
    touch: navigator.maxTouchPoints || 0
  };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(signals)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function canvasSignal() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, 240, 60);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#fbbf24';
    ctx.fillText('日本小学 星図 123', 8, 30);
    return canvas.toDataURL().slice(-256);
  } catch { return 'unavailable'; }
}

function webGLSignal() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'unavailable';
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return [gl.getParameter(gl.VERSION), gl.getParameter(gl.SHADING_LANGUAGE_VERSION), debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'masked'].join('|').slice(0, 256);
  } catch { return 'unavailable'; }
}
