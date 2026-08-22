/**
 * AgentIntegration.js - Antigravity AI Multi-Agent Collaboration & Adaptation Engine
 * 
 * Includes:
 * 1. Product Manager Agent (PMAgentBrain): Developmental Psychology Matrix, Flow State Framework (75-85%), Dynamic Points Formula
 * 2. Director Agent (DirectorOrchestrator): Central Message Router, DAG Integrity Checker, Multi-Loop Coordinator
 * 3. Self-Loop Pipeline (Micro, Meso, Macro loops)
 * 4. AntigravityAgentBrain: Telemetry Ingestion & Runtime DOM Event Bridge
 * 5. Standardized Message Schemas (PM_SPEC_v1, DESIGNER_OUTPUT_v1, QA_BUG_REPORT_v1, REPAIR_PATCH_v1, GRAPH_MUTATION_v1)
 */

export const SCHEMAS = {
  PM_SPEC_v1: {
    type: 'object',
    required: ['schema', 'feature_id', 'target_grade', 'subject', 'pedagogical_goal', 'target_flow_metrics', 'audio_visual_requirements', 'accessibility']
  },
  DESIGNER_OUTPUT_v1: {
    type: 'object',
    required: ['schema', 'game_type', 'target_files', 'mechanics', 'audio_hooks', 'score_formula']
  },
  QA_BUG_REPORT_v1: {
    type: 'object',
    required: ['schema', 'bug_id', 'category', 'device', 'viewport', 'node_id', 'error_message', 'stack_trace', 'fps', 'reproduce_steps']
  },
  REPAIR_PATCH_v1: {
    type: 'object',
    required: ['schema', 'bug_id', 'root_cause', 'action_type', 'affected_files', 'verification_command', 'status']
  },
  GRAPH_MUTATION_v1: {
    type: 'object',
    required: ['schema', 'directive_id', 'trigger_reason', 'target_node', 'observed_pass_rate', 'mutations']
  }
};

/**
 * Validate object against defined agent schema standards
 */
export function validateSchema(schemaName, data) {
  const schemaDef = SCHEMAS[schemaName];
  if (!schemaDef) {
    return { valid: false, errors: [`Unknown schema: ${schemaName}`] };
  }
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Payload must be a non-null object'] };
  }
  if (data.schema !== schemaName) {
    return { valid: false, errors: [`Expected schema '${schemaName}', got '${data.schema}'`] };
  }
  const missing = schemaDef.required.filter(key => !(key in data));
  if (missing.length > 0) {
    return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] };
  }
  return { valid: true, errors: [] };
}

/**
 * Creates observation telemetry payload for learning attempts
 */
export function createObservationPayload({
  userId,
  nodeId,
  attemptDurationMs = 1000,
  errorClickCount = 0,
  hintRequested = false,
  score = 100,
  trajectoryData = []
}) {
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return {
    schema_version: '2026.08.v1',
    event_type: 'LEARNING_NODE_ATTEMPT',
    timestamp: new Date().toISOString(),
    user: {
      user_id: userId || 'USR-ANON-001',
      client_platform: isMobile ? 'MOBILE_TOUCH' : 'DESKTOP_POINTER',
      screen_resolution: `${winWidth}x${winHeight}`
    },
    context: {
      node_id: nodeId || 'NODE_UNKNOWN',
      subject_domain: (nodeId || 'GENERAL').split('_')[0] || 'GENERAL',
      difficulty_profile_version: 'v1.4.2'
    },
    performance_metrics: {
      attempt_duration_sec: Number((attemptDurationMs / 1000).toFixed(2)),
      error_click_count: errorClickCount,
      hint_requested: hintRequested,
      final_score: score,
      accuracy_rate: Math.max(0, 1 - (errorClickCount * 0.15)),
      is_cleared: score >= 60
    },
    telemetry: {
      interactive_drop_trajectory: trajectoryData.map((pt) => ({
        timestamp_offset_ms: pt.t || 0,
        x_norm: Number(((pt.x || 0) / winWidth).toFixed(4)),
        y_norm: Number(((pt.y || 0) / winHeight).toFixed(4)),
        velocity_px_s: pt.v || 0,
        jitter_variance: pt.jitter || 0.0
      }))
    }
  };
}

export const SAMPLE_GRAPH_MUTATION_DIRECTIVE = {
  schema: 'GRAPH_MUTATION_v1',
  directive_id: 'MUT-AGENT-20260822-0042',
  generated_by: 'product_manager_agent',
  trigger_reason: 'ANOMALY_PASS_RATE_DROP',
  target_node: 'MATH_G5_RATIO',
  observed_pass_rate: 0.284,
  diagnosis_summary: '小学5年【割合】ノードの通過率が 28.4% (< 35% 閾値) に低下。認知断層を解消するため視覚的補助ノードを挿入します。',
  mutations: [
    {
      operation: 'INSERT_NODE',
      node: {
        id: 'MATH_G5_RATIO_VISUAL',
        name: '割合の可視化：面積図・テープ図ブリッジ',
        subject: '算数',
        grade: 5,
        bloomDepth: 1.4,
        gameType: 'RATIO_SCALE',
        mechanic_overrides: {
          slider_step_size: 5,
          tolerance_percentage: 4.0,
          guide_visual_grid: true
        }
      },
      placement: {
        after_node: 'MATH_G4_AREA_DECIMAL',
        before_node: 'MATH_G5_RATIO'
      }
    },
    {
      operation: 'UPDATE_EDGE',
      action: 'REWIRE_PREREQUISITES',
      node_id: 'MATH_G5_RATIO',
      new_prerequisites: ['MATH_G5_RATIO_VISUAL']
    },
    {
      operation: 'ADJUST_DIFFICULTY',
      target_node: 'MATH_G5_RATIO',
      parameters: {
        speed_multiplier: 0.8,
        hitbox_expansion_ratio: 1.25,
        time_limit_sec: 90
      }
    }
  ]
};

/**
 * Product Manager Agent Brain (PMAgentBrain)
 * Manages Japanese Elementary developmental psychology, Flow state channel (75-85%), and dynamic point metrics.
 */
export class PMAgentBrain {
  constructor() {
    this.name = 'product_manager_agent';
    this.flowMetrics = {
      targetPassRateMin: 0.75,
      targetPassRateMax: 0.85,
      cognitiveDropOffThreshold: 0.35,
      boredomThreshold: 0.95,
      minSampleForMutation: 5
    };
  }

  /**
   * Returns developmental psychology and UX matrix for specific grade
   */
  getDevelopmentalPsychologyMatrix(grade = 1) {
    const g = Number(grade) || 1;
    if (g <= 2) {
      return {
        stage: 'LOWER_ELEMENTARY_CONCRETE_INTUITIVE',
        stageName: '低学年（小1・小2）',
        minTouchTargetPx: 56,
        furiganaRequired: true,
        cognitiveFocus: '直感・具体物思考、平仮名・基本漢字80/160字の定着',
        soundProfile: 'POLYPHONIC_ARPEGGIO_C5_C6',
        gentleErrorSound: 'MARIMBA_GENTLE_F3_D3',
        particleBurstCount: 36,
        maxDurationSec: 60,
        gameMechanicDefaults: {
          tapAccuracyTolerancePx: 24,
          allowMultiDrag: false,
          enableVisualClueSpotlight: true
        }
      };
    } else if (g <= 4) {
      return {
        stage: 'MIDDLE_ELEMENTARY_CONCRETE_OPERATIONAL',
        stageName: '中学年（小3・小4）',
        minTouchTargetPx: 44,
        furiganaRequired: false,
        cognitiveFocus: '可逆性・分類思考、漢字200/202字、コンボ・達成感の追求',
        soundProfile: 'PENTATONIC_ASCENDING_COMBO',
        gentleErrorSound: 'MARIMBA_GENTLE_F3_D3',
        particleBurstCount: 48,
        maxDurationSec: 75,
        gameMechanicDefaults: {
          comboMultiplierEnabled: true,
          screenShakeIntensity: 3,
          enableRadarClue: true
        }
      };
    } else {
      return {
        stage: 'UPPER_ELEMENTARY_FORMAL_OPERATIONAL',
        stageName: '高学年（小5・小6）',
        minTouchTargetPx: 44,
        furiganaRequired: false,
        cognitiveFocus: '抽象論理・比例推理・仮説検証、高次Bloom思考（分析・総合・評価）',
        soundProfile: 'LAYERED_SYNTH_HARMONY',
        gentleErrorSound: 'MARIMBA_GENTLE_F3_D3',
        particleBurstCount: 48,
        maxDurationSec: 90,
        gameMechanicDefaults: {
          precisionSliders: true,
          balancePhysicsEnabled: true,
          detailedBreakdownReport: true
        }
      };
    }
  }

  /**
   * Flow State Analyzer: Evaluates cohort pass rates against the 75-85% optimal channel
   */
  analyzeFlowState(cohortStat) {
    const { passRate, sampleSize = 10, nodeId = 'UNKNOWN' } = cohortStat;
    
    if (sampleSize >= this.flowMetrics.minSampleForMutation && passRate < this.flowMetrics.cognitiveDropOffThreshold) {
      return {
        status: 'COGNITIVE_DROP_OFF',
        nodeId,
        passRate,
        action: 'TRIGGER_GRAPH_MUTATION',
        recommendation: 'INSERT_BRIDGING_NODE',
        diagnosis: `通過率が ${(passRate * 100).toFixed(1)}% (< 35%) に低下。認知断層を検知しました。`,
        mutationDirective: {
          schema: 'GRAPH_MUTATION_v1',
          directive_id: `MUT-${Date.now()}`,
          trigger_reason: 'ANOMALY_PASS_RATE_DROP',
          target_node: nodeId,
          observed_pass_rate: passRate,
          mutations: [
            {
              operation: 'INSERT_NODE',
              node: {
                id: `${nodeId}_BRIDGE`,
                name: '基礎定着ビジュアルブリッジ',
                subject: nodeId.split('_')[0] || 'GENERAL',
                bloomDepth: 1.2,
                gameType: 'VISUAL_SCAFFOLD'
              }
            }
          ]
        }
      };
    }

    if (passRate > this.flowMetrics.boredomThreshold && sampleSize >= 5) {
      return {
        status: 'BOREDOM_ZONE',
        nodeId,
        passRate,
        action: 'INCREASE_CHALLENGE',
        recommendation: 'BOOST_BLOOM_DEPTH_AND_SPEED',
        diagnosis: `通過率が ${(passRate * 100).toFixed(1)}% (> 95%)。退屈防止のため難易度を微増させます。`
      };
    }

    if (passRate >= this.flowMetrics.targetPassRateMin && passRate <= this.flowMetrics.targetPassRateMax) {
      return {
        status: 'OPTIMAL_FLOW',
        nodeId,
        passRate,
        action: 'MAINTAIN',
        diagnosis: `通過率 ${(passRate * 100).toFixed(1)}% は理想的な心流（75%〜85%）チャンネル内です。`
      };
    }

    return {
      status: 'TRANSITIONAL_ZONE',
      nodeId,
      passRate,
      action: 'MONITOR',
      diagnosis: `通過率 ${(passRate * 100).toFixed(1)}%：通常観測中。`
    };
  }

  /**
   * Generates standard PM_SPEC_v1 requirement specification for a curriculum node
   */
  generatePMSpec(node, overrides = {}) {
    const grade = node.grade || 1;
    const devMatrix = this.getDevelopmentalPsychologyMatrix(grade);

    const spec = {
      schema: 'PM_SPEC_v1',
      feature_id: `FEAT-${Date.now()}-${node.id || 'NODE'}`,
      target_grade: Array.isArray(grade) ? grade : [grade],
      subject: node.subject || '国語',
      pedagogical_goal: node.desc || `${node.name || '学習単元'}の基礎理解と定着`,
      target_flow_metrics: {
        expected_pass_rate: 0.80,
        max_duration_sec: devMatrix.maxDurationSec,
        hesitation_error_threshold: 2
      },
      audio_visual_requirements: {
        sound_correct: devMatrix.soundProfile,
        sound_error: devMatrix.gentleErrorSound,
        particle_fx: 'GOLDEN_STARDUST_BURST',
        screen_shake_intensity: devMatrix.gameMechanicDefaults.screenShakeIntensity || 2
      },
      accessibility: {
        min_touch_target_px: devMatrix.minTouchTargetPx,
        furigana_enabled: devMatrix.furiganaRequired
      },
      ...overrides
    };

    const validation = validateSchema('PM_SPEC_v1', spec);
    if (!validation.valid) {
      throw new Error(`Generated PM_SPEC_v1 is invalid: ${validation.errors.join(', ')}`);
    }
    return spec;
  }

  /**
   * Dynamic Score Calculation with Bloom taxonomy depth and streak multiplier
   */
  calculateDynamicPoints({ base = 100, bloomDepth = 1.0, accuracy = 1.0, streakCount = 0 }) {
    const clampedAccuracy = Math.max(0.0, Math.min(1.0, accuracy));
    const clampedBloom = Math.max(1.0, Math.min(2.5, bloomDepth));
    const streakMultiplier = Math.min(2.0, 1.0 + Math.max(0, streakCount) * 0.1);
    const rawScore = base * clampedBloom * clampedAccuracy * streakMultiplier;
    return Math.round(rawScore);
  }
}

/**
 * Director Orchestrator Agent (DirectorOrchestrator)
 * Coordinates PM, Designer, Evolution, QA, and Bug Repair agents across the lifecycle.
 */
export class DirectorOrchestrator {
  constructor(pmBrain, knowledgeGraphRef = [], economyManagerRef = null) {
    this.name = 'director_agent';
    this.pmBrain = pmBrain || new PMAgentBrain();
    this.graph = knowledgeGraphRef;
    this.economy = economyManagerRef;
    this.activeDirectives = [];
    this.agentRegistry = {
      product_manager_agent: { status: 'READY', role: 'Lead PM / Educational Producer' },
      director_agent: { status: 'ACTIVE', role: 'Master Orchestrator' },
      game_designer_agent: { status: 'READY', role: 'Gameplay & Component Creator' },
      graph_evolution_agent: { status: 'READY', role: 'DAG Mutation & Smoothing' },
      qa_player_agent: { status: 'READY', role: 'Monkey Testing & Bug Interceptor' },
      bug_repair_agent: { status: 'READY', role: 'Root Cause & Auto-Patching' }
    };
  }

  /**
   * Dispatch a PM requirement spec for a curriculum node
   */
  dispatchPMSpec(curriculumNode) {
    const spec = this.pmBrain.generatePMSpec(curriculumNode);
    this.activeDirectives.push({ type: 'PM_SPEC', data: spec, timestamp: Date.now() });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('AGENT_PM_SPEC_DISPATCHED', { detail: spec }));
    }
    return spec;
  }

  /**
   * Handle Game Designer implementation output
   */
  handleDesignerOutput(designerOutput) {
    const validation = validateSchema('DESIGNER_OUTPUT_v1', designerOutput);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this.agentRegistry.game_designer_agent.lastOutput = designerOutput;
    return { success: true, designerOutput };
  }

  /**
   * Handle QA Bug Report and coordinate repair
   */
  handleQABugReport(qaBugReport) {
    const validation = validateSchema('QA_BUG_REPORT_v1', qaBugReport);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this.agentRegistry.qa_player_agent.lastReport = qaBugReport;
    return { success: true, qaBugReport, action: 'DISPATCH_TO_BUG_REPAIR' };
  }

  /**
   * Handle Bug Repair Patch
   */
  handleRepairPatch(repairPatch) {
    const validation = validateSchema('REPAIR_PATCH_v1', repairPatch);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this.agentRegistry.bug_repair_agent.lastPatch = repairPatch;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('AGENT_PATCH_APPLIED', { detail: repairPatch }));
    }
    return { success: true, repairPatch };
  }

  /**
   * Authorize and apply graph mutation with strict DAG cycle detection
   */
  authorizeGraphMutation(mutationDirective, currentGraph = this.graph) {
    const validation = validateSchema('GRAPH_MUTATION_v1', mutationDirective);
    if (!validation.valid) {
      return { success: false, error: `Invalid GRAPH_MUTATION_v1: ${validation.errors.join(', ')}` };
    }

    // DAG Acyclicity Verification (Kahn's algorithm / DFS cycle check)
    const cycleCheck = this.verifyDAGAcyclicity(currentGraph);
    if (!cycleCheck.isAcyclic) {
      return {
        success: false,
        error: `DAG Cycle Detected before mutation! Offending cycle: ${cycleCheck.cyclePath.join(' -> ')}`
      };
    }

    mutationDirective.mutations.forEach(mut => {
      if (mut.operation === 'INSERT_NODE' && mut.node) {
        currentGraph.push(mut.node);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('AGENT_GRAPH_MUTATED', { detail: mutationDirective }));
    }

    return { success: true, mutationDirective };
  }

  /**
   * Topological cycle detector
   */
  verifyDAGAcyclicity(nodes = []) {
    const adj = new Map();
    const inDegree = new Map();

    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    nodes.forEach(n => {
      if (Array.isArray(n.prerequisites)) {
        n.prerequisites.forEach(prereqId => {
          if (adj.has(prereqId)) {
            adj.get(prereqId).push(n.id);
            inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
          }
        });
      }
    });

    const queue = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    let visitedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift();
      visitedCount++;
      (adj.get(u) || []).forEach(v => {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) queue.push(v);
      });
    }

    const isAcyclic = visitedCount === nodes.length;
    return {
      isAcyclic,
      visitedCount,
      totalNodes: nodes.length,
      cyclePath: isAcyclic ? [] : ['Cycle detected in prerequisite chain']
    };
  }

  getAgentStatus() {
    return { ...this.agentRegistry };
  }
}

/**
 * 3-Tier Self-Loop Execution Pipeline
 */
export const AgentSelfLoopPipeline = {
  executeMicroLoop: (currentSessionLog) => {
    const { errorClickCount = 0, attemptDurationSec = 0, hesitationDetected = false } = currentSessionLog;
    
    // Tier 3: Consecutive errors >= 3 -> Assisted slow motion & direct mascot guidance
    if (errorClickCount >= 3) {
      return {
        action: 'ASSISTED_SLOW_MOTION',
        errorTier: 3,
        hintMessage: '✦ 星の子ピコがアシスト中：正解の手がかりを直接点灯します！',
        slowMotionFactor: 0.75,
        mascotSpeech: 'いっしょにやってみよう！焦らなくて大丈夫だよ。',
        targetHighlight: true
      };
    }

    // Tier 2: 2 errors -> Clue pulse & encouragement toast
    if (errorClickCount >= 2 || hesitationDetected) {
      return {
        action: 'INJECT_REALTIME_HINT',
        errorTier: 2,
        hintMessage: '✦ エネルギーの揺らぎを検知：まずは左側の基準目盛りに注目してみよう！',
        slowMotionFactor: 0.9,
        clueHighlight: true
      };
    }

    // Tier 1: 0-1 error -> Maintain smooth flow
    return { action: 'MAINTAIN', errorTier: 1 };
  },

  executeMesoLoop: (cohortNodeStats) => {
    const pm = new PMAgentBrain();
    const mutationDirectives = [];

    cohortNodeStats.forEach((stat) => {
      const flowAnalysis = pm.analyzeFlowState(stat);
      if (flowAnalysis.status === 'COGNITIVE_DROP_OFF' && flowAnalysis.mutationDirective) {
        mutationDirectives.push(flowAnalysis.mutationDirective);
      }
    });

    return mutationDirectives;
  },

  executeMacroLoop: (globalEconomyMetrics = {}) => {
    const totalCirculation = globalEconomyMetrics.totalCoinCirculation || 0;
    return {
      type: 'MACRO_REBALANCE',
      globalInflationIndex: totalCirculation > 10000000 ? 0.9 : 1.0,
      bloomSlopeAdjustment: 0.05,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * AntigravityAgentBrain - Integrated AI Agent Brain
 * Bridges PM Agent, Director Orchestrator, and Frontend DOM events
 */
export class AntigravityAgentBrain {
  constructor(knowledgeGraphRef = [], economyManagerRef = null) {
    this.graph = Array.isArray(knowledgeGraphRef) ? knowledgeGraphRef : [];
    this.economy = economyManagerRef;
    this.pmBrain = new PMAgentBrain();
    this.director = new DirectorOrchestrator(this.pmBrain, this.graph, this.economy);
    this.state = 'IDLE_OBSERVING';
    this.observationBuffer = [];
    this.subscribers = new Map();
  }

  ingestObservation(logPayload) {
    this.observationBuffer.push(logPayload);
    
    const errCount = logPayload?.performance_metrics?.error_click_count || 0;
    const durSec = logPayload?.performance_metrics?.attempt_duration_sec || 0;

    const microDecision = AgentSelfLoopPipeline.executeMicroLoop({
      errorClickCount: errCount,
      attemptDurationSec: durSec,
      hesitationDetected: errCount >= 2
    });

    if (microDecision.action === 'INJECT_REALTIME_HINT' || microDecision.action === 'ASSISTED_SLOW_MOTION') {
      this.broadcastAgentEvent('AGENT_MICRO_INTERVENTION', microDecision);
    }

    if (this.observationBuffer.length >= 5) {
      this.triggerMesoAnalysis();
    }
  }

  triggerMesoAnalysis() {
    this.state = 'ANALYZING';
    console.log('[Antigravity Agent] 直近の学習行動テレメトリを分析中...', this.observationBuffer.length);

    const nodeFails = this.observationBuffer.filter(log => !log.performance_metrics.is_cleared);
    const failRate = nodeFails.length / Math.max(1, this.observationBuffer.length);

    if (failRate >= 0.4) {
      this.state = 'MUTATING';
      console.warn('[Antigravity Agent] 星図トポロジーの自己適応変異を発令します！');
      this.applyMutationDirective(SAMPLE_GRAPH_MUTATION_DIRECTIVE);
    } else {
      this.state = 'IDLE_OBSERVING';
    }
  }

  applyMutationDirective(directive) {
    const result = this.director.authorizeGraphMutation(directive, this.graph);
    if (!result.success) {
      console.error('[Agent Mutation Error]', result.error);
      this.state = 'IDLE_OBSERVING';
      return result;
    }

    this.state = 'VALIDATING';
    this.broadcastAgentEvent('AGENT_GRAPH_MUTATED', directive);

    setTimeout(() => {
      this.state = 'IDLE_OBSERVING';
      this.observationBuffer = [];
    }, 1000);

    return result;
  }

  triggerPMReview(curriculumNode, playerHistory = []) {
    return this.director.dispatchPMSpec(curriculumNode);
  }

  broadcastAgentEvent(eventType, payload) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
    }
    const handlers = this.subscribers.get(eventType) || [];
    handlers.forEach(fn => fn(payload));
  }

  on(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);
  }

  mutateCurriculumDAG(mutationAction) {
    return this.director.authorizeGraphMutation(mutationAction, this.graph);
  }
}
