/**
 * まなびぽっぷ！ カートゥーンマップエンジン
 * WebGLを使わず、HTML/CSSだけで軽く動く学習マップを描画する。
 */

const SUBJECT_ICONS = Object.freeze({
  '国語': '📚',
  '算数': '🔢',
  '理科': '🔬',
  '社会': '🗺️',
  '生活': '🌱',
  '外国語・英語': '🎈',
  '英語': '🎈'
});

const MAP_POSITIONS = Object.freeze([
  [16, 71], [33, 56], [52, 68], [70, 48], [84, 67], [67, 79],
  [47, 42], [26, 35], [46, 22], [70, 26], [86, 37], [14, 20]
]);

function subjectMatches(filter, subject) {
  if (!filter) return true;
  if (filter === subject) return true;
  return filter.includes('英語') && subject?.includes('英語');
}

function shortNodeName(node) {
  const clean = String(node?.name || 'チャレンジ')
    .replace(/^[0-9一二三四五六]年\s*/, '')
    .replace(/[・／]/g, '・');
  return clean.length > 18 ? `${clean.slice(0, 17)}…` : clean;
}

export class GalaxyEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.nodes = options.nodes || [];
    this.subjectMetadata = options.subjectMetadata || {};
    this.currentGradeFilter = 0;
    this.currentSubjectFilter = null;
    this.playerMastery = {};
    this.renderer = { domElement: null };
    this.buildMap();
    this.renderNodes();
  }

  buildMap() {
    this.container.replaceChildren();
    this.container.classList.add('cartoon-map-container');

    const root = document.createElement('div');
    root.className = 'cartoon-map-world';
    root.setAttribute('aria-label', 'まなびのぼうけんマップ');
    root.innerHTML = `
      <div class="map-sky" aria-hidden="true">
        <span class="map-cloud cloud-one">☁</span>
        <span class="map-cloud cloud-two">☁</span>
        <span class="map-sun">☀</span>
      </div>
      <div class="map-mountain mountain-one" aria-hidden="true"></div>
      <div class="map-mountain mountain-two" aria-hidden="true"></div>
      <div class="map-hill hill-one" aria-hidden="true"></div>
      <div class="map-hill hill-two" aria-hidden="true"></div>
      <div class="map-river" aria-hidden="true"></div>
      <div class="map-landmark map-school" aria-hidden="true">🏫</div>
      <div class="map-landmark map-castle" aria-hidden="true">🏰</div>
      <div class="map-landmark map-forest" aria-hidden="true">🌳</div>
      <div class="map-landmark map-lab" aria-hidden="true">🔭</div>
      <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M8 82 C18 70 20 62 34 57 S52 70 62 57 S72 39 88 33" />
      </svg>
      <div class="map-caption" aria-hidden="true"><span>きょうは どこへ いこう？</span></div>
      <div class="map-node-layer" role="group" aria-label="学習ステージ"></div>`;
    this.container.appendChild(root);
    this.root = root;
    this.nodeLayer = root.querySelector('.map-node-layer');
    this.renderer.domElement = root;
  }

  updateCurriculumData(nodes, metadata) {
    this.nodes = nodes || [];
    this.subjectMetadata = metadata || this.subjectMetadata;
    this.renderNodes();
  }

  setBackgroundTheme() {
    // 旧テーマAPIとの互換用。背景は常に軽量なカートンマップを使用する。
  }

  setGradeFilter(grade = 0) {
    this.currentGradeFilter = Number(grade) || 0;
    this.renderNodes();
  }

  setSubjectFilter(subject = null) {
    this.currentSubjectFilter = (!subject || subject === 'ALL' || subject === '全教科') ? null : subject;
    this.renderNodes();
  }

  syncProgress(playerMasteryMap = {}) {
    this.playerMastery = { ...playerMasteryMap };
    this.renderNodes();
  }

  lightUpNode(nodeId) {
    this.playerMastery[nodeId] = 1;
    this.renderNodes();
    const escapedId = globalThis.CSS?.escape ? CSS.escape(String(nodeId)) : String(nodeId).replace(/["\\]/g, '\\$&');
    const node = this.nodeLayer?.querySelector(`[data-node-id="${escapedId}"]`);
    node?.classList.add('map-node-celebrate');
  }

  getVisibleNodes() {
    if (this.currentGradeFilter < 1) return [];
    return this.nodes.filter(node => {
      if (this.currentGradeFilter > 0 && Number(node.grade) !== this.currentGradeFilter) return false;
      if (!subjectMatches(this.currentSubjectFilter, node.subject)) return false;
      if (this.currentGradeFilter <= 2 && ['理科', '社会', '外国語・英語', '英語'].includes(node.subject)) return false;
      if (this.currentGradeFilter >= 3 && node.subject === '生活') return false;
      return true;
    });
  }

  getNodeStatus(node) {
    if (Number(this.playerMastery[node.id] || 0) >= 0.85) return 'CLEARED';
    const unlocked = (node.prerequisites || []).every(id => Number(this.playerMastery[id] || 0) >= 0.85);
    return unlocked || !(node.prerequisites || []).length ? 'AVAILABLE' : 'LOCKED';
  }

  renderNodes() {
    if (!this.nodeLayer) return;
    this.nodeLayer.replaceChildren();
    const visibleNodes = this.getVisibleNodes();
    this.root?.classList.toggle('map-has-grade', this.currentGradeFilter > 0);
    this.root?.classList.toggle('map-has-subject', Boolean(this.currentSubjectFilter));

    visibleNodes.forEach((node, index) => {
      const status = this.getNodeStatus(node);
      const position = MAP_POSITIONS[index % MAP_POSITIONS.length];
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.nodeId = node.id;
      button.dataset.subject = node.subject;
      button.className = `map-stage-node map-stage-${status.toLowerCase()}`;
      button.style.setProperty('--map-x', `${position[0]}%`);
      button.style.setProperty('--map-y', `${position[1]}%`);
      button.setAttribute('aria-label', `小学${node.grade}年 ${node.subject} ${node.name}`);
      button.innerHTML = `
        <span class="map-node-bubble" aria-hidden="true">${status === 'CLEARED' ? '⭐' : SUBJECT_ICONS[node.subject] || '🎯'}</span>
        <span class="map-node-label"><small>小${node.grade}・${node.subject}</small><strong>${shortNodeName(node)}</strong></span>`;
      button.addEventListener('click', event => {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('GALAXY_NODE_CLICK_START', { detail: { time: Date.now() } }));
        window.dispatchEvent(new CustomEvent('GALAXY_NODE_SELECTED', { detail: node }));
      });
      this.nodeLayer.appendChild(button);
    });

    const caption = this.root?.querySelector('.map-caption span');
    if (caption) {
      caption.textContent = this.currentGradeFilter
        ? `しょうがく${this.currentGradeFilter}ねんの ぼうけん！`
        : 'がくねんを えらんで しゅっぱつ！';
    }
  }
}
