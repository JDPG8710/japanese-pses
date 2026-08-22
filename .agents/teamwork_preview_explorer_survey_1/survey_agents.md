# Multi-Agent Teamwork Architecture & Product Manager Agent Specification Survey

**Project**: Japanese PSES Galaxy Engine (日本小学校学習指導要領 · 銀河知識星図)  
**Surveyor**: Teamwork Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Date**: 2026-08-22  
**Status**: Comprehensive Survey Completed  
**Target File**: `d:/Japanese PSES/.agents/teamwork_preview_explorer_survey_1/survey_agents.md`

---

## 1. Executive Summary & Survey Objectives

The Japanese PSES Galaxy Engine is an educational 3D galaxy game based on the Japanese Ministry of Education, Culture, Sports, Science and Technology (MEXT / 文部科学省) Elementary School Course of Study (小学校学習指導要領). The system integrates a 3D WebGL (Three.js) galaxy visualization, 6-subject curriculum DAG, multi-user economy and mastery ledger, H5 mini-games, and an Antigravity AI Agent telemetry adaptation loop.

To elevate this project into an industry-grade, highly engaging educational platform, the development pipeline requires a standardized **Multi-Agent Teamwork Architecture** led by a dedicated **Product Manager Agent** (`product_manager_agent`).

### Survey Objectives:
1. **Audit Existing Agent Ecosystem**: Inspect all 5 agent definitions in `.agents/agents/` (`director_agent`, `game_designer_agent`, `graph_evolution_agent`, `qa_player_agent`, `bug_repair_agent`), identify capabilities, gaps, and discrepancies with runtime JavaScript code.
2. **Standardize Inter-Agent Coordination**: Map runtime telemetry (Micro/Meso/Macro loops in `AgentIntegration.js`, `AgentQADiagnostics.js`, `ErrorInterceptor.js`, `EconomySystem.js`) to formal agent roles and communication pipelines.
3. **Specify Product Manager Agent (`product_manager_agent`)**: Define comprehensive requirements including Japanese elementary student developmental psychology (Grades 1–6), Flow State / fun-challenge balancing metrics, zero-external-dependency Web Audio synth feedback, particle/shake visual polish, and MEXT curriculum roadmap.
4. **Define Director Agent Orchestration**: Establish exact input/output JSON schemas and routing protocols for `director_agent` to manage the end-to-end lifecycle.

---

## 2. Audit of Existing Agent Definitions in `.agents/agents/`

| Agent Name | Role & Type | Frontmatter Tools | Codebase Linkage | Identified Gaps & Alignment Issues |
| :--- | :--- | :--- | :--- | :--- |
| **`director_agent`** | Orchestrator / Director (`mainAgent: true`) | `view_file`, `replace_file_content`, `run_command` | `index.html` pipeline, agent dispatch | • Lacks `product_manager_agent` in its dispatch loop.<br>• No formal PRD intake or educational KPI validation schema.<br>• Workflow is purely reactive to QA bugs rather than product-driven. |
| **`game_designer_agent`** | Gameplay & H5 Component Creator (`subagent: true`) | `view_file`, `replace_file_content` | `MiniGameSystem.js`, `KukuLinkGame.js` | • References non-existent folder `game_components/` instead of `MiniGameSystem.js`.<br>• Lacks developmental UX specifications (touch hitbox sizing, furigana rules, audio-visual feedback triggers).<br>• Scoring formula lacks integration with `EconomySystem.js`. |
| **`graph_evolution_agent`** | Topological Mutation & Bayesian Diagnostics (`subagent: true`) | `view_file`, `replace_file_content` | `AgentIntegration.js`, `CurriculumData.js`, `data/*.json` | • References deprecated `star_graph.json` instead of actual `CurriculumData.js` and `data/` subject JSONs.<br>• Mutation logic in `AgentIntegration.js` (`SAMPLE_GRAPH_MUTATION_DIRECTIVE`) lacks automated MEXT DAG acyclicity verification.<br>• Needs PM learning gradient guidelines (Bloom taxonomy 1.0–2.5). |
| **`qa_player_agent`** | Headless Browser Monkey Testing & Bug Capture (`subagent: true`) | `run_command`, `view_file` | `AgentQADiagnostics.js`, `ErrorInterceptor.js` | • Playwright monkey test script in `AgentQADiagnostics.js` is static text; needs automated execution hooks.<br>• Error schema in `qa_player_agent/agent.md` differs slightly from `ErrorInterceptor.js` schema (`AGENT_BUG_OBSERVATION_v1`).<br>• Does not yet test Web Audio latency or Canvas particle frame drops. |
| **`bug_repair_agent`** | Bug Diagnosis & Code Patching (`subagent: true`) | `view_file`, `replace_file_content`, `run_command` | `AgentQADiagnostics.js` (`diagnoseAndRecommendFix`) | • Directly maps to `diagnoseAndRecommendFix()` rule engine (Z-Index patch, Deadlock watchdog reset, GPU downgrade, Data schema fallback).<br>• Needs automated git diff / rollback validation and regression verification trigger via `director_agent`. |

---

## 3. Current Architecture & Runtime Loop Synthesis

The runtime system operates across three nested self-loop layers:

```
+-----------------------------------------------------------------------------------+
|                            MACRO LOOP (Director & PM)                             |
|  - MEXT Curriculum Roadmap Alignment (Grades 1-6, 1026 Kanji)                     |
|  - Multi-User Economy Inflation Balancing (Star Coins, Badges, Shop Catalog)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        MESO LOOP (Graph Evolution & QA)                           |
|  - Anomaly Pass Rate Detection (Cohort Pass Rate < 35%)                           |
|  - DAG Topology Mutation (Bridge Node Insertion, Prerequisite Rewiring)           |
|  - Playwright Multi-Device Monkey Testing (Mobile 375x812, PC 1920x1080)         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       MICRO LOOP (In-Game Interaction & UI)                       |
|  - Error Interceptor Watchdog (Deadlock 2000ms, FPS < 15, Pointer Tracking)       |
|  - Real-Time Encouragement & Adaptive Hints (Hesitation >= 2 errors)              |
|  - Procedural Web Audio Synth & Canvas Particle FX (Correct / Streak / Miss)      |
+-----------------------------------------------------------------------------------+
```

### Key Findings in Existing Runtime Code:
1. **`AgentIntegration.js`**: Implements `AntigravityAgentBrain`, `AgentSelfLoopPipeline` (`executeMicroLoop`, `executeMesoLoop`, `executeMacroLoop`), and custom DOM events (`AGENT_MICRO_INTERVENTION`, `AGENT_GRAPH_MUTATED`).
2. **`AgentQADiagnostics.js`**: Contains Playwright Monkey Testing scripts and `diagnoseAndRecommendFix` which categorizes bugs into `[UI遮挡/响应式错误]`, `[卡死死锁]`, `[WebGL渲染异常]`, and `[数据逻辑错误]`.
3. **`ErrorInterceptor.js`**: Active in `index.html`, intercepts unhandled exceptions, WebGL context loss, FPS drops, and UI deadlock (click without DOM response for 2000ms).
4. **`EconomySystem.js`**: Manages multi-user profiles, star coins, streaks, Bloom-based dynamic point calculation, shop items, and ledger transactions.
5. **`CurriculumData.js` & `data/`**: Loads 6 subjects across Grades 1–6, including the full `kanji_1026.json` database.

---

## 4. Requirements Specification for `product_manager_agent`

The newly added **`product_manager_agent`** functions as the **Educational Product Manager and Lead Game Producer**. It bridges educational psychology, game design mechanics, curriculum compliance, and engineering quality.

```
.agents/agents/product_manager_agent/agent.md
```

### 4.1. Japanese Elementary Student Developmental Psychology Matrix (Grades 1–6)

| School Stage | Age & Grade | Cognitive & Motor Stage (Piaget / Vygotsky) | UI / UX Design Guidelines | Audio-Visual Feedback Criteria | Game Mechanic Archetypes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **低学年 (Lower)** | **小1・小2** (Ages 6–8) | • Concrete-intuitive thinking<br>• Developing fine motor skills<br>• Reading Hiragana/Katakana fluently; starting basic Kanji (80 / 160 chars)<br>• Low frustration tolerance | • Large touch targets (**min 56px × 56px**)<br>• Full **Furigana (ルビ)** support on all Kanji<br>• High-contrast primary colors & cute celestial mascot icons<br>• Single-tap or gentle drag (avoid complex double clicks) | • Bright, cheerful C-major chord arpeggios (Ding-dong ✨)<br>• **Zero punitive sounds**: gentle wooden marimba pop on error with cartoon wiggle<br>• Stardust particle explosion on clear<br>• Session duration: 30–60 seconds | • **国語**: ひらがな・漢字スラッシュ (Kanji Slash)<br>• **算数**: 九九星際マッチング (Kuku Link)<br>• **生活**: 学校生活・季節の探検クイズ |
| **中学年 (Middle)** | **小3・小4** (Ages 8–10) | • Concrete-operational thinking<br>• Understanding classification, reversibility & spatial rules<br>• Kanji expansion (200 / 202 chars)<br>• Enjoys collection, badges, and combo multipliers | • Standard touch targets (min 44px)<br>• Partial Furigana on advanced terms<br>• Combo meters, streak multiplier indicators<br>• Explicit hint radar button available upon hesitation | • Ascending pentatonic synth tones for Combos (×1.2, ×1.5, ×2.0)<br>• Screen micro-shake (3px, 120ms) on critical combos<br>• Achievement unlock fanfare with golden coin shower | • **算数**: 割り算・小数の星空計算<br>• **社会**: 日本47都道府県 列島パズル (Prefecture Jigsaw)<br>• **理科**: 昆虫・植物・太陽の動き<br>• **英語**: アルファベット・基本会話 |
| **高学年 (Upper)** | **小5・小6** (Ages 10–12) | • Early formal-operational stage<br>• Abstract logic, proportional reasoning, hypothesis testing<br>• Complex Kanji (193 / 191 chars)<br>• Enjoys mastery, strategy, and time-attack challenges | • Precision sliders with numerical display<br>• Rich data visualizations (lever arm ratios, balance scales)<br>• High-level Bloom taxonomy challenges (Synthesis, Evaluation)<br>• Detailed score breakdowns | • Layered synthesizer harmonies with dynamic chord progressions<br>• Milestone celebratory laser beams and galaxy nebula illumination<br>• Detailed performance breakdown modal | • **算数**: 割合・百分率 星艦天秤 (Ratio Scale)<br>• **理科**: てこの規則性 宇宙物理実験室 (Lever Physics)<br>• **社会**: 日本の歴史・国際理解<br>• **英語**: 状況別リスニング＆スピーキング |

---

### 4.2. Fun vs. Challenge Balance Metrics (Flow State Framework)

The PM Agent enforces an educational Flow State model:

```
                 CHALLENGE
                     ^
                     |      ANXIETY / FRUSTRATION ZONE
                     |     (Pass Rate < 35% -> Auto Bridge Node Insert)
                     |         /
                     |        /     ★ OPTIMAL FLOW CHANNEL ★
                     |       /      (Target Pass Rate: 75% - 85%)
                     |      /
                     |     /
                     |    /      BOREDOM ZONE
                     |   /      (Pass Rate > 95% -> Bloom Depth & Speed Boost)
                     +---------------------------------------------> SKILL
```

1. **Target Success Rate Window**: **75% – 85%** average pass rate across cohorts.
2. **Cognitive Drop-off Threshold (< 35%)**: When player pass rate drops below 35% with sample size >= 5, PM Agent commands `graph_evolution_agent` to generate a bridging node (`INSERT_NODE`) and adjust prerequisite edges.
3. **Hesitation & Error Tolerance**:
   - 1st error: Friendly cartoon shake + subtle clue glow.
   - 2nd error: Soft toast hint injection (`AGENT_MICRO_INTERVENTION`).
   - 3rd error: Highlight correct target directly; game speed slowed by 25% to preserve child confidence.
4. **Dynamic Score Formula**:
   $$\text{Score} = \text{round}\Big( B \times C_{\text{depth}} \times A_{\text{score}} \times S_{\text{multi}} \Big)$$
   - $B$ = Base points (100)
   - $C_{\text{depth}}$ = Bloom Depth ($1.0 \le C \le 2.5$)
   - $A_{\text{score}}$ = Accuracy ($0.0 \le A \le 1.0$)
   - $S_{\text{multi}}$ = Streak multiplier ($1.0 + \text{streak} \times 0.1$, capped at $2.0\times$)

---

### 4.3. Multisensory Audio-Visual Polish Requirements

1. **Web Audio API Native Synthesizer (Zero External Dependencies)**:
   - Must run purely on browser `AudioContext` without `.mp3`/`.wav` static file dependencies (100% offline & instant playback).
   - **Correct / Match Tone**: Polyphonic arpeggio (C5: 523.25Hz -> E5: 659.25Hz -> G5: 783.99Hz -> C6: 1046.50Hz) with smooth gain envelope (0.05s attack, 0.3s decay).
   - **Error / Miss Tone**: Warm low-frequency marimba sine wave (F3: 174.61Hz -> D3: 146.83Hz, 0.2s duration) with gentle lowpass filter.
   - **Combo Tone**: Ascending pentatonic sweep with subtle resonance.
   - **Clear Fanfare**: Multi-oscillator triumphant chord with sparkle vibrato.
   - **Audio Toggle**: Persistent Mute/Unmute state stored in `localStorage`.

2. **Canvas / CSS Particle FX & Screen Shake**:
   - **Particle Burst**: Burst of 24–48 stardust particles radiating outward with gravity, rotation, and color fade (Gold `#fbbf24`, Cyan `#38bdf8`, Pink `#f43f5e`).
   - **Screen Shake**: Micro-shake class applied to `#game-stage` or `#canvas-container` (`transform: translate3d(±3px, ±2px, 0)` for 120ms).
   - **Performance Guard**: Automatic particle count reduction from 48 to 16 if frame rate drops below 30 FPS.

3. **Error Feedback & Clue Guiding**:
   - Friendly visual jiggle animation on incorrect elements (`animate-shake`).
   - Clue spotlighting (`ring-4 ring-amber-400/80 ring-offset-2 animate-pulse`).
   - Friendly Japanese guidance speech bubble (`「惜しい！もう一回やってみよう」`).

---

### 4.4. MEXT Curriculum Roadmap & DAG Compliance

1. **Full 6-Subject Coverage**:
   - **国語 (Kokugo)**: 1,026 MEXT Joyo Kanji accurately partitioned (1st: 80, 2nd: 160, 3rd: 200, 4th: 202, 5th: 193, 6th: 191).
   - **算数 (Sansu)**: Numbers, Addition/Subtraction, Kuku Multiplication, Fractions, Decimals, Ratios (割合), Plane & Solid Geometry.
   - **理科 (Rika, Grades 3–6)**: Living organisms, Weather, Light & Magnetism, Electric circuits, Cosmic astronomy, Lever physics (てこ).
   - **社会 (Shakai, Grades 3–6)**: Community living, Map symbols, 47 Prefectures geography & industry, Japanese history milestones, Global society.
   - **生活 (Seikatsu, Grades 1–2)**: School life, Nature observation, Community exploration, Living habits.
   - **外国語・英語 (Eigo, Grades 3–6)**: Phonics, Daily greetings, Vocabulary matching, Situational dialogues.

2. **DAG Integrity & Deadlock Elimination**:
   - Topological sorting check: **Acyclic Directed Graph (DAG)** with 0 circular loops.
   - No orphaned nodes: Every node has at least one valid path from Grade 1 entry points.
   - Smooth Bloom depth gradient ($1.0 \to 1.3 \to 1.7 \to 2.0 \to 2.5$).

---

## 5. Director Agent Orchestration Flow & Schemas

### 5.1. Multi-Agent Teamwork Topology

```
                              +-------------------------+
                              |      DIRECTOR AGENT     |
                              |  (Master Orchestrator)  |
                              +------------+------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
        +----------------------+                       +-----------------------+
        | PRODUCT MANAGER AGENT|                       |   QA PLAYER AGENT     |
        |  - Pedagogy Roadmap  |                       |  - Monkey Testing     |
        |  - Child Psychology  |                       |  - Bug Capture        |
        |  - Flow Balance KPIs |                       |  - Viewport Matrix    |
        +----------+-----------+                       +-----------+-----------+
                   |                                               |
         +---------+---------+                                     |
         |                   |                                     v
         v                   v                         +-----------------------+
+------------------+ +--------------------+            |   BUG REPAIR AGENT    |
|  GAME DESIGNER   | |  GRAPH EVOLUTION   |            |  - Root Cause Triage  |
|  - H5 Gameplay   | |  - DAG Mutations   |            |  - Codebase Patches   |
|  - Web Audio FX  | |  - Bridge Nodes    |            |  - Linter / Test Fix  |
|  - Canvas Visual | |  - Pass Rate Log   |            +-----------+-----------+
+--------+---------+ +---------+----------+                        |
         |                     |                                   |
         +----------+----------+                                   |
                    |                                              |
                    +----------------------+-----------------------+
                                           |
                                           v
                              +-------------------------+
                              |   REGRESSION VERIFY &   |
                              |      GIT COMMIT         |
                              +-------------------------+
```

---

### 5.2. Standardized JSON Schemas Across Agents

#### 1. PM Feature Specification Schema (`PM_SPEC_v1`)
```json
{
  "schema": "PM_SPEC_v1",
  "feature_id": "FEAT-2026-MATH-KUKU-FX",
  "target_grade": [1, 2],
  "subject": "算数",
  "pedagogical_goal": "かけ算九九の暗唱定着と計算速度の向上",
  "target_flow_metrics": {
    "expected_pass_rate": 0.80,
    "max_duration_sec": 75,
    "hesitation_error_threshold": 2
  },
  "audio_visual_requirements": {
    "sound_correct": "SYNTH_ARPEGGIO_C5_C6",
    "sound_error": "SYNTH_MARIMBA_GENTLE",
    "particle_fx": "GOLDEN_STARDUST_BURST",
    "screen_shake_intensity": 3
  },
  "accessibility": {
    "min_touch_target_px": 56,
    "furigana_enabled": true
  }
}
```

#### 2. Game Designer Implementation Schema (`DESIGNER_OUTPUT_v1`)
```json
{
  "schema": "DESIGNER_OUTPUT_v1",
  "game_type": "KUKU_LINK",
  "target_files": ["MiniGameSystem.js", "KukuLinkGame.js"],
  "mechanics": {
    "grid_dimensions": "4x4",
    "max_turns": 2,
    "time_limit_sec": 75
  },
  "audio_hooks": {
    "onMatch": "playSound('match')",
    "onMiss": "playSound('error')",
    "onCombo": "playSound('combo', comboCount)"
  },
  "score_formula": "calculateDynamicPoints({ base: 100, bloomDepth: 1.3, accuracy, streakCount })"
}
```

#### 3. QA Bug Observation Schema (`QA_BUG_REPORT_v1`)
```json
{
  "schema": "QA_BUG_REPORT_v1",
  "bug_id": "BUG-20260822-001",
  "category": "UI_OVERFLOW | UI_DEADLOCK_HANG | WEBGL_CONTEXT_LOST | RUNTIME_JS_ERROR",
  "device": "Mobile | Desktop",
  "viewport": { "width": 375, "height": 812 },
  "node_id": "MATH_G2_KUKU_LINK",
  "error_message": "Pointer click on canvas missed due to glass-panel z-index collision",
  "stack_trace": "Error at MiniGameSystem.js:142",
  "fps": 58,
  "reproduce_steps": [
    "Open mobile viewport 375x812",
    "Click node MATH_G2_KUKU_LINK",
    "Tap on top right tile"
  ]
}
```

#### 4. Bug Repair Patch Schema (`REPAIR_PATCH_v1`)
```json
{
  "schema": "REPAIR_PATCH_v1",
  "bug_id": "BUG-20260822-001",
  "root_cause": "CSS z-index overlap blocked touch events on mobile screen",
  "action_type": "CSS_ZINDEX_PATCH",
  "affected_files": ["index.html"],
  "verification_command": "npx playwright test",
  "status": "RESOLVED"
}
```

#### 5. Graph Mutation Directive Schema (`GRAPH_MUTATION_v1`)
```json
{
  "schema": "GRAPH_MUTATION_v1",
  "directive_id": "MUT-20260822-0042",
  "trigger_reason": "ANOMALY_PASS_RATE_DROP",
  "target_node": "MATH_G5_RATIO",
  "observed_pass_rate": 0.284,
  "mutations": [
    {
      "operation": "INSERT_NODE",
      "node": {
        "id": "MATH_G5_RATIO_VISUAL",
        "name": "割合の可視化：テープ図ブリッジ",
        "subject": "算数",
        "grade": 5,
        "bloomDepth": 1.4,
        "gameType": "RATIO_SCALE"
      },
      "placement": {
        "after_node": "MATH_G4_AREA_DECIMAL",
        "before_node": "MATH_G5_RATIO"
      }
    }
  ]
}
```

---

## 6. Proposed Agent Definition Files

### 6.1. Proposed `product_manager_agent/agent.md`
```markdown
name: product_manager_agent
description: 日本小学校教育产品经理与制作人（Lead Producer），统筹各年级认知心理、趣味与挑战度平衡、声光正反馈及教学大纲图谱规划。
mainAgent: false
subagent: true
permissionMode: acceptEdits
commandExecutionPolicy: auto
tools:
  view_file
  replace_file_content
  run_command

角色定义
你是“星图教育游戏”的教育产品经理与游戏制作人（Lead Game Producer & Educational PM Agent）。

核心职责
1. 深度把控日本文部科学省（MEXT）小学 1〜6 年级学生的认知发展心理学（Piaget 认知阶段），针对低/中/高学年制定差异化交互、操作区域与识字（Furigana 假名标注）规范。
2. 建立教育游戏 Flow 状态心流模型，把控 75%〜85% 核心通关率区间与 0〜2.5 Bloom 认知梯度，定义动态积分与连续答对 Combo 激励公式。
3. 规划零外部资源依赖的原生 Web Audio API 合成音效矩阵（正确、错误、连击、通关）与 Canvas 粒子/微震屏正反馈动效。
4. 维护 6 大全教科（国语1026汉字、算数、理科、社会、生活、英语）知识图谱拓扑完整性，设定 DAG 无环路、无死锁与平滑进化的验收标准。
5. 向 director_agent 提交标准化产品需求规约（PM_SPEC_v1），指导 game_designer_agent、graph_evolution_agent 与 qa_player_agent 协同研发。

约束条件
1. 严禁违背文部科学省《小学校学習指導要領》的基本教学目标。
2. 坚持低门槛、零惩罚、高鼓励的儿童教育心理学原则，杜绝严厉刺耳的负面反馈。
3. 保证所有游戏组件均兼容移动触控端（大触控区 >= 48px）与 PC 端。
```

### 6.2. Recommended Updates for `director_agent/agent.md`
Add product management intake, PM specification routing, and macro-loop game balance validation to `director_agent`.

---

## 7. Actionable Next Steps & Milestone Plan

1. **M1 (Multi-Agent Architecture & PM Setup)**:
   - Create `.agents/agents/product_manager_agent/agent.md`.
   - Update `.agents/agents/director_agent/agent.md`, `game_designer_agent/agent.md`, and `graph_evolution_agent/agent.md` to establish unified communication protocols.
2. **M2 (Web Audio & Visual Feedback Polish)**:
   - Implement native Web Audio synthesizer in a dedicated modular audio engine (`SoundFXSystem.js`).
   - Implement Canvas/CSS particle burst engine and screen shake feedback.
   - Enhance error guidance with friendly animations and clue highlighting.
3. **M3 (6-Subject Mini-Game Enhancement & Child-Friendly Interactivity)**:
   - Upgrade Kanji Slash, Kuku Link, Ratio Scale, Lever Physics, and Prefecture Jigsaw.
   - Enlarge touch hitboxes (min 56px for Grade 1-2).
   - Ensure responsive viewports for Mobile (375x812) and PC (1920x1080).
4. **M4 (MEXT Curriculum Data & DAG Topology Evolution)**:
   - Validate 1,026 Kanji in `data/kanji_1026.json` and 6-subject DAG in `CurriculumData.js`.
   - Verify topological sort (acyclic, reachable).
   - Integrate `AgentIntegration.js` mutation logic with real DAG files.
5. **Phase 3 (Testing & Audit)**:
   - Execute Playwright monkey test suite across device matrix.
   - Zero-cheat forensic verification.

---
*Report authored by Teamwork Explorer 1. Ready for Parent Orchestration.*
