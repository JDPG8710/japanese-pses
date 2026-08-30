/**
 * まなびぽっぷ！ 冒険マップエンジン
 * 静止画の背景と軽量なDOMだけで、学年内の全単元・全ステージを表示する。
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

function subjectMatches(filter, subject) {
  if (!filter) return true;
  if (filter === subject) return true;
  return filter.includes('英語') && subject?.includes('英語');
}

function shortNodeName(node) {
  const clean = String(node?.name || 'チャレンジ')
    .replace(/^[0-9一二三四五六]年\s*/, '')
    .replace(/[・／]/g, '・');
  return clean.length > 24 ? `${clean.slice(0, 23)}…` : clean;
}

function dispatchNodeSelected(node) {
  window.dispatchEvent(new CustomEvent('GALAXY_NODE_CLICK_START', { detail: { time: Date.now() } }));
  window.dispatchEvent(new CustomEvent('GALAXY_NODE_SELECTED', { detail: node }));
}

export class GalaxyEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.nodes = options.nodes || [];
    this.subjectMetadata = options.subjectMetadata || {};
    this.currentGradeFilter = 0;
    this.currentSubjectFilter = null;
    this.playerMastery = {};
    this.stageCountResolver = options.stageCountResolver || null;
    this.stageProgressResolver = options.stageProgressResolver || null;
    this.stageLaunchHandler = options.stageLaunchHandler || null;
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
      <div class="map-art-shade" aria-hidden="true"></div>
      <div class="map-sparkles" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="map-caption" aria-live="polite"><span>学年をえらんで、ぼうけんへ出発！</span></div>
      <div class="map-node-layer custom-scroll" role="group" aria-label="学習ステージ"></div>`;
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

  setBackgroundTheme(themeId = '') {
    const allowedThemes = new Set(['skin_nebula_aurora', 'skin_cyber_neon']);
    const resolvedTheme = allowedThemes.has(String(themeId)) ? String(themeId) : 'default';
    this.backgroundTheme = resolvedTheme;
    if (this.root) this.root.dataset.theme = resolvedTheme;
    return resolvedTheme;
  }

  setStageCountResolver(resolver) {
    this.stageCountResolver = typeof resolver === 'function' ? resolver : null;
    this.renderNodes();
  }

  setStageProgressResolver(resolver) {
    this.stageProgressResolver = typeof resolver === 'function' ? resolver : null;
    this.renderNodes();
  }

  setStageLaunchHandler(handler) {
    this.stageLaunchHandler = typeof handler === 'function' ? handler : null;
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
    const row = this.nodeLayer?.querySelector(`[data-node-id="${escapedId}"]`);
    row?.classList.add('map-node-celebrate');
  }

  getVisibleNodes() {
    if (this.currentGradeFilter < 1) return [];
    return this.nodes.filter(node => {
      if (Number(node.grade) !== this.currentGradeFilter) return false;
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

  getStageCount(node) {
    const resolved = this.stageCountResolver?.(node);
    const candidate = Number(resolved || node?.gameData?.stages || node?.stages || 6);
    return Math.max(1, Math.min(80, Number.isFinite(candidate) ? Math.floor(candidate) : 6));
  }

  isStageCleared(node, stageNumber) {
    return Boolean(this.stageProgressResolver?.(node, stageNumber));
  }

  createStageButton(node, stageNumber) {
    const cleared = this.isStageCleared(node, stageNumber);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-stage-stop${cleared ? ' is-cleared' : ''}`;
    button.dataset.nodeId = node.id;
    button.dataset.stage = String(stageNumber);
    button.setAttribute('aria-label', `${node.subject} ${shortNodeName(node)} ステージ${stageNumber}${cleared ? ' クリア済み' : ''}`);
    button.title = `ステージ ${stageNumber}${cleared ? '・クリア済み' : ''}`;
    button.innerHTML = `<span aria-hidden="true">${cleared ? '✓' : stageNumber}</span>`;
    button.addEventListener('click', event => {
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent('GALAXY_NODE_CLICK_START', { detail: { time: Date.now() } }));
      if (this.stageLaunchHandler) this.stageLaunchHandler(node, stageNumber);
      else if (typeof window.launchStage === 'function') window.launchStage(node.id, stageNumber);
    });
    return button;
  }

  createUnitRoute(node) {
    const status = this.getNodeStatus(node);
    const stageCount = this.getStageCount(node);
    const clearedCount = Array.from({ length: stageCount }, (_, index) => index + 1)
      .filter(stageNumber => this.isStageCleared(node, stageNumber)).length;
    const row = document.createElement('section');
    row.className = `map-unit-route map-stage-${status.toLowerCase()}`;
    row.dataset.nodeId = node.id;
    row.dataset.subject = node.subject;

    const unitButton = document.createElement('button');
    unitButton.type = 'button';
    unitButton.className = 'map-unit-select';
    unitButton.setAttribute('aria-label', `小学${node.grade}年 ${node.subject} ${node.name}の説明を開く`);
    unitButton.innerHTML = `
      <span class="map-node-bubble" aria-hidden="true">${status === 'CLEARED' ? '⭐' : SUBJECT_ICONS[node.subject] || '🎯'}</span>
      <span class="map-node-label">
        <small></small>
        <strong></strong>
      </span>`;
    unitButton.querySelector('small').textContent = `小${node.grade}・${node.subject}　${clearedCount}/${stageCount}`;
    unitButton.querySelector('strong').textContent = shortNodeName(node);
    unitButton.addEventListener('click', event => {
      event.stopPropagation();
      dispatchNodeSelected(node);
    });

    const track = document.createElement('div');
    track.className = 'map-stage-track custom-scroll';
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', `${node.subject}の全${stageCount}ステージ`);
    for (let stageNumber = 1; stageNumber <= stageCount; stageNumber += 1) {
      track.appendChild(this.createStageButton(node, stageNumber));
    }

    const scrollHint = document.createElement('span');
    scrollHint.className = 'map-scroll-hint';
    scrollHint.setAttribute('aria-hidden', 'true');
    scrollHint.textContent = '横にスライド →';

    row.append(unitButton, track, scrollHint);
    return row;
  }

  renderNodes() {
    if (!this.nodeLayer) return;
    this.nodeLayer.replaceChildren();
    const visibleNodes = this.getVisibleNodes();
    this.root?.classList.toggle('map-has-grade', this.currentGradeFilter > 0);
    this.root?.classList.toggle('map-single-subject', Boolean(this.currentSubjectFilter));

    visibleNodes.forEach(node => this.nodeLayer.appendChild(this.createUnitRoute(node)));

    if (!visibleNodes.length && this.currentGradeFilter > 0) {
      const empty = document.createElement('p');
      empty.className = 'map-empty-message';
      empty.textContent = 'この学年のコースを読み込んでいます…';
      this.nodeLayer.appendChild(empty);
    }

    const caption = this.root?.querySelector('.map-caption span');
    if (caption) {
      caption.textContent = this.currentGradeFilter
        ? `小学${this.currentGradeFilter}年の全コース・全ステージ`
        : '学年をえらんで、ぼうけんへ出発！';
    }
  }
}
