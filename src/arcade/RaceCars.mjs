/** Low-poly vehicle classes with arcade stats. */

export const RACE_CARS = Object.freeze([
  Object.freeze({
    id: 'sports',
    accel: 38,
    topSpeed: 42,
    brake: 52,
    handling: 2.4,
    grip: 1.0,
    mass: 1.0,
    color: 0x6ff0ad,
    accent: 0xffffff,
    profile: 'coupe'
  }),
  Object.freeze({
    id: 'gt',
    accel: 30,
    topSpeed: 52,
    brake: 44,
    handling: 1.85,
    grip: 0.92,
    mass: 1.25,
    color: 0x57dfff,
    accent: 0xffe6a8,
    profile: 'gt'
  }),
  Object.freeze({
    id: 'openwheel',
    accel: 48,
    topSpeed: 46,
    brake: 58,
    handling: 2.9,
    grip: 1.12,
    mass: 0.85,
    color: 0xff5c7a,
    accent: 0xffffff,
    profile: 'open'
  }),
  Object.freeze({
    id: 'kart',
    accel: 44,
    topSpeed: 34,
    brake: 60,
    handling: 3.4,
    grip: 1.2,
    mass: 0.7,
    color: 0xffd45e,
    accent: 0xff6b4a,
    profile: 'kart'
  })
]);

export function getRaceCar(id) {
  return RACE_CARS.find(c => c.id === id) || RACE_CARS[0];
}

/**
 * Build a cute low-poly car group (body + wheels + accents).
 * Requires THREE + boxMesh from Arcade3D.
 */
export function makeRaceCarMesh(THREE, boxMesh, carDef, {ghost = false} = {}) {
  const g = new THREE.Group();
  const color = carDef.color;
  const accent = carDef.accent;
  const profile = carDef.profile || 'coupe';

  if (profile === 'open') {
    const body = boxMesh(1.1, 0.28, 2.4, color);
    body.position.y = 0.32;
    const nose = boxMesh(0.9, 0.18, 0.7, accent);
    nose.position.set(0, 0.3, 1.35);
    const wing = boxMesh(1.5, 0.08, 0.35, 0x1a2438);
    wing.position.set(0, 0.55, -1.05);
    const cockpit = boxMesh(0.55, 0.28, 0.7, 0x1a2438);
    cockpit.position.set(0, 0.52, 0.1);
    g.add(body, nose, wing, cockpit);
  } else if (profile === 'kart') {
    const body = boxMesh(1.2, 0.28, 1.6, color);
    body.position.y = 0.28;
    const seat = boxMesh(0.7, 0.35, 0.55, accent);
    seat.position.set(0, 0.5, -0.15);
    const bumper = boxMesh(1.35, 0.18, 0.25, 0x1a2438);
    bumper.position.set(0, 0.25, 0.85);
    g.add(body, seat, bumper);
  } else if (profile === 'gt') {
    const body = boxMesh(1.55, 0.45, 2.5, color);
    body.position.y = 0.38;
    const cabin = boxMesh(1.25, 0.4, 1.2, 0x1a2438);
    cabin.position.set(0, 0.72, -0.15);
    const stripe = boxMesh(0.25, 0.48, 2.4, accent);
    stripe.position.set(0, 0.4, 0);
    g.add(body, cabin, stripe);
  } else {
    const body = boxMesh(1.35, 0.42, 2.2, color);
    body.position.y = 0.36;
    const cabin = boxMesh(1.1, 0.38, 1.0, 0x1a2438);
    cabin.position.set(0, 0.68, -0.1);
    const stripe = boxMesh(0.18, 0.44, 2.1, accent);
    stripe.position.set(0, 0.38, 0);
    g.add(body, cabin, stripe);
  }

  const wheelZ = profile === 'kart' ? 0.55 : 0.75;
  const wheelX = profile === 'open' ? 0.7 : 0.62;
  for (const [x, z] of [[-wheelX, wheelZ], [wheelX, wheelZ], [-wheelX, -wheelZ], [wheelX, -wheelZ]]) {
    const w = boxMesh(0.28, 0.28, 0.42, 0x111820);
    w.position.set(x, 0.14, z);
    g.add(w);
  }

  if (ghost) {
    g.traverse(o => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.55;
      }
    });
  }
  return g;
}
