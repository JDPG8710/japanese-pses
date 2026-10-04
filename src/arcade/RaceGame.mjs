import {RACE_POWERUPS,POWER_COLORS,itemIcon,makeRaceItemMesh,disposeItem} from './RaceItems.mjs';
import {raceExpansion} from './RaceContent.mjs';
import {segmentDistance,hitRival,advanceRivalStatus,surfaceAt,SURFACE_FACTOR} from './RaceCombat.mjs';
/** Player-driven circuit racing with track/car select, power-ups, and AI traffic. */
import {normalizeDifficulty} from '../town/TownProgression.mjs';
import {
  createArcadeRenderer, resizeArcade3D, disposeArcade3D, boxMesh, sphereMesh, THREE,
  spawnParticleBurst, updateParticles
} from './Arcade3D.mjs?v=3';
import {arcadeText} from './ArcadeText.mjs?v=3';
import {
  RACE_TRACKS, getRaceTrack, buildPathMetrics, projectOnPath, pointAtProgress, trackMap
} from './RaceTracks.mjs?v=1';
import {buildRaceScenery, disposeRaceScene} from './RaceScenery.mjs?v=1';
import {RACE_CARS, getRaceCar, makeRaceCarMesh, updateRaceCar} from './RaceCars.mjs?v=2';

import {barrierContact,carContact,support} from './RacePhysics.mjs';

export {RACE_TRACKS, RACE_CARS};
export {RACE_POWERUPS};

export const RACE_DIFFICULTY = Object.freeze({
  laps: 3,
  aiCount: 2,
  lives: 4,
  clearDistance: 0, // lap-based; kept for smoke-test compat
  spawnIntervalMin: 0.5, // kept for smoke-test compat (item respawn floor)
  itemRespawn: 6.5,
  offTrackSlow: 0.55,
  boostDuration: 3,
  shieldDuration: 6.0,
  oilDuration: 2.2,
  magnetDuration: 12,
  finishGraceMs: 400
});


function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function wrapDelta(a, b) {
  let d = a - b;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

export function raceDifficultyFor(difficulty) {
 const scale=normalizeDifficulty(difficulty).scale;
 return Object.freeze({...RACE_DIFFICULTY,aiCount:2+Math.floor(scale*2),aiSpeedMultiplier:1+.22*scale,itemRespawn:6.5+3*scale,offTrackSlow:.55-.09*scale});
}

export function createRaceGame({
  canvas,
  onHud,
  onEnd,
  audio = null,
  autoStart = true,
  locale = 'en',
  trackId = null,
  carId = null,
  skipLobby = false,
  difficulty
} = {}) {
  const D = raceDifficultyFor(difficulty);
  const tCopy = arcadeText(locale);
  const expansion=raceExpansion(locale);
  const raceCopy={...tCopy.race,...expansion,tracks:{...tCopy.race.tracks,...expansion.tracks},cars:{...tCopy.race.cars,...expansion.cars},powerups:{...tCopy.race.powerups,...expansion.powerups}};
  const graphics = createArcadeRenderer(canvas, {clear: 0x0a1224});

  let selectedTrackId = trackId || RACE_TRACKS[0].id;
  let selectedCarId = carId || RACE_CARS[0].id;
  let track = getRaceTrack(selectedTrackId);
  let carDef = getRaceCar(selectedCarId);
  let metrics = buildPathMetrics(track.path);

  let phase = 'lobby'; // lobby | racing | ended
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let score = 0;
  let lives = D.lives;
  let lap = 1;
  let raceTime = 0;
  let distance = 0; // cumulative meters along path (compat)
  let speed = 0;
  let heading = 0;
  let steering = 0;
  let driftX=0,driftZ=0,yawKick=0,impactT=0,impactStrength=0,damage=0,collisionCount=0,lastCollision=null;
  let raceUI=null,mapData=null,skidPool=[],skidIndex=0,skidClock=0;
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let cameraHeading = 0;
  let px = 0;
  let pz = 0;
  let progress = 0;
  let lastProgress = 0;
  let crossedMid = false;
  let invuln = 0;
  let boostT = 0;
  let shieldT = 0;
  let oilT = 0;
  let magnetT = 0;
  let heldItem = null;
  let skillT=0,skillCooldown=0,projectiles=[],playerFx=null,surfaceKind="road",notice="",noticeT=0,attackHits=0,usedItems=0,surfaceFxClock=0;
  let particles = [];
  let items = [];
  let hazards = [];
  let aiCars = [];
  let playerMesh = null;
  let worldGroup = null;
  let itemGroup = null;
  let trafficGroup = null;
  let fxGroup = null;
  let lobbyEl = null;
  let touchEl = null;
  let camX = 0, camY = 8, camZ = -12;

  const keys = {throttle: false, brake: false, left: false, right: false};
  const touch = {throttle: 0, brake: 0, steer: 0};

  function hasDom() {
    return typeof document !== 'undefined' && canvas && typeof canvas.getBoundingClientRect === 'function'
      && canvas.parentElement;
  }

  function shouldShowLobby() {
    if (skipLobby) return false;
    if (trackId && carId) return false;
    if (!hasDom()) return false;
    // Stub canvases used in headless tests have no real parent with class arcade-stage
    const parent = canvas.parentElement;
    if (!parent || parent.nodeType !== 1) return false;
    return true;
  }

  function labelTrack(id) {
    return raceCopy.tracks?.[id]?.name || id;
  }
  function labelCar(id) {
    return raceCopy.cars?.[id]?.name || id;
  }
  function labelPower(id) {
    return raceCopy.powerups?.[id] || id;
  }

  function mountLobby() {
    if (!shouldShowLobby()) return false;
    const stage = canvas.parentElement;
    lobbyEl = document.createElement('div');
    lobbyEl.className = 'race-lobby';
    lobbyEl.innerHTML = `
      <div class="race-lobby-card">
        <p class="race-lobby-kicker">${esc(raceCopy.lobbyKicker || 'CIRCUIT')}</p>
        <h2>${esc(raceCopy.lobbyTitle || tCopy.games.race.title)}</h2>
        <p class="muted">${esc(raceCopy.hint)}</p>
        <h3>${esc(raceCopy.pickTrack || 'Track')}</h3>
        <div class="race-lobby-grid" data-pick="track">
          ${RACE_TRACKS.map(tr => `
            <button type="button" class="race-pick ${tr.id === selectedTrackId ? 'active' : ''}" data-track="${tr.id}">
              <svg class="race-route-preview" viewBox="0 0 200 200" aria-hidden="true"><polygon points="${trackMap(tr).points}"/></svg>
              <strong>${esc(labelTrack(tr.id))}</strong><span class="race-length">${(buildPathMetrics(tr.path).total/1000).toFixed(2)} km</span>
              <small>${esc(raceCopy.tracks?.[tr.id]?.blurb || '')}</small>
            </button>`).join('')}
        </div>
        <h3>${esc(raceCopy.pickCar || 'Car')}</h3>
        <div class="race-lobby-grid" data-pick="car">
          ${RACE_CARS.map(c => `
            <button type="button" class="race-pick ${c.id === selectedCarId ? 'active' : ''}" data-car="${c.id}">
              <strong>${esc(labelCar(c.id))}</strong>
              <small>${esc(raceCopy.cars?.[c.id]?.blurb || '')}</small><span class="race-length">${Math.round(c.topSpeed*3.6)} km/h · ${esc(raceCopy.skills[c.skill])}</span>
            </button>`).join('')}
        </div>
        <button type="button" class="primary wide race-lobby-play" data-race-play>${esc(tCopy.play)}</button>
      </div>`;
    stage.append(lobbyEl);
    lobbyEl.addEventListener('click', onLobbyClick);
    phase = 'lobby';
    return true;
  }

  function onLobbyClick(e) {
    const trackBtn = e.target.closest('[data-track]');
    if (trackBtn) {
      selectedTrackId = trackBtn.dataset.track;
      lobbyEl.querySelectorAll('[data-track]').forEach(b => b.classList.toggle('active', b.dataset.track === selectedTrackId));
      previewSelection();
      return;
    }
    const carBtn = e.target.closest('[data-car]');
    if (carBtn) {
      selectedCarId = carBtn.dataset.car;
      lobbyEl.querySelectorAll('[data-car]').forEach(b => b.classList.toggle('active', b.dataset.car === selectedCarId));
      previewSelection();
      return;
    }
    if (e.target.closest('[data-race-play]')) {
      beginRace();
    }
  }

  function previewSelection(){
    track=getRaceTrack(selectedTrackId);carDef=getRaceCar(selectedCarId);metrics=buildPathMetrics(track.path);
    buildScene();resetPlayerPose();draw();
  }
  function mountRaceUI(){
    raceUI?.remove();if(!hasDom())return;
    mapData=trackMap(track);raceUI=document.createElement('div');raceUI.className='race-instruments';
    raceUI.innerHTML=`<div class="race-minimap"><span>${esc(labelTrack(track.id))}</span><svg viewBox="0 0 200 200" aria-label="${esc(labelTrack(track.id))}"><polygon points="${mapData.points}"/><circle class="race-map-start" cx="${mapData.map(track.path[0]).x}" cy="${mapData.map(track.path[0]).y}" r="4"/><circle class="race-map-player" r="5"/>${aiCars.map(()=>'<circle class="race-map-ai" r="3"/>').join('')}</svg><small>${(metrics.total/1000).toFixed(2)} km</small></div><div class="race-impact" role="status" aria-live="polite" hidden></div>`;
    canvas.parentElement.append(raceUI);updateRaceUI();
  }
  function updateRaceUI(){
    if(!raceUI)return;const p=mapData.map({x:px,z:pz}),dot=raceUI.querySelector('.race-map-player');dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
    raceUI.querySelectorAll('.race-map-ai').forEach((el,i)=>{const q=mapData.map(aiCars[i]);el.setAttribute('cx',q.x);el.setAttribute('cy',q.y);});
    if(impactT<=0)raceUI.querySelector('.race-impact').hidden=true;
  }
  function impact(kind,strength,x,z){
    if(strength<1.8||invuln>0)return;
    const shielded=shieldT>0||(skillT>0&&carDef.skill==='armor');
    invuln=450;impactT=.9;impactStrength=Math.min(1,strength/25);collisionCount++;
    lastCollision={kind,strength,shielded,time:raceTime};
    if(shielded&&shieldT>0)shieldT=0;
    else {damage=Math.min(1,damage+strength/100);if(strength>9)lives--;}
    try{audio?.raceHit?.(strength);}catch{}
    if(fxGroup){
      const sparks=spawnParticleBurst(fxGroup,new THREE.Vector3(x,.55,z),{count:Math.round(10+impactStrength*18),color:shielded?0x7bdfff:0xffba63,speed:3+strength*.18,life:.55,size:.055});
      for(const p of sparks){p.mesh.geometry.dispose();p.mesh.material.dispose();p.mesh.geometry=new THREE.BoxGeometry(.024,.024,.2+impactStrength*.25);p.mesh.material=new THREE.MeshBasicMaterial({color:shielded?0x7bdfff:0xffd18a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(p.vx,p.vy,p.vz).normalize());}
      const chips=spawnParticleBurst(fxGroup,new THREE.Vector3(x,.25,z),{count:6,color:0x69717a,speed:2,life:.7,size:.05});
      for(const p of chips){p.mesh.geometry.dispose();p.mesh.geometry=new THREE.BoxGeometry(.06,.03,.09);p.mesh.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);}
      particles.push(...sparks,...chips);
    }
    if(raceUI){const el=raceUI.querySelector('.race-impact');el.hidden=false;el.dataset.severity=strength>9?'heavy':'light';el.textContent=locale==='zh'?(shielded?'护盾挡住了撞击！':strength>9?'砰！撞得好重':'蹭到了 · 稳住方向盘'):locale==='ja'?(shielded?'シールドでガード！':strength>9?'ガシャーン！おおきくぶつかった':'こつん！ハンドルをまっすぐ'):(shielded?'Shield blocked the hit!':strength>9?'Crash! Big bump':'Bump! Keep it steady');}
  }
  function acceptVelocity(vx,vz){
    const fx=Math.sin(heading),fz=Math.cos(heading);speed=vx*fx+vz*fz;
    driftX=vx-fx*speed;driftZ=vz-fz*speed;
  }
  function playerBody(){return {x:px,z:pz,heading,car:carDef,vx:Math.sin(heading)*speed+driftX,vz:Math.cos(heading)*speed+driftZ};}

  function unmountLobby() {
    if (!lobbyEl) return;
    lobbyEl.removeEventListener('click', onLobbyClick);
    lobbyEl.remove();
    lobbyEl = null;
  }

  function mountTouch() {
    if (!hasDom()) return;
    const stage = canvas.parentElement;
    const labels = locale === 'zh' ? ['向左','向右','刹车','油门'] : locale === 'ja' ? ['ひだり','みぎ','ブレーキ','アクセル'] : ['Left','Right','Brake','Go'];
    touchEl = document.createElement('div');
    touchEl.className = 'race-touch';
    touchEl.innerHTML = `
      <div class="race-touch-steer">
        <button type="button" data-touch="left" aria-label="${labels[0]}">◀</button>
        <button type="button" data-touch="right" aria-label="${labels[1]}">▶</button>
      </div>
      <div class="race-touch-pedals">
        <button type="button" data-touch="brake" aria-label="${labels[2]}">${labels[2]}</button>
        <button type="button" data-touch="throttle" class="primary" aria-label="${labels[3]}">${labels[3]}</button>
      </div>
      <div class="race-action-buttons"><button type="button" class="race-touch-item" data-touch="item"></button><button type="button" class="race-touch-skill" data-touch="skill"></button></div>`;
    stage.append(touchEl);
    const pointers = new Map();
    const update = () => {
      const pressed = new Set(pointers.values());
      touch.steer = Number(pressed.has('right')) - Number(pressed.has('left'));
      touch.throttle = Number(pressed.has('throttle'));
      touch.brake = Number(pressed.has('brake'));
      touchEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', pressed.has(b.dataset.touch)));
    };
    const down = e => {
      const b = e.target.closest('[data-touch]');
      if (!b || b.disabled || ['item','skill'].includes(b.dataset.touch)) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, b.dataset.touch);

      update();
    };
    const up = e => { pointers.delete(e.pointerId); update(); };
    touchEl.addEventListener('pointerdown', down);
    touchEl.addEventListener('pointerup', up);
    touchEl.addEventListener('pointercancel', up);
    touchEl.addEventListener('lostpointercapture', up);
    const click=e=>{const action=e.target.closest('[data-touch]')?.dataset.touch;if(action==='item')useHeldItem();if(action==='skill')useSkill();};
    touchEl.addEventListener('click',click);
    touchEl._raceHandlers = {down, up, pointers,click};
    updateActionUI();
  }

  function unmountTouch() {
    if (!touchEl) return;
    const h = touchEl._raceHandlers;
    if (h) {
      touchEl.removeEventListener('click',h.click);
      touchEl.removeEventListener('pointerdown', h.down);
      touchEl.removeEventListener('pointerup', h.up);
      touchEl.removeEventListener('pointercancel', h.up);
      touchEl.removeEventListener('lostpointercapture', h.up);
    }
    touchEl.remove();
    touchEl = null;
    touch.throttle = 0; touch.brake = 0; touch.steer = 0;
  }

  function buildScene() {
    if (!graphics.ok) {
      worldGroup = null;
      return;
    }
    disposeRaceScene(graphics.scene);
    playerFx=null;
    skidPool=[];skidIndex=0;skidClock=0;
    const {scene, camera, renderer} = graphics;
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    buildRaceScenery({scene, renderer, group: worldGroup, track, metrics});

    itemGroup = new THREE.Group();
    scene.add(itemGroup);
    trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    fxGroup = new THREE.Group();
    scene.add(fxGroup);

    playerMesh = makeRaceCarMesh(THREE, boxMesh, carDef);
    scene.add(playerMesh);
    initPlayerFx();
    if(track.id==='neon')for(const side of [-1,1]){
      const lamp=new THREE.SpotLight(0xd6e8ff,48,65,.38,.6,1.3);lamp.position.set(side*.62,.55,2.1);
      lamp.target.position.set(side*.8,.05,36);playerMesh.add(lamp,lamp.target);
    }

    camera.far=1000;camera.updateProjectionMatrix();
    const skidGeo=new THREE.PlaneGeometry(.25,1),skidMat=new THREE.MeshBasicMaterial({color:0x171a1c,transparent:true,opacity:.48,depthWrite:false});
    for(let i=0;i<160;i++){const mark=new THREE.Mesh(skidGeo,skidMat);mark.rotation.x=-Math.PI/2;mark.visible=false;fxGroup.add(mark);skidPool.push(mark);}
    camera.position.set(0, 10, -14);
    camera.lookAt(0, 0, 0);
    resizeArcade3D(graphics, canvas);
  }

  function spawnItems() {
    items = [];
    if (itemGroup) while (itemGroup.children.length) itemGroup.remove(itemGroup.children[0]);
    const types = RACE_POWERUPS;
    track.itemSlots.forEach((s, i) => {
      const lateral = (i % 2 ? 1 : -1) * (track.width * 0.28);
      const p = pointAtProgress(track.path, metrics, s);
      const type = types[i % types.length];
      const mesh = graphics.ok
        ? (() => {
          const m = makeRaceItemMesh(type);
          m.position.set(p.x + p.nx * lateral, 0.7, p.z + p.nz * lateral);
          itemGroup.add(m);
          return m;
        })()
        : null;
      items.push({s,lateral,type,mesh,x:p.x+p.nx*lateral,z:p.z+p.nz*lateral,drawX:p.x+p.nx*lateral,drawZ:p.z+p.nz*lateral,alive:true,respawn:0});
    });
  }

  function spawnAi() {
    aiCars = [];
    if (trafficGroup) while (trafficGroup.children.length) trafficGroup.remove(trafficGroup.children[0]);
    const count = D.aiCount;
    for (let i = 0; i < count; i++) {
      const pool=track.id==='offroad'?['rally','bumper','gt','kart']:track.id==='grandtour'?['supercar','openwheel','gt','sports']:RACE_CARS.map(c=>c.id);
      const def=getRaceCar(pool[(i+(track.id==='offroad'||track.id==='grandtour'?0:1))%pool.length]);
      const s0 = .02+(18+i*14)/metrics.total;
      const lat = (i % 2 ? 1 : -1) * 1.4;
      const p = pointAtProgress(track.path, metrics, s0);
      const mesh = graphics.ok ? makeRaceCarMesh(THREE, boxMesh, def, {ghost: false}) : null;
      if (mesh) {
        mesh.position.set(p.x + p.nx * lat, 0.055, p.z + p.nz * lat);
        mesh.rotation.y = p.heading;
        trafficGroup.add(mesh);
      }
      aiCars.push({
        slowT:0,stunT:0,slipT:0,shieldT:0,hitCount:0,lastHit:null,
        def, x:p.x+p.nx*lat,z:p.z+p.nz*lat,heading:p.heading,lateralVelocity:0,
        s: s0,
        lat,
        speed: def.topSpeed * (0.62 + i * 0.08) * D.aiSpeedMultiplier,
        mesh,
        lap: 1,
        progress: s0
      });
    }
  }

  function resetPlayerPose() {
    const start = pointAtProgress(track.path, metrics, 0.02);
    px = start.x + start.nx * -1.2;
    pz = start.z + start.nz * -1.2;
    heading = start.heading;
    speed = 0;
    steering = 0;
    cameraHeading = heading;
    camX = px - Math.sin(heading) * 9;
    camY = 3.7;
    camZ = pz - Math.cos(heading) * 9;
    progress = 0.02;
    lastProgress = progress;
    crossedMid = false;
    driftX=driftZ=yawKick=impactT=impactStrength=damage=collisionCount=invuln=0;lastCollision=null;
    if (playerMesh) {
      playerMesh.position.set(px, 0.055, pz);
      playerMesh.rotation.y = heading;
      playerMesh.visible = true;
    }
  }

  function hud() {
    const pos = racePosition();
    const itemLabel = heldItem ? labelPower(heldItem) : '—';
    const spd = Math.round(Math.abs(speed) * 3.6);
    updateActionUI();
    onHud?.({
      score,
      lives,
      extra: `${tCopy.games?.race ? '' : ''}${raceCopy.lap || 'Lap'} ${Math.min(lap, track.laps)}/${track.laps} · #${pos} · ${spd} km/h · ${itemLabel}`
    });
  }

  function racePosition() {
    const playerScore = (lap - 1) + progress;
    let better = 0;
    for (const ai of aiCars) {
      const aiScore = (ai.lap - 1) + ai.progress;
      if (aiScore > playerScore + 1e-4) better++;
    }
    return better + 1;
  }

  function inputThrottle() {
    return (keys.throttle ? 1 : 0) || touch.throttle;
  }
  function inputBrake() {
    return (keys.brake ? 1 : 0) || touch.brake;
  }
  function inputSteer() {
    let s = 0;
    if (keys.left) s -= 1;
    if (keys.right) s += 1;
    if (touch.steer) s += touch.steer;
    return Math.max(-1, Math.min(1, s));
  }

  function tell(text){notice=text;noticeT=2.8;hud();}
  function updateActionUI(){
    if(!touchEl)return;
    const item=touchEl.querySelector('[data-touch=item]'),skill=touchEl.querySelector('[data-touch=skill]');
    const signature=heldItem||'empty';
    if(item.dataset.item!==signature){item.dataset.item=signature;item.innerHTML=heldItem?`<img src="${itemIcon(heldItem)}" alt=""><span>${esc(labelPower(heldItem))}</span><small>${esc(raceCopy.itemReady)}</small>`:`<span>＋</span><small>${esc(raceCopy.emptyItem)}</small>`;}
    item.disabled=!heldItem||!running;item.setAttribute('aria-label',heldItem?labelPower(heldItem)+' · '+raceCopy.itemReady:raceCopy.emptyItem);
    const label=raceCopy.skills[carDef.skill],status=skillT>0?skillT.toFixed(1)+'s':skillCooldown>0?Math.ceil(skillCooldown)+'s':raceCopy.ready;
    const signatureSkill=label+status;if(skill.dataset.signature!==signatureSkill){skill.dataset.signature=signatureSkill;skill.innerHTML=`<span>✦ ${esc(label)}</span><small>${esc(status)} · F</small>`;}skill.disabled=skillCooldown>0||!running;skill.dataset.skill=carDef.skill;skill.dataset.active=String(skillT>0);skill.setAttribute('aria-label',label+' · '+status);
    if(raceUI){let effects=raceUI.querySelector('.race-effect-status');if(!effects){effects=document.createElement('div');effects.className='race-effect-status';effects.setAttribute('role','status');raceUI.append(effects);}
      effects.textContent=[noticeT>0?notice:'',boostT>0?raceCopy.effects.boost+' '+boostT.toFixed(1)+'s':'',shieldT>0?raceCopy.effects.shield+' '+shieldT.toFixed(1)+'s':'',magnetT>0?raceCopy.effects.magnet+' '+magnetT.toFixed(1)+'s':'',oilT>0?raceCopy.effects.oil:'',surfaceKind!=='road'?raceCopy.surface[surfaceKind]:''].filter(Boolean).join(' · ');
    }
  }
  function burst(x,z,type='rocket'){
    if(!graphics.ok||!fxGroup)return;
    particles.push(...spawnParticleBurst(fxGroup,new THREE.Vector3(x,.8,z),{count:14,color:POWER_COLORS[type]||0xaaf7ff,speed:5,life:.7,size:.11}));
  }
  function initPlayerFx(){
    if(!graphics.ok||!playerMesh)return;
    playerFx=new THREE.Group();playerMesh.add(playerFx);
    const shield=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0x62dfff,transparent:true,opacity:.23,wireframe:true,depthWrite:false}));shield.position.y=.75;shield.scale.set(1.5,1.25,2.7);playerFx.add(shield);
    const flames=[];for(const side of [-1,1]){const f=new THREE.Mesh(new THREE.ConeGeometry(.22,1.7,12),new THREE.MeshBasicMaterial({color:0xffb434,transparent:true,opacity:.9,depthWrite:false}));f.position.set(side*.48,.35,-2.7);f.rotation.x=-Math.PI/2;playerFx.add(f);flames.push(f);}
    const magnet=new THREE.Group();for(const radius of [2.4,4]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,6,48),new THREE.MeshBasicMaterial({color:0xec688e,transparent:true,opacity:.65,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.1;magnet.add(ring);}const icon=makeRaceItemMesh('magnet');icon.scale.setScalar(.6);icon.position.y=1.8;magnet.add(icon);playerFx.add(magnet);
    const special=new THREE.Mesh(new THREE.TorusGeometry(2,.09,8,48),new THREE.MeshBasicMaterial({color:0x83ffe1,transparent:true,opacity:.8,depthWrite:false}));special.rotation.x=Math.PI/2;special.position.y=.2;playerFx.add(special);
    playerFx.userData={shield,flames,magnet,special};updatePlayerFx();
  }
  function updatePlayerFx(){
    if(!playerFx)return;const f=playerFx.userData;
    f.shield.visible=shieldT>0||(skillT>0&&carDef.skill==='armor');
    for(const flame of f.flames){flame.visible=boostT>0||(skillT>0&&carDef.skill==='overdrive');flame.scale.y=.8+Math.sin(raceTime*39)*.2;}
    f.magnet.visible=magnetT>0;f.magnet.rotation.y=raceTime*1.8;
    f.special.visible=skillT>0;f.special.scale.setScalar(carDef.skill==='pulse'?1+(carDef.skillDuration-skillT)*7:1+Math.sin(raceTime*7)*.1);
  }
  function useSkill(){
    if(!running||phase!=='racing'||skillCooldown>0)return false;
    skillT=carDef.skillDuration;skillCooldown=carDef.skillCooldown;
    if(carDef.skill==='pulse'){for(const ai of aiCars)if(Math.hypot(ai.x-px,ai.z-pz)<22){if(hitRival(ai,'pulse'))attackHits++;burst(ai.x,ai.z,'shield');}}
    if(carDef.skill==='hop'){oilT=0;driftX=driftZ=0;}
    burst(px,pz,'shield');tell(raceCopy.skills[carDef.skill]+' · '+raceCopy.used);updatePlayerFx();return true;
  }
  function addHazard(kind,x,z,radius=2.5){
    let mesh=null;
    if(graphics.ok){if(kind==='banana'){mesh=makeRaceItemMesh(kind);mesh.scale.setScalar(1.5);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.15,z);}else{mesh=new THREE.Group();const puddle=new THREE.Mesh(new THREE.CircleGeometry(radius,32),new THREE.MeshStandardMaterial({color:kind==='oil'?0x252630:0x43bee1,transparent:true,opacity:.8,roughness:.18,metalness:.2,side:THREE.DoubleSide}));puddle.rotation.x=-Math.PI/2;mesh.add(puddle);for(const r of [.45,.8]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*r,.035,6,32),new THREE.MeshBasicMaterial({color:kind==='oil'?0x7d6a9b:0xc1f5ff,transparent:true,opacity:.6}));ring.rotation.x=Math.PI/2;ring.position.y=.02;mesh.add(ring);}mesh.position.set(x,.075,z);}fxGroup.add(mesh);}
    hazards.push({kind,x,z,radius,mesh,life:12,age:0,hits:new Set(),playerHit:false});
  }
  function useHeldItem(){
    if(!heldItem||phase!=='racing'||!running)return false;
    const type=heldItem;heldItem=null;usedItems++;try{audio?.powerup?.();}catch{}
    if(type==='boost')boostT=D.boostDuration;
    else if(type==='shield')shieldT=D.shieldDuration;
    else if(type==='magnet')magnetT=D.magnetDuration;
    else if(type==='oil'||type==='banana'){
      const rear=aiCars.filter(ai=>{const delta=(progress-ai.progress+1)%1;return delta*metrics.total<80;}).sort((a,b)=>Math.hypot(a.x-px,a.z-pz)-Math.hypot(b.x-px,b.z-pz))[0];
      const p=pointAtProgress(track.path,metrics,progress-5/metrics.total),lateral=type==='banana'&&rear?rear.lat:(px-p.x)*p.nx+(pz-p.z)*p.nz;
      addHazard(type,p.x+p.nx*lateral,p.z+p.nz*lateral);
    }
    else{
      const mesh=graphics.ok?makeRaceItemMesh(type):null;
      const ahead=pointAtProgress(track.path,metrics,progress+22/metrics.total);
      const candidates=aiCars.filter(ai=>{let delta=ai.progress-progress;if(delta<0)delta++;return delta*metrics.total<220&&Math.hypot(ai.x-px,ai.z-pz)<190;}).sort((a,b)=>Math.hypot(a.x-px,a.z-pz)-Math.hypot(b.x-px,b.z-pz));
      const targetAi=type==='splash'&&candidates[0]&&Math.hypot(candidates[0].x-px,candidates[0].z-pz)<90?candidates[0]:null;
      const landing=targetAi?pointAtProgress(track.path,metrics,targetAi.progress+targetAi.speed*.7/metrics.total):ahead;
      const projectile={kind:type,x:px+Math.sin(heading)*3,z:pz+Math.cos(heading)*3,vx:Math.sin(heading)*90,vz:Math.cos(heading)*90,mesh,life:4,age:0,target:type==='rocket'?candidates[0]:null,endX:landing.x+landing.nx*(targetAi?.lat||0),endZ:landing.z+landing.nz*(targetAi?.lat||0),startX:px,startZ:pz};
      if(mesh){mesh.position.set(projectile.x,.9,projectile.z);mesh.rotation.x=Math.PI/2;fxGroup.add(mesh);}projectiles.push(projectile);
    }
    burst(px,pz,type);tell(labelPower(type)+' · '+raceCopy.used);updatePlayerFx();return true;
  }
  function updateCombat(dt){
    projectiles=projectiles.filter(p=>{
      p.life-=dt;p.age+=dt;const previousX=p.x,previousZ=p.z;
      if(p.kind==='splash'){
        const f=Math.min(1,p.age/.7);p.x=p.startX+(p.endX-p.startX)*f;p.z=p.startZ+(p.endZ-p.startZ)*f;
        if(p.mesh)p.mesh.position.set(p.x,.3+Math.sin(f*Math.PI)*3,p.z);
        if(f===1){addHazard('splash',p.x,p.z,3.5);burst(p.x,p.z,'splash');disposeItem(p.mesh);return false;}
      }else{
        if(p.target){const dx=p.target.x-p.x,dz=p.target.z-p.z,len=Math.hypot(dx,dz)||1;p.vx=dx/len*90;p.vz=dz/len*90;}
        p.x+=p.vx*dt;p.z+=p.vz*dt;
        if(p.mesh){p.mesh.position.set(p.x,.85,p.z);p.mesh.rotation.y=Math.atan2(p.vx,p.vz);}
        for(const ai of aiCars)if(segmentDistance(previousX,previousZ,p.x,p.z,ai.x,ai.z)<2.8){const success=hitRival(ai,'rocket');if(success)attackHits++;burst(ai.x,ai.z,'rocket');tell(success?raceCopy.hit:raceCopy.blocked);disposeItem(p.mesh);return false;}
      }
      if(p.life<=0){disposeItem(p.mesh);return false;}return true;
    });
    hazards=hazards.filter(h=>{
      h.life-=dt;h.age+=dt;if(h.life<=0){disposeItem(h.mesh);return false;}
      if(h.age>1&&!h.playerHit&&Math.hypot(px-h.x,pz-h.z)<h.radius+1){h.playerHit=true;if(shieldT>0){shieldT=0;tell(raceCopy.blocked);}else if(!(skillT>0&&['armor','hop'].includes(carDef.skill))){oilT=D.oilDuration;speed*=.55;driftX=Math.cos(heading)*4;driftZ=-Math.sin(heading)*4;yawKick=.65;}}
      for(const ai of aiCars)if(!h.hits.has(ai)&&Math.hypot(ai.x-h.x,ai.z-h.z)<h.radius+1){h.hits.add(ai);const success=hitRival(ai,h.kind);if(success)attackHits++;burst(ai.x,ai.z,h.kind);tell(success?raceCopy.hit:raceCopy.blocked);}
      return true;
    });
  }

  function physicsStep(dt) {
    if (!running || ended || phase !== 'racing') return;
    raceTime += dt;
    skillT=Math.max(0,skillT-dt);skillCooldown=Math.max(0,skillCooldown-dt);noticeT=Math.max(0,noticeT-dt);
    impactT=Math.max(0,impactT-dt);
    heading+=yawKick*dt;yawKick*=Math.exp(-dt*5);
    driftX*=Math.exp(-dt*3);driftZ*=Math.exp(-dt*3);
    invuln = Math.max(0, invuln - dt * 1000);
    boostT = Math.max(0, boostT - dt);
    shieldT = Math.max(0, shieldT - dt);
    oilT = Math.max(0, oilT - dt);
    magnetT = Math.max(0, magnetT - dt);

    const proj = projectOnPath(track.path, metrics, px, pz);
    const onTrack = proj.dist <= track.width * 0.55;
    surfaceKind=surfaceAt(track,metrics,proj,px,pz);
    const terrainFactor=skillT>0&&carDef.skill==='trailGrip'?1:SURFACE_FACTOR[surfaceKind];
    const cornerFocus=skillT>0&&carDef.skill==='cornerFocus',drsActive=skillT>0&&carDef.skill==='drs';
    const gripMul=(onTrack?1:D.offTrackSlow)*(oilT>0?.35:1)*carDef.grip*Math.max(.45,terrainFactor)*(cornerFocus?1.4:drsActive?1.2:1);
    const top=Math.min(carDef.speedCap||Infinity,carDef.topSpeed*(onTrack?1:.7)*terrainFactor*(boostT>0?1.35:1));
    const thr = inputThrottle();
    const brk = inputBrake();
    const steerIn = inputSteer();

    if (thr > 0) {
      speed += carDef.accel*.62*thr*dt/carDef.mass*terrainFactor*(boostT>0?1.65:1)*(skillT>0&&carDef.skill==='overdrive'?1.85:drsActive?1.25:1);
    } else {
      speed *= Math.pow(drsActive?.94:.7, dt); // coast friction
    }
    if (brk > 0) {
      if (speed > 0.8) speed -= carDef.brake * brk * dt;
      else speed -= carDef.brake * 0.35 * brk * dt; // light reverse
    }
    speed = Math.max(-carDef.topSpeed * 0.25, Math.min(top, speed));

    // With +Z forward, positive yaw turns LEFT in the chase camera.
    // Smooth key presses, return promptly to neutral, and keep corners reachable at speed.
    steering += (steerIn - steering) * (1 - Math.exp(-dt * (steerIn ? 12 : 18)));
    const speedRatio = Math.min(1, Math.abs(speed) / carDef.topSpeed);
    const steerRate = carDef.handling * (1 - speedRatio * 0.6) * gripMul;
    heading -= steering * steerRate * dt * Math.sign(speed) * Math.min(1, Math.abs(speed) / 6);

    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    px += (forwardX * speed+driftX) * dt;
    pz += (forwardZ * speed+driftZ) * dt;

    for(const obstacle of track.obstacles||[]){
      if(skillT>0&&carDef.skill==='hop')continue;
      const p=pointAtProgress(track.path,metrics,obstacle.s),ox=p.x+p.nx*obstacle.lateral,oz=p.z+p.nz*obstacle.lateral,dx=px-ox,dz=pz-oz,len=Math.hypot(dx,dz),radius=obstacle.radius+support(carDef,heading,dx/(len||1),dz/(len||1));
      if(len<radius){const nx=dx/(len||1),nz=dz/(len||1),strength=Math.abs(speed);px=ox+nx*radius;pz=oz+nz*radius;speed*=.3;driftX+=nx*2;driftZ+=nz*2;impact('obstacle',strength,ox,oz);}
    }
    // Physical guardrails preserve tangential momentum; no magnetic pull to the road.
    const contact=barrierContact(playerBody(),projectOnPath(track.path,metrics,px,pz),track.width);
    if(contact){
      px=contact.x;pz=contact.z;acceptVelocity(contact.vx,contact.vz);
      if(contact.impact>1){yawKick+=(Math.cos(heading)*contact.nx-Math.sin(heading)*contact.nz)*Math.min(.65,contact.impact*.025);}
      impact('barrier',contact.impact,contact.contactX,contact.contactZ);
    }

    const proj2 = projectOnPath(track.path, metrics, px, pz);
    progress = proj2.s;
    const delta = wrapDelta(progress, lastProgress);
    if (metrics.total > 0) distance += Math.abs(delta) * metrics.total;
    // Mid-track checkpoint prevents finish-line cheese.
    if (progress > 0.4 && progress < 0.6) crossedMid = true;
    // Lap complete when crossing the finish forward after the mid checkpoint.
    if (crossedMid && lastProgress > 0.75 && progress < 0.25 && speed >= -0.5) {
      lap += 1;
      crossedMid = false;
      score += 500 + Math.floor(Math.max(0, metrics.total*track.laps/18 - raceTime) * 8);
      try { audio?.correct?.(); } catch {}
      if (lap > track.laps) {
        lastProgress = progress;
        return finish(true);
      }
    }
    lastProgress = progress;

    // items
    for (const it of items) {
      if (!it.alive) {
        it.respawn -= dt;
        if (it.respawn <= 0) {
          it.alive = true;
          it.drawX=it.x;it.drawZ=it.z;if (it.mesh) {it.mesh.visible = true;it.mesh.position.set(it.x,.7,it.z);}
        }
        continue;
      }
      const ip = pointAtProgress(track.path, metrics, it.s);
      const ix = ip.x + ip.nx * it.lateral;
      const iz = ip.z + ip.nz * it.lateral;
      const attract=magnetT>0&&Math.hypot(px-ix,pz-iz)<18;
      const factor=Math.min(1,dt*(attract?12:5));it.drawX+=((attract?px:ix)-it.drawX)*factor;it.drawZ+=((attract?pz:iz)-it.drawZ)*factor;
      if(it.mesh){it.mesh.position.x=it.drawX;it.mesh.position.z=it.drawZ;}
      const mx=it.drawX,mz=it.drawZ;
      if (!heldItem && Math.hypot(px - mx, pz - mz) < 2.2) {
        it.alive = false;
        it.respawn = Math.max(D.spawnIntervalMin, D.itemRespawn);
        if (it.mesh) it.mesh.visible = false;
        heldItem = it.type;notice=labelPower(it.type)+' · '+raceCopy.itemReady;noticeT=3;
        score += 40;
        try { audio?.powerup?.(); } catch {}
        if (fxGroup && graphics.ok) {
          particles = particles.concat(spawnParticleBurst(fxGroup, new THREE.Vector3(mx, 0.8, mz), {
            count: 8, color: POWER_COLORS[it.type], speed: 3, life: 0.35, size: 0.1
          }));
        }
      }
      if (it.mesh && it.alive) {
        it.mesh.position.y = 0.7 + Math.sin(raceTime * 4 + it.s * 10) * 0.15;
        it.mesh.rotation.y += dt * 2;
      }
    }

    updateCombat(dt);

    // Rivals slow for upcoming bends and carry impulse momentum after contact.
    for(const ai of aiCars){
      advanceRivalStatus(ai,dt);
      const current=pointAtProgress(track.path,metrics,ai.progress),ahead=pointAtProgress(track.path,metrics,ai.progress+24/metrics.total);
      const bend=Math.abs(Math.atan2(Math.sin(ahead.heading-current.heading),Math.cos(ahead.heading-current.heading)));
      const aiSurface=surfaceAt(track,metrics,{...current,s:ai.progress},ai.x,ai.z);
      const targetSpeed=ai.def.topSpeed*(.72-Math.min(.36,bend*.4))*(ai.slowT>0?.38:1)*SURFACE_FACTOR[aiSurface];
      if(ai.stunT>0)ai.speed=0;else ai.speed+=(targetSpeed-ai.speed)*Math.min(1,dt*.8);
      if(ai.slipT>0)ai.lateralVelocity+=Math.sin(raceTime*9)*dt*9;
      for(const obstacle of track.obstacles||[]){const aheadDistance=((obstacle.s-ai.progress+1)%1)*metrics.total;if(aheadDistance<45&&Math.abs(ai.lat-obstacle.lateral)<obstacle.radius+1.6)ai.lat+=(Math.sign(-obstacle.lateral)*track.width*.24-ai.lat)*Math.min(1,dt*3);}
      ai.lateralVelocity*=Math.exp(-dt*4);ai.lat=Math.max(-track.width*.3,Math.min(track.width*.3,ai.lat+ai.lateralVelocity*dt));
      const prev=ai.progress;ai.progress=(ai.progress+ai.speed*dt/metrics.total+1)%1;
      if(prev>.8&&ai.progress<.2)ai.lap++;ai.s=ai.progress;
      const p=pointAtProgress(track.path,metrics,ai.progress);ai.x=p.x+p.nx*ai.lat;ai.z=p.z+p.nz*ai.lat;ai.heading=p.heading;
      const other={x:ai.x,z:ai.z,heading:p.heading,car:ai.def,vx:p.tx*ai.speed+p.nx*ai.lateralVelocity,vz:p.tz*ai.speed+p.nz*ai.lateralVelocity};
      const hit=carContact(playerBody(),other);
      if(hit){
        const share=ai.def.mass/(carDef.mass+ai.def.mass);
        px-=hit.nx*hit.depth*share;pz-=hit.nz*hit.depth*share;
        ai.lat+=(hit.nx*p.nx+hit.nz*p.nz)*hit.depth*(1-share);
        ai.progress=(ai.progress+(hit.nx*p.tx+hit.nz*p.tz)*hit.depth*(1-share)/metrics.total+1)%1;
        acceptVelocity(hit.avx,hit.avz);
        ai.speed=hit.bvx*p.tx+hit.bvz*p.tz;ai.lateralVelocity=hit.bvx*p.nx+hit.bvz*p.nz;
        yawKick+=(Math.cos(heading)*hit.nx-Math.sin(heading)*hit.nz)*Math.min(.8,hit.impact*.035);
        impact('car',hit.impact,(px+ai.x)/2,(pz+ai.z)/2);
      }
      if(ai.mesh){ai.mesh.position.set(ai.x,.055,ai.z);ai.mesh.rotation.y=p.heading+(ai.slipT>0?Math.sin(raceTime*9)*.35:0);updateRaceCar(ai.mesh,{speed:ai.speed,steering:-bend*.5,brake:ai.speed>targetSpeed+2,dt});}
    }
    // Resolve a car push against the rail in the same frame, even during damage cooldown.
    const finalContact=barrierContact(playerBody(),projectOnPath(track.path,metrics,px,pz),track.width);
    if(finalContact){px=finalContact.x;pz=finalContact.z;acceptVelocity(finalContact.vx,finalContact.vz);impact('barrier',finalContact.impact,finalContact.contactX,finalContact.contactZ);}
    if(playerMesh){
      playerMesh.position.set(px,skillT>0&&carDef.skill==='hop'?.45+Math.abs(Math.sin(raceTime*7))*.6:.055,pz);playerMesh.rotation.y=heading;playerMesh.visible=true;
      updateRaceCar(playerMesh,{speed,steering,brake:brk,drs:drsActive,impact:reducedMotion?0:impactT,damage,dt});
      skidClock+=dt;
      if((brk&&speed>12||Math.hypot(driftX,driftZ)>2)&&skidClock>.045){
        for(const side of [-1,1]){const mark=skidPool[skidIndex++%skidPool.length];mark.visible=true;mark.position.set(px+Math.cos(heading)*side*.91-Math.sin(heading)*1.35,.055,pz-Math.sin(heading)*side*.91-Math.cos(heading)*1.35);mark.rotation.set(-Math.PI/2,0,-heading);mark.scale.y=Math.max(.25,Math.abs(speed)*skidClock);}
        skidClock=0;
      }else if(skidClock>.1)skidClock=0;
    }
    surfaceFxClock+=dt;
    if(graphics.ok&&surfaceKind!=='road'&&Math.abs(speed)>4&&surfaceFxClock>.15){surfaceFxClock=0;particles.push(...spawnParticleBurst(fxGroup,new THREE.Vector3(px,.18,pz),{count:reducedMotion?2:5,color:surfaceKind==='water'?0xa1ecff:surfaceKind==='mud'?0x9a714c:0x93b666,speed:2,life:.35,size:.045}));}
    updatePlayerFx();
    updateRaceUI();
    if(lives<=0)return finish(false);

    score = Math.max(score, Math.floor(distance * 0.5 + raceTime * 2));
    particles = updateParticles(particles, dt, fxGroup);
    hud();
  }

  // Bound contact integration independently of rendering and externally supplied dt.
  function tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const steps=Math.ceil(Math.min(dt,.25)/(1/60)),step=Math.min(dt,.25)/steps;
    for(let i=0;i<steps;i++)physicsStep(step);
  }

  function finish(cleared) {
    ended = true;
    running = false;
    phase = 'ended';
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unmountTouch();
    const detail = cleared
      ? `${raceCopy.lap || 'Lap'} ${track.laps} · ${raceTime.toFixed(1)}s · #${racePosition()}`
      : `${raceCopy.dnf || 'DNF'} · ${raceTime.toFixed(1)}s`;
    if (cleared) {
      try { audio?.victory?.(); } catch {}
    }
    hud();
    onEnd?.({cleared, score, detail});
  }

  function draw(dt = 1 / 60) {
    if (!graphics.ok || !playerMesh) return;
    const {camera, renderer, scene} = graphics;
    const angleDelta = Math.atan2(Math.sin(heading - cameraHeading), Math.cos(heading - cameraHeading));
    cameraHeading += angleDelta * (1 - Math.exp(-8 * dt));
    const follow = 1 - Math.exp(-12 * dt);
    const back = 9 + Math.min(2, Math.abs(speed) * 0.035);
    camX += (px - Math.sin(cameraHeading) * back - camX) * follow;
    camY += (3.7 + Math.abs(speed) * 0.012 - camY) * follow;
    camZ += (pz - Math.cos(cameraHeading) * back - camZ) * follow;
    const shake=reducedMotion?0:Math.min(impactT,.3)*impactStrength;
    camera.position.set(camX+Math.sin(raceTime*89)*shake,camY+Math.cos(raceTime*73)*shake*.6,camZ);
    const sun=worldGroup?.userData.sun;if(sun){sun.position.set(px-45,65,pz-30);sun.target.position.set(px,0,pz);sun.target.updateMatrixWorld();}
    worldGroup?.userData.dome?.position.set(px,0,pz);
    camera.lookAt(px + Math.sin(cameraHeading) * 9, 1.5, pz + Math.cos(cameraHeading) * 9);
    renderer.render(scene, camera);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw(dt);
    if (running) raf = requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    const k = ({KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyE:'e',KeyF:'f',Space:' '})[e.code] || e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.throttle = true; e.preventDefault(); }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.brake = true; e.preventDefault(); }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
    if (k === ' ' || k === 'e' || k === 'E') { if(!e.repeat)useHeldItem(); e.preventDefault(); }
    if(k==='f'||k==='F'){if(!e.repeat)useSkill();e.preventDefault();}
  }
  function onKeyUp(e) {
    const k = ({KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',KeyE:'e',Space:' '})[e.code] || e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.throttle = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.brake = false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  }
  function clearInput() {
    for (const key of Object.keys(keys)) keys[key] = false;
    touch.throttle = touch.brake = touch.steer = 0;
    steering = 0;
    touchEl?._raceHandlers?.pointers.clear();
    touchEl?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  }
  function onVisibility() { if (document.hidden) clearInput(); }
  function onResize() { resizeArcade3D(graphics, canvas); }

  function bind() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    window.addEventListener('blur', clearInput);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  }
  function unbind() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('blur', clearInput);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  }

  function beginRace() {
    clearInput();
    unmountLobby();
    track = getRaceTrack(selectedTrackId);
    carDef = getRaceCar(selectedCarId);
    metrics = buildPathMetrics(track.path);
    buildScene();
    spawnItems();
    spawnAi();
    resetPlayerPose();
    lap = 1;
    lives = D.lives;
    score = 0;
    raceTime = 0;
    distance = 0;
    boostT = shieldT = oilT = magnetT = 0;
    heldItem = null;
    skillT=skillCooldown=attackHits=usedItems=noticeT=surfaceFxClock=0;notice="";projectiles=[];surfaceKind="road";
    hazards = [];
    particles = [];
    ended = false;
    phase = 'racing';
    mountTouch();
    mountRaceUI();
    running = true;
    updateActionUI();
    last = performance.now?.() || 0;
    hud();updatePlayerFx();
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }

  function start() {
    // retry / explicit start
    raceUI?.remove();raceUI=null;
    unmountTouch();
    unmountLobby();
    ended = false;
    running = false;
    phase = 'lobby';
    if (shouldShowLobby() && !(trackId && carId)) {
      mountLobby();
      // keep a static preview scene
      track = getRaceTrack(selectedTrackId);
      carDef = getRaceCar(selectedCarId);
      metrics = buildPathMetrics(track.path);
      buildScene();
      resetPlayerPose();
      draw();
      return;
    }
    beginRace();
  }

  function pause() {
    clearInput();
    running = false;
    updateActionUI();
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
  }
  function resume() {
    if (ended || phase !== 'racing') return;
    running = true;
    last = performance.now?.() || 0;
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  }
  function destroy() {
    running = false;
    typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(raf);
    unbind();
    raceUI?.remove();raceUI=null;
    unmountLobby();
    unmountTouch();
    if (graphics.ok) disposeRaceScene(graphics.scene);
    disposeArcade3D(graphics);
  }

  /** Test / external control hook. */
  function setControls({throttle = 0, brake = 0, steer = 0} = {}) {
    keys.throttle = throttle > 0.1;
    keys.brake = brake > 0.1;
    keys.left = steer < -0.1;
    keys.right = steer > 0.1;
  }

  bind();
  // Initial setup: headless / defaults skip lobby
  if (autoStart) {
    if (shouldShowLobby() && !(trackId && carId)) {
      mountLobby();
      track = getRaceTrack(selectedTrackId);
      carDef = getRaceCar(selectedCarId);
      metrics = buildPathMetrics(track.path);
      buildScene();
      resetPlayerPose();
      draw();
    } else {
      beginRace();
    }
  } else {
    // prepare defaults without running
    track = getRaceTrack(selectedTrackId);
    carDef = getRaceCar(selectedCarId);
    metrics = buildPathMetrics(track.path);
    buildScene();
    resetPlayerPose();
  }

  return {
    start,
    pause,
    resume,
    destroy,
    tick,
    draw,
    setControls,
    useItem: useHeldItem,
    useSkill,
    getState: () => ({
      difficulty:D,
      lane: 0,
      lives,
      score,
      distance,
      speed,
      heading,
      x: px, z: pz, steering,
      trackLength:metrics.total,damage,collisionCount,lastCollision,impactT,particleCount:particles.length,
      rivals:aiCars.map(a=>({x:a.x,z:a.z,speed:a.speed,heading:a.heading,progress:a.progress,slowT:a.slowT,stunT:a.stunT,slipT:a.slipT,hitCount:a.hitCount,lastHit:a.lastHit})),
      lap,
      progress,
      trackId: track.id,
      carId: carDef.id,
      heldItem,skill:carDef.skill,skillT,skillCooldown,usedItems,attackHits,surface:surfaceKind,
      effects:{boost:boostT,shield:shieldT,magnet:magnetT,slip:oilT},
      pickups:items.map(it=>({type:it.type,x:it.x,z:it.z,s:it.s,alive:it.alive})),
      projectiles:projectiles.map(p=>({kind:p.kind,x:p.x,z:p.z})),hazards:hazards.map(h=>({kind:h.kind,x:h.x,z:h.z,life:h.life})),
      phase,
      cars: aiCars.length,
      ended,
      gl: graphics.ok
    })
  };
}
