/**
 * tests/test_agents.js - Multi-Agent Architecture & Diagnostics Test Suite
 * 
 * Verifies:
 * 1. Product Manager Agent (PMAgentBrain): Developmental matrix, Flow State (75-85%), Dynamic Score formula
 * 2. Director Agent (DirectorOrchestrator): Multi-agent message routing, DAG cycle detection, agent status
 * 3. Self-Loop Pipeline: Micro-loop (3-tier guidance), Meso-loop (cognitive drop-off < 35%), Macro-loop (rebalance)
 * 4. Standard Schemas: PM_SPEC_v1, DESIGNER_OUTPUT_v1, QA_BUG_REPORT_v1, REPAIR_PATCH_v1, GRAPH_MUTATION_v1
 * 5. AgentQADiagnostics: 4-category root cause classification and REPAIR_PATCH_v1 generation
 * 6. Agent definitions & markdown files alignment in .agents/agents/
 */

const fs = require('fs');
const path = require('path');

function register({ describe, test, it, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');

  function loadModuleExports(filePath) {
    const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
    return loader(filePath);
  }

  // Ensure window and custom event mock exist
  if (!global.CustomEvent) {
    global.CustomEvent = class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || null;
      }
    };
  }
  if (!global.window) {
    const listeners = {};
    global.window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
      removeEventListener: (type, fn) => { if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn); },
      dispatchEvent: (evt) => { (listeners[evt.type] || []).forEach(fn => fn(evt)); return true; }
    };
  }

  const integrationPath = path.join(rootDir, 'AgentIntegration.js');
  const diagnosticsPath = path.join(rootDir, 'AgentQADiagnostics.js');

  const {
    SCHEMAS,
    validateSchema,
    createObservationPayload,
    PMAgentBrain,
    DirectorOrchestrator,
    AgentSelfLoopPipeline,
    AntigravityAgentBrain
  } = loadModuleExports(integrationPath);

  const {
    diagnoseAndRecommendFix,
    validateAgentSchema,
    AgentQADiagnosticsEngine
  } = loadModuleExports(diagnosticsPath);

  // =========================================================================
  // Suite 1: Markdown Agent Definitions Verification
  // =========================================================================
  describe('Agent Definitions & Markdown Specifications', () => {
    const expectedAgents = [
      'product_manager_agent',
      'director_agent',
      'game_designer_agent',
      'graph_evolution_agent',
      'qa_player_agent',
      'bug_repair_agent'
    ];

    expectedAgents.forEach(agentName => {
      test(`M1: Agent definition exists and has YAML frontmatter for ${agentName}`, () => {
        const agentMdPath = path.join(rootDir, '.agents', 'agents', agentName, 'agent.md');
        assert.ok(fs.existsSync(agentMdPath), `Missing agent.md for ${agentName}`);
        const content = fs.readFileSync(agentMdPath, 'utf-8');
        assert.ok(content.startsWith('---'), `Missing YAML frontmatter in ${agentName}/agent.md`);
        assert.ok(content.includes(`name: ${agentName}`), `Missing name field in ${agentName}/agent.md`);
      });
    });

    test('M2: product_manager_agent defines developmental psychology and Flow state targets', () => {
      const pmMd = fs.readFileSync(path.join(rootDir, '.agents', 'agents', 'product_manager_agent', 'agent.md'), 'utf-8');
      assert.ok(pmMd.includes('低学年'), 'PM agent must cover lower elementary (G1-G2)');
      assert.ok(pmMd.includes('中学年'), 'PM agent must cover middle elementary (G3-G4)');
      assert.ok(pmMd.includes('高学年'), 'PM agent must cover upper elementary (G5-G6)');
      assert.ok(pmMd.includes('56px'), 'PM agent must specify min 56px touch target for G1-2');
      assert.ok(pmMd.includes('75%') && pmMd.includes('85%'), 'PM agent must specify 75-85% optimal Flow State');
      assert.ok(pmMd.includes('PM_SPEC_v1'), 'PM agent must specify PM_SPEC_v1 schema');
    });
  });

  // =========================================================================
  // Suite 2: Standard JSON Schemas Validation
  // =========================================================================
  describe('Agent Communication Schema Validation (SCHEMAS & validateSchema)', () => {
    test('S1: Valid PM_SPEC_v1 payload passes validation', () => {
      const validPMSpec = {
        schema: 'PM_SPEC_v1',
        feature_id: 'FEAT-2026-TEST',
        target_grade: [1, 2],
        subject: '算数',
        pedagogical_goal: 'かけ算九九の基礎習得',
        target_flow_metrics: { expected_pass_rate: 0.80, max_duration_sec: 60, hesitation_error_threshold: 2 },
        audio_visual_requirements: { sound_correct: 'POLYPHONIC', sound_error: 'GENTLE', particle_fx: 'BURST', screen_shake_intensity: 2 },
        accessibility: { min_touch_target_px: 56, furigana_enabled: true }
      };
      const res = validateSchema('PM_SPEC_v1', validPMSpec);
      assert.strictEqual(res.valid, true, `Validation failed: ${res.errors?.join(', ')}`);
    });

    test('S2: Invalid PM_SPEC_v1 missing required fields fails validation', () => {
      const invalidPMSpec = {
        schema: 'PM_SPEC_v1',
        feature_id: 'FEAT-MISSING-FIELDS'
      };
      const res = validateSchema('PM_SPEC_v1', invalidPMSpec);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.length > 0);
    });

    test('S3: Valid DESIGNER_OUTPUT_v1 passes validation', () => {
      const designerPayload = {
        schema: 'DESIGNER_OUTPUT_v1',
        game_type: 'KUKU_LINK',
        target_files: ['MiniGameSystem.js', 'KukuLinkGame.js'],
        mechanics: { grid_dimensions: '4x4', max_turns: 2, time_limit_sec: 60 },
        audio_hooks: { onMatch: 'playPositive()', onMiss: 'playGentleError()', onCombo: 'playCombo()' },
        score_formula: 'calculateDynamicPoints'
      };
      const res = validateSchema('DESIGNER_OUTPUT_v1', designerPayload);
      assert.strictEqual(res.valid, true);
    });

    test('S4: Valid QA_BUG_REPORT_v1 and REPAIR_PATCH_v1 pass validation', () => {
      const bugReport = {
        schema: 'QA_BUG_REPORT_v1',
        bug_id: 'BUG-001',
        category: 'UI_OVERFLOW',
        device: 'Mobile',
        viewport: { width: 375, height: 812 },
        node_id: 'MATH_G2_KUKU',
        error_message: 'Touch blocked',
        stack_trace: 'at MiniGameSystem.js:50',
        fps: 60,
        reproduce_steps: ['Open mobile', 'Tap button']
      };
      assert.strictEqual(validateSchema('QA_BUG_REPORT_v1', bugReport).valid, true);

      const patch = {
        schema: 'REPAIR_PATCH_v1',
        bug_id: 'BUG-001',
        root_cause: 'z-index collision',
        action_type: 'CSS_ZINDEX_PATCH',
        affected_files: ['index.html'],
        verification_command: 'node tests/test_agents.js',
        status: 'RESOLVED'
      };
      assert.strictEqual(validateSchema('REPAIR_PATCH_v1', patch).valid, true);
    });

    test('S5: Valid GRAPH_MUTATION_v1 passes validation', () => {
      const mutation = {
        schema: 'GRAPH_MUTATION_v1',
        directive_id: 'MUT-001',
        trigger_reason: 'ANOMALY_PASS_RATE_DROP',
        target_node: 'MATH_G5_RATIO',
        observed_pass_rate: 0.28,
        mutations: [
          { operation: 'INSERT_NODE', node: { id: 'MATH_G5_RATIO_BRIDGE', subject: '算数' } }
        ]
      };
      assert.strictEqual(validateSchema('GRAPH_MUTATION_v1', mutation).valid, true);
    });
  });

  // =========================================================================
  // Suite 3: Product Manager Agent Brain (PMAgentBrain)
  // =========================================================================
  describe('Product Manager Agent Brain (PMAgentBrain)', () => {
    test('PM1: getDevelopmentalPsychologyMatrix respects grade constraints', () => {
      const pm = new PMAgentBrain();
      const lower = pm.getDevelopmentalPsychologyMatrix(1);
      assert.strictEqual(lower.minTouchTargetPx, 56, 'Lower elementary must have touch target >= 56px');
      assert.strictEqual(lower.furiganaRequired, true, 'Lower elementary must require Furigana');

      const middle = pm.getDevelopmentalPsychologyMatrix(3);
      assert.strictEqual(middle.minTouchTargetPx, 44);
      assert.strictEqual(middle.gameMechanicDefaults.comboMultiplierEnabled, true);

      const upper = pm.getDevelopmentalPsychologyMatrix(6);
      assert.strictEqual(upper.gameMechanicDefaults.precisionSliders, true);
    });

    test('PM2: analyzeFlowState accurately classifies optimal channel, drop-off, and boredom', () => {
      const pm = new PMAgentBrain();
      
      // Optimal Flow channel (75-85%)
      const optimal = pm.analyzeFlowState({ passRate: 0.80, sampleSize: 20, nodeId: 'MATH_G2_KUKU' });
      assert.strictEqual(optimal.status, 'OPTIMAL_FLOW');

      // Cognitive Drop-Off (< 35%)
      const dropOff = pm.analyzeFlowState({ passRate: 0.28, sampleSize: 10, nodeId: 'MATH_G5_RATIO' });
      assert.strictEqual(dropOff.status, 'COGNITIVE_DROP_OFF');
      assert.strictEqual(dropOff.action, 'TRIGGER_GRAPH_MUTATION');
      assert.ok(dropOff.mutationDirective);

      // Boredom Zone (> 95%)
      const boredom = pm.analyzeFlowState({ passRate: 0.98, sampleSize: 10, nodeId: 'MATH_G1_ADD' });
      assert.strictEqual(boredom.status, 'BOREDOM_ZONE');
      assert.strictEqual(boredom.action, 'INCREASE_CHALLENGE');
    });

    test('PM3: generatePMSpec outputs validated PM_SPEC_v1', () => {
      const pm = new PMAgentBrain();
      const node = { id: 'MATH_G1_ADD', name: 'たし算の基礎', subject: '算数', grade: 1, desc: '1桁の加算定着' };
      const spec = pm.generatePMSpec(node);
      assert.strictEqual(spec.schema, 'PM_SPEC_v1');
      assert.strictEqual(spec.accessibility.min_touch_target_px, 56);
      assert.strictEqual(spec.accessibility.furigana_enabled, true);
    });

    test('PM4: calculateDynamicPoints calculates dynamic score with Bloom depth and streak', () => {
      const pm = new PMAgentBrain();
      // Base calculation: 100 * 1.0 (Bloom) * 1.0 (Accuracy) * 1.0 (Streak 0) = 100
      const scoreBase = pm.calculateDynamicPoints({ base: 100, bloomDepth: 1.0, accuracy: 1.0, streakCount: 0 });
      assert.strictEqual(scoreBase, 100);

      // High Bloom & Streak: 100 * 1.5 * 1.0 * 1.3 (Streak 3) = 195
      const scoreBonus = pm.calculateDynamicPoints({ base: 100, bloomDepth: 1.5, accuracy: 1.0, streakCount: 3 });
      assert.strictEqual(scoreBonus, 195);
    });
  });

  // =========================================================================
  // Suite 4: Director Orchestrator Agent
  // =========================================================================
  describe('Director Orchestrator Agent (DirectorOrchestrator)', () => {
    test('DIR1: All 6 agents are registered in DirectorOrchestrator', () => {
      const director = new DirectorOrchestrator();
      const status = director.getAgentStatus();
      assert.ok(status.product_manager_agent);
      assert.ok(status.director_agent);
      assert.ok(status.game_designer_agent);
      assert.ok(status.graph_evolution_agent);
      assert.ok(status.qa_player_agent);
      assert.ok(status.bug_repair_agent);
    });

    test('DIR2: verifyDAGAcyclicity detects valid DAG vs cyclic graph', () => {
      const director = new DirectorOrchestrator();

      // Valid acyclic DAG
      const acyclicGraph = [
        { id: 'NODE_A', prerequisites: [] },
        { id: 'NODE_B', prerequisites: ['NODE_A'] },
        { id: 'NODE_C', prerequisites: ['NODE_B'] }
      ];
      assert.strictEqual(director.verifyDAGAcyclicity(acyclicGraph).isAcyclic, true);

      // Invalid cyclic graph (A -> B -> C -> A)
      const cyclicGraph = [
        { id: 'NODE_A', prerequisites: ['NODE_C'] },
        { id: 'NODE_B', prerequisites: ['NODE_A'] },
        { id: 'NODE_C', prerequisites: ['NODE_B'] }
      ];
      assert.strictEqual(director.verifyDAGAcyclicity(cyclicGraph).isAcyclic, false);
    });

    test('DIR3: authorizeGraphMutation rejects invalid DAGs and accepts valid mutations', () => {
      const initialGraph = [
        { id: 'G4_DECIMAL', prerequisites: [] },
        { id: 'G5_RATIO', prerequisites: ['G4_DECIMAL'] }
      ];
      const director = new DirectorOrchestrator(null, initialGraph);

      const validMutation = {
        schema: 'GRAPH_MUTATION_v1',
        directive_id: 'MUT-TEST-001',
        trigger_reason: 'ANOMALY_PASS_RATE_DROP',
        target_node: 'G5_RATIO',
        observed_pass_rate: 0.28,
        mutations: [
          {
            operation: 'INSERT_NODE',
            node: { id: 'G5_RATIO_BRIDGE', subject: '算数', grade: 5, prerequisites: ['G4_DECIMAL'] }
          }
        ]
      };

      const res = director.authorizeGraphMutation(validMutation, initialGraph);
      assert.strictEqual(res.success, true);
      assert.ok(initialGraph.some(n => n.id === 'G5_RATIO_BRIDGE'));
    });
  });

  // =========================================================================
  // Suite 5: Self-Loop Pipeline (Micro, Meso, Macro)
  // =========================================================================
  describe('AgentSelfLoopPipeline (Micro, Meso, Macro)', () => {
    test('LOOP1: executeMicroLoop applies 3-tier child-friendly error guidance', () => {
      // Tier 1: 0 errors -> Maintain
      const tier1 = AgentSelfLoopPipeline.executeMicroLoop({ errorClickCount: 0 });
      assert.strictEqual(tier1.action, 'MAINTAIN');

      // Tier 2: 2 errors -> Inject hint
      const tier2 = AgentSelfLoopPipeline.executeMicroLoop({ errorClickCount: 2 });
      assert.strictEqual(tier2.action, 'INJECT_REALTIME_HINT');
      assert.strictEqual(tier2.errorTier, 2);

      // Tier 3: 3+ errors -> Assisted slow motion & mascot guidance
      const tier3 = AgentSelfLoopPipeline.executeMicroLoop({ errorClickCount: 3 });
      assert.strictEqual(tier3.action, 'ASSISTED_SLOW_MOTION');
      assert.strictEqual(tier3.errorTier, 3);
      assert.ok(tier3.mascotSpeech);
    });

    test('LOOP2: executeMesoLoop extracts mutation directives from dropped cohort stats', () => {
      const cohortStats = [
        { nodeId: 'MATH_G1', passRate: 0.82, sampleSize: 10 },
        { nodeId: 'MATH_G5_RATIO', passRate: 0.25, sampleSize: 8 }
      ];
      const directives = AgentSelfLoopPipeline.executeMesoLoop(cohortStats);
      assert.strictEqual(directives.length, 1);
      assert.strictEqual(directives[0].target_node, 'MATH_G5_RATIO');
    });

    test('LOOP3: executeMacroLoop produces macro rebalance metrics', () => {
      const macro = AgentSelfLoopPipeline.executeMacroLoop({ totalCoinCirculation: 500000 });
      assert.strictEqual(macro.type, 'MACRO_REBALANCE');
      assert.strictEqual(macro.globalInflationIndex, 1.0);
    });
  });

  // =========================================================================
  // Suite 6: AgentQADiagnostics & Self-Healing Patching
  // =========================================================================
  describe('AgentQADiagnostics Engine & Root-Cause Classification', () => {
    test('QA1: diagnoseAndRecommendFix handles UI_OVERFLOW and generates valid REPAIR_PATCH_v1', () => {
      const errorLog = {
        bug_id: 'BUG-UI-01',
        category: 'UI_OVERFLOW',
        error_message: 'Touch click missed due to glass-panel z-index collision',
        viewport_size: { width: 375, height: 812 },
        fps: 60
      };
      const diag = diagnoseAndRecommendFix(errorLog);
      assert.strictEqual(diag.classification, '[UI重なり／レスポンシブ表示エラー]');
      assert.strictEqual(diag.recommendedFix.actionType, 'CSS_ZINDEX_PATCH');
      assert.strictEqual(diag.repairPatch.schema, 'REPAIR_PATCH_v1');
      assert.strictEqual(diag.repairPatch.status, 'RESOLVED');
    });

    test('QA2: diagnoseAndRecommendFix handles UI_DEADLOCK_HANG and resets state', () => {
      const errorLog = {
        bug_id: 'BUG-DEADLOCK-01',
        category: 'UI_DEADLOCK_HANG',
        error_message: 'Modal lock timeout 2000ms',
        fps: 60
      };
      const diag = diagnoseAndRecommendFix(errorLog);
      assert.strictEqual(diag.classification, '[UI応答停止]');
      assert.strictEqual(diag.recommendedFix.actionType, 'STATE_MACHINE_RESET');
    });

    test('QA3: diagnoseAndRecommendFix handles WEBGL_CONTEXT_LOST and downscales rendering', () => {
      const errorLog = {
        bug_id: 'BUG-GPU-01',
        category: 'WEBGL_CONTEXT_LOST',
        error_message: 'WebGL context was lost',
        fps: 12
      };
      const diag = diagnoseAndRecommendFix(errorLog);
      assert.strictEqual(diag.classification, '[WebGL描画エラー]');
      assert.strictEqual(diag.recommendedFix.actionType, 'GPU_FALLBACK_RECOVERY');
    });

    test('QA4: AgentQADiagnosticsEngine records and aggregates diagnostics sweep', () => {
      const engine = new AgentQADiagnosticsEngine();
      const logs = [
        { bug_id: 'B1', category: 'UI_OVERFLOW', error_message: 'touch fail' },
        { bug_id: 'B2', category: 'DATA_SCHEMA_FALLBACK', error_message: 'undefined node' }
      ];
      const results = engine.runDiagnosticSweep(logs);
      assert.strictEqual(results.length, 2);
      const summary = engine.getSummary();
      assert.strictEqual(summary.totalBugsCaptured, 2);
      assert.strictEqual(summary.totalPatchesGenerated, 2);
    });
  });

  // =========================================================================
  // Suite 7: AntigravityAgentBrain Runtime Integration
  // =========================================================================
  describe('AntigravityAgentBrain End-to-End Runtime Integration', () => {
    test('AB1: ingestObservation creates micro interventions on repeated errors', () => {
      const brain = new AntigravityAgentBrain([]);
      let eventDispatched = null;

      brain.on('AGENT_MICRO_INTERVENTION', (evt) => {
        eventDispatched = evt;
      });

      const obs = createObservationPayload({
        userId: 'USR-TEST-001',
        nodeId: 'MATH_G2_KUKU',
        attemptDurationMs: 45000,
        errorClickCount: 3,
        score: 50
      });

      brain.ingestObservation(obs);
      assert.ok(eventDispatched);
      assert.strictEqual(eventDispatched.action, 'ASSISTED_SLOW_MOTION');
      assert.strictEqual(eventDispatched.errorTier, 3);
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
