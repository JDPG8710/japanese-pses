# Project: Japanese PSES Galaxy Engine

## Architecture
The Japanese PSES Galaxy Engine is an educational multi-agent gaming platform for Japanese elementary school students (Grades 1-6), covering 6 core subjects (Kokugo, Sansu, Rika, Shakai, Eigo, Seikatsu) across 1,026 MEXT Joyo Kanji and curriculum topics.

### Core Systems
1. **Multi-Agent Collaboration Engine (`.agents/agents/`, `js/AgentIntegration.js`, `js/AgentQADiagnostics.js`)**:
   - `product_manager_agent`: Defines developmental psychology rules, fun/challenge metrics, feedback rules, and curriculum roadmap.
   - `director_agent`: Master orchestrator coordinating PM, Game Designer, Graph Evolution, QA, and Bug Repair agents.
   - `game_designer_agent`: Mini-game mechanics and pedagogical level design.
   - `graph_evolution_agent`: DAG topological integrity, fracture detection, and auto-smoothing.
   - `qa_player_agent`: Automated playthrough simulations and stress testing.
   - `bug_repair_agent`: Diagnostic telemetry and runtime error auto-patching.

2. **Audio-Visual & Feedback Engine (`js/AudioSynthesizer.js`, `js/FXSystem.js`, `css/style.css`)**:
   - Web Audio API zero-dependency procedural synthesizer (positive chimes, combo glissando, gentle error boop, UI clicks, mute controls).
   - 2D Canvas & CSS particle explosion engine (stardust, coins, sparkles) and screen shake/cartoon wiggle system.
   - 3-tier child-friendly error guidance (soft bounce -> clue glow -> mascot "星の子ピコ" explanation bubble).

3. **Curriculum & 3D Galaxy Graph Engine (`js/CurriculumData.js`, `js/GraphEngine.js`, `data/kanji_1026.json`)**:
   - 6-subject DAG topology with 1,026 Kanji and multi-subject nodes; cycle-free topological sorting.
   - Dynamic graph evolution and mutation repair.

4. **6-Subject Mini-Game Suite (`js/MiniGameSystem.js`, `js/games/`)**:
   - **Kokugo**: Radical Assembly (偏旁部首) + Star Stream Kanji Slash.
   - **Sansu**: Kuku Multiplication Laser Combo + Starship Balance Scale (星舰天平).
   - **Rika**: Celestial Orbits + Lever Physics Balance + Electric Circuit Sandbox.
   - **Shakai**: 47 Prefectures Map Puzzle + Regional Specialty Treasure Hunt.
   - **Eigo & Seikatsu**: Contextual Scene Matching & Drag-and-Drop Categorization.
   - Child-friendly touch/mouse hitboxes (min 56px, zero accidental double-tap).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | PM Agent Architecture | Create `product_manager_agent/agent.md` with developmental psychology, fun metrics, and I/O schemas | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Agent Alignment & Director Integration | Align 5 existing agents in `.agents/agents/` and update director runtime coordination logic in `AgentIntegration.js` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Web Audio Synthesizer | Zero-dependency procedural Web Audio engine with arpeggios, combo pitch increments, soft error tones, and mute button | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Canvas/CSS Particle Explosions & Screen Shake | 2D particle burst effects (stars, coins) and subtle screen shake/wobble on events | M2 | ORIGINAL_REQUEST §R2 |
| 5 | 3-Tier Friendly Error Guidance | Gentle wobble feedback, clue highlighting, and mascot speech bubble explanations (no punitive score deduction) | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Kokugo Mini-Games | Kanji radical assembly (偏旁部首拼装) + Star stream kanji slash | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Sansu Mini-Games | Kuku multiplication combo + Starship pan balance scale (星舰天平) | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Rika Mini-Games | Interactive sandbox experiments (Celestial orbits, Lever balance physics, Electric circuits) | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Shakai Mini-Games | 47 Prefectures map puzzle & regional specialty treasure hunt | M3 | ORIGINAL_REQUEST §R3 |
| 10| Eigo & Seikatsu Mini-Games | Scene contextual vocabulary matching and drag-and-drop category sorting | M3 | ORIGINAL_REQUEST §R3 |
| 11| Hitbox & Touch/Click Ergonomics | Min 56px touch target padding, mobile/desktop viewport scaling | M3 | ORIGINAL_REQUEST §R3 |
| 12| MEXT Curriculum & 1026 Kanji DAG Validation | Verification and enhancement of 1026 Kanji & 6-subject DAG topology (zero cycles, zero deadlocks) | M4 | ORIGINAL_REQUEST §R4 |
| 13| Graph Evolution & Dynamic Smoothing | Fracture detection, bottleneck repair, and adaptive DAG evolution algorithms | M4 | ORIGINAL_REQUEST §R4 |
| 14| Full E2E Integration & Verification | Comprehensive test suite (Tiers 1-5), browser workflow validation, and zero JS error check | M5 | ORIGINAL_REQUEST Acceptance Criteria |

## Code Layout
```
d:/Japanese PSES/
├── .agents/
│   ├── agents/
│   │   ├── product_manager_agent/
│   │   │   └── agent.md
│   │   ├── director_agent/
│   │   │   └── agent.md
│   │   ├── game_designer_agent/
│   │   │   └── agent.md
│   │   ├── graph_evolution_agent/
│   │   │   └── agent.md
│   │   ├── qa_player_agent/
│   │   │   └── agent.md
│   │   └── bug_repair_agent/
│   │       └── agent.md
│   └── orchestrator/
├── css/
│   └── style.css
├── data/
│   ├── kanji_1026.json
│   ├── subjects_curriculum.json
│   └── prefectures_47.json
├── js/
│   ├── AudioSynthesizer.js
│   ├── FXSystem.js
│   ├── ErrorGuidanceSystem.js
│   ├── CurriculumData.js
│   ├── GraphEngine.js
│   ├── MiniGameSystem.js
│   ├── AgentIntegration.js
│   ├── AgentQADiagnostics.js
│   ├── ErrorInterceptor.js
│   ├── EconomySystem.js
│   └── app.js
├── tests/
│   ├── test_e2e_runner.js
│   ├── test_audio_fx.js
│   ├── test_games.js
│   ├── test_curriculum_dag.js
│   └── test_agents.js
├── index.html
├── ORIGINAL_REQUEST.md
├── PROJECT.md
└── TEST_READY.md
```

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Multi-Agent Teamwork & PM Agent | `.agents/agents/` PM agent definition, agent alignment, `AgentIntegration.js` & `AgentQADiagnostics.js` PM coordination | none | PLANNED |
| M2 | Audio-Visual FX & Friendly Error Feedback | Web Audio API procedural sound engine, canvas/CSS particle system, screen shake, and 3-tier friendly error guidance | none | PLANNED |
| M3 | 6-Subject Mini-Games Variety & Interactivity | Kokugo (Radical Assembly), Sansu (Kuku & Starship Balance), Rika (Celestial/Lever/Circuit sandbox), Shakai (47 Prefectures & Specialties), Eigo/Seikatsu (Matching & Sorting), 56px Hitboxes | M2 | PLANNED |
| M4 | Knowledge Graph DAG & Evolution Engine | 1026 Kanji + 6-subject curriculum DAG integrity validation, cycle/deadlock tests, graph evolution agent auto-smoothing | none | PLANNED |
| M5 | E2E Testing Track & Final Verification | Comprehensive E2E test suite (Tiers 1-5), zero-error browser integration, Reviewer/Challenger/Auditor gates | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### AudioSynthesizer ↔ MiniGameSystem & UI
```javascript
window.audioSynth = {
  playPositive(grade = 1, combo = 1), // Chord/arpeggio ascending
  playCombo(count = 1),               // Glissando with frequency pitch shift
  playGentleError(),                  // Soft cartoon wobble (F3 -> Eb3)
  playButtonTap(),                    // Crisp subtle pop
  playFanfare(),                      // Major pentatonic celebration
  setMuted(boolean),
  isMuted()
};
```

### FXSystem ↔ MiniGameSystem & UI
```javascript
window.fxSystem = {
  createBurst(x, y, type = 'star', count = 25), // 'star' | 'coin' | 'confetti' | 'spark'
  triggerShake(intensity = 'light', durationMs = 300), // 'light' | 'medium' | 'bounce'
  showClueHighlight(elementOrSelector),
  showMascotGuidance(message, targetElement, mascot = 'pico')
};
```

### MiniGameSystem ↔ CurriculumData & Galaxy Engine
```javascript
window.miniGameSystem = {
  startMiniGame(nodeId, containerElement, onCompleteCallback),
  registerGame(subject, gameType, gameClass),
  exitGame(results)
};
```

### AgentIntegration ↔ Director & PM Agent
```javascript
window.agentIntegration = {
  triggerPMReview(curriculumNode, playerHistory),
  broadcastAgentEvent(eventType, payload),
  mutateCurriculumDAG(mutationAction)
};
```
