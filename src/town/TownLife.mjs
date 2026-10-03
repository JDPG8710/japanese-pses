/** Harmless, solid townsfolk with a short squash-and-spin reaction when bumped. */
import {THREE, box, ball, makeAvatar, animateAvatar, disposeGroup} from './Models3D.mjs?v=2';

const WANDERERS = [
  {character: 'explorer', path: [[-8, 6], [8, 6], [8, -4], [-8, -4]], speed: 2.2, label: 'Kai'},
  {character: 'robot', path: [[-36, 30], [-22, 46], [-6, 34], [-28, 24]], speed: 1.9, label: 'Beep'},
  {character: 'cat', path: [[34, 24], [52, 36], [58, 22], [40, 18]], speed: 2.4, label: 'Momo'},
  {character: 'builder', path: [[-28, -20], [-12, -4], [-34, 0], [-22, -24]], speed: 1.8, label: 'Rin'},
  {character: 'astro', path: [[12, -10], [26, -2], [8, 4], [20, -18]], speed: 2.0, label: 'Lux'},
  {character: 'explorer', path: [[-52, -36], [-66, -48], [-48, -52], [-42, -34]], speed: 2.1, label: 'Ski'}
];

const ANIMALS = [
  {kind: 'cat', x: -58, z: 12, radius: 5, hop: true},
  {kind: 'bird', x: 2, z: 10, radius: 7, fly: true},
  {kind: 'frog', x: -6, z: 14, radius: 3.5, hop: true},
  {kind: 'rabbit', x: 14, z: -4, radius: 4.5, hop: true},
  {kind: 'bird', x: 54, z: -36, radius: 6, fly: true},
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

export const TOWN_BODY = Object.freeze({
  foot: {radius: .68, height: 2.7},
  car: {radius: 2.2, height: 2.8},
  plane: {radius: 4.15, height: 2.8}
});
const finitePoint = p => p && ['x', 'y', 'z'].every(k => Number.isFinite(p[k]));

/** Sweep the whole displacement in small steps, then project touching circles apart.
 * The same narrow-phase runs while the player is still, so walking NPCs cannot enter them.
 * Contact cooldowns deliberately have no effect on this physical separation.
 */
export function resolveTownMotion(previous, desired, colliders, vehicle = 'foot', canOccupy = () => true) {
  if (!finitePoint(previous) || !finitePoint(desired)) return {position: finitePoint(previous) ? {...previous} : {x: 0, y: 0, z: 7}, contacts: []};
  const shape = TOWN_BODY[vehicle] || TOWN_BODY.foot;
  const length = Math.hypot(desired.x - previous.x, desired.z - previous.z);
  // A town is only 160 units wide. Reject a corrupt move rather than spend unbounded work.
  if (length > 500) return {position: {...previous}, contacts: []};
  const steps = Math.max(1, Math.ceil(Math.max(length, Math.abs(desired.y - previous.y)) / .16));
  const dx = (desired.x - previous.x) / steps, dz = (desired.z - previous.z) / steps;
  let position = {...previous};
  const contacts = new Map();
  const bodies = colliders.filter(c => finitePoint(c) && Number.isFinite(c.radius) && c.radius > 0 && Number.isFinite(c.height));
  for (let step = 1; step <= steps; step++) {
    const candidate = {x: position.x + dx, y: previous.y + (desired.y - previous.y) * step / steps, z: position.z + dz};
    for (let pass = 0; pass < 4; pass++) {
      let overlap = false;
      for (const c of bodies) {
        if (candidate.y >= c.y + c.height || candidate.y + shape.height <= c.y) continue;
        const gap = shape.radius + c.radius + .015;
        const ax = candidate.x - c.x, az = candidate.z - c.z, distance = Math.hypot(ax, az);
        if (distance >= gap) continue;
        let nx, nz;
        if (distance > .00001) { nx = ax / distance; nz = az / distance; }
        else {
          const backX = position.x - c.x, backZ = position.z - c.z, back = Math.hypot(backX, backZ);
          nx = back ? backX / back : 1; nz = back ? backZ / back : 0;
        }
        const separated = {...candidate, x: c.x + nx * gap, z: c.z + nz * gap};
        if (canOccupy(separated.x, separated.z, separated.y)) Object.assign(candidate, separated);
        else { candidate.x = position.x; candidate.z = position.z; }
        contacts.set(c.id ?? c, {body: c, nx, nz});
        overlap = true;
      }
      if (!overlap) break;
    }
    if (canOccupy(candidate.x, candidate.z, candidate.y)) position = candidate;
    else position.y = candidate.y;
  }
  return {position, contacts: [...contacts.values()]};
}

function makeStars(environment) {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Group();
    box(star, 0, 0, 0, .33, .09, .09, 0xffdc59);
    box(star, 0, 0, 0, .09, .33, .09, 0xffdc59);
    const cross = box(star, 0, 0, 0, .25, .08, .09, 0xfff6b0);cross.rotation.z = Math.PI / 4;
    star.position.set(Math.cos(i * Math.PI * 2 / 3) * .65, Math.sin(i * Math.PI * 2 / 3) * .1, Math.sin(i * Math.PI * 2 / 3) * .65);
    group.add(star);
  }
  group.visible = false;environment.add(group);return group;
}

/** npcs are existing task characters; their task anchors and rewards stay unchanged.
 * update returns corrected player coordinates and contact count, or null without a player.
 * All animation uses simulation time; dispose releases this controller's effects/animals.
 */
export function spawnTownLife(environment, {npcs = [], canOccupy = () => true} = {}) {
  const wanderers = [], animals = [], stationary = [], bodies = [];
  let time = 0, disposed = false, collisionCount = 0;
  function body(mesh, spec) {
    const b = {mesh, baseX: mesh.position.x, baseZ: mesh.position.z, baseY: mesh.position.y,
      yaw: mesh.rotation.y, radius: .73, height: 2.7, offsetX: 0, offsetZ: 0,
      vx: 0, vz: 0, cooldown: 0, reaction: 0, ...spec};
    b.id = bodies.length;b.stars = makeStars(environment);bodies.push(b);return b;
  }
  for (const mesh of npcs) stationary.push(body(mesh, {stationary: true}));
  for (const spec of WANDERERS) {
    const mesh = makeAvatar(spec.character);mesh.scale.setScalar(.92);
    mesh.position.set(spec.path[0][0], 0, spec.path[0][1]);environment.add(mesh);
    wanderers.push(body(mesh, {path: spec.path.map(([x, z]) => ({x, z})), i: 0, t: 0, speed: spec.speed, wait: 0}));
  }
  for (const spec of ANIMALS) {
    const mesh = makeAnimal(spec.kind);mesh.position.set(spec.x, 0, spec.z);environment.add(mesh);
    animals.push(body(mesh, {kind: spec.kind, ox: spec.x, oz: spec.z, orbit: spec.radius,
      radius: spec.kind === 'cat' ? .5 : .36, height: spec.fly ? .4 : .95,
      hop: !!spec.hop, fly: !!spec.fly, phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2, spin: .4 + Math.random() * .6}));
  }
  function renderBody(b, reducedMotion) {
    const progress = Math.max(0, 1 - b.reaction / 1.1);
    const wobble = b.reaction > 0 && !reducedMotion ? Math.sin(progress * Math.PI) : 0;
    b.mesh.position.set(b.baseX + b.offsetX, b.baseY + wobble * .55, b.baseZ + b.offsetZ);
    b.mesh.rotation.y = b.yaw + (b.reaction > 0 && !reducedMotion ? progress * Math.PI * 2 : 0);
    b.mesh.rotation.z = wobble * Math.sin(progress * Math.PI * 4) * .25;
    b.stars.visible = b.reaction > 0;
    b.stars.position.set(b.mesh.position.x, b.mesh.position.y + b.height + .35, b.mesh.position.z);
    b.stars.rotation.y = reducedMotion ? 0 : time * 3;
  }
  function update(dt, {paused = false, active = true, player, previous = player, vehicle = 'foot', reducedMotion = false} = {}) {
    if (disposed || paused || !active || !Number.isFinite(dt) || dt <= 0) return player ? {position: {...player}, contacts: [], collisionCount} : null;
    dt = Math.min(dt, .04);time += dt;
    for (const w of wanderers) {
      if (w.wait > 0 || w.reaction > 0) {w.wait = Math.max(0, w.wait - dt);animateAvatar(w.mesh, time, false);continue;}
      const a = w.path[w.i], b = w.path[(w.i + 1) % w.path.length], distance = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      w.t = Math.min(1, w.t + w.speed * dt / distance);
      w.baseX = a.x + (b.x - a.x) * w.t;w.baseZ = a.z + (b.z - a.z) * w.t;w.yaw = Math.atan2(b.x - a.x, b.z - a.z);
      if (w.t >= 1) {w.t = 0;w.i = (w.i + 1) % w.path.length;w.wait = .6;}
      animateAvatar(w.mesh, time, true);
    }
    for (const a of animals) {
      if (a.reaction <= 0) a.angle += a.spin * dt * .35;
      a.baseX = a.ox + Math.cos(a.angle + a.phase) * a.orbit * .55;
      a.baseZ = a.oz + Math.sin(a.angle * .85 + a.phase) * a.orbit * .55;
      a.baseY = a.fly ? 1.2 + Math.sin(time * 3 + a.phase) * .45 : a.hop && !reducedMotion ? Math.max(0, Math.sin(time * 5 + a.phase) * .35) : 0;
      a.yaw = a.angle + Math.PI / 2;
    }
    for (const b of bodies) {
      b.cooldown = Math.max(0, b.cooldown - dt);b.reaction = Math.max(0, b.reaction - dt);
      b.vx += (-b.offsetX * 10 - b.vx * 5) * dt;b.vz += (-b.offsetZ * 10 - b.vz * 5) * dt;
      const nextX = b.offsetX + b.vx * dt, nextZ = b.offsetZ + b.vz * dt;
      if (canOccupy(b.baseX + nextX, b.baseZ + nextZ, b.baseY)) {b.offsetX = nextX;b.offsetZ = nextZ;}
      else {b.vx = 0;b.vz = 0;}
      renderBody(b, reducedMotion);
    }
    if (!player) return null;
    // Visual hops never disable a body's collision; only its actual floor/flight altitude matters.
    const colliders = bodies.map(b => ({id: b.id, x: b.baseX + b.offsetX, y: b.baseY, z: b.baseZ + b.offsetZ, radius: b.radius, height: b.height, source: b}));
    const result = resolveTownMotion(previous, player, colliders, vehicle, canOccupy);
    for (const {body: contact, nx, nz} of result.contacts) {
      const b = contact.source;
      if (b.cooldown > 0) continue;
      collisionCount++;b.cooldown = 1.35;b.reaction = 1.1;
      const impulse = reducedMotion ? 1 : vehicle === 'foot' ? 3.4 : vehicle === 'car' ? 5 : 6;
      b.vx -= nx * impulse;b.vz -= nz * impulse;
      renderBody(b, reducedMotion);
    }
    return {...result, collisionCount};
  }

  // Only the town's existing click-to-walk route uses this local repair. Manual input stays manual.
  // Rejoin beyond the obstructed grid nodes; otherwise a detour would lead back into the same NPC.
  function navigationDetour(player, path) {
    if (disposed || !finitePoint(player) || !path?.length) return null;
    const obstacles = bodies.filter(b => player.y < b.baseY + b.height && player.y + TOWN_BODY.foot.height > b.baseY)
      .map(b => ({x:b.baseX+b.offsetX,z:b.baseZ+b.offsetZ,r:b.radius+TOWN_BODY.foot.radius+.006}));
    const clear = p => canOccupy(p.x,p.z,player.y) && obstacles.every(b=>Math.hypot(p.x-b.x,p.z-b.z)>=b.r);
    const segment = (a,b) => {const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12));for(let i=1;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;};
    let rejoin=path.findIndex(p=>Math.hypot(p.x-player.x,p.z-player.z)>3&&clear(p));
    if(rejoin<0)rejoin=path.length-1;
    const goal=path[rejoin];if(!clear(goal))return null;
    const step=.4,goalX=(goal.x-player.x)/step,goalZ=(goal.z-player.z)/step;
    const limitX=Math.ceil(Math.max(4,Math.abs(goalX))+10),limitZ=Math.ceil(Math.max(4,Math.abs(goalZ))+10);
    const key=(x,z)=>x+','+z,point=(x,z)=>({x:player.x+x*step,z:player.z+z*step});
    const start={x:0,z:0,g:0,h:Math.hypot(goalX,goalZ),parent:null};
    const open=[start],known=new Map([[key(0,0),start]]);let end=null;
    for(let visited=0;open.length&&visited<1800;visited++){
      open.sort((a,b)=>(b.g+b.h)-(a.g+a.h));const node=open.pop();if(node.closed)continue;node.closed=true;
      const here=point(node.x,node.z);
      if(Math.hypot(here.x-goal.x,here.z-goal.z)<.58&&segment(here,goal)){end=node;break;}
      for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const x=node.x+dx,z=node.z+dz;if(Math.abs(x)>limitX||Math.abs(z)>limitZ)continue;
        const k=key(x,z),existing=known.get(k),g=node.g+Math.hypot(dx,dz);
        if(existing&&(existing.closed||existing.g<=g))continue;
        const p=point(x,z);if(!segment(here,p))continue;
        const next={x,z,g,h:Math.hypot(x-goalX,z-goalZ),parent:node};known.set(k,next);open.push(next);
      }
    }
    if(!end)return null;
    const route=[];for(let cur=end;cur.parent;cur=cur.parent)route.unshift(point(cur.x,cur.z));
    return [...route,...path.slice(rejoin)];
  }

  function dispose() {
    if (disposed) return;disposed = true;
    for (const b of bodies) {environment.remove(b.stars);disposeGroup(b.stars);if (!b.stationary) {environment.remove(b.mesh);disposeGroup(b.mesh);}}
    bodies.length = wanderers.length = animals.length = stationary.length = 0;
  }
  return {update, dispose, navigationDetour, wandererCount: wanderers.length, animalCount: animals.length,
    wanderers, animals, stationary, get collisionCount() {return collisionCount;}, get time() {return time;}};
}
