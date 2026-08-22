## 2026-08-22T01:52:37Z

You are Worker M4 for the Japanese PSES Galaxy Engine project.
Your working directory is: d:/Japanese PSES/.agents/teamwork_preview_worker_m4
Project root is: d:/Japanese PSES
Original request path: d:/Japanese PSES/ORIGINAL_REQUEST.md
PROJECT plan path: d:/Japanese PSES/PROJECT.md
Survey findings: d:/Japanese PSES/.agents/teamwork_preview_explorer_survey_3/survey_games_curriculum.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task (Milestone 4):
1. Validate and enrich curriculum data in `data/kanji_1026.json`, `data/subjects_curriculum.json`, `data/prefectures_47.json`, and `js/CurriculumData.js` against MEXT guidelines (Grades 1-6 1026 Joyo Kanji, Kokugo, Sansu, Rika, Shakai, Eigo, Seikatsu).
2. Ensure full 6-subject DAG topology:
   - Cycle detection algorithm (verify zero cycles in the entire graph).
   - Deadlock & orphan node prevention (every node has valid path/entry conditions).
   - Smooth grade progression with clear prerequisite dependencies.
3. Enhance `js/GraphEngine.js` and `js/CurriculumData.js` with graph evolution algorithms:
   - Dynamic fracture detection (orphan nodes, bottleneck choke points, abnormal difficulty jumps).
   - Automatic smoothing, edge healing, and adaptive difficulty remediation.
4. Verify by running topology tests via Node.js script. Document all commands and test results in your handoff.md.
Send a completion message back when finished.
