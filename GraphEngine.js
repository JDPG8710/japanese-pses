/**
 * GraphEngine.js - 6教科有向非巡回グラフ（DAG）解析・トポロジー整合性検証・動的グラフ進化エンジン
 * 
 * 核心機能:
 * 1. DAGトポロジー構築・深さ優先探索（DFS 3-Color）＆カーン（Kahn）法による完全閉路（サイクル）検出
 * 2. トポロジカルソート、階層深度計算、先行前提・後続波及連鎖解析
 * 3. 孤立ノード（Orphan）、死鎖（Deadlock）、学年順序異常、到達可能性の全方位バリデーション
 * 4. 認知断層（Cognitive Fracture）、難易度急峻ジャンプ、ボトルネックチョークポイント検出
 * 5. 動的グラフ進化（Graph Evolution）：架橋ノード自動挿入、エッジ再配線修復（Healing）、難易度平滑化（Smoothing）
 */

export class GraphEngine {
  constructor(nodes = [], options = {}) {
    this.options = {
      defaultUnlockThreshold: 0.85,
      bloomJumpThreshold: 0.55,
      fracturePassRateThreshold: 0.35,
      ...options
    };
    this.nodes = [];
    this.nodeMap = new Map();
    this.adjList = new Map();     // nodeId -> Array<successorNodeId>
    this.revAdjList = new Map();  // nodeId -> Array<prerequisiteNodeId>
    this.inDegreeMap = new Map();
    this.outDegreeMap = new Map();
    this.mutationHistory = [];

    if (Array.isArray(nodes) && nodes.length > 0) {
      this.buildGraph(nodes);
    }
  }

  /**
   * ノード群から DAG 隣接リストおよび逆引きインデックスを構築
   */
  buildGraph(nodes) {
    this.nodes = JSON.parse(JSON.stringify(nodes));
    this.nodeMap.clear();
    this.adjList.clear();
    this.revAdjList.clear();
    this.inDegreeMap.clear();
    this.outDegreeMap.clear();

    // 1. ノード登録 & 初期化
    for (const node of this.nodes) {
      if (!node.id) continue;
      this.nodeMap.set(node.id, node);
      this.adjList.set(node.id, []);
      this.revAdjList.set(node.id, []);
      this.inDegreeMap.set(node.id, 0);
      this.outDegreeMap.set(node.id, 0);
    }

    // 2. 前提エッジの配線 (prerequisite -> node)
    for (const node of this.nodes) {
      if (!node.id) continue;
      const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
      for (const prereqId of prereqs) {
        if (this.nodeMap.has(prereqId)) {
          // prereqId から node.id への有向エッジ
          this.adjList.get(prereqId).push(node.id);
          this.revAdjList.get(node.id).push(prereqId);
          this.inDegreeMap.set(node.id, (this.inDegreeMap.get(node.id) || 0) + 1);
          this.outDegreeMap.set(prereqId, (this.outDegreeMap.get(prereqId) || 0) + 1);
        }
      }
    }

    return this;
  }

  /**
   * 全ノード取得
   */
  getAllNodes() {
    return Array.from(this.nodeMap.values());
  }

  /**
   * 単一ノード取得
   */
  getNode(nodeId) {
    return this.nodeMap.get(nodeId) || null;
  }

  /**
   * ノード存在確認
   */
  hasNode(nodeId) {
    return this.nodeMap.has(nodeId);
  }

  /**
   * ルートノード（前提依存なし・開始可能ノード）の取得
   */
  getRoots(subject = null) {
    const roots = [];
    for (const [id, inDegree] of this.inDegreeMap.entries()) {
      if (inDegree === 0) {
        const node = this.nodeMap.get(id);
        if (!subject || node.subject === subject || node.subjectId === subject) {
          roots.push(node);
        }
      }
    }
    return roots;
  }

  /**
   * リーフノード（後続依存なし・終端ノード）の取得
   */
  getLeaves(subject = null) {
    const leaves = [];
    for (const [id, outDegree] of this.outDegreeMap.entries()) {
      if (outDegree === 0) {
        const node = this.nodeMap.get(id);
        if (!subject || node.subject === subject || node.subjectId === subject) {
          leaves.push(node);
        }
      }
    }
    return leaves;
  }

  /**
   * 直接の前提ノード一覧取得
   */
  getDirectPrerequisites(nodeId) {
    const prereqIds = this.revAdjList.get(nodeId) || [];
    return prereqIds.map(id => this.nodeMap.get(id)).filter(Boolean);
  }

  /**
   * 直接の後続依存ノード一覧取得
   */
  getDirectDependents(nodeId) {
    const succIds = this.adjList.get(nodeId) || [];
    return succIds.map(id => this.nodeMap.get(id)).filter(Boolean);
  }

  /**
   * 再帰的な前提祖先チェーンをトポロジカル順で取得
   */
  getPrerequisiteChain(nodeId) {
    const visited = new Set();
    const result = [];

    const dfs = (currId) => {
      const prereqIds = this.revAdjList.get(currId) || [];
      for (const pId of prereqIds) {
        if (!visited.has(pId)) {
          visited.add(pId);
          dfs(pId);
          const node = this.nodeMap.get(pId);
          if (node) result.push(node);
        }
      }
    };

    if (this.nodeMap.has(nodeId)) {
      dfs(nodeId);
    }
    return result;
  }

  /**
   * 再帰的な後続子孫チェーンを取得
   */
  getDependentChain(nodeId) {
    const visited = new Set();
    const result = [];

    const dfs = (currId) => {
      const succIds = this.adjList.get(currId) || [];
      for (const sId of succIds) {
        if (!visited.has(sId)) {
          visited.add(sId);
          const node = this.nodeMap.get(sId);
          if (node) result.push(node);
          dfs(sId);
        }
      }
    };

    if (this.nodeMap.has(nodeId)) {
      dfs(nodeId);
    }
    return result;
  }

  /**
   * 閉路（サイクル）検出アルゴリズム（DFS 3-Color 状態遷移法）
   * 0: UNVISITED (白), 1: VISITING (灰), 2: VISITED (黒)
   * 
   * @returns {{ hasCycle: boolean, cycleCount: number, cycles: Array<string[]> }}
   */
  detectCycles() {
    const state = new Map(); // nodeId -> 0 | 1 | 2
    for (const id of this.nodeMap.keys()) {
      state.set(id, 0);
    }

    const cycles = [];
    const parentPath = [];

    const dfs = (currId) => {
      state.set(currId, 1);
      parentPath.push(currId);

      const successors = this.adjList.get(currId) || [];
      for (const nextId of successors) {
        const nextState = state.get(nextId);
        if (nextState === 1) {
          // バックエッジ発見：サイクル抽出
          const cycleStartIndex = parentPath.indexOf(nextId);
          if (cycleStartIndex !== -1) {
            const cycle = parentPath.slice(cycleStartIndex).concat(nextId);
            cycles.push(cycle);
          }
        } else if (nextState === 0) {
          dfs(nextId);
        }
      }

      parentPath.pop();
      state.set(currId, 2);
    };

    for (const id of this.nodeMap.keys()) {
      if (state.get(id) === 0) {
        dfs(id);
      }
    }

    return {
      hasCycle: cycles.length > 0,
      cycleCount: cycles.length,
      cycles: cycles
    };
  }

  /**
   * トポロジカルソート（Kahn法）
   * 
   * @returns {Array<object>} トポロジカル順に並んだノード配列
   * @throws {Error} サイクルが検出された場合
   */
  topologicalSort() {
    const inDegrees = new Map(this.inDegreeMap);
    const queue = [];
    const sorted = [];

    // 入次数 0 のノードをキューへ
    for (const [id, deg] of inDegrees.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const u = queue.shift();
      const node = this.nodeMap.get(u);
      if (node) sorted.push(node);

      const successors = this.adjList.get(u) || [];
      for (const v of successors) {
        const newDeg = inDegrees.get(v) - 1;
        inDegrees.set(v, newDeg);
        if (newDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (sorted.length !== this.nodeMap.size) {
      const cycleInfo = this.detectCycles();
      throw new Error(`[GraphEngine] トポロジカルソート失敗：グラフ内に閉路が存在します (閉路数: ${cycleInfo.cycleCount})`);
    }

    return sorted;
  }

  /**
   * ノードのトポロジカル層（最大経路長深度）を計算
   * ルートからの最短・最長ステップ数を算出し、3D星図レイアウトや学習ステージ区分に活用
   */
  calculateTopologicalDepths() {
    const depths = new Map();
    let sortedNodes;
    try {
      sortedNodes = this.topologicalSort();
    } catch (e) {
      // サイクルがある場合はフォールバック
      sortedNodes = Array.from(this.nodeMap.values());
    }

    // 初期化
    for (const node of sortedNodes) {
      depths.set(node.id, 0);
    }

    for (const node of sortedNodes) {
      const currentDepth = depths.get(node.id) || 0;
      const successors = this.adjList.get(node.id) || [];
      for (const nextId of successors) {
        const nextDepth = depths.get(nextId) || 0;
        if (currentDepth + 1 > nextDepth) {
          depths.set(nextId, currentDepth + 1);
        }
      }
    }

    return depths;
  }

  /**
   * 包括的 DAG トポロジー整合性検証（Validation）
   * 
   * 検証項目:
   * 1. 閉路（サイクル）の完全不在
   * 2. 存在しないノードへのダングリング参照（Orphan References）
   * 3. ルートから到達不能な孤立島ノード（Unreachable Nodes）
   * 4. 学年順序の単調性（低学年ノードが高学年ノードに依存していないか）
   * 5. 認知深度（Bloom Depth）の異常ジャンプ
   * 6. 死鎖ノード（アンロック不能な前提条件）
   */
  validateDAG() {
    const errors = [];
    const warnings = [];
    const danglingReferences = [];
    const gradeAnomalies = [];
    const bloomAnomalies = [];
    const orphanNodes = [];

    // 1. 存在しないノードへの前提参照チェック
    for (const node of this.nodes) {
      const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
      for (const pId of prereqs) {
        if (!this.nodeMap.has(pId)) {
          danglingReferences.push({ nodeId: node.id, invalidPrereqId: pId });
          errors.push(`[DanglingPrereq] ノード ${node.id} は存在しない前提ノード "${pId}" を参照しています。`);
        }
      }
    }

    // 2. サイクル検出
    const cycleResult = this.detectCycles();
    if (cycleResult.hasCycle) {
      errors.push(`[CycleDetected] グラフ内に ${cycleResult.cycleCount} 件の循環参照が検出されました: ${JSON.stringify(cycleResult.cycles)}`);
    }

    // 3. ルートからの到達可能性チェック
    const roots = this.getRoots();
    const reachable = new Set();
    const queue = roots.map(r => r.id);
    for (const rId of queue) reachable.add(rId);

    while (queue.length > 0) {
      const curr = queue.shift();
      const succs = this.adjList.get(curr) || [];
      for (const next of succs) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    const unreachableNodes = [];
    for (const node of this.nodes) {
      if (!reachable.has(node.id)) {
        unreachableNodes.push(node.id);
        errors.push(`[UnreachableNode] ノード ${node.id} はいずれのルートノードからも到達できません（孤立島）。`);
      }
    }

    // 4. 学年順序および Bloom 深度の検証
    for (const node of this.nodes) {
      const prereqs = this.getDirectPrerequisites(node.id);
      for (const p of prereqs) {
        // 学年順序: 前提の学年はノードの学年以下であるべき
        if (p.grade && node.grade && p.grade > node.grade) {
          gradeAnomalies.push({
            nodeId: node.id,
            nodeGrade: node.grade,
            prereqId: p.id,
            prereqGrade: p.grade
          });
          warnings.push(`[GradeProgressionAnomaly] ノード ${node.id} (小${node.grade}) が上位学年 ${p.id} (小${p.grade}) を前提としています。`);
        }

        // Bloom 深度ジャンプ検証
        const nodeBloom = Number(node.bloomDepth || 1.0);
        const prereqBloom = Number(p.bloomDepth || 1.0);
        const delta = nodeBloom - prereqBloom;
        if (delta > this.options.bloomJumpThreshold) {
          bloomAnomalies.push({
            nodeId: node.id,
            prereqId: p.id,
            nodeBloom,
            prereqBloom,
            delta: Number(delta.toFixed(2))
          });
          warnings.push(`[BloomSteepJump] ノード ${p.id} (深度${prereqBloom}) -> ${node.id} (深度${nodeBloom}) 間で認知深度が ${delta.toFixed(2)} 急上昇しています。`);
        }
      }
    }

    const edgeCount = Array.from(this.adjList.values()).reduce((sum, list) => sum + list.length, 0);

    return {
      valid: errors.length === 0,
      totalNodes: this.nodeMap.size,
      totalEdges: edgeCount,
      hasCycle: cycleResult.hasCycle,
      cycles: cycleResult.cycles,
      danglingReferences,
      unreachableNodes,
      gradeAnomalies,
      bloomAnomalies,
      errors,
      warnings,
      metrics: {
        rootCount: roots.length,
        leafCount: this.getLeaves().length,
        maxDepth: Math.max(...Array.from(this.calculateTopologicalDepths().values()), 0)
      }
    };
  }

  /**
   * 認知断層（Cognitive Fracture）の動的検出
   * プレイヤーの学習ログ統計（通過率、エラークリック数、所要時間）から学習困難ノードを特定
   * 
   * @param {Array<{ nodeId: string, passRate: number, sampleSize: number, avgErrorClicks?: number, avgDurationSec?: number }>} stats 
   * @returns {Array<object>} 認知断層レポート一覧
   */
  detectCognitiveFractures(stats = [], customThreshold = null) {
    const threshold = customThreshold !== null ? customThreshold : this.options.fracturePassRateThreshold;
    const fractures = [];

    for (const stat of stats) {
      if (!this.nodeMap.has(stat.nodeId)) continue;
      const node = this.nodeMap.get(stat.nodeId);
      const passRate = stat.passRate !== undefined ? stat.passRate : 1.0;
      const sampleSize = stat.sampleSize || 1;

      if (passRate < threshold && sampleSize >= 1) {
        const severity = passRate < 0.2 ? 'CRITICAL' : (passRate < 0.3 ? 'HIGH' : 'MODERATE');
        fractures.push({
          nodeId: node.id,
          nodeName: node.name,
          subject: node.subject,
          grade: node.grade,
          passRate: passRate,
          sampleSize: sampleSize,
          severity: severity,
          currentBloomDepth: node.bloomDepth || 1.0,
          diagnosis: `小学${node.grade}年【${node.name}】の通過率が ${(passRate * 100).toFixed(1)}% (< ${(threshold * 100)}% 閾値) に急落。認知断層と判定。`,
          recommendedAction: 'INSERT_BRIDGING_SCAFFOLDING_NODE'
        });
      }
    }

    return fractures;
  }

  /**
   * ボトルネック・チョークポイント検出（重要結節点・波及影響度分析）
   * あるノードが躓いた際に後続カリキュラム全体が閉塞するリスク度合いを計算
   */
  detectBottlenecks(impactRatioThreshold = 0.25) {
    const totalNodes = this.nodeMap.size;
    const bottlenecks = [];

    for (const node of this.nodes) {
      const dependentChain = this.getDependentChain(node.id);
      const impactCount = dependentChain.length;
      const impactRatio = totalNodes > 0 ? impactCount / totalNodes : 0;

      // クロス教科依存があるか判定
      const hasCrossSubject = dependentChain.some(d => d.subject !== node.subject);

      if (impactRatio >= impactRatioThreshold) {
        bottlenecks.push({
          nodeId: node.id,
          nodeName: node.name,
          subject: node.subject,
          grade: node.grade,
          downstreamImpactCount: impactCount,
          impactRatio: Number(impactRatio.toFixed(3)),
          isCrossSubjectBottleneck: hasCrossSubject,
          dependentsSample: dependentChain.slice(0, 3).map(d => d.id)
        });
      }
    }

    // 影響度降順でソート
    bottlenecks.sort((a, b) => b.impactRatio - a.impactRatio);
    return bottlenecks;
  }

  /**
   * 孤立ノードおよびダングリング参照の自動修復（Edge Healing）
   */
  healOrphanNodes(options = {}) {
    const healLogs = [];
    let healedCount = 0;

    for (const node of this.nodes) {
      const validPrereqs = [];
      const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
      let modified = false;

      for (const pId of prereqs) {
        if (this.nodeMap.has(pId)) {
          validPrereqs.push(pId);
        } else {
          // 存在しない前提参照を削除
          healLogs.push(`[Healing] ノード ${node.id} から未定義前提 "${pId}" を安全に除去しました。`);
          modified = true;
          healedCount++;
        }
      }

      if (modified) {
        node.prerequisites = validPrereqs;
      }
    }

    // 到達不能ノードの自動接続
    const roots = this.getRoots();
    const reachable = new Set();
    const queue = roots.map(r => r.id);
    for (const rId of queue) reachable.add(rId);

    while (queue.length > 0) {
      const curr = queue.shift();
      const succs = this.adjList.get(curr) || [];
      for (const next of succs) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    for (const node of this.nodes) {
      if (!reachable.has(node.id)) {
        // 同一教科で直近の先行ノードを探索
        const candidateAncestors = this.nodes.filter(n => 
          n.id !== node.id && 
          n.subject === node.subject && 
          n.grade <= node.grade && 
          reachable.has(n.id)
        );

        if (candidateAncestors.length > 0) {
          // 学年が最も近いノードを選択
          candidateAncestors.sort((a, b) => b.grade - a.grade || b.bloomDepth - a.bloomDepth);
          const bestAncestor = candidateAncestors[0];
          node.prerequisites = Array.from(new Set([...(node.prerequisites || []), bestAncestor.id]));
          healLogs.push(`[Healing] 孤立ノード ${node.id} を同一教科の先行ノード ${bestAncestor.id} へ自動接続しました。`);
          healedCount++;
        }
      }
    }

    // グラフ再構築
    this.buildGraph(this.nodes);

    return {
      success: true,
      healedCount,
      logs: healLogs
    };
  }

  /**
   * 架橋ノード自動挿入（Bridge Node Insertion）
   * 認知断層が発生したノードの手前に、足場かけ（Scaffolding）用の補助ノードを動的挿入し、エッジを再配線する
   * 
   * @param {string} targetNodeId 対象ノードID（例: 'MATH_G5_RATIO'）
   * @param {object} bridgeNodeDef 挿入する架橋ノード定義
   * @returns {{ success: boolean, insertedNodeId: string, message: string }}
   */
  insertBridgeNode(targetNodeId, bridgeNodeDef) {
    if (!this.nodeMap.has(targetNodeId)) {
      throw new Error(`[GraphEngine] 対象ノード ${targetNodeId} が存在しません。`);
    }

    const targetNode = this.nodeMap.get(targetNodeId);
    const bridgeId = bridgeNodeDef.id || `${targetNodeId}_BRIDGE_${Date.now()}`;

    if (this.nodeMap.has(bridgeId)) {
      return { success: false, insertedNodeId: bridgeId, message: `ノード ${bridgeId} は既に存在します。` };
    }

    // 既存の前提を退避
    const originalPrereqs = [...(targetNode.prerequisites || [])];

    // 架橋ノードの作成
    const newBridgeNode = {
      id: bridgeId,
      subject: bridgeNodeDef.subject || targetNode.subject,
      subjectId: bridgeNodeDef.subjectId || targetNode.subjectId,
      grade: bridgeNodeDef.grade || targetNode.grade,
      name: bridgeNodeDef.name || `${targetNode.name}（基礎・視覚サポート）`,
      desc: bridgeNodeDef.desc || `${targetNode.name}の直観的理解を促す足場かけスモールステップ単元。`,
      bloomDepth: bridgeNodeDef.bloomDepth || Number(((targetNode.bloomDepth || 1.5) * 0.8).toFixed(2)),
      prerequisites: bridgeNodeDef.prerequisites || originalPrereqs,
      gameType: bridgeNodeDef.gameType || targetNode.gameType || 'KANJI_SLASH',
      gameData: bridgeNodeDef.gameData || { ...targetNode.gameData, isScaffolding: true },
      isBridgeNode: true,
      mextRef: bridgeNodeDef.mextRef || `${targetNode.mextRef || 'MEXT'}-SCAFFOLD`
    };

    // グラフへのノード追加
    this.nodes.push(newBridgeNode);

    // ターゲットノードの前提を架橋ノードに切り替え（または追加）
    targetNode.prerequisites = [bridgeId];

    // 再構築＆サイクル検証
    this.buildGraph(this.nodes);
    const cycleCheck = this.detectCycles();

    if (cycleCheck.hasCycle) {
      // ロールバック: filter the LIVE cloned node list, then restore prereqs on
      // the live target (not the stale pre-clone targetNode reference).
      this.nodes = this.nodes.filter(n => n.id !== bridgeId);
      const liveTarget = this.nodes.find(n => n.id === targetNodeId);
      if (liveTarget) {
        liveTarget.prerequisites = [...originalPrereqs];
      }
      this.buildGraph(this.nodes);
      throw new Error(`[GraphEngine] 架橋ノード挿入により閉路が発生したためロールバックしました: ${JSON.stringify(cycleCheck.cycles)}`);
    }

    const mutationRecord = {
      type: 'INSERT_BRIDGE_NODE',
      timestamp: new Date().toISOString(),
      targetNodeId,
      insertedBridgeId: bridgeId,
      bridgeNode: newBridgeNode
    };
    this.mutationHistory.push(mutationRecord);

    return {
      success: true,
      insertedNodeId: bridgeId,
      bridgeNode: newBridgeNode,
      message: `架橋補助ノード ${bridgeId} を ${targetNodeId} の直前に正常挿入しました。`
    };
  }

  /**
   * 前提依存エッジの安全な再配線（Rewiring）
   */
  rewirePrerequisites(targetNodeId, newPrerequisites) {
    if (!this.nodeMap.has(targetNodeId)) {
      return { success: false, reason: `ノード ${targetNodeId} が存在しません。` };
    }

    const targetNode = this.nodeMap.get(targetNodeId);
    const previousPrereqs = [...(targetNode.prerequisites || [])];

    // 一時適用
    targetNode.prerequisites = [...newPrerequisites];
    this.buildGraph(this.nodes);

    const cycleCheck = this.detectCycles();
    if (cycleCheck.hasCycle) {
      // ロールバック: buildGraph() deep-clones, so targetNode is a stale pre-clone
      // object. Restore prerequisites on the LIVE clone that detectCycles/nodeMap use.
      const liveNode = this.nodeMap.get(targetNodeId);
      if (liveNode) {
        liveNode.prerequisites = [...previousPrereqs];
      }
      this.buildGraph(this.nodes);
      return {
        success: false,
        reason: 'CYCLE_WOULD_BE_CREATED',
        cycles: cycleCheck.cycles
      };
    }

    const appliedNode = this.nodeMap.get(targetNodeId) || targetNode;
    this.mutationHistory.push({
      type: 'REWIRE_PREREQUISITES',
      timestamp: new Date().toISOString(),
      targetNodeId,
      oldPrerequisites: previousPrereqs,
      newPrerequisites: appliedNode.prerequisites
    });

    return {
      success: true,
      targetNodeId,
      prerequisites: appliedNode.prerequisites
    };
  }

  /**
   * 難易度パラメータの平滑化・動的補正（Adaptive Remediation）
   */
  smoothDifficultyGradient(targetNodeId, remediationParams = {}) {
    if (!this.nodeMap.has(targetNodeId)) {
      return { success: false, reason: `ノード ${targetNodeId} が存在しません。` };
    }

    const targetNode = this.nodeMap.get(targetNodeId);
    const oldParams = { ...targetNode.gameData };

    targetNode.gameData = {
      ...(targetNode.gameData || {}),
      speedMultiplier: remediationParams.speedMultiplier || 0.85,
      hitboxPadding: remediationParams.hitboxPadding || 1.25,
      timeLimitSec: remediationParams.timeLimitSec || 90,
      hintTriggerErrorCount: remediationParams.hintTriggerErrorCount || 2,
      toleranceMargin: remediationParams.toleranceMargin || 5
    };

    if (remediationParams.bloomDepthAdjustment) {
      targetNode.bloomDepth = Math.max(1.0, (targetNode.bloomDepth || 1.5) + remediationParams.bloomDepthAdjustment);
    }

    this.mutationHistory.push({
      type: 'SMOOTH_DIFFICULTY',
      timestamp: new Date().toISOString(),
      targetNodeId,
      oldParams,
      newParams: targetNode.gameData
    });

    return {
      success: true,
      targetNodeId,
      gameData: targetNode.gameData
    };
  }

  /**
   * AI Agent 指令（Mutation Directive）の適用と検証
   */
  applyMutationDirective(directive) {
    const results = [];
    const mutations = Array.isArray(directive.mutations) ? directive.mutations : [];

    for (const mut of mutations) {
      try {
        if (mut.operation === 'INSERT_NODE') {
          const res = this.insertBridgeNode(mut.placement?.before_node || mut.target_node, mut.node);
          results.push(res);
        } else if (mut.operation === 'UPDATE_EDGE') {
          const res = this.rewirePrerequisites(mut.node_id, mut.new_prerequisites);
          results.push(res);
        } else if (mut.operation === 'ADJUST_DIFFICULTY') {
          const res = this.smoothDifficultyGradient(mut.target_node, mut.parameters);
          results.push(res);
        } else if (mut.operation === 'HEAL_GRAPH') {
          const res = this.healOrphanNodes();
          results.push(res);
        }
      } catch (err) {
        results.push({ success: false, error: err.message, mutation: mut });
      }
    }

    const validation = this.validateDAG();
    return {
      directiveId: directive.directive_id || `MUT-${Date.now()}`,
      appliedCount: results.filter(r => r.success).length,
      results,
      postValidation: validation
    };
  }

  /**
   * 現在のグラフ状態のスナップショット出力
   */
  exportDAGSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      totalNodes: this.nodeMap.size,
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      validation: this.validateDAG(),
      mutationHistory: [...this.mutationHistory]
    };
  }
}
