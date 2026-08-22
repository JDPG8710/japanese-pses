## 2026-08-22T01:52:37Z
You are Test Writer for the E2E Testing Track of the Japanese PSES Galaxy Engine project.
Your working directory is: d:/Japanese PSES/.agents/teamwork_preview_test_writer_e2e
Project root is: d:/Japanese PSES
Original request path: d:/Japanese PSES/ORIGINAL_REQUEST.md
PROJECT plan path: d:/Japanese PSES/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test suites must be genuine opaque-box tests verifying real requirements. DO NOT hardcode dummy pass conditions.

Scope & Task (E2E Testing Track):
1. Create `TEST_INFRA.md` following the 4-tier systematic test methodology:
   - Tier 1: Feature Coverage (>=5 per feature)
   - Tier 2: Boundary & Corner Cases (>=5 per feature)
   - Tier 3: Cross-Feature Combinations (Pairwise coverage)
   - Tier 4: Real-World Application Scenarios (Realistic 1-6 grade student playthroughs)
2. Build executable test runner and test suites in `tests/`:
   - `tests/test_e2e_runner.js`: Master test suite runner executing all tests and outputting TAP / JSON summary.
   - `tests/test_agents.js`: Tests for agent specifications, PM agent integration, schemas, and director coordination.
   - `tests/test_audio_fx.js`: Tests for Web Audio synthesizer API, parameter safety, particle generation, screen shake, and error guidance tiers.
   - `tests/test_curriculum_dag.js`: Tests for 1026 Kanji coverage, 6-subject curriculum DAG acyclicity, topological sort, deadlock-free progression, and fracture healing algorithms.
   - `tests/test_games.js`: Tests for mini-game interfaces across all 6 subjects, hitbox ergonomics (>=56px), game cycle completion, and scoring/reward flows.
3. Run the initial test suite with Node.js to verify test runner mechanics.
4. When test suites and test infra are ready, publish `TEST_READY.md` at project root with complete coverage breakdown and execution commands.
5. Deliver handoff report in your working directory and send a completion message back.
