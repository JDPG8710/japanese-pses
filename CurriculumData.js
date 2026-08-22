/**
 * CurriculumData.js - 文部科学省小学校学習指導要領 6教科 知識グラフ（DAG）マネージャー
 * 
 * 機能:
 * - data/subjects_curriculum.json および各教科個別 JSON の統合動的ローダー
 * - 漢字1026字データベース (data/kanji_1026.json) & 47都道府県 (data/prefectures_47.json) ロード機構
 * - GraphEngine との完全連動（トポロジー検証、アンロック判定、学年/教科別クエリ、グラフ進化）
 */

import { GraphEngine } from './GraphEngine.js';

export let GRADES = [
  { id: 1, name: '小学1年生', alias: '1年' },
  { id: 2, name: '小学2年生', alias: '2年' },
  { id: 3, name: '小学3年生', alias: '3年' },
  { id: 4, name: '小学4年生', alias: '4年' },
  { id: 5, name: '小学5年生', alias: '5年' },
  { id: 6, name: '小学6年生', alias: '6年' }
];

export let SUBJECT_METADATA = {
  kokugo: { id: 'kokugo', name: '国語', nameEn: 'Japanese', color: 0xe60033, hex: '#e60033', dataFile: './data/kokugo.json', grades: [1, 2, 3, 4, 5, 6] },
  sansu: { id: 'sansu', name: '算数', nameEn: 'Math', color: 0x0055a5, hex: '#0055a5', dataFile: './data/sansu.json', grades: [1, 2, 3, 4, 5, 6] },
  rika: { id: 'rika', name: '理科', nameEn: 'Science', color: 0x00a960, hex: '#00a960', dataFile: './data/rika.json', grades: [3, 4, 5, 6] },
  shakai: { id: 'shakai', name: '社会', nameEn: 'Social Studies', color: 0xffb900, hex: '#ffb900', dataFile: './data/shakai.json', grades: [3, 4, 5, 6] },
  seikatsu: { id: 'seikatsu', name: '生活', nameEn: 'Life Skills', color: 0xf37023, hex: '#f37023', dataFile: './data/seikatsu.json', grades: [1, 2] },
  eigo: { id: 'eigo', name: '外国語・英語', nameEn: 'English', color: 0x8a39e6, hex: '#8a39e6', dataFile: './data/eigo.json', grades: [3, 4, 5, 6] }
};

export let FULL_CURRICULUM_DAG = [];
export let graphEngineInstance = new GraphEngine();

export const CURRICULUM_GAME_TYPES_BY_SUBJECT = {
  '国語': 'KOKUGO_CURRICULUM',
  '算数': 'MATH_CURRICULUM',
  '理科': 'SCIENCE_CURRICULUM',
  '社会': 'SOCIAL_CURRICULUM',
  '生活': 'LIFE_CURRICULUM',
  '外国語・英語': 'ENGLISH_CURRICULUM'
};

/** Validate curriculum metadata before it is allowed into the runtime graph. */
export function validateCurriculumNodeSchema(nodes = []) {
  const errors = [];
  const ids = new Set();
  for (const node of nodes) {
    if (!node?.id) errors.push('NODE_WITHOUT_ID');
    else if (ids.has(node.id)) errors.push(`DUPLICATE_ID:${node.id}`);
    else ids.add(node.id);
    if (!Number.isInteger(Number(node?.grade)) || Number(node.grade) < 1 || Number(node.grade) > 6) errors.push(`INVALID_GRADE:${node?.id}`);
    if (!node?.subject || !node?.subjectId) errors.push(`MISSING_SUBJECT:${node?.id}`);
    if (!Array.isArray(node?.learningObjectives) || node.learningObjectives.length === 0) errors.push(`MISSING_OBJECTIVES:${node?.id}`);
    const expectedType = CURRICULUM_GAME_TYPES_BY_SUBJECT[node?.subject];
    if (!expectedType || node?.gameType !== expectedType) errors.push(`ROUTE_MISMATCH:${node?.id}:${node?.gameType || 'NONE'}:${expectedType || 'UNKNOWN_SUBJECT'}`);
    if (!node?.gameData?.mode || !Array.isArray(node?.gameData?.topicPool) || node.gameData.topicPool.length === 0) errors.push(`MISSING_TOPIC_POOL:${node?.id}`);
  }
  for (const node of nodes) {
    for (const prereq of (node?.prerequisites || [])) {
      if (!ids.has(prereq)) errors.push(`MISSING_PREREQUISITE:${node.id}:${prereq}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 統合 JSON (subjects_curriculum.json) または個別教科 JSON を動的ロードして DAG を構築
 */
export async function loadCurriculumFromJSON() {
  try {
    // プラン A: 総合 subjects_curriculum.json を最優先ロード
    const masterRes = await fetch('./data/subjects_curriculum.json').catch(() => null);
    if (masterRes && masterRes.ok) {
      const masterJson = await masterRes.json();
      if (masterJson.grades) GRADES = masterJson.grades;
      if (masterJson.subjects) {
        // 色設定などをマージ
        for (const [k, v] of Object.entries(masterJson.subjects)) {
          if (SUBJECT_METADATA[k]) {
            SUBJECT_METADATA[k] = { ...SUBJECT_METADATA[k], ...v };
          }
        }
      }
      if (Array.isArray(masterJson.nodes) && masterJson.nodes.length > 0) {
        const validation = validateCurriculumNodeSchema(masterJson.nodes);
        if (!validation.valid) throw new Error(`統合カリキュラムデータの検証に失敗しました: ${validation.errors.join(', ')}`);
        FULL_CURRICULUM_DAG = masterJson.nodes;
        graphEngineInstance.buildGraph(FULL_CURRICULUM_DAG);
        console.log(`[CurriculumLoader] 総合 subjects_curriculum.json より全 ${FULL_CURRICULUM_DAG.length} 件の単元ノードをロード完了。`);
        return FULL_CURRICULUM_DAG;
      }
    }

    // プラン B: 個別 JSON からの並列ロード
    const metaRes = await fetch('./data/metadata.json').catch(() => null);
    if (metaRes && metaRes.ok) {
      const metaJson = await metaRes.json();
      if (metaJson.grades) GRADES = metaJson.grades;
      if (metaJson.subjects) SUBJECT_METADATA = metaJson.subjects;
    }

    const subjectKeys = Object.keys(SUBJECT_METADATA);
    const fetchPromises = subjectKeys.map(async (key) => {
      const subj = SUBJECT_METADATA[key];
      const filePath = subj.dataFile || `./data/${key}.json`;
      try {
        const res = await fetch(filePath);
        if (res.ok) {
          const data = await res.json();
          return (data.nodes || []).map(node => ({ ...node, subjectId: node.subjectId || data.subjectId || key }));
        }
      } catch (err) {
        console.warn(`[CurriculumLoader] ${filePath} のロードをスキップ:`, err);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    const aggregatedNodes = results.flat();

    if (aggregatedNodes.length > 0) {
      const validation = validateCurriculumNodeSchema(aggregatedNodes);
      if (!validation.valid) throw new Error(`教科別カリキュラムデータの検証に失敗しました: ${validation.errors.join(', ')}`);
      FULL_CURRICULUM_DAG = aggregatedNodes;
      graphEngineInstance.buildGraph(FULL_CURRICULUM_DAG);
      console.log(`[CurriculumLoader] 個別教科 JSON より全 ${aggregatedNodes.length} 件の単元ノードをロード完了。`);
      return FULL_CURRICULUM_DAG;
    }
  } catch (e) {
    console.warn('[CurriculumLoader] fetch 失敗、ビルトインフォールバックを使用:', e);
  }

  // 不完全または不一致の代替データを、別学年・別教科として表示しない。
  if (FULL_CURRICULUM_DAG.length === 0) {
    console.error('[CurriculumLoader] 有効な完全カリキュラムデータがありません。安全のため空の知識グラフを返します。');
    FULL_CURRICULUM_DAG = [];
    graphEngineInstance.buildGraph(FULL_CURRICULUM_DAG);
  }
  return FULL_CURRICULUM_DAG;
}

/**
 * 漢字1,026字データベースのロード
 */
export async function loadKanjiDatabase() {
  try {
    const res = await fetch('./data/kanji_1026.json');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[CurriculumLoader] kanji_1026.json のロード失敗:', e);
  }
  return null;
}

/**
 * 47都道府県データベースのロード
 */
export async function loadPrefecturesDatabase() {
  try {
    const res = await fetch('./data/prefectures_47.json');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[CurriculumLoader] prefectures_47.json のロード失敗:', e);
  }
  return null;
}

/**
 * GraphEngine インスタンスの取得
 */
export function getGraphEngine() {
  return graphEngineInstance;
}

/**
 * カリキュラムトポロジー全体の自動検証
 */
export function validateCurriculumTopology() {
  return graphEngineInstance.validateDAG();
}

/**
 * 学年別ノード一覧取得
 */
export function getNodesByGrade(grade) {
  if (!grade || grade === 0) return FULL_CURRICULUM_DAG;
  return FULL_CURRICULUM_DAG.filter(n => n.grade === grade);
}

/**
 * 教科別ノード一覧取得
 */
export function getNodesBySubject(subject) {
  if (!subject) return FULL_CURRICULUM_DAG;
  return FULL_CURRICULUM_DAG.filter(n => n.subject === subject || n.subjectId === subject);
}

/**
 * プレイヤーの習熟度マップに基づき、現在アンロックされているノード群を判定
 * 
 * @param {Record<string, { mastery: number }>} playerMasteryMap 
 * @param {number} threshold 解放閾値（デフォルト 0.85）
 */
export function getUnlockedNodes(playerMasteryMap = {}, threshold = 0.85) {
  const unlocked = [];

  for (const node of FULL_CURRICULUM_DAG) {
    const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
    const allPrereqsMet = prereqs.every(pId => {
      const pRecord = playerMasteryMap[pId];
      return pRecord && (pRecord.mastery || 0) >= threshold;
    });

    if (allPrereqsMet) {
      unlocked.push(node);
    }
  }

  return unlocked;
}

/**
 * 特定ノードがアンロックされているか判定
 */
export function isNodeUnlocked(nodeId, playerMasteryMap = {}, threshold = 0.85) {
  const node = FULL_CURRICULUM_DAG.find(n => n.id === nodeId);
  if (!node) return false;
  const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
  return prereqs.every(pId => {
    const pRecord = playerMasteryMap[pId];
    return pRecord && (pRecord.mastery || 0) >= threshold;
  });
}
