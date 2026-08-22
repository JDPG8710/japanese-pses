/**
 * GalaxyEngine.js - 3D知識星図とテーマ背景の描画エンジン
 * 
 * 1. 6教科の3D星雲
 * 2. 星雲内の学習単元を結ぶ経路
 * 3. 学習単元名の3Dラベル
 * 4. 中心星、レスポンシブ表示、タッチ操作
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FULL_CURRICULUM_DAG, SUBJECT_METADATA } from './CurriculumData.js';

export class GalaxyEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.nodes = options.nodes || FULL_CURRICULUM_DAG;
    this.subjectMetadata = options.subjectMetadata || SUBJECT_METADATA;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;
    this.isMobile = window.innerWidth <= 768;
    this.currentGradeFilter = 0; // 0 = 全学年
    this.currentSubjectFilter = null; // null = 全教科
    this.backgroundTheme = 'GALAXY';

    this.initScene();
    this.createNucleus();
    this.create3DNebulaeAndCurriculumNodes();
    this.setBackgroundTheme(this.backgroundTheme);
    this.setupInteractions();
    this.setupResponsive();
    this.animate();
  }

  updateCurriculumData(nodes, metadata) {
    if (nodes) this.nodes = nodes;
    if (metadata) this.subjectMetadata = metadata;
    if (this.nebulaGroup) this.scene.remove(this.nebulaGroup);
    if (this.constellationGroup) this.scene.remove(this.constellationGroup);
    if (this.nodeGroup) this.scene.remove(this.nodeGroup);
    this.create3DNebulaeAndCurriculumNodes();
    this.nebulaGroup.visible = this.backgroundTheme === 'GALAXY';
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020208, 0.0012);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 3000);
    this.camera.position.set(0, 200, 260);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 800;
    this.controls.minDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
  }

  disposeObject(group) {
    group?.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
      else object.material?.dispose?.();
    });
  }

  // 背景は外部画像を使わず手続き的に描画し、即時切り替えと全テーマでの操作を可能にする。
  setBackgroundTheme(theme = 'GALAXY') {
    const nextTheme = ['GALAXY', 'FOREST', 'CITY'].includes(theme) ? theme : 'GALAXY';
    this.backgroundTheme = nextTheme;
    if (this.backgroundGroup) {
      this.scene.remove(this.backgroundGroup);
      this.disposeObject(this.backgroundGroup);
    }
    this.backgroundGroup = new THREE.Group();
    this.nebulaGroup.visible = nextTheme === 'GALAXY';
    this.constellationGroup.visible = true;

    const presets = {
      GALAXY: { color: 0x020208, fog: 0x020208, density: 0.0012 },
      FOREST: { color: 0x061b19, fog: 0x061b19, density: 0.0022 },
      CITY: { color: 0x070b1e, fog: 0x070b1e, density: 0.0018 }
    };
    const preset = presets[nextTheme];
    this.scene.background = new THREE.Color(preset.color);
    this.scene.fog = new THREE.FogExp2(preset.fog, preset.density);

    if (nextTheme === 'FOREST') this.createForestBackground(this.backgroundGroup);
    if (nextTheme === 'CITY') this.createCityBackground(this.backgroundGroup);
    this.scene.add(this.backgroundGroup);
    // 背景だけでなく、学習ノードも星・木・都市のランドマークへ再構成する。
    if (this.nodeGroup) this.renderNodeMeshesAndSprites();
  }

  createForestBackground(group) {
    const trunkMat = new THREE.MeshBasicMaterial({ color: 0x5b341b });
    const foliageMats = [0x0f766e, 0x15803d, 0x166534].map(color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(480, 48), new THREE.MeshBasicMaterial({ color: 0x052e27, transparent: true, opacity: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -48;
    group.add(ground);
    for (let i = 0; i < 58; i++) {
      const x = (Math.random() - 0.5) * 680;
      const z = -140 - Math.random() * 340;
      const height = 35 + Math.random() * 75;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, height * 0.38, 7), trunkMat);
      trunk.position.y = -38 + height * 0.19;
      tree.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(height * 0.22, height * 0.72, 9), foliageMats[i % foliageMats.length]);
      crown.position.y = -38 + height * 0.68;
      tree.add(crown);
      tree.position.set(x, 0, z);
      group.add(tree);
    }
    const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 20), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
    moon.position.set(-180, 180, -350);
    group.add(moon);
  }

  createCityBackground(group) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ color: 0x0b1026, transparent: true, opacity: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    group.add(ground);
    const colors = [0x0f2b55, 0x1d2d6b, 0x2b1d5a, 0x123e5a];
    for (let i = 0; i < 64; i++) {
      const width = 14 + Math.random() * 28;
      const height = 35 + Math.random() * 130;
      const depth = 14 + Math.random() * 28;
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
      building.position.set((Math.random() - 0.5) * 620, -50 + height / 2, -100 - Math.random() * 380);
      group.add(building);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x67e8f9 : 0xfbbf24 }));
      beacon.position.set(building.position.x, building.position.y + height / 2 + 2, building.position.z);
      group.add(beacon);
    }
  }

  createThemeNodeMesh(node) {
    const statusColor = node.status === 'LOCKED' ? 0x64748b : (node.status === 'CLEARED' ? 0xfacc15 : 0x38bdf8);
    if (this.backgroundTheme === 'FOREST') {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 4, 7), new THREE.MeshBasicMaterial({ color: 0x7c3f1d }));
      trunk.position.y = 1.6;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.6, 7.5, 9), new THREE.MeshBasicMaterial({ color: statusColor, transparent: true, opacity: node.status === 'LOCKED' ? 0.55 : 0.95 }));
      crown.position.y = 6.1;
      tree.add(trunk, crown);
      tree.userData = { nodeInfo: node, isPulse: node.status === 'AVAILABLE' };
      return tree;
    }
    if (this.backgroundTheme === 'CITY') {
      const landmark = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4.8, 9, 4.8), new THREE.MeshBasicMaterial({ color: statusColor, transparent: true, opacity: node.status === 'LOCKED' ? 0.5 : 0.95 }));
      tower.position.y = 4.5;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), new THREE.MeshBasicMaterial({ color: node.status === 'CLEARED' ? 0xfef08a : 0xffffff }));
      beacon.position.y = 10.2;
      landmark.add(tower, beacon);
      landmark.userData = { nodeInfo: node, isPulse: node.status === 'AVAILABLE' };
      return landmark;
    }
    const geometry = new THREE.SphereGeometry(node.status === 'CLEARED' ? 3.0 : (node.status === 'AVAILABLE' ? 2.6 : 1.8), 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: statusColor, transparent: node.status === 'LOCKED', opacity: node.status === 'LOCKED' ? 0.5 : 1 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.userData = { nodeInfo: node, isPulse: node.status === 'AVAILABLE' };
    return sphere;
  }

  // 1. 中心星（生きる力）
  createNucleus() {
    const nucleusGroup = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(9, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    nucleusGroup.add(coreMesh);

    const pointLight = new THREE.PointLight(0xffeedd, 3.5, 400, 0.5);
    nucleusGroup.add(pointLight);

    const glowGeo = new THREE.BufferGeometry();
    const glowCount = 800;
    const glowPositions = new Float32Array(glowCount * 3);
    for (let i = 0; i < glowCount; i++) {
      const radius = 5 + Math.random() * 24;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      glowPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      glowPositions[i * 3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.4;
      glowPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    const glowMat = new THREE.PointsMaterial({
      color: 0xffe6aa,
      size: 4.5,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85
    });
    this.nucleusParticles = new THREE.Points(glowGeo, glowMat);
    nucleusGroup.add(this.nucleusParticles);

    this.scene.add(nucleusGroup);
    this.nucleus = nucleusGroup;
  }

  // 2. 6教科の3D星雲と学習単元を結ぶ経路を生成
  create3DNebulaeAndCurriculumNodes() {
    const subjectKeys = Object.keys(this.subjectMetadata || SUBJECT_METADATA);
    const numArms = subjectKeys.length;
    const particlesPerNebula = 1200;
    const armMaxRadius = 270;

    const allPositions = [];
    const allColors = [];
    this.starNodes = [];
    this.constellationLines = [];

    this.nebulaGroup = new THREE.Group();
    this.constellationGroup = new THREE.Group();

    subjectKeys.forEach((subjKey, armIndex) => {
      const meta = (this.subjectMetadata || SUBJECT_METADATA)[subjKey];
      const armBaseAngle = (armIndex / numArms) * Math.PI * 2;
      const subColor = new THREE.Color(meta.color);

      // (A) 立体的な星雲パーティクル
      for (let i = 0; i < particlesPerNebula; i++) {
        const progress = i / particlesPerNebula;
        const radius = 18 + progress * armMaxRadius;
        const spinAngle = progress * 3.6;
        const angle = armBaseAngle + spinAngle;

        // 星雲の立体的な広がり
        const spread = (1 - Math.exp(-progress * 2.2)) * 26;
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread * 0.7 * (1 - progress * 0.4);

        allPositions.push(x, y, z);

        // 中心の白から教科ごとの星雲色へ変化
        const mixedColor = new THREE.Color(0xffffff).lerp(subColor, 0.3 + progress * 0.7);
        allColors.push(mixedColor.r, mixedColor.g, mixedColor.b);
      }

      // (B) 学習単元を学年順に配置
      const subjectNodes = (this.nodes || FULL_CURRICULUM_DAG)
        .filter(n => n.subject === meta.name)
        .sort((a, b) => (a.grade || 0) - (b.grade || 0));

      const nodePositionsForThisSubject = [];

      subjectNodes.forEach((node) => {
        const gradeProgress = ((node.grade || 1) - 0.5) / 6;
        const radius = 30 + gradeProgress * (armMaxRadius - 45);
        const spinAngle = gradeProgress * 3.6;
        const angle = armBaseAngle + spinAngle;

        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 4;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 4;
        const y = (Math.random() - 0.5) * 3;

        const nodePos = new THREE.Vector3(x, y, z);
        nodePositionsForThisSubject.push(nodePos);

        this.starNodes.push({
          ...node,
          position: nodePos,
          status: node.grade === 1 || node.prerequisites.length === 0 ? 'AVAILABLE' : 'LOCKED',
          baseColor: subColor,
          hexColor: meta.hex
        });
      });

      // (C) 星雲内の学習単元を光の経路で結ぶ
      if (nodePositionsForThisSubject.length > 1) {
        const curve = new THREE.CatmullRomCurve3(nodePositionsForThisSubject, false, 'centripetal', 0.2);
        const curvePoints = curve.getPoints(60);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        
        // やわらかい半透明の発光線
        const lineMat = new THREE.LineBasicMaterial({
          color: meta.color,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          linewidth: 2
        });

        const constellationLine = new THREE.Line(lineGeo, lineMat);
        constellationLine.userData = { subject: meta.name };
        this.constellationGroup.add(constellationLine);
      }
    });

    // 3D星雲の背景パーティクルを描画
    const armGeo = new THREE.BufferGeometry();
    armGeo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    armGeo.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));

    const armMat = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85
    });

    this.armsPoints = new THREE.Points(armGeo, armMat);
    this.nebulaGroup.add(this.armsPoints);
    this.scene.add(this.nebulaGroup);
    this.scene.add(this.constellationGroup);

    this.renderNodeMeshesAndSprites();
  }

  // 3. 学習ノードと3D文字ラベルを描画
  renderNodeMeshesAndSprites() {
    if (this.nodeGroup) {
      this.scene.remove(this.nodeGroup);
    }

    this.nodeGroup = new THREE.Group();

    this.starNodes.forEach((node) => {
      // 学年フィルタリング
      if (this.currentGradeFilter > 0 && node.grade !== this.currentGradeFilter) {
        return;
      }

      // 教科フィルタリング
      if (this.currentSubjectFilter) {
        const isSubjMatch = node.subject === this.currentSubjectFilter ||
          (this.currentSubjectFilter.includes('英語') && node.subject?.includes('英語'));
        if (!isSubjMatch) return;
      }

      // 日本小学校学習指導要領の学年別教科フィルタリング (小1・小2は生活のみ、理科・社会・英語は小3〜)
      if (this.currentGradeFilter === 1 || this.currentGradeFilter === 2) {
        if (node.subject === '理科' || node.subject === '社会' || node.subject === '外国語・英語' || node.subject === '英語') {
          return; // 小1・小2では理科・社会・英語を表示しない
        }
      } else if (this.currentGradeFilter >= 3) {
        if (node.subject === '生活') {
          return; // 小3〜小6では生活科を表示しない
        }
      }

      const singleNodeGroup = new THREE.Group();
      singleNodeGroup.position.copy(node.position);

      // (A) テーマに合う学習ノードの形状
      const nodeMesh = this.createThemeNodeMesh(node);
      if (node.status === 'CLEARED' && this.backgroundTheme === 'GALAXY') {
        const ringGeo = new THREE.RingGeometry(4.0, 4.8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 3;
        nodeMesh.add(ring);
      }
      singleNodeGroup.add(nodeMesh);

      // (B) 学習ノード名の3Dラベル
      const nameSprite = this.createNameSprite(node);
      nameSprite.position.set(0, this.backgroundTheme === 'GALAXY' ? 4.5 : 12.5, 0);
      singleNodeGroup.add(nameSprite);

      this.nodeGroup.add(singleNodeGroup);
    });

    this.scene.add(this.nodeGroup);
  }

  // 習熟度を同期し、クリア済み・挑戦可能・未解放の表示を更新
  syncProgress(playerMasteryMap = {}) {
    this.starNodes.forEach((node) => {
      const mastery = playerMasteryMap[node.id] || 0;
      if (mastery >= 0.85) {
        node.status = 'CLEARED'; // クリア済み
      } else {
        const prereqs = node.prerequisites || [];
        const allPrereqsMet = prereqs.every(pId => (playerMasteryMap[pId] || 0) >= 0.85);
        node.status = (allPrereqsMet || prereqs.length === 0) ? 'AVAILABLE' : 'LOCKED'; // 挑戦可能または未解放
      }
    });
    this.renderNodeMeshesAndSprites();
  }

  // 単一ノードのクリア演出
  lightUpNode(nodeId) {
    const targetNode = this.starNodes.find(n => n.id === nodeId);
    if (targetNode) {
      targetNode.status = 'CLEARED';
      this.triggerLightingCelebration(targetNode.position);
      this.renderNodeMeshesAndSprites();
    }
  }

  triggerLightingCelebration(pos) {
    const particleCount = 40;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities.push(
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 2.5 + 1.0,
        (Math.random() - 0.5) * 2.5
      );
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 5.0,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 1.0
    });

    const celebrationPoints = new THREE.Points(geom, mat);
    this.scene.add(celebrationPoints);

    let life = 35;
    const burstAnimate = () => {
      if (life > 0) {
        life--;
        const posAttr = celebrationPoints.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          posAttr.array[i * 3] += velocities[i * 3];
          posAttr.array[i * 3 + 1] += velocities[i * 3 + 1];
          posAttr.array[i * 3 + 2] += velocities[i * 3 + 2];
        }
        posAttr.needsUpdate = true;
        mat.opacity = life / 35;
        requestAnimationFrame(burstAnimate);
      } else {
        this.scene.remove(celebrationPoints);
        geom.dispose();
        mat.dispose();
      }
    };
    burstAnimate();
  }

  // 読みやすい3Dビルボード文字を生成
  createNameSprite(node) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // カプセル型の発光背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = node.hexColor || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6, 6, 308, 68, 16);
    ctx.fill();
    ctx.stroke();

    // 年級プレフィックスと短縮名称
    const gradeTag = node.grade ? `[小${node.grade}] ` : '';
    let shortName = node.name.replace(/^[0-9一二三四五六]年\s*/, '');
    if (shortName.length > 10) shortName = shortName.slice(0, 9) + '..';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${gradeTag}${shortName}`, 160, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    // モバイルでは表示倍率を調整
    const scaleFactor = this.isMobile ? 18 : 22;
    sprite.scale.set(scaleFactor, scaleFactor * 0.25, 1);
    return sprite;
  }

  setGradeFilter(grade = 0) {
    this.currentGradeFilter = grade;
    this.renderNodeMeshesAndSprites();
  }

  setSubjectFilter(subject = null) {
    this.currentSubjectFilter = (!subject || subject === 'ALL' || subject === '全教科') ? null : subject;
    this.renderNodeMeshesAndSprites();
    this.updateConstellationHighlight();
  }

  updateConstellationHighlight() {
    if (!this.constellationGroup) return;
    this.constellationGroup.children.forEach((line) => {
      const lineSubj = line.userData?.subject;
      if (!this.currentSubjectFilter) {
        line.visible = true;
        if (line.material) line.material.opacity = 0.8;
      } else {
        const isMatch = lineSubj === this.currentSubjectFilter ||
          (this.currentSubjectFilter.includes('英語') && lineSubj?.includes('英語'));
        line.visible = isMatch;
        if (line.material) line.material.opacity = isMatch ? 1.0 : 0.2;
      }
    });
  }

  // 教科をまたぐ関連を光線で表示
  createCrossDisciplineBeam(startPos, endPos) {
    if (this.currentBeam) this.scene.remove(this.currentBeam);

    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    midPoint.y += 30.0;

    const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 3,
      gapSize: 1.5,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });

    this.currentBeam = new THREE.Line(geometry, material);
    this.currentBeam.computeLineDistances();
    this.scene.add(this.currentBeam);
  }

  setupInteractions() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = this.isMobile ? 8.0 : 4.0;
    this.mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      if (event.target.closest('#pc-detail-card') || event.target.closest('#mobile-sheet') || event.target.closest('aside') || event.target.closest('#shop-modal') || event.target.closest('#grade-tabs-container')) {
        return;
      }

      window.dispatchEvent(new CustomEvent('GALAXY_NODE_CLICK_START', { detail: { time: Date.now() } }));

      const x = event.touches ? event.touches[0].clientX : event.clientX;
      const y = event.touches ? event.touches[0].clientY : event.clientY;

      this.mouse.x = (x / window.innerWidth) * 2 - 1;
      this.mouse.y = -(y / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.nodeGroup.children, true);

      if (intersects.length > 0) {
        let targetObj = intersects[0].object;
        while (targetObj && !targetObj.userData?.nodeInfo && targetObj.parent) {
          targetObj = targetObj.parent;
        }

        const clickedNode = targetObj.userData?.nodeInfo;
        if (clickedNode) {
          window.dispatchEvent(new CustomEvent('GALAXY_NODE_SELECTED', { detail: clickedNode }));
          
          const crossNodes = this.starNodes.filter(n => n.subject !== clickedNode.subject);
          if (crossNodes.length > 0) {
            const otherNode = crossNodes[Math.floor(Math.random() * crossNodes.length)];
            this.createCrossDisciplineBeam(clickedNode.position, otherNode.position);
          }
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
  }

  setupResponsive() {
    const handleResize = () => {
      this.width = this.container.clientWidth || window.innerWidth;
      this.height = this.container.clientHeight || window.innerHeight;
      this.isMobile = window.innerWidth <= 768;

      this.camera.aspect = this.width / this.height;

      if (this.isMobile && this.height > this.width) {
        this.camera.fov = 70;
        this.controls.target.set(0, 15, 0);
      } else {
        this.camera.fov = 60;
        this.controls.target.set(0, 0, 0);
      }

      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  }

  animate(time = 0) {
    requestAnimationFrame(this.animate.bind(this));

    // 星雲と各教科の腕を回転
    if (this.nebulaGroup) this.nebulaGroup.rotation.y += 0.0006;
    if (this.constellationGroup) this.constellationGroup.rotation.y += 0.0006;
    if (this.nodeGroup) this.nodeGroup.rotation.y += 0.0006;
    if (this.nucleus) this.nucleus.rotation.y -= 0.0018;

    // 挑戦可能ノードの脈動表現
    const pulseScale = 1.0 + Math.sin(time * 0.005) * 0.22;
    if (this.nodeGroup) {
      this.nodeGroup.children.forEach((group) => {
        const mesh = group.children[0];
        if (mesh && mesh.userData?.nodeInfo?.status === 'AVAILABLE') {
          mesh.scale.set(pulseScale, pulseScale, pulseScale);
        }
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
