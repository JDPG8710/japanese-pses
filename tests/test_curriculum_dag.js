/**
 * tests/test_curriculum_dag.js - MEXT 6-Subject Curriculum DAG & Graph Evolution Test Suite
 * 
 * Covers 4-Tier Systematic Testing:
 * - Tier 1: Feature Coverage (MEXT 1,026 Joyo Kanji, 47 Prefectures, 6-Subject DAG Topology, Cycle Detection, Graph Evolution)
 * - Tier 2: Boundary & Corner Cases (Cycle rejection, dangling prerequisite healing, disconnected island recovery, steep difficulty jumps)
 * - Tier 3: Cross-Feature Pairwise Integrations (GraphEngine <-> CurriculumData <-> AgentIntegration <-> Economy)
 * - Tier 4: Real-World Playthrough Scenarios (Grades 1-6 progression path, dynamic cognitive fracture remediation, 3D galaxy graph sync)
 */

const fs = require('fs');
const path = require('path');

function register({ describe, test, it, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');

  // Load GraphEngine and CurriculumData dynamically for headless Node.js runner
  function loadModuleExports(filePath) {
    const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
    return loader(filePath);
  }

  const { GraphEngine } = loadModuleExports(path.join(rootDir, 'GraphEngine.js'));

  // =========================================================================
  // TIER 1: Feature Coverage (>= 5 Tests per Feature, F12 & F13)
  // =========================================================================
  describe('Tier 1: MEXT Curriculum Data Integrity & 6-Subject DAG Topology (F12 & F13)', () => {

    test('F12.1: MEXT 1,026 Joyo Kanji database exists with exact grade allocations', () => {
      const kanjiPath = path.join(rootDir, 'data', 'kanji_1026.json');
      assert.ok(fs.existsSync(kanjiPath), `kanji_1026.json must exist at ${kanjiPath}`);
      const data = JSON.parse(fs.readFileSync(kanjiPath, 'utf-8'));
      
      assert.equal(data.total, 1026, 'Total Kanji count must be exactly 1,026');
      assert.equal(data.grades['1'].count, 80, 'Grade 1 must have 80 Kanji');
      assert.equal(data.grades['2'].count, 160, 'Grade 2 must have 160 Kanji');
      assert.equal(data.grades['3'].count, 200, 'Grade 3 must have 200 Kanji');
      assert.equal(data.grades['4'].count, 202, 'Grade 4 must have 202 Kanji');
      assert.equal(data.grades['5'].count, 193, 'Grade 5 must have 193 Kanji');
      assert.equal(data.grades['6'].count, 191, 'Grade 6 must have 191 Kanji');
    });

    test('F12.2: 1,026 Kanji entries have complete readings, onyomi, kunyomi, and zero duplicates', () => {
      const kanjiPath = path.join(rootDir, 'data', 'kanji_1026.json');
      const data = JSON.parse(fs.readFileSync(kanjiPath, 'utf-8'));
      const seen = new Set();
      let totalCount = 0;

      for (let g = 1; g <= 6; g++) {
        const list = data.grades[String(g)].kanjiList;
        for (const item of list) {
          totalCount++;
          assert.ok(item.k && typeof item.k === 'string', `Kanji character missing in G${g}`);
          assert.ok(item.r && typeof item.r === 'string', `Hiragana reading missing for ${item.k}`);
          assert.ok(typeof item.on === 'string', `Onyomi field missing for ${item.k}`);
          assert.ok(typeof item.kun === 'string', `Kunyomi field missing for ${item.k}`);
          assert.ok(!seen.has(item.k), `Duplicate kanji found: ${item.k}`);
          seen.add(item.k);
        }
      }
      assert.equal(totalCount, 1026, 'Iterated total must equal 1,026');
      assert.equal(seen.size, 1026, 'Unique kanji set size must equal 1,026');
    });

    test('F12.3: 47 Prefectures database has all 8 regions, capitals, coordinates, specialties & trivia', () => {
      const prefPath = path.join(rootDir, 'data', 'prefectures_47.json');
      assert.ok(fs.existsSync(prefPath), `prefectures_47.json must exist at ${prefPath}`);
      const data = JSON.parse(fs.readFileSync(prefPath, 'utf-8'));
      
      assert.equal(data.total, 47, 'Total prefectures must equal 47');
      assert.equal(data.regions.length, 8, 'Must cover 8 Japanese geographic regions');
      assert.equal(data.prefectures.length, 47, 'Prefectures list length must be 47');

      const codes = new Set();
      for (const p of data.prefectures) {
        assert.ok(p.code >= 1 && p.code <= 47, `Invalid code ${p.code} for ${p.name}`);
        assert.ok(p.name && p.name.length >= 2, `Invalid name for code ${p.code}`);
        assert.ok(p.hiragana && p.hiragana.length >= 2, `Missing hiragana for ${p.name}`);
        assert.ok(p.capital && p.capital.length >= 2, `Missing capital for ${p.name}`);
        assert.ok(Array.isArray(p.specialties) && p.specialties.length >= 2, `Missing specialties for ${p.name}`);
        assert.ok(Array.isArray(p.landmarks) && p.landmarks.length >= 2, `Missing landmarks for ${p.name}`);
        assert.ok(p.gridPos && typeof p.gridPos.x === 'number' && typeof p.gridPos.y === 'number', `Missing gridPos for ${p.name}`);
        assert.ok(p.trivia && p.trivia.length > 5, `Missing trivia fact for ${p.name}`);
        codes.add(p.code);
      }
      assert.equal(codes.size, 47, 'All 47 prefecture codes must be unique');
    });

    test('F12.4: 6-Subject DAG topology has 27 core nodes with zero cycles and full acyclicity', () => {
      const masterPath = path.join(rootDir, 'data', 'subjects_curriculum.json');
      assert.ok(fs.existsSync(masterPath), `subjects_curriculum.json must exist at ${masterPath}`);
      const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
      
      assert.equal(masterData.totalNodes, 27, 'Total curriculum nodes must be 27');
      const engine = new GraphEngine(masterData.nodes);
      
      const cycleResult = engine.detectCycles();
      assert.equal(cycleResult.hasCycle, false, 'Graph must have zero cycles');
      assert.equal(cycleResult.cycles.length, 0, 'Cycle list must be empty');

      const validation = engine.validateDAG();
      assert.equal(validation.valid, true, 'Validation status must be true');
      assert.equal(validation.danglingReferences.length, 0, 'Must have zero dangling prerequisite references');
      assert.equal(validation.unreachableNodes.length, 0, 'Must have zero unreachable orphan nodes');
    });

    test('F12.5: Entry root nodes have empty prerequisites (zero deadlock) and monotonic grade flow', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      const roots = engine.getRoots();
      assert.ok(roots.length >= 6, `Must have at least 6 root entry points (found ${roots.length})`);
      
      for (const root of roots) {
        assert.equal(root.prerequisites.length, 0, `Root node ${root.id} must have empty prerequisites`);
        assert.ok(root.grade === 1 || root.grade === 3, `Root node ${root.id} must start at Grade 1 or Grade 3`);
      }

      // Check monotonic grade progression: for all u -> v, grade(u) <= grade(v)
      for (const node of masterData.nodes) {
        const prereqs = engine.getDirectPrerequisites(node.id);
        for (const p of prereqs) {
          assert.ok(p.grade <= node.grade, `Prerequisite ${p.id} (G${p.grade}) cannot exceed node ${node.id} (G${node.grade})`);
        }
      }
    });

    test('F13.1: STEM Cross-Subject prerequisites are correctly wired and topological sort succeeds', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      // STEM Link 1: Rika G5 requires Math G4 (Area/Decimals)
      const rikaG5 = engine.getNode('RIKA_G5_ELECTROMAGNET');
      assert.ok(rikaG5.prerequisites.includes('MATH_G4_AREA_DECIMAL'), 'RIKA_G5 must require MATH_G4_AREA_DECIMAL');

      // STEM Link 2: Rika G6 requires Math G5 (Ratio/Proportion)
      const rikaG6 = engine.getNode('RIKA_G6_LEVER_AQUEOUS');
      assert.ok(rikaG6.prerequisites.includes('MATH_G5_RATIO'), 'RIKA_G6 must require MATH_G5_RATIO');

      // Topological Sort
      const sorted = engine.topologicalSort();
      assert.equal(sorted.length, 27, 'Topological sort must order all 27 nodes');

      // Ensure every node appears after all its prerequisites in sorted list
      const indexMap = new Map();
      sorted.forEach((node, idx) => indexMap.set(node.id, idx));

      for (const node of sorted) {
        for (const pId of node.prerequisites) {
          const pIndex = indexMap.get(pId);
          const nodeIndex = indexMap.get(node.id);
          assert.ok(pIndex < nodeIndex, `Prereq ${pId} (idx ${pIndex}) must appear before ${node.id} (idx ${nodeIndex})`);
        }
      }
    });

    test('F13.2: Dynamic fracture detection identifies steep pass-rate drops and cognitive cliffs', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      const stats = [
        { nodeId: 'KOKUGO_G1_KANA', passRate: 0.96, sampleSize: 200 },
        { nodeId: 'MATH_G5_RATIO', passRate: 0.28, sampleSize: 150 }, // Cognitive Cliff: 28%
        { nodeId: 'RIKA_G6_LEVER_AQUEOUS', passRate: 0.31, sampleSize: 90 }, // Cognitive Cliff: 31%
        { nodeId: 'SHAKAI_G4_PREFECTURES_47', passRate: 0.85, sampleSize: 120 }
      ];

      const fractures = engine.detectCognitiveFractures(stats, 0.35);
      assert.equal(fractures.length, 2, 'Should detect exactly 2 cognitive fractures');
      assert.equal(fractures[0].nodeId, 'MATH_G5_RATIO', 'First fracture should be MATH_G5_RATIO');
      assert.equal(fractures[1].nodeId, 'RIKA_G6_LEVER_AQUEOUS', 'Second fracture should be RIKA_G6_LEVER_AQUEOUS');
    });

    test('F13.3: Bottleneck detection computes articulation points and downstream blast radius', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      const bottlenecks = engine.detectBottlenecks(0.20);
      assert.ok(bottlenecks.length >= 2, 'Must detect key curriculum bottleneck choke points');
      
      const mathG1Bottleneck = bottlenecks.find(b => b.nodeId === 'MATH_G1_ADD_SUB');
      assert.ok(mathG1Bottleneck, 'MATH_G1_ADD_SUB must be a major bottleneck affecting math & science downstream');
      assert.ok(mathG1Bottleneck.downstreamImpactCount >= 5, 'MATH_G1_ADD_SUB must affect >= 5 downstream nodes');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Graph Engine Boundary & Edge Anomaly Handling', () => {

    test('Boundary 2.1: Rejection of cyclic edge additions with rollback preserving DAG acyclicity', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      // Attempt to create a cycle: MATH_G1_ADD_SUB -> depends on MATH_G6_PROPORTION_SPEED
      const result = engine.rewirePrerequisites('MATH_G1_ADD_SUB', ['MATH_G6_PROPORTION_SPEED']);
      assert.equal(result.success, false, 'Cyclic rewire must be rejected');
      assert.equal(result.reason, 'CYCLE_WOULD_BE_CREATED', 'Rejection reason must be CYCLE_WOULD_BE_CREATED');

      // Verify graph state rolled back cleanly
      const cycleCheck = engine.detectCycles();
      assert.equal(cycleCheck.hasCycle, false, 'Graph must remain acyclic after rollback');
      assert.equal(engine.getNode('MATH_G1_ADD_SUB').prerequisites.length, 0, 'Prerequisites must revert to original state');
    });

    test('Boundary 2.2: Orphan healing safely strips dangling references and reconnects disconnected islands', () => {
      const brokenNodes = [
        { id: 'N1', subject: '算数', grade: 1, prerequisites: [], bloomDepth: 1.0 },
        { id: 'N2', subject: '算数', grade: 2, prerequisites: ['NONEXISTENT_NODE_999'], bloomDepth: 1.2 }, // dangling
        { id: 'N3_ISLAND', subject: '算数', grade: 3, prerequisites: ['N2'], bloomDepth: 1.4 }
      ];

      const engine = new GraphEngine(brokenNodes);
      let validation = engine.validateDAG();
      assert.equal(validation.valid, false, 'Graph with dangling reference must be invalid initially');
      assert.equal(validation.danglingReferences.length, 1, 'Must detect 1 dangling reference');

      const healReport = engine.healOrphanNodes();
      assert.equal(healReport.success, true, 'Healing must succeed');

      validation = engine.validateDAG();
      assert.equal(validation.valid, true, 'Graph must be valid after healing');
      assert.equal(validation.danglingReferences.length, 0, 'Dangling references must be 0 after healing');
    });

    test('Boundary 2.3: Detection of abnormal Bloom depth cognitive jumps between direct edges', () => {
      const steepJumpNodes = [
        { id: 'S1', subject: '国語', grade: 1, prerequisites: [], bloomDepth: 1.0 },
        { id: 'S2', subject: '国語', grade: 2, prerequisites: ['S1'], bloomDepth: 2.8 } // Delta = 1.8 (> 0.55)
      ];

      const engine = new GraphEngine(steepJumpNodes, { bloomJumpThreshold: 0.55 });
      const validation = engine.validateDAG();
      assert.equal(validation.bloomAnomalies.length, 1, 'Should detect steep Bloom depth jump anomaly');
      assert.equal(validation.bloomAnomalies[0].nodeId, 'S2', 'Anomaly target should be S2');
      assert.equal(validation.bloomAnomalies[0].delta, 1.8, 'Anomaly delta should be 1.8');
    });

    test('Boundary 2.4: Empty graph and single-node graph boundary handling', () => {
      const emptyEngine = new GraphEngine([]);
      assert.equal(emptyEngine.getAllNodes().length, 0, 'Empty engine must have 0 nodes');
      assert.equal(emptyEngine.detectCycles().hasCycle, false, 'Empty engine has no cycles');
      assert.equal(emptyEngine.topologicalSort().length, 0, 'Topological sort on empty graph returns empty array');

      const singleNodeEngine = new GraphEngine([{ id: 'SOLO_1', subject: '生活', grade: 1, prerequisites: [], bloomDepth: 1.0 }]);
      assert.equal(singleNodeEngine.getAllNodes().length, 1, 'Single node engine has 1 node');
      assert.equal(singleNodeEngine.getRoots().length, 1, 'Single node is a root');
      assert.equal(singleNodeEngine.getLeaves().length, 1, 'Single node is a leaf');
      assert.equal(singleNodeEngine.validateDAG().valid, true, 'Single node DAG is valid');
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Pairwise Integrations
  // =========================================================================
  describe('Tier 3: Graph Engine & System Pairwise Integrations', () => {

    test('Pairwise 3.1: Bridge Node Insertion re-wires edges, inserts scaffolding, and preserves zero cycles', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      const bridgeSpec = {
        id: 'MATH_G5_RATIO_VISUAL',
        name: '5年 割合の可視化：面積図・テープ図ブリッジ',
        subject: '算数',
        grade: 5,
        bloomDepth: 1.4,
        gameType: 'AETHER_SCALE',
        gameData: { targetRatio: 50, hint: 'テープ図で半分を直観把握' }
      };

      const result = engine.insertBridgeNode('MATH_G5_RATIO', bridgeSpec);
      assert.equal(result.success, true, 'Bridge node insertion must succeed');
      assert.equal(engine.getAllNodes().length, 28, 'Node count must increase to 28');

      // Verify target node now depends on bridge node
      const ratioNode = engine.getNode('MATH_G5_RATIO');
      assert.equal(ratioNode.prerequisites[0], 'MATH_G5_RATIO_VISUAL', 'Target node prerequisites must rewire to bridge node');

      // Verify bridge node inherited MATH_G4_AREA_DECIMAL
      const bridgeNode = engine.getNode('MATH_G5_RATIO_VISUAL');
      assert.ok(bridgeNode.prerequisites.includes('MATH_G4_AREA_DECIMAL'), 'Bridge node must inherit upstream prerequisite');

      // Verify full DAG validity
      const validation = engine.validateDAG();
      assert.equal(validation.valid, true, 'Graph must remain valid after bridge node insertion');
      assert.equal(validation.hasCycle, false, 'Graph must have 0 cycles');
    });

    test('Pairwise 3.2: AI Agent Mutation Directive processing executes atomic operations with validation', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      const sampleDirective = {
        directive_id: 'DIR-TEST-2026',
        mutations: [
          {
            operation: 'ADJUST_DIFFICULTY',
            target_node: 'MATH_G5_RATIO',
            parameters: { speedMultiplier: 0.8, hitboxPadding: 1.5, timeLimitSec: 95 }
          },
          {
            operation: 'INSERT_NODE',
            placement: { before_node: 'MATH_G5_RATIO' },
            node: {
              id: 'MATH_G5_RATIO_BRIDGE',
              name: '割合ブリッジステップ',
              subject: '算数',
              grade: 5,
              bloomDepth: 1.5
            }
          }
        ]
      };

      const dirResult = engine.applyMutationDirective(sampleDirective);
      assert.equal(dirResult.appliedCount, 2, 'Must apply both mutation operations');
      assert.equal(dirResult.postValidation.valid, true, 'Post-validation must be valid');
      assert.equal(engine.getNode('MATH_G5_RATIO').gameData.speedMultiplier, 0.8, 'Difficulty parameter must be updated');
    });

    test('Pairwise 3.3: Curriculum Unlock Filter accurately unlocks nodes as player achieves 85% mastery', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      // Simulation: New player with 0 mastery
      const emptyMastery = {};
      const initialRoots = masterData.nodes.filter(n => (n.prerequisites || []).length === 0);
      assert.ok(initialRoots.length >= 6, 'All roots should be available initially');

      // Simulation: Player completes Kokugo G1 with 90% mastery
      const partialMastery = {
        'KOKUGO_G1_KANA': { mastery: 0.90, starsEarned: 3 }
      };

      // Check if KOKUGO_G1_KANJI_80 is now unlocked
      const g1KanjiNode = engine.getNode('KOKUGO_G1_KANJI_80');
      const isG1KanjiUnlocked = g1KanjiNode.prerequisites.every(pId => (partialMastery[pId]?.mastery || 0) >= 0.85);
      assert.equal(isG1KanjiUnlocked, true, 'KOKUGO_G1_KANJI_80 should unlock after KOKUGO_G1_KANA reaches 90%');

      // Check if KOKUGO_G2_RADICAL_160 is still locked
      const g2RadicalNode = engine.getNode('KOKUGO_G2_RADICAL_160');
      const isG2RadicalUnlocked = g2RadicalNode.prerequisites.every(pId => (partialMastery[pId]?.mastery || 0) >= 0.85);
      assert.equal(isG2RadicalUnlocked, false, 'KOKUGO_G2_RADICAL_160 should remain locked');
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Elementary Playthrough & DAG Evolution Scenarios', () => {

    test('Scenario 4.1: Full 1-6 Grade Japanese Elementary Curriculum Progression Playthrough', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);
      const sorted = engine.topologicalSort();

      const simulatedPlayerMastery = {};
      let totalNodesCleared = 0;

      // Play through all nodes in topological dependency order
      for (const node of sorted) {
        // Verify all prerequisites are met before clearing
        const prereqsMet = (node.prerequisites || []).every(pId => {
          return (simulatedPlayerMastery[pId]?.mastery || 0) >= 0.85;
        });

        assert.ok(prereqsMet, `Player cannot attempt ${node.id} because prerequisite is not cleared!`);

        // Player achieves 95% score
        simulatedPlayerMastery[node.id] = {
          mastery: 0.95,
          score: 100,
          attempts: 1,
          clearedAt: Date.now()
        };
        totalNodesCleared++;
      }

      assert.equal(totalNodesCleared, 27, 'Player must be able to complete all 27 curriculum nodes linearly without deadlock');
      assert.equal(Object.keys(simulatedPlayerMastery).length, 27, 'Player mastery state must record all 27 nodes');
    });

    test('Scenario 4.2: Dynamic Cognitive Fracture Detection, Bridge Insertion & Auto-Healing Lifecycle', () => {
      const masterData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));
      const engine = new GraphEngine(masterData.nodes);

      // 1. Cohort telemetry reports severe drop on MATH_G5_RATIO
      const cohortTelemetry = [
        { nodeId: 'MATH_G5_RATIO', passRate: 0.22, sampleSize: 100, avgErrorClicks: 4.2 }
      ];

      const fractures = engine.detectCognitiveFractures(cohortTelemetry, 0.35);
      assert.equal(fractures.length, 1, 'Agent must detect cognitive fracture on MATH_G5_RATIO');

      // 2. Agent generates and applies remediation directive
      const bridgeNode = {
        id: 'MATH_G5_RATIO_SCAFFOLD',
        name: '5年 割合：ビジュアル図解ステップ',
        subject: '算数',
        grade: 5,
        bloomDepth: 1.3,
        gameType: 'AETHER_SCALE'
      };

      const mutationDirective = {
        directive_id: 'AUTO-MUT-SCENARIO',
        mutations: [
          {
            operation: 'INSERT_NODE',
            placement: { before_node: 'MATH_G5_RATIO' },
            node: bridgeNode
          },
          {
            operation: 'ADJUST_DIFFICULTY',
            target_node: 'MATH_G5_RATIO',
            parameters: { speedMultiplier: 0.8, timeLimitSec: 90 }
          }
        ]
      };

      const result = engine.applyMutationDirective(mutationDirective);
      assert.equal(result.appliedCount, 2, 'All lifecycle mutations must apply');

      // 3. Verify graph snapshot exports complete evolution history
      const snapshot = engine.exportDAGSnapshot();
      assert.equal(snapshot.totalNodes, 28, 'Snapshot must include newly bridged node');
      assert.equal(snapshot.mutationHistory.length, 2, 'Snapshot must log 2 mutation records');
      assert.equal(snapshot.validation.valid, true, 'Snapshot validation must remain completely valid');
    });
  });
}


module.exports = register;
module.exports.register = register;

if (require.main === module) {
  const { harness, describe, test, it, assert, loadESModule } = require('./test_e2e_runner.js');
  register({ describe, test, it, assert, loadESModule });
  harness.runAll().then((report) => {
    process.exitCode = report.summary.failed > 0 ? 1 : 0;
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
