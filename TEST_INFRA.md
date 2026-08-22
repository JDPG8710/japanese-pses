# Japanese PSES Galaxy Engine — Systematic E2E Testing Infrastructure
**Document**: `TEST_INFRA.md`  
**Version**: 2026.08.v1  
**Project Root**: `d:/Japanese PSES`  
**Standard**: 4-Tier Systematic Test Methodology & Opaque-Box Verification  

---

## 1. Executive Summary & Quality Mandate

The Japanese PSES Galaxy Engine (日本小学校学習指導要領 · 銀河知識星図) is a comprehensive multi-agent educational gaming platform for Japanese elementary school students (Grades 1–6). It covers 6 core subjects (**国語 Kokugo**, **算数 Sansu**, **理科 Rika**, **社会 Shakai**, **生活 Seikatsu**, **外国語・英語 Eigo**), the complete MEXT 1,026 Joyo Kanji corpus, procedural Web Audio synthesis, particle physics, 3-tier child-friendly error guidance, and self-evolving knowledge graph DAGs.

### The Zero-Cheat Integrity Guarantee
Every test in this suite is a genuine opaque-box verification executing actual mathematical, algorithmic, syntactic, structural, and behavioral assertions against the application's contracts. No hardcoded test passes, mock-bypasses, or facade assertions are permitted.

---

## 2. The 4-Tier Systematic Testing Architecture

```
+-----------------------------------------------------------------------------------+
|               TIER 4: REAL-WORLD ELEMENTARY STUDENT PLAYTHROUGHS                  |
|  - Realistic grade 1-6 student journeys (Hinata, Ren, Sakura, Sota, Aoi)          |
|  - Multi-subject progression, frustration detection, bridge node auto-healing     |
|  - Multi-user profile switching, ledger isolation, economy shop transactions      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               TIER 3: CROSS-FEATURE PAIRWISE & INTEGRATION MATRIX                 |
|  - PM Spec -> Designer -> QA -> Repair loop integration                           |
|  - Game Clear -> Dynamic Points -> Economy Reward -> DAG Mastery Unlock           |
|  - Error Interceptor -> Micro-loop -> Guidance Mascot -> Audio Synthesizer        |
|  - Anomaly Pass Rate (<35%) -> Meso-loop -> DAG Mutation -> Acyclicity Check      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               TIER 2: BOUNDARY, CORNER & ADVERSARIAL STRESS CASES                 |
|  - Extreme audio frequencies, gain limits, rapid mute toggling, audio context lock |
|  - Particle count bounds (16 to 100), zero-velocity vectors, NaN coordinates      |
|  - Hitbox hit-padding bounds (>=56px for G1-2, >=44px for G3-6), touch debounce  |
|  - Empty graphs, orphan nodes, cyclic edge injection, single-node DAGs            |
|  - Extreme economy inputs (negative points, 100% accuracy, max streak multiplier) |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               TIER 1: SYSTEMATIC FEATURE & CONTRACT COVERAGE (>=5/feat)           |
|  - F1: PM Agent & Developmental Psychology (Piaget/Vygotsky grades 1-6)           |
|  - F2: Multi-Agent Schemas & Director Coordination                                |
|  - F3: Web Audio Native Procedural Synthesizer                                    |
|  - F4: Canvas 2D Particles, Explosions & Screen Shake                             |
|  - F5: 3-Tier Friendly Error Guidance Scaffolding                                 |
|  - F6: Kokugo Mini-Games (Kanji Slash & Radical Assembly)                         |
|  - F7: Sansu Mini-Games (Kuku Link & Aether Ratio Scale)                          |
|  - F8: Rika Mini-Games (Lever Physics, Astronomy, Circuit Sandbox)                |
|  - F9: Shakai Mini-Games (47 Prefectures Map Puzzle & Specialties)                |
|  - F10: Eigo & Seikatsu Mini-Games (Context Matching & Category Sorting)          |
|  - F11: Hitbox Ergonomics & Mobile/Desktop Viewports (>=56px)                     |
|  - F12: MEXT 1,026 Kanji Database & Grade Allocation                              |
|  - F13: 6-Subject Curriculum DAG Acyclicity & Topological Sort                    |
|  - F14: Graph Evolution, Fracture Detection & Auto-Healing                        |
|  - F15: Multi-User Economy, Token Ledger & Dynamic Points Formula                 |
+-----------------------------------------------------------------------------------+
```

---

## 3. Detailed Tier Breakdown & Specifications

### Tier 1: Feature Coverage Specifications (>= 5 Tests per Feature)

#### F1: PM Agent Architecture & Developmental Psychology
1. Verify `product_manager_agent/agent.md` exists and contains core roles, developmental guidelines, and Flow state rules.
2. Verify developmental psychology matrix for Lower Elementary (Grades 1-2: min 56px touch, full furigana, zero punitive audio).
3. Verify Middle Elementary guidelines (Grades 3-4: min 44px, combo escalations, streak indicators).
4. Verify Upper Elementary guidelines (Grades 5-6: proportional reasoning, Bloom depth 2.0-2.5, balance models).
5. Verify Flow Channel target pass rate metrics (75%–85% target window; <35% triggers automatic bridge node).

#### F2: Multi-Agent Schemas & Director Coordination
1. Validate `PM_SPEC_v1` schema compliance (feature_id, target_grade, flow_metrics, audio_visual_requirements, accessibility).
2. Validate `DESIGNER_OUTPUT_v1` schema compliance (game_type, mechanics, audio_hooks, score_formula).
3. Validate `QA_BUG_REPORT_v1` schema compliance (bug_id, category, viewport, reproduce_steps).
4. Validate `REPAIR_PATCH_v1` schema compliance (bug_id, root_cause, action_type, verification_command).
5. Validate `GRAPH_MUTATION_v1` schema compliance (directive_id, trigger_reason, mutations array with INSERT_NODE/UPDATE_EDGE).

#### F3: Web Audio Procedural Synthesizer
1. Validate AudioSynthesizer interface contract (`playPositive`, `playCombo`, `playGentleError`, `playButtonTap`, `playFanfare`, `setMuted`, `isMuted`).
2. Verify frequency progression of positive chord arpeggios (C5: 523.25Hz -> E5: 659.25Hz -> G5: 783.99Hz -> C6: 1046.50Hz).
3. Verify combo pitch glissando formula ($f_{\text{combo}} = 440 \times 2^{(\text{combo}-1)/12}$).
4. Verify gentle error tone downward frequency sweep (260Hz -> 180Hz) and lowpass filter safety.
5. Verify persistent mute state toggle and localStorage synchronization.

#### F4: Canvas 2D Particles, Explosions & Screen Shake
1. Verify 2D Particle physics (gravity, drag coefficient, velocity decay, rotation, alpha degradation).
2. Verify particle shapes (star 5-point geometry, coin with star glyph, circle, spark).
3. Verify starburst emitter parameters (count 24-48, multi-color palette #fbbf24, #38bdf8, #f43f5e).
4. Verify screen shake intensity bounds (1px to 10px) and duration limits (100ms to 500ms).
5. Verify floating score text rendering and lifetime management.

#### F5: 3-Tier Friendly Error Guidance
1. Tier 1 verification: First error generates gentle wobble, friendly toast 「おしい！ もう一度！」, and zero score penalty.
2. Tier 2 verification: Second error highlights target clue with pulsing spotlight ring.
3. Tier 3 verification: Third error triggers mascot speech bubble (星の子ピコ) with educational explanation.
4. Verify error counter reset upon correct answer submission.
5. Verify non-punitive scoring: errors must never reduce total score below 0 or apply negative deductions.

#### F6: Kokugo Mini-Games (Kanji Slash & Radical Assembly)
1. Verify Kanji Slash meteor trajectory, spawn intervals, and target matching.
2. Verify Kanji Slash hitbox hit detection tolerance (radius + 25px).
3. Verify Radical Assembly game mechanics (combining parts, e.g. 氵 + 青 = 清, 木 + 木 = 林).
4. Verify Kanji reading challenge grade selector dynamically pulls from `kanji_1026.json`.
5. Verify win condition evaluation and score emission.

#### F7: Sansu Mini-Games (Kuku Link & Aether Ratio Scale)
1. Verify Kuku Link 2-turn laser pathfinding algorithm (straight, 1-bend, 2-bend orthogonal routing).
2. Verify Kuku Link board generation (4x4, matching multiplication formula with product).
3. Verify Kuku Link hint generator and board reshuffle mechanics.
4. Verify Aether Ratio Scale slider / pan balance equilibrium calculation ($|current - target| \le tolerance$).
5. Verify dynamic point integration with streak multipliers for Sansu.

#### F8: Rika Mini-Games (Lever Physics, Astronomy, Circuit Sandbox)
1. Verify Cosmic Lever Physics moment equilibrium calculation ($W_1 \times L_1 = W_2 \times L_2$).
2. Verify drag-and-drop weight slot placement and torque balance angle calculation.
3. Verify Astronomy sandbox moon phase and solar orbit angle progression.
4. Verify Electric Circuit sandbox series vs parallel switch connections and bulb illumination state.
5. Verify genuine user interaction validation (rejection of auto-win bypasses).

#### F9: Shakai Mini-Games (47 Prefectures & Regional Specialties)
1. Verify complete 47 Prefectures database coverage across 8 regions (Hokkaido, Tohoku, Kanto, Chubu, Kinki, Chugoku, Shikoku, Kyushu-Okinawa).
2. Verify map piece drag-and-drop target snapping with distance threshold ($\le 45\text{px}$).
3. Verify regional specialty matching (e.g. Aomori -> Apple, Shizuoka -> Green Tea, Aichi -> Automobiles).
4. Verify wrong region drop triggers Tier 1 friendly cartoon wobble and returns piece to tray.
5. Verify regional clear fanfare and prefecture navigator completion.

#### F10: Eigo & Seikatsu Mini-Games (Context Match & Category Sort)
1. Verify Eigo contextual scene matching (pairing vocabulary with illustrated scenario).
2. Verify Eigo dialogue ordering (greeting -> response -> farewell).
3. Verify Seikatsu category sorting (dragging items into recyclable vs combustible or school vs home bins).
4. Verify Seikatsu plant growth sequencing (seed -> sprout -> leaf -> flower -> fruit).
5. Verify accessibility and child-friendly touch targets for G1-G2 Seikatsu.

#### F11: Hitbox Ergonomics & Viewport Responsiveness
1. Verify Lower Elementary (Grades 1-2) interactive elements meet or exceed 56px × 56px minimum.
2. Verify Middle/Upper Elementary (Grades 3-6) interactive elements meet or exceed 44px × 44px minimum.
3. Verify mobile touch padding expansion (+8px to +12px transparent hit zone).
4. Verify mobile viewport adaptation (375x812 iPhone, 768x1024 iPad, 1920x1080 Desktop).
5. Verify rapid double-tap debounce prevention (minimum 250ms interval between tap registrations).

#### F12: MEXT 1,026 Joyo Kanji Database Integrity
1. Total Kanji count is exactly 1,026.
2. Grade 1 contains exactly 80 Kanji.
3. Grade 2 contains exactly 160 Kanji.
4. Grade 3 contains exactly 200 Kanji.
5. Grade 4 contains exactly 202 Kanji.
6. Grade 5 contains exactly 193 Kanji.
7. Grade 6 contains exactly 191 Kanji.
8. Zero duplicate Kanji across all grades; all entries have valid `k`, `r`, `on`, and `kun` fields.

#### F13: 6-Subject Curriculum DAG Acyclicity & Topological Sort
1. Verify all 6 subjects (Kokugo, Sansu, Rika, Shakai, Seikatsu, Eigo) form a valid Directed Acyclic Graph (DAG).
2. Topological sort using Kahn's algorithm succeeds with zero cycles.
3. Verify all Grade 1 entry nodes (or Grade 3 for Rika/Shakai/Eigo) have empty prerequisites (`[]`).
4. Verify zero orphan nodes; every node is reachable from an entry node.
5. Verify cross-subject STEM prerequisites (e.g. Rika G5 requiring Sansu G4 decimal/area).

#### F14: Graph Evolution, Fracture Detection & Auto-Healing
1. Verify anomaly pass rate detection (<35% threshold triggers fracture diagnosis).
2. Verify bridge node generation and insertion between prerequisite and target node.
3. Verify edge rewiring maintaining acyclicity post-mutation.
4. Verify difficulty parameter adjustment (speed multiplier 0.8x, hitbox expansion 1.25x).
5. Verify dynamic graph mutation preserves MEXT standard curriculum coverage.

#### F15: Multi-User Economy, Token Ledger & Dynamic Points
1. Verify multi-user profile creation, switching, and state isolation.
2. Verify dynamic point calculation formula: $\text{round}(B \times C_{\text{depth}} \times A_{\text{score}} \times S_{\text{multi}})$.
3. Verify first-clear reward grant vs replay mastery update (no duplicate star coin inflation).
4. Verify shop item catalog validation and purchase transaction balance deduction.
5. Verify double-entry ledger audit trail logging for all rewards and purchases.

---

### Tier 2: Boundary & Corner Cases (>= 5 Tests per Feature Area)

1. **Web Audio Limits**:
   - Zero volume, negative volume clamping, max volume limit (1.0).
   - Rapid concurrent sound calls (100 simultaneous calls) without AudioContext crash.
   - Frequency bounds ($20\text{Hz} \le f \le 20000\text{Hz}$).
   - Mute state rapid toggle 50 times in succession.
   - AudioContext suspended state recovery on first user interaction.

2. **Visual FX & Particle Bounds**:
   - Zero particle spawn count handling.
   - Particle count throttled down under low FPS (48 -> 16).
   - Infinite/NaN coordinate protection in particle update.
   - Screen shake duration 0ms and >1000ms clamped to safe range.
   - Canvas resizing to 0x0 or negative dimensions gracefully handled.

3. **Hitbox & Ergonomics Corner Cases**:
   - Touch coordinates at exact canvas boundaries (0,0) and (width, height).
   - Multi-touch simultaneous 5-finger taps filtered to primary touch.
   - Click events fired while animation transitions are in progress.
   - Window resize during active mini-game session.
   - Ultra-narrow viewport (320px width) layout preservation.

4. **Curriculum DAG Topology Corner Cases**:
   - Single-node graph topological sort.
   - Completely disconnected subgraphs validation.
   - Simulated circular prerequisite injection detected and rejected.
   - Self-referencing node dependency detected and rejected.
   - Non-existent prerequisite ID reference detected and flagged.

5. **Economy & Ledger Corner Cases**:
   - 0 accuracy gives 0 points but valid transaction.
   - 100 streak count capped at maximum $2.0\times$ multiplier.
   - Purchase with insufficient coins rejected without balance alteration.
   - Purchase with exact balance leaving 0 coins succeeds.
   - Empty user name / whitespace-only user name rejected.

---

### Tier 3: Cross-Feature Combinations (Pairwise & Inter-Module Workflows)

1. **PM -> Game Designer -> QA Loop**:
   - PM Agent issues `PM_SPEC_v1` for Kuku Link.
   - Game Designer generates game parameters conforming to spec.
   - QA Agent executes simulated monkey run and evaluates pass criteria.
2. **Game Clear -> Dynamic Points -> Economy -> DAG Mastery**:
   - Player completes Sansu node with 90% accuracy and 3 streak.
   - Points calculated via dynamic formula and credited to active user.
   - Node status transitions to CLEARED ($0.90 \ge 0.85$).
   - Downstream dependent nodes transition from LOCKED to AVAILABLE.
3. **Repeated Error -> Micro-Intervention -> Guidance Mascot -> Audio Feedback**:
   - Player commits 3 consecutive errors in Kanji Slash.
   - ErrorInterceptor captures hesitation.
   - Micro-loop emits `AGENT_MICRO_INTERVENTION`.
   - GuidanceSystem displays mascot speech bubble (星の子ピコ) and plays gentle error boop.
   - Clue spotlight ring appears on target radical.
4. **Cohort Pass Rate Drop -> Meso-Loop -> DAG Mutation -> Graph Re-Validation**:
   - 5 consecutive fails recorded on `MATH_G5_RATIO` (pass rate 0%).
   - Meso-loop triggers `SAMPLE_GRAPH_MUTATION_DIRECTIVE`.
   - Bridge node `MATH_G5_RATIO_VISUAL` inserted into DAG.
   - Prerequisite edge rewired: `MATH_G4_AREA_DECIMAL` -> `MATH_G5_RATIO_VISUAL` -> `MATH_G5_RATIO`.
   - Topological sort verifies mutated graph remains 100% acyclic and deadlock-free.
5. **Audio Persistence Across User Sessions**:
   - User A mutes audio; setting saved to localStorage.
   - Switch to User B; audio preferences loaded and maintained.
   - User B triggers game sound; synthesizer checks `isMuted` and bypasses output cleanly.

---

### Tier 4: Real-World Student Playthrough Scenarios

1. **Scenario 1: Grade 1 Student ("ひなた - Hinata") — Lower Elementary Journey**:
   - Enters platform, selects Grade 1 Kokugo (ひらがな・カタカナ).
   - Plays Kanji Slash with large 56px touch hitboxes and full Furigana.
   - Makes 1 mistake -> receives gentle wobble and toast.
   - Clears stage with 95% accuracy -> receives 114 Star Coins + Stardust particle burst + C-major chime.
   - Checks unlocked Seikatsu Grade 1 node (学校探検・朝顔).
2. **Scenario 2: Grade 2 Student ("れん - Ren") — Kuku Multiplication & Shop Spree**:
   - Starts with 500 starter coins and 3 streak.
   - Plays Sansu Grade 2 Kuku Link (かけ算九九星際マッチング).
   - Connects 8 pairs with 2-turn laser paths, achieving 4 combo.
   - Clears with 100% accuracy -> earns dynamic points and increases streak to 4.
   - Enters Shop and purchases "九九星際レジェンド" badge for 300 coins.
   - Balance accurately updates from 656 to 356 coins in ledger.
3. **Scenario 3: Grade 4 Student ("さくら - Sakura") — Shakai 47 Prefectures & Rika Astronomy**:
   - Selects Shakai Grade 4 (47都道府県 列島パズル).
   - Drags Hokkaido, Tokyo, Kyoto, Fukuoka, Okinawa to map slots.
   - Matches Aomori with Apple and Shizuoka with Green Tea.
   - Clears Shakai node and unlocks Rika Grade 4 (空気と水・天体の動き).
   - Interacts with Astronomy celestial orbit sandbox.
4. **Scenario 4: Grade 5 Student ("そうた - Sota") — Adaptive Fracture Healing**:
   - Struggles with Grade 5 Sansu Ratio (`MATH_G5_RATIO`), failing 5 times.
   - Antigravity Brain ingests telemetry and triggers Meso-loop mutation.
   - Graph automatically heals by inserting `MATH_G5_RATIO_VISUAL` bridge node.
   - Student plays visual tape diagram bridge game with 80% accuracy.
   - Proceeds to clear `MATH_G5_RATIO` with reduced speed and expanded hitboxes.
5. **Scenario 5: Grade 6 Student ("あおい - Aoi") — Cross-Subject STEM Mastery**:
   - Solves Grade 5 Ratio (`MATH_G5_RATIO`), reaching 90% mastery.
   - Cross-subject prerequisite satisfies Grade 6 Rika (`RIKA_G6_LEVER_AQUEOUS`).
   - Plays Lever Physics experiment sandbox, balancing 30g weight at slot 2 against 20g weight at slot 3 ($30 \times 2 = 20 \times 3 = 60$).
   - System validates true torque equilibrium and awards Science Master badge.
6. **Scenario 6: Multi-Child Household Profile Segregation**:
   - User "ひなた" logs in, clears Kokugo G1, earns 114 coins (total 614).
   - Sibling "れん" logs in on same device; profile, ledger, streak, and unlocked DAG remain strictly isolated.
   - "れん" buys badge; "ひなた"'s balance and inventory remain untouched.

---

## 4. Test Runner & Harness Specifications

### 4.1 Output Protocols
- **TAP 13 Output**: Standard Test Anything Protocol format for CI/CD integrations:
  ```
  TAP version 13
  1..N
  ok 1 - Suite Name > Test Case Name
  not ok 2 - Suite Name > Failing Test Case Name
  # Error: Assertion failed ...
  ```
- **Structured JSON Summary**: Machine-readable breakdown for quality gates:
  ```json
  {
    "summary": {
      "totalTests": 85,
      "passed": 85,
      "failed": 0,
      "skipped": 0,
      "durationMs": 420,
      "successRate": 1.0
    },
    "suites": [...]
  }
  ```

### 4.2 Browser Environment Mocking Strategy
The headless test environment provides comprehensive, spec-compliant mocks for:
- `AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `AudioParam`
- `HTMLCanvasElement`, `CanvasRenderingContext2D`, `Path2D`
- `localStorage`, `sessionStorage`
- `window`, `document`, `CustomEvent`, `EventTarget`, `navigator`
- `requestAnimationFrame`, `cancelAnimationFrame`

---

## 5. Execution Commands

```bash
# Run the Master E2E Test Suite
node tests/test_e2e_runner.js

# Run Individual Domain Suites
node tests/test_agents.js
node tests/test_audio_fx.js
node tests/test_curriculum_dag.js
node tests/test_games.js
```
