/** Lightweight wandering townsfolk + critters for the sprawl map (no player collision). */
import {THREE, box, ball, makeAvatar, animateAvatar} from './Models3D.mjs?v=2';

const WANDERERS = [
  {character: 'explorer', path: [[-8, 6], [8, 6], [8, -4], [-8, -4]], speed: 2.2, label: 'Kai'},
  {character: 'robot', path: [[-30, 26], [-18, 34], [-8, 28], [-22, 22]], speed: 1.9, label: 'Beep'},
  {character: 'cat', path: [[30, 28], [42, 34], [48, 26], [34, 22]], speed: 2.4, label: 'Momo'},
  {character: 'builder', path: [[-22, -10], [-12, -4], [-28, 2], [-16, -14]], speed: 1.8, label: 'Rin'},
  {character: 'astro', path: [[12, -10], [22, -2], [8, 4], [18, -16]], speed: 2.0, label: 'Lux'},
  {character: 'explorer', path: [[-42, -28], [-50, -34], [-38, -38], [-34, -26]], speed: 2.1, label: 'Ski'}
];

const ANIMALS = [
  {kind: 'cat', x: -46, z: 8, radius: 5, hop: true},
  {kind: 'bird', x: 2, z: 10, radius: 7, fly: true},
  {kind: 'frog', x: -6, z: 14, radius: 3.5, hop: true},
  {kind: 'rabbit', x: 14, z: -4, radius: 4.5, hop: true},
  {kind: 'bird', x: 40, z: -26, radius: 6, fly: true},
  {kind: 'cat', x: 16, z: -8, radius: 4, hop: false}
];

function makeAnimal(kind) {
  const g = new THREE.Group();
  if (kind === 'cat') {
    box(g, 0, 0.28, 0, 0.55, 0.32, 0.35, 0xf0a45a);
    ball(g, 0.28, 0.42, 0.05, 0.18, 0xf0a45a);
    box(g, -0.28, 0.35, -0.05, 0.12, 0.12, 0.35, 0xe08a40);
    for (const x of [0.2, 0.36]) box(g, x, 0.55, 0.05, 0.08, 0.12, 0.06, 0xf0a45a);
  } else if (kind === 'bird') {
    box(g, 0, 0.2, 0, 0.22, 0.16, 0.28, 0x6eb5e0);
    ball(g, 0, 0.32, 0.12, 0.1, 0x6eb5e0);
    box(g, -0.2, 0.22, 0, 0.28, 0.04, 0.12, 0x4a91c0);
    box(g, 0.2, 0.22, 0, 0.28, 0.04, 0.12, 0x4a91c0);
  } else if (kind === 'frog') {
    box(g, 0, 0.18, 0, 0.4, 0.22, 0.35, 0x6dbf5c);
    ball(g, -0.12, 0.32, 0.1, 0.09, 0x8ad872);
    ball(g, 0.12, 0.32, 0.1, 0.09, 0x8ad872);
  } else {
    // rabbit
    box(g, 0, 0.28, 0, 0.35, 0.32, 0.28, 0xf5f0e6);
    ball(g, 0, 0.5, 0.08, 0.16, 0xf5f0e6);
    for (const x of [-0.08, 0.08]) box(g, x, 0.72, 0, 0.07, 0.28, 0.06, 0xf5f0e6);
    box(g, -0.18, 0.2, -0.05, 0.08, 0.1, 0.22, 0xe8e0d0);
  }
  return g;
}

/**
 * Spawn wanderers + animals into the town environment group.
 * Returns a controller with update(dt, {paused, active}) and counts.
 */
export function spawnTownLife(environment) {
  const wanderers = [];
  const animals = [];

  for (const spec of WANDERERS) {
    const mesh = makeAvatar(spec.character);
    mesh.scale.setScalar(0.92);
    const start = spec.path[0];
    mesh.position.set(start[0], 0, start[1]);
    environment.add(mesh);
    wanderers.push({
      mesh,
      path: spec.path.map(([x, z]) => ({x, z})),
      i: 0,
      t: 0,
      speed: spec.speed,
      wait: 0
    });
  }

  for (const spec of ANIMALS) {
    const mesh = makeAnimal(spec.kind);
    mesh.position.set(spec.x, 0, spec.z);
    environment.add(mesh);
    animals.push({
      mesh,
      kind: spec.kind,
      ox: spec.x,
      oz: spec.z,
      radius: spec.radius,
      hop: !!spec.hop,
      fly: !!spec.fly,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spin: 0.4 + Math.random() * 0.6
    });
  }

  function update(dt, {paused = false, active = true} = {}) {
    if (paused || !active || !(dt > 0)) return;
    for (const w of wanderers) {
      if (w.wait > 0) {
        w.wait -= dt;
        animateAvatar(w.mesh, performance.now() / 1000, false);
        continue;
      }
      const a = w.path[w.i];
      const b = w.path[(w.i + 1) % w.path.length];
      const dist = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      w.t += (w.speed * dt) / dist;
      if (w.t >= 1) {
        w.t = 0;
        w.i = (w.i + 1) % w.path.length;
        w.wait = 0.4 + Math.random() * 1.2;
        animateAvatar(w.mesh, performance.now() / 1000, false);
        continue;
      }
      const x = a.x + (b.x - a.x) * w.t;
      const z = a.z + (b.z - a.z) * w.t;
      w.mesh.position.set(x, 0, z);
      w.mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      animateAvatar(w.mesh, performance.now() / 1000, true);
    }
    const now = performance.now() / 1000;
    for (const a of animals) {
      a.angle += a.spin * dt * 0.35;
      const x = a.ox + Math.cos(a.angle + a.phase) * a.radius * 0.55;
      const z = a.oz + Math.sin(a.angle * 0.85 + a.phase) * a.radius * 0.55;
      let y = 0;
      if (a.fly) y = 1.2 + Math.sin(now * 3 + a.phase) * 0.45;
      else if (a.hop) y = Math.max(0, Math.sin(now * 5 + a.phase) * 0.35);
      a.mesh.position.set(x, y, z);
      a.mesh.rotation.y = a.angle + Math.PI / 2;
      if (a.fly) {
        // flap wings lightly via child scale if present
        a.mesh.rotation.z = Math.sin(now * 10 + a.phase) * 0.15;
      }
    }
  }

  return {
    update,
    wandererCount: wanderers.length,
    animalCount: animals.length,
    wanderers,
    animals
  };
}
