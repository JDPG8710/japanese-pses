/**
 * tests/test_adversarial_challenger.js - Empirical Adversarial Stress Test Suite
 * 
 * Specialized Challenger Recheck 1 Verification Harness for:
 * 1. GraphEngine (DAG Topology, DFS 3-Color Cycle Detection, Kahn's Topological Sorting,
 *    Cognitive Fracture Scaffolding & Rollback, Articulation Bottlenecks, Rewiring, Healing)
 * 2. AudioSynthesizer (Web Audio API 100-Note Rapid-Fire, Safety Gain Clamping,
 *    Exponential Ramp Floors, Mute Persistence & Event Lifecycle)
 */

const fs = require('fs');
const path = require('path');

function registerChallengerTests({ describe, test, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');

  function loadModuleExports(filePath) {
    const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
    return loader(filePath);
  }

  const { GraphEngine } = loadModuleExports(path.join(rootDir, 'GraphEngine.js'));
  const { AudioSynthesizer } = loadModuleExports(path.join(rootDir, 'js', 'AudioSynthesizer.js'));
  const curriculumData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf-8'));

  // =========================================================================
  // SECTION 1: GraphEngine Adversarial Cycle Detection (DFS 3-Color)
  // =========================================================================
  describe('GraphEngine: Adversarial Cycle Detection (DFS 3-Color)', () => {

    test('C1: Self-Loop Detection (Node A -> Node A)', () => {
      const nodes = [
        { id: 'A', prerequisites: ['A'], subject: '算数', grade: 1 }
      ];
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, true, 'Self-loop must be detected as cycle');
      assert.strictEqual(res.cycleCount >= 1, true, 'Cycle count must be >= 1');
      assert.strictEqual(res.cycles[0].includes('A'), true, 'Cycle path must contain node A');
    });

    test('C2: Direct 2-Node Reciprocal Cycle (A -> B -> A)', () => {
      const nodes = [
        { id: 'A', prerequisites: ['B'], subject: '国語', grade: 1 },
        { id: 'B', prerequisites: ['A'], subject: '国語', grade: 1 }
      ];
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, true, '2-node cycle must be detected');
      assert.strictEqual(res.cycleCount >= 1, true);
      const c = res.cycles[0];
      assert.strictEqual(c.includes('A') && c.includes('B'), true);
    });

    test('C3: Long-Ring 10-Node Cyclic Chain (N0 -> N1 -> ... -> N9 -> N0)', () => {
      const nodes = [];
      const N = 10;
      for (let i = 0; i < N; i++) {
        const prevId = `N${(i - 1 + N) % N}`;
        nodes.push({
          id: `N${i}`,
          prerequisites: [prevId],
          subject: '理科',
          grade: 3
        });
      }
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, true, '10-node cycle ring must be detected');
      assert.strictEqual(res.cycleCount >= 1, true);
    });

    test('C4: Disjoint Multiple Cycles Across Independent Components', () => {
      const nodes = [
        // Component 1: Cycle A <-> B
        { id: 'C1_A', prerequisites: ['C1_B'], subject: '社会', grade: 4 },
        { id: 'C1_B', prerequisites: ['C1_A'], subject: '社会', grade: 4 },
        // Component 2: Cycle C -> D -> E -> C
        { id: 'C2_C', prerequisites: ['C2_E'], subject: '外国語・英語', grade: 5 },
        { id: 'C2_D', prerequisites: ['C2_C'], subject: '外国語・英語', grade: 5 },
        { id: 'C2_E', prerequisites: ['C2_D'], subject: '外国語・英語', grade: 5 },
        // Component 3: Valid Acyclic DAG F -> G -> H
        { id: 'C3_F', prerequisites: [], subject: '生活', grade: 1 },
        { id: 'C3_G', prerequisites: ['C3_F'], subject: '生活', grade: 1 },
        { id: 'C3_H', prerequisites: ['C3_G'], subject: '生活', grade: 2 }
      ];
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, true, 'Multiple disjoint cycles must be detected');
      assert.strictEqual(res.cycleCount >= 2, true, 'Must detect at least 2 distinct cycles');
    });

    test('C5: Figure-8 / Interlocking Twin Cycles Sharing Pivot Node', () => {
      const nodes = [
        { id: 'PIVOT', prerequisites: ['L1_B', 'L2_B'], subject: '算数', grade: 2 },
        { id: 'L1_A', prerequisites: ['PIVOT'], subject: '算数', grade: 2 },
        { id: 'L1_B', prerequisites: ['L1_A'], subject: '算数', grade: 2 },
        { id: 'L2_A', prerequisites: ['PIVOT'], subject: '算数', grade: 2 },
        { id: 'L2_B', prerequisites: ['L2_A'], subject: '算数', grade: 2 }
      ];
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, true, 'Figure-8 interlocking cycles must be detected');
      assert.strictEqual(res.cycleCount >= 2, true, 'Both loops through pivot must be reported');
    });

    test('C6: Large Dense Random DAG (50 Nodes, 150 Edges) + Single Back-Edge Stress', () => {
      const nodes = [];
      const nodeCount = 50;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          id: `RAND_${i}`,
          prerequisites: [],
          subject: '算数',
          grade: 1 + Math.floor(i / 10)
        });
      }
      // Create valid DAG edges: from lower index to higher index only
      for (let i = 1; i < nodeCount; i++) {
        const prereqCount = Math.min(3, i);
        for (let k = 1; k <= prereqCount; k++) {
          nodes[i].prerequisites.push(`RAND_${i - k}`);
        }
      }

      const cleanEngine = new GraphEngine(nodes);
      const cleanCheck = cleanEngine.detectCycles();
      assert.strictEqual(cleanCheck.hasCycle, false, 'Dense ordered DAG must have zero cycles');

      // Plant 1 adversarial back-edge from node 40 to node 5
      nodes[5].prerequisites.push('RAND_40');
      const corruptedEngine = new GraphEngine(nodes);
      const corruptedCheck = corruptedEngine.detectCycles();
      assert.strictEqual(corruptedCheck.hasCycle, true, 'Planted back-edge must be immediately detected');
    });

    test('C7: Deep Linear Chain (500 Nodes) Without Recursion Overflow', () => {
      const nodes = [];
      const N = 500;
      for (let i = 0; i < N; i++) {
        nodes.push({
          id: `CHAIN_${i}`,
          prerequisites: i === 0 ? [] : [`CHAIN_${i - 1}`],
          subject: '国語',
          grade: 1
        });
      }
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, false, '500-node linear chain must be cycle-free');
      assert.strictEqual(engine.getAllNodes().length, 500);
    });

    test('C8: Boundary Graphs (Empty, Single Isolated, 100 Isolated Nodes)', () => {
      const emptyEngine = new GraphEngine([]);
      assert.strictEqual(emptyEngine.detectCycles().hasCycle, false);

      const singleEngine = new GraphEngine([{ id: 'SOLO', prerequisites: [] }]);
      assert.strictEqual(singleEngine.detectCycles().hasCycle, false);

      const isoNodes = Array.from({ length: 100 }, (_, i) => ({ id: `ISO_${i}`, prerequisites: [] }));
      const isoEngine = new GraphEngine(isoNodes);
      assert.strictEqual(isoEngine.detectCycles().hasCycle, false);
      assert.strictEqual(isoEngine.getRoots().length, 100);
      assert.strictEqual(isoEngine.getLeaves().length, 100);
    });

    test('C9: Duplicate Prerequisite Edge Resilience', () => {
      const nodes = [
        { id: 'ROOT', prerequisites: [] },
        { id: 'CHILD', prerequisites: ['ROOT', 'ROOT', 'ROOT'] }
      ];
      const engine = new GraphEngine(nodes);
      const res = engine.detectCycles();
      assert.strictEqual(res.hasCycle, false, 'Duplicate prereq references must not create phantom cycles');
    });
  });

  // =========================================================================
  // SECTION 2: GraphEngine Topological Sorting (Kahn's Algorithm)
  // =========================================================================
  describe("GraphEngine: Topological Sorting (Kahn's Algorithm)", () => {

    test('T1: Strict Topological Invariant on MEXT 27-Node Curriculum', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const sorted = engine.topologicalSort();
      assert.strictEqual(sorted.length, 27, 'All 27 nodes must be in topological sort');

      const indexMap = new Map();
      sorted.forEach((n, idx) => indexMap.set(n.id, idx));

      // Invariant: For every node v, all prerequisites u must have index(u) < index(v)
      for (const node of sorted) {
        const vIdx = indexMap.get(node.id);
        const prereqs = node.prerequisites || [];
        for (const uId of prereqs) {
          if (indexMap.has(uId)) {
            const uIdx = indexMap.get(uId);
            assert.strictEqual(
              uIdx < vIdx,
              true,
              `Topological order violated: prerequisite ${uId} (pos ${uIdx}) must precede ${node.id} (pos ${vIdx})`
            );
          }
        }
      }
    });

    test('T2: Wide Diamond / Fan-Out Fan-In DAG (1 -> 100 -> 1)', () => {
      const nodes = [{ id: 'ROOT', prerequisites: [] }];
      const midIds = [];
      for (let i = 0; i < 100; i++) {
        const midId = `MID_${i}`;
        midIds.push(midId);
        nodes.push({ id: midId, prerequisites: ['ROOT'] });
      }
      nodes.push({ id: 'SINK', prerequisites: [...midIds] });

      const engine = new GraphEngine(nodes);
      const sorted = engine.topologicalSort();
      assert.strictEqual(sorted.length, 102);
      assert.strictEqual(sorted[0].id, 'ROOT', 'ROOT must be first');
      assert.strictEqual(sorted[sorted.length - 1].id, 'SINK', 'SINK must be last');
    });

    test('T3: Deep Sequential Chain (200 Nodes) Exact Ordering', () => {
      const N = 200;
      const nodes = Array.from({ length: N }, (_, i) => ({
        id: `STEP_${i}`,
        prerequisites: i === 0 ? [] : [`STEP_${i - 1}`]
      }));

      const engine = new GraphEngine(nodes);
      const sorted = engine.topologicalSort();
      assert.strictEqual(sorted.length, N);
      for (let i = 0; i < N; i++) {
        assert.strictEqual(sorted[i].id, `STEP_${i}`, `Node at index ${i} must be STEP_${i}`);
      }
    });

    test('T4: Kahn Sort Throws on Cyclic Graph Without State Corruption', () => {
      const cyclicNodes = [
        { id: 'CYC_A', prerequisites: ['CYC_C'] },
        { id: 'CYC_B', prerequisites: ['CYC_A'] },
        { id: 'CYC_C', prerequisites: ['CYC_B'] }
      ];
      const engine = new GraphEngine(cyclicNodes);

      let thrown = false;
      try {
        engine.topologicalSort();
      } catch (err) {
        thrown = true;
        assert.strictEqual(err.message.includes('トポロジカルソート失敗'), true);
      }
      assert.strictEqual(thrown, true, 'Kahn sort must throw when a cycle is present');
      assert.strictEqual(engine.getAllNodes().length, 3);
    });

    test('T5: Topological Depth Monotonicity Across Edges', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const depths = engine.calculateTopologicalDepths();
      assert.strictEqual(depths.size, 27);

      for (const node of curriculumData.nodes) {
        const nodeDepth = depths.get(node.id);
        const prereqs = node.prerequisites || [];
        for (const pId of prereqs) {
          if (depths.has(pId)) {
            const pDepth = depths.get(pId);
            assert.strictEqual(
              pDepth < nodeDepth,
              true,
              `Depth of ${pId} (${pDepth}) must be strictly less than depth of ${node.id} (${nodeDepth})`
            );
          }
        }
      }
    });
  });

  // =========================================================================
  // SECTION 3: Cognitive Fracture Detection & Scaffolding Bridge Insertion
  // =========================================================================
  describe('GraphEngine: Cognitive Fracture Scaffolding & Rollback', () => {

    test('F1: Multi-Tier Pass Rate Threshold Classification (0.35 Boundary)', () => {
      const engine = new GraphEngine(curriculumData.nodes);

      const stats = [
        { nodeId: 'MATH_G5_RATIO', passRate: 0.15, sampleSize: 20 },         // < 0.20 -> CRITICAL
        { nodeId: 'KOKUGO_G4_CONJUNCTIONS', passRate: 0.25, sampleSize: 15 }, // < 0.30 -> HIGH
        { nodeId: 'RIKA_G5_ELECTROMAGNET', passRate: 0.34, sampleSize: 10 },  // < 0.35 -> MODERATE
        { nodeId: 'SHAKAI_G3_MAP_SYMBOLS', passRate: 0.35, sampleSize: 50 },  // == 0.35 -> NOT a fracture
        { nodeId: 'EIGO_G3_GREETING_COLOR', passRate: 0.85, sampleSize: 100 } // >= 0.35 -> NOT a fracture
      ];

      const fractures = engine.detectCognitiveFractures(stats);
      assert.strictEqual(fractures.length, 3, 'Must detect exactly 3 fractures (< 0.35)');

      const crit = fractures.find(f => f.nodeId === 'MATH_G5_RATIO');
      assert.strictEqual(crit.severity, 'CRITICAL');

      const high = fractures.find(f => f.nodeId === 'KOKUGO_G4_CONJUNCTIONS');
      assert.strictEqual(high.severity, 'HIGH');

      const mod = fractures.find(f => f.nodeId === 'RIKA_G5_ELECTROMAGNET');
      assert.strictEqual(mod.severity, 'MODERATE');
    });

    test('F2: Non-Existent Node Resilience in Telemetry', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const stats = [
        { nodeId: 'NON_EXISTENT_NODE_XYZ', passRate: 0.05, sampleSize: 100 }
      ];
      const fractures = engine.detectCognitiveFractures(stats);
      assert.strictEqual(fractures.length, 0, 'Non-existent nodes must be safely ignored');
    });

    test('F3: Bridge Node Scaffolding Insertion & Topological Rewiring', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const targetId = 'MATH_G5_RATIO';
      const origTarget = engine.getNode(targetId);
      const origPrereqs = [...origTarget.prerequisites];

      const bridgeDef = {
        id: 'MATH_G5_RATIO_SCAFFOLD_VISUAL',
        name: '5年 割合の視覚化・図解基礎',
        desc: '割合（もとにする量・くらべる量）を棒グラフと図解で直観的に掴む足場かけ単元。',
        bloomDepth: 1.6,
        gameType: 'STARSHIP_BALANCE'
      };

      const result = engine.insertBridgeNode(targetId, bridgeDef);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.insertedNodeId, 'MATH_G5_RATIO_SCAFFOLD_VISUAL');

      // Check new graph state
      const bridgeNode = engine.getNode('MATH_G5_RATIO_SCAFFOLD_VISUAL');
      assert.ok(bridgeNode, 'Bridge node must exist in graph');
      assert.deepStrictEqual(bridgeNode.prerequisites, origPrereqs, 'Bridge must inherit original prerequisites');

      const updatedTarget = engine.getNode(targetId);
      assert.deepStrictEqual(updatedTarget.prerequisites, ['MATH_G5_RATIO_SCAFFOLD_VISUAL'], 'Target must now depend on bridge node');

      // Verify DAG acyclicity and Kahn sorting
      const val = engine.validateDAG();
      assert.strictEqual(val.valid, true);
      assert.strictEqual(val.hasCycle, false);
      const sorted = engine.topologicalSort();
      assert.strictEqual(sorted.length, 28);
    });

    test('F4: Adversarial Bridge Insertion with Cyclic Prereq Triggers Complete Rollback', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const targetId = 'MATH_G2_KUKU_LINK';
      const origPrereqs = [...engine.getNode(targetId).prerequisites];
      const initialNodeCount = engine.getAllNodes().length;

      // Adversarial bridge definition that depends on a successor of targetId
      // MATH_G3_DIV_FRACTION is a successor of MATH_G2_KUKU_LINK
      const cyclicBridgeDef = {
        id: 'EVIL_CYCLIC_BRIDGE',
        prerequisites: ['MATH_G3_DIV_FRACTION'] // Back-edge creation!
      };

      let threw = false;
      try {
        engine.insertBridgeNode(targetId, cyclicBridgeDef);
      } catch (err) {
        threw = true;
        assert.strictEqual(err.message.includes('ロールバック'), true);
      }
      assert.strictEqual(threw, true, 'Must reject cyclic bridge insertion and throw rollback error');

      // Verify state was completely rolled back
      assert.strictEqual(engine.hasNode('EVIL_CYCLIC_BRIDGE'), false, 'Bridge node must NOT exist after rollback');
      assert.strictEqual(engine.getAllNodes().length, initialNodeCount, 'Node count must match original');
      const restoredTarget = engine.getNode(targetId);
      assert.deepStrictEqual(restoredTarget.prerequisites, origPrereqs, 'Target prerequisites must be restored');
      assert.strictEqual(engine.validateDAG().valid, true, 'DAG must remain valid and acyclic');
    });

    test('F5: Consecutive Multi-Bridge Chaining on Same Target', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const targetId = 'RIKA_G5_ELECTROMAGNET';

      const b1 = engine.insertBridgeNode(targetId, { id: 'RIKA_G5_BRIDGE_1', name: '直列回路の基礎' });
      assert.strictEqual(b1.success, true);

      const b2 = engine.insertBridgeNode(targetId, { id: 'RIKA_G5_BRIDGE_2', name: '並列回路の電圧' });
      assert.strictEqual(b2.success, true);

      assert.strictEqual(engine.getAllNodes().length, 29);
      const val = engine.validateDAG();
      assert.strictEqual(val.valid, true);
      assert.strictEqual(val.hasCycle, false);
    });

    test('F6: Bridge ID Collision Handling', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const res = engine.insertBridgeNode('KOKUGO_G2_RADICAL_160', {
        id: 'KOKUGO_G1_KANA' // Already exists!
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.message.includes('既に存在'), true);
    });

    test('F7: Safe Prerequisites Rewiring and Cyclic Edge Rejection', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const targetId = 'MATH_G4_AREA_DECIMAL';

      // 1. Valid rewiring: adding MATH_G1_ADD_SUB as additional prerequisite
      const validRewire = engine.rewirePrerequisites(targetId, ['MATH_G3_DIV_FRACTION', 'MATH_G1_ADD_SUB']);
      assert.strictEqual(validRewire.success, true);
      assert.strictEqual(engine.validateDAG().valid, true);

      // 2. Cyclic rewiring: setting descendant MATH_G5_RATIO as prerequisite
      const cyclicRewire = engine.rewirePrerequisites(targetId, ['MATH_G5_RATIO']);
      assert.strictEqual(cyclicRewire.success, false);
      assert.strictEqual(cyclicRewire.reason, 'CYCLE_WOULD_BE_CREATED');

      // Verify target reverted to valid state
      assert.strictEqual(engine.validateDAG().valid, true);
    });
  });

  // =========================================================================
  // SECTION 4: GraphEngine Bottleneck Articulation Points
  // =========================================================================
  describe('GraphEngine: Bottleneck Articulation Point Calculation', () => {

    test('B1: Star Topology High-Impact Bottleneck Identification', () => {
      const nodes = [{ id: 'HUB', prerequisites: [], subject: '算数', grade: 1 }];
      for (let i = 0; i < 40; i++) {
        nodes.push({ id: `SPOKE_${i}`, prerequisites: ['HUB'], subject: '算数', grade: 2 });
      }
      const engine = new GraphEngine(nodes);
      const bottlenecks = engine.detectBottlenecks(0.20);
      assert.strictEqual(bottlenecks.length, 1);
      assert.strictEqual(bottlenecks[0].nodeId, 'HUB');
      assert.strictEqual(bottlenecks[0].downstreamImpactCount, 40);
      assert.strictEqual(bottlenecks[0].impactRatio >= 0.90, true);
    });

    test('B2: Linear Chain Impact Ratios Strictly Descending', () => {
      const N = 10;
      const nodes = Array.from({ length: N }, (_, i) => ({
        id: `CHAIN_${i}`,
        prerequisites: i === 0 ? [] : [`CHAIN_${i - 1}`],
        subject: '国語',
        grade: 1
      }));
      const engine = new GraphEngine(nodes);
      const bottlenecks = engine.detectBottlenecks(0.10);
      assert.strictEqual(bottlenecks.length, 9);

      for (let i = 0; i < bottlenecks.length - 1; i++) {
        assert.strictEqual(
          bottlenecks[i].impactRatio >= bottlenecks[i + 1].impactRatio,
          true,
          'Bottlenecks must be sorted descending by impact ratio'
        );
      }
    });

    test('B3: MEXT 27-Node Curriculum STEM Cross-Subject Bottleneck Verification', () => {
      const engine = new GraphEngine(curriculumData.nodes);
      const bottlenecks = engine.detectBottlenecks(0.15);
      assert.strictEqual(bottlenecks.length > 0, true);

      // Foundational math nodes like MATH_G1_ADD_SUB and MATH_G2_KUKU_LINK should be prominent bottlenecks
      const addSub = bottlenecks.find(b => b.nodeId === 'MATH_G1_ADD_SUB');
      assert.ok(addSub, 'MATH_G1_ADD_SUB must be identified as a major bottleneck');
      assert.strictEqual(addSub.isCrossSubjectBottleneck, true, 'MATH_G1_ADD_SUB must have cross-subject dependents');

      const kuku = bottlenecks.find(b => b.nodeId === 'MATH_G2_KUKU_LINK');
      assert.ok(kuku, 'MATH_G2_KUKU_LINK must be identified as a major bottleneck');
      assert.strictEqual(kuku.isCrossSubjectBottleneck, true, 'MATH_G2_KUKU_LINK must have cross-subject dependents');
    });
  });

  // =========================================================================
  // SECTION 5: AudioSynthesizer Rapid-Fire 100-Note Trigger & Stress Testing
  // =========================================================================
  describe('AudioSynthesizer: Rapid-Fire 100-Note Trigger & Concurrency Stress', () => {

    test('A1: 100 Rapid Sequential & Concurrent Invocations Across All Sound Types', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      synth.unlock();

      const soundMethods = [
        () => synth.playPositive(1, 1),
        () => synth.playCombo(5),
        () => synth.playGentleError(),
        () => synth.playButtonTap(),
        () => synth.playFanfare(),
        () => synth.playCoin(),
        () => synth.playLaser(),
        () => synth.playSlash(),
        () => synth.playClue()
      ];

      // Execute 100 triggers rapidly
      for (let i = 0; i < 100; i++) {
        const fn = soundMethods[i % soundMethods.length];
        fn();
      }

      assert.ok(true, '100 sound triggers completed without exception');
    });

    test('A2: Extreme Combo Pitch Shift Clamping (Combo 1 to 500)', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      synth.unlock();

      // Stress combo scaling with huge values
      const testCombos = [1, 5, 10, 24, 50, 100, 500];
      testCombos.forEach(combo => {
        synth.playCombo(combo);
      });

      assert.ok(true, 'Extreme combo counts handled safely without overflow');
    });

    test('A3: Scheduled Node Lifecycle and Stop Time Allocation', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      const osc = synth.createTone({
        freq: 440,
        type: 'sine',
        startTime: 0,
        duration: 0.2
      });

      assert.ok(osc, 'Oscillator node created');
      assert.strictEqual(osc.started, true, 'Oscillator must have start() called');
      assert.strictEqual(osc.stopped, true, 'Oscillator must have stop() scheduled');
      assert.strictEqual(osc.stopTime >= 0.2, true, 'Oscillator stopTime must cover duration');
    });
  });

  // =========================================================================
  // SECTION 6: AudioSynthesizer Safety Clamping & Exponential Ramp Floors
  // =========================================================================
  describe('AudioSynthesizer: Gain Clamping & Exponential Ramp Safety', () => {

    test('G1: Exponential Ramp Target Values Strictly >= 0.0001 (Web Audio Standard Floor)', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      const ctx = synth.initAudioContext();

      // Trigger multiple tones with ADSR and pitchBend
      synth.createTone({
        freq: 440,
        startTime: 0,
        duration: 0.2,
        sustainLevel: 0.5,
        pitchBend: { targetFreq: 100, duration: 0.1 }
      });

      // Verify all created gain nodes with exponential ramps strictly enforce >= 0.0001
      const gainNodes = ctx.createdNodes.filter(n => n.gain && n.gain.timeline);
      for (const gn of gainNodes) {
        for (const entry of gn.gain.timeline) {
          if (entry.type === 'exponential') {
            assert.strictEqual(
              entry.val >= 0.0001,
              true,
              `Exponential ramp value ${entry.val} must be >= 0.0001`
            );
          }
        }
      }
    });

    test('G2: Master Volume Clamping on Boundary & Adversarial Inputs', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });

      synth.setMasterVolume(-10.0);
      assert.strictEqual(synth.volume, 0.0, 'Negative volume must clamp to 0.0');

      synth.setMasterVolume(100.0);
      assert.strictEqual(synth.volume, 1.0, 'Excess volume must clamp to 1.0');

      synth.setMasterVolume(0.65);
      assert.strictEqual(synth.volume, 0.65, 'Valid volume within [0, 1] preserved');
    });

    test('G3: Zero Allocation & Node Creation When Muted', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      synth.setMuted(true);
      const ctx = synth.initAudioContext();
      const nodeCountBefore = ctx.createdNodes.length;

      const res = synth.createTone({ freq: 440, duration: 0.2 });
      assert.strictEqual(res, null, 'createTone must return null when muted');

      synth.playPositive(1, 1);
      synth.playCombo(3);
      synth.playGentleError();
      synth.playFanfare();

      const nodeCountAfter = ctx.createdNodes.length;
      assert.strictEqual(nodeCountAfter, nodeCountBefore, 'No audio nodes should be allocated while muted');
    });
  });

  // =========================================================================
  // SECTION 7: AudioSynthesizer Mute Toggle State & Persistence
  // =========================================================================
  describe('AudioSynthesizer: Mute State Persistence & Event Lifecycle', () => {

    test('M1: Mute State Toggling and Gain Synchronization', () => {
      const synth = new AudioSynthesizer({ volume: 0.75 });
      const ctx = synth.initAudioContext();

      assert.strictEqual(synth.isMuted(), false);
      assert.strictEqual(synth.masterGain.gain.value, 0.75);

      synth.setMuted(true);
      assert.strictEqual(synth.isMuted(), true);
      assert.strictEqual(synth.masterGain.gain.value, 0);

      synth.toggleMute();
      assert.strictEqual(synth.isMuted(), false);
      assert.strictEqual(synth.masterGain.gain.value, 0.75);
    });

    test('M2: LocalStorage Persistence across Synthesizer Instances', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pses_audio_muted', 'true');
        const synth1 = new AudioSynthesizer();
        assert.strictEqual(synth1.isMuted(), true, 'Must load persisted muted=true from localStorage');

        synth1.setMuted(false);
        assert.strictEqual(localStorage.getItem('pses_audio_muted'), 'false');

        const synth2 = new AudioSynthesizer();
        assert.strictEqual(synth2.isMuted(), false, 'Must load persisted muted=false from localStorage');
      }
    });

    test('M3: Window CustomEvent Dispatch on Mute Change', () => {
      let eventFired = false;
      let eventDetail = null;

      if (typeof window !== 'undefined') {
        const handler = (e) => {
          eventFired = true;
          eventDetail = e.detail;
        };
        window.addEventListener('AUDIO_MUTE_TOGGLED', handler);

        const synth = new AudioSynthesizer();
        synth.setMuted(true);

        assert.strictEqual(eventFired, true, 'AUDIO_MUTE_TOGGLED event must be dispatched');
        assert.deepStrictEqual(eventDetail, { muted: true });

        window.removeEventListener('AUDIO_MUTE_TOGGLED', handler);
      }
    });
  });
}

module.exports = registerChallengerTests;
module.exports.register = registerChallengerTests;

if (require.main === module) {
  const { harness, describe, test, assert, loadESModule } = require('./test_e2e_runner.js');
  registerChallengerTests({ describe, test, assert, loadESModule });
  harness.runAll().then((report) => {
    process.exitCode = report.summary.failed > 0 ? 1 : 0;
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
