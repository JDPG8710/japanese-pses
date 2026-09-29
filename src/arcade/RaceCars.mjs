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
  } else {
    const width = profile === 'gt' ? 1.5 : 1.35, length = profile === 'gt' ? 2.5 : 2.2;
    // Bevelled bodywork catches the sun instead of reading as stacked boxes.
    const outline = new THREE.Shape();
    const w=width/2, l=length/2, r=0.18;
    outline.moveTo(-w+r,-l);outline.lineTo(w-r,-l);outline.quadraticCurveTo(w,-l,w,-l+r);
    outline.lineTo(w,l-r);outline.quadraticCurveTo(w,l,w-r,l);outline.lineTo(-w+r,l);
    outline.quadraticCurveTo(-w,l,-w,l-r);outline.lineTo(-w,-l+r);outline.quadraticCurveTo(-w,-l,-w+r,-l);
    const bodyGeo = new THREE.ExtrudeGeometry(outline,{depth:0.25,bevelEnabled:true,bevelThickness:0.07,bevelSize:0.06,bevelSegments:3,steps:1,curveSegments:6});
    bodyGeo.rotateX(Math.PI/2);bodyGeo.translate(0,0.57,0);
    const body = new THREE.Mesh(bodyGeo,new THREE.MeshStandardMaterial({color,metalness:0.38,roughness:0.32}));g.add(body);
    // Sloped windshield/rear glass and a narrower roof make a true coupe silhouette.
    const vertices=[-w*.83,.57,-.7, w*.83,.57,-.7, w*.83,.57,.55,-w*.83,.57,.55,
                    -w*.67,.94,-.38,w*.67,.94,-.38,w*.67,.94,.14,-w*.67,.94,.14];
    const cabinGeo=new THREE.BufferGeometry();cabinGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    cabinGeo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5]);cabinGeo.computeVertexNormals();
    const cabin=new THREE.Mesh(cabinGeo,new THREE.MeshStandardMaterial({color:0x284555,metalness:0.55,roughness:0.2,side:THREE.DoubleSide}));g.add(cabin);
    const roof=boxMesh(width*.68,.045,.52,color,{roughness:0.32});roof.position.set(0,.97,-.12);g.add(roof);
    for(const side of [-1,1]) {
      const sill=boxMesh(.045,.11,length*.72,0x263a42);sill.position.set(side*(w+.06),.28,0);g.add(sill);
      const pillar=boxMesh(.045,.33,.045,color);pillar.position.set(side*w*.74,.76,-.12);g.add(pillar);
      const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.048,.048,.13,10),new THREE.MeshStandardMaterial({color:0x697985,metalness:.8,roughness:.3}));exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.39,.25,-l-.045);g.add(exhaust);
    }
    const bumper=boxMesh(width*.84,.09,.07,0x263a42);bumper.position.set(0,.29,-l-.055);g.add(bumper);
    const stripe=boxMesh(.14,.012,.43,accent);stripe.position.set(0,.655,.86);g.add(stripe);
    if(profile==='gt') {
      for(const x of [-.45,.45]){const stem=boxMesh(.06,.22,.06,0x27343d);stem.position.set(x,.67,-1.02);g.add(stem);}
      const spoiler=boxMesh(1.6,.055,.27,0x27343d);spoiler.position.set(0,.79,-1.02);g.add(spoiler);
    }
  }

  const wheelZ = profile === 'kart' ? 0.55 : 0.75;
  const wheelX = profile === 'open' ? 0.76 : 0.69;
  g.userData.wheels = [];
  for (const [x, z] of [[-wheelX, wheelZ], [wheelX, wheelZ], [-wheelX, -wheelZ], [wheelX, -wheelZ]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.22, z);
    pivot.userData.front = z > 0;
    const rolling = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.27,0.24,16),new THREE.MeshStandardMaterial({color:0x161a20,roughness:0.95}));
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.25,12),new THREE.MeshStandardMaterial({color:0xaab7c1,metalness:0.65,roughness:0.3}));
    hub.rotation.z = Math.PI / 2;
    rolling.add(tire,hub);pivot.add(rolling);g.add(pivot);g.userData.wheels.push(pivot);
  }
  const length = profile === 'kart' ? 1.6 : profile === 'gt' ? 2.5 : 2.2;
  for (const x of [-0.44,0.44]) {
    const head = boxMesh(0.28,0.12,0.06,0xffffdf,{emissive:0xffedb1,emissiveIntensity:0.6});
    head.position.set(x,0.47,length/2+0.09);
    const tail = boxMesh(0.27,0.1,0.06,0xc9302f,{emissive:0xff3020,emissiveIntensity:0.65});
    tail.position.set(x,0.43,-length/2-0.09);g.add(head,tail);
  }
  if (profile === 'coupe' || profile === 'gt') {
    for(const x of [-0.77,0.77]) {const mirror=boxMesh(0.18,0.1,0.23,color);mirror.position.set(x,0.65,0.35);g.add(mirror);}
  }
  g.traverse(o => { if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });

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
