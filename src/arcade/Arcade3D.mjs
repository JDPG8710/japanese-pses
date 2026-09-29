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

export function boxMesh(w, h, d, color, {roughness = 0.75, emissive = 0x000000, emissiveIntensity = 0} = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({color, roughness, emissive, emissiveIntensity})
  );
}

export function sphereMesh(r, color, {roughness = 0.7, segments = 12, emissive = 0x000000, emissiveIntensity = 0} = {}) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, segments, Math.max(8, segments / 2 | 0)),
    new THREE.MeshStandardMaterial({color, roughness, emissive, emissiveIntensity})
  );
}

/** Burst of short-lived spark spheres. Headless-safe when scene is null. */
export function spawnParticleBurst(scene, origin, {
  count = 10,
  color = 0xffd45e,
  speed = 4,
  life = 0.45,
  size = 0.12
} = {}) {
  if (!scene || !origin) return [];
  const parts = [];
  for (let i = 0; i < count; i++) {
    const mesh = sphereMesh(size * (0.6 + Math.random() * 0.6), color, {
      segments: 6,
      emissive: color,
      emissiveIntensity: 0.55
    });
    mesh.position.copy(origin);
    scene.add(mesh);
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 1.4 + 0.2,
      Math.random() * 2 - 1
    ).normalize();
    parts.push({
      mesh,
      vx: dir.x * speed * (0.6 + Math.random()),
      vy: dir.y * speed * (0.6 + Math.random()),
      vz: dir.z * speed * (0.6 + Math.random()),
      life,
      max: life
    });
  }
  return parts;
}

export function updateParticles(list, dt, scene) {
  if (!list?.length) return [];
  const next = [];
  for (const p of list) {
    p.life -= dt;
    if (p.life <= 0) {
      scene?.remove?.(p.mesh);
      p.mesh.geometry?.dispose?.();
      p.mesh.material?.dispose?.();
      continue;
    }
    p.vy -= 6 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    const t = p.life / p.max;
    p.mesh.scale.setScalar(0.4 + t * 0.8);
    if (p.mesh.material) p.mesh.material.opacity = t;
    if (p.mesh.material && p.mesh.material.transparent !== true) p.mesh.material.transparent = true;
    next.push(p);
  }
  return next;
}

/** Ribbon slash trail as fading quads along recent points. */
export function createSlashTrail(scene, {color = 0xfff1a8, maxPoints = 14} = {}) {
  if (!scene) {
    return {
      push() {},
      update() {},
      clear() {},
      dispose() {}
    };
  }
  const group = new THREE.Group();
  scene.add(group);
  const points = [];
  const quads = [];
  function ensureQuads() {
    while (quads.length < maxPoints - 1) {
      const q = boxMesh(0.08, 0.04, 0.5, color, {emissive: color, emissiveIntensity: 0.8, roughness: 0.35});
      q.material.transparent = true;
      q.visible = false;
      group.add(q);
      quads.push(q);
    }
  }
  ensureQuads();
  return {
    push(point) {
      if (!point) return;
      points.push({x: point.x, y: point.y, z: point.z, age: 0});
      if (points.length > maxPoints) points.shift();
    },
    update(dt) {
      for (const p of points) p.age += dt;
      while (points.length && points[0].age > 0.28) points.shift();
      for (let i = 0; i < quads.length; i++) {
        const q = quads[i];
        if (i >= points.length - 1) {
          q.visible = false;
          continue;
        }
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dy, dz) || 0.01;
        q.visible = true;
        q.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        q.scale.set(1, 1, Math.max(0.2, len / 0.5));
        q.lookAt(b.x, b.y, b.z);
        const fade = 1 - a.age / 0.28;
        q.material.opacity = 0.25 + fade * 0.75;
        q.material.emissiveIntensity = 0.4 + fade * 0.6;
      }
    },
    clear() {
      points.length = 0;
      for (const q of quads) q.visible = false;
    },
    dispose() {
      scene.remove(group);
      group.traverse(o => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
  };
}

export function capsulePowerMesh(color) {
  const g = new THREE.Group();
  const body = sphereMesh(0.28, color, {segments: 10, emissive: color, emissiveIntensity: 0.65});
  body.scale.set(1, 1.35, 1);
  const glow = sphereMesh(0.38, color, {segments: 8, emissive: color, emissiveIntensity: 0.35});
  glow.material.transparent = true;
  glow.material.opacity = 0.35;
  glow.scale.set(1, 1.2, 1);
  g.add(body, glow);
  return g;
}
