## 2026-08-22T08:10:58Z

You are Worker Refinement 1 (teamwork_preview_worker).
Your working directory is: d:/Japanese PSES/.agents/teamwork_preview_worker_refinement_1
The workspace root is: d:/Japanese PSES

Read the following files before starting:
- d:/Japanese PSES/ORIGINAL_REQUEST.md
- d:/Japanese PSES/PROJECT.md
- d:/Japanese PSES/.agents/teamwork_preview_reviewer_1/handoff.md
- d:/Japanese PSES/.agents/teamwork_preview_reviewer_2/handoff.md
- d:/Japanese PSES/.agents/teamwork_preview_auditor_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Fix data/kanji_1026.json:
   - Ensure EXACTLY 1,026 unique MEXT Joyo Kanji are present across grades 1-6.
   - Grade quotas must match MEXT Elementary School standard exactly:
     Grade 1: 80 kanji
     Grade 2: 160 kanji
     Grade 3: 200 kanji (fix the duplicate '万' which belongs to G2, ensure 200 unique G3 kanji)
     Grade 4: 202 kanji
     Grade 5: 193 kanji
     Grade 6: 191 kanji
   - Eliminate all cross-grade duplicates. Every kanji must have valid onyomi, kunyomi, meaning, and radical fields.
   - Set total: 1026 in the JSON metadata.

2. Fix Test Harness & Loaders in 	ests/:
   - 	ests/test_e2e_runner.js: Add ssert.equal = assert.strictEqual; to the custom assertion object.
   - Fix module loading / ES-to-CJS regex scoping in 	ests/test_audio_fx.js, 	ests/test_games.js, 	ests/test_agents.js, and 	ests/test_curriculum_dag.js so that getAudioSynthesizer, FULL_CURRICULUM_DAG, alidateSchema, pm.analyzeFlowState, diagnoseAndRecommendFix, etc. are properly defined and accessible in the evaluated test context.
   - Make sure all test suites can be executed both through 
ode tests/test_e2e_runner.js AND individually (
ode tests/test_agents.js, 
ode tests/test_audio_fx.js, 
ode tests/test_curriculum_dag.js, 
ode tests/test_games.js).

3. Child-Friendly Interactivity & Pedagogical Polish:
   - Ensure KukuLinkGame.js minimum card height on small screens is at least 56px (Math.max(56, ...)).
   - Check and ensure Furigana / ruby text annotations are present for lower elementary grades (G1-G2) in game instructions and modal headers.

4. Verification:
   - Run 
ode tests/test_e2e_runner.js and verify that ALL test suites and ALL test cases pass with 0 failures (100% pass rate).
   - Run 
ode tests/test_agents.js, 
ode tests/test_audio_fx.js, 
ode tests/test_curriculum_dag.js, 
ode tests/test_games.js.
   - Verify unique kanji count with:
     
ode -e const d=require('./data/kanji_1026.json'); const s=new Set(); Object.values(d.grades).forEach(g=>g.kanjiList.forEach(k=>s.add(k.k))); console.log('Unique:', s.size); -> MUST print Unique: 1026.

5. Write a detailed Handoff Report at:
   d:/Japanese PSES/.agents/teamwork_preview_worker_refinement_1/handoff.md
   Documenting:
   - What was changed
   - Verification commands and their exact outputs
   - Confidence and readiness for Gate re-review.
