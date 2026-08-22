/**
 * GalaxyEngine.js - 3D 银河系全大纲知识星图与3D星云图渲染引擎
 * 
 * 1. 六大 3D 星云团（Volumetric 3D Nebulae Clouds）
 * 2. 星云内知识点串联链路（Intra-Nebula Constellation Paths）
 * 3. 3D 悬浮知识点名称标签（Billboard Text Sprites）
 * 4. 核心星核、响应式视口与触控交互
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
    this.currentGradeFilter = 0; // 0 = 全学年 (All)
    this.currentSubjectFilter = null; // null = 全教科 (All Subjects)

    this.initScene();
    this.createNucleus();
    this.create3DNebulaeAndCurriculumNodes();
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

  // 1. 核心星核（Galactic Nucleus - 生きる力）
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

  // 2. 六大 3D 星云团与知识点串联链路生成
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

      // (A) 3D 体积星云粒子团 (Volumetric Nebula Cloud)
      for (let i = 0; i < particlesPerNebula; i++) {
        const progress = i / particlesPerNebula;
        const radius = 18 + progress * armMaxRadius;
        const spinAngle = progress * 3.6;
        const angle = armBaseAngle + spinAngle;

        // 3D 星云弥散扩散体积
        const spread = (1 - Math.exp(-progress * 2.2)) * 26;
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * spread * 0.7 * (1 - progress * 0.4);

        allPositions.push(x, y, z);

        // 核心至边缘由亮白渐变到深邃星云专属色
        const mixedColor = new THREE.Color(0xffffff).lerp(subColor, 0.3 + progress * 0.7);
        allColors.push(mixedColor.r, mixedColor.g, mixedColor.b);
      }

      // (B) 知识点定位与年级排序
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

      // (C) 绘制星云内部知识点串联光路 (Constellation Connecting Path)
      if (nodePositionsForThisSubject.length > 1) {
        const curve = new THREE.CatmullRomCurve3(nodePositionsForThisSubject, false, 'centripetal', 0.2);
        const curvePoints = curve.getPoints(60);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        
        // 柔和半透明发光星座连线
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

    // 渲染 3D 星云背景粒子流
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

  // 3. 渲染知识星点与 3D 悬浮文字标签 (Name Sprites)
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

      // (A) 星点球体 Mesh
      let nodeMesh;
      if (node.status === 'LOCKED') {
        const geo = new THREE.SphereGeometry(1.8, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 });
        nodeMesh = new THREE.Mesh(geo, mat);
      } else if (node.status === 'AVAILABLE') {
        const geo = new THREE.SphereGeometry(2.6, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        nodeMesh = new THREE.Mesh(geo, mat);
        nodeMesh.userData = { isPulse: true };
      } else {
        const geo = new THREE.SphereGeometry(3.0, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        nodeMesh = new THREE.Mesh(geo, mat);

        const ringGeo = new THREE.RingGeometry(4.0, 4.8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 3;
        nodeMesh.add(ring);
      }

      nodeMesh.userData = { nodeInfo: node };
      singleNodeGroup.add(nodeMesh);

      // (B) 3D 悬浮文字标签 Sprite (在星点旁显示知识点名称)
      const nameSprite = this.createNameSprite(node);
      nameSprite.position.set(0, 4.5, 0); // 悬浮在星点上方
      singleNodeGroup.add(nameSprite);

      this.nodeGroup.add(singleNodeGroup);
    });

    this.scene.add(this.nodeGroup);
  }

  // 同步玩家掌握度并点亮已通关节点（未通关保持灰暗，可挑战保持脉冲）
  syncProgress(playerMasteryMap = {}) {
    this.starNodes.forEach((node) => {
      const mastery = playerMasteryMap[node.id] || 0;
      if (mastery >= 0.85) {
        node.status = 'CLEARED'; // 点亮已通关
      } else {
        const prereqs = node.prerequisites || [];
        const allPrereqsMet = prereqs.every(pId => (playerMasteryMap[pId] || 0) >= 0.85);
        node.status = (allPrereqsMet || prereqs.length === 0) ? 'AVAILABLE' : 'LOCKED'; // 可挑战 vs 灰暗
      }
    });
    this.renderNodeMeshesAndSprites();
  }

  // 单个节点通关点亮特效
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

  // 生成高清晰度 3D Billboard 文字精灵
  createNameSprite(node) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // 胶囊发光背景板
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
    // 移动端适当微调缩放
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

  // 跨学科关联光束
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
      if (event.target.closest('#pc-detail-card') || event.target.closest('#mobile-sheet') || event.target.closest('aside') || event.target.closest('#shop-modal') || event.target.closest('#grade-tabs')) {
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

    // 星云与旋臂自转
    if (this.nebulaGroup) this.nebulaGroup.rotation.y += 0.0006;
    if (this.constellationGroup) this.constellationGroup.rotation.y += 0.0006;
    if (this.nodeGroup) this.nodeGroup.rotation.y += 0.0006;
    if (this.nucleus) this.nucleus.rotation.y -= 0.0018;

    // 脉冲呼吸效果
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
