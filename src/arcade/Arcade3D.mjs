/** Shared Three.js bootstrap for casual arcade games (vendor from town). */
import * as THREE from '../town/vendor/three.module.js';

export {THREE};

export function createArcadeRenderer(canvas, {clear = 0x0b1528} = {}) {
  if (!canvas) return {ok: false, reason: 'no-canvas'};
  let gl = null;
  try {
    gl = canvas.getContext?.('webgl2', {alpha: false, antialias: true})
      || canvas.getContext?.('webgl', {alpha: false, antialias: true});
  } catch {
    gl = null;
  }
  if (!gl || typeof WebGLRenderingContext === 'undefined') {
    return {ok: false, reason: 'no-webgl'};
  }
  // Reject stub/fake contexts used in node smoke tests.
  if (typeof gl.createShader !== 'function') {
    return {ok: false, reason: 'stub-context'};
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, context: gl, antialias: true, powerPreference: 'high-performance'});
  } catch (err) {
    return {ok: false, reason: String(err?.message || err)};
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(clear, 1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(clear);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.35));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.position.set(6, 14, 8);
  scene.add(sun);
  return {ok: true, THREE, renderer, scene, camera, sun};
}

export function resizeArcade3D(bundle, canvas) {
  if (!bundle?.ok || !canvas) return;
  const r = canvas.getBoundingClientRect?.() || {width: canvas.width || 360, height: canvas.height || 640};
  const w = Math.max(2, Math.floor(r.width || canvas.width || 360));
  const h = Math.max(2, Math.floor(r.height || canvas.height || 640));
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.75);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  bundle.renderer.setSize(w, h, false);
  bundle.camera.aspect = w / h;
  bundle.camera.updateProjectionMatrix();
}

export function disposeArcade3D(bundle) {
  if (!bundle?.ok) return;
  bundle.scene.traverse(o => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      m?.map?.dispose?.();
      m?.dispose?.();
    }
  });
  bundle.scene.clear();
  bundle.renderer.dispose?.();
}

export function boxMesh(w, h, d, color, {roughness = 0.75} = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({color, roughness})
  );
}

export function sphereMesh(r, color, {roughness = 0.7, segments = 12} = {}) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, segments, Math.max(8, segments / 2 | 0)),
    new THREE.MeshStandardMaterial({color, roughness})
  );
}
