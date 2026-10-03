# Independent English and AMC 8 practice

## Revision requested after local preview

Root cause reproduced in Chrome: importing MiniGameSystem.js to read EIKEN data initializes the school-game singleton and injects game-modal, guidance-bubble and global-fx-canvas into the independent page. The page has no Tailwind utility stylesheet, so these otherwise hidden elements appear below the footer. Fix the import dependency by moving pure English question generation into a shared module, rather than hiding the injected DOM.

Expanded acceptance chain: primary upper-grade readiness → five mathematical topics → thirty distinct problem families, twenty parameter variants each → choice, numeric/fraction entry, multi-field entry and ordering → amc8.html in ja/zh/en → 600 semantic questions per language, ten-question mixed sessions, method examples, full worked steps, checks and common mistakes. Translations preserve question IDs and answer contracts. Historical resources remain ordinary text links. School graph, reward and progress contracts remain separate.

Layout verification must cover home, question after loading EIKEN data, feedback, result review, course return and page bottom at 320/390/768/1280 pixel widths; no school modal or guidance UI may appear anywhere in the independent pages.

## User goal and traceability

- Japanese primary Grades 3–6 → English → retain school BASIC/short/long reading → ENGLISH_CURRICULUM → data/eigo.json → index.html?course=jp → school menu and runtime reject EIKEN2/EIKEN3.
- Independent course (no grade prerequisite) → English → original English/Japanese meaning practice at the existing EIKEN3/EIKEN2 modes → existing getEnglishQuestionBank → eiken.html → ten unique questions, graded first attempts, independent browser progress.
- Primary upper grades with arithmetic/fraction readiness → mathematics → number patterns, fractions, geometry, counting/probability, word problems → 6 families × 20 variants per topic, 600 exercises total → amc8.html → ten unique questions per session covering all six families and all four response types, hints and worked explanations.
- AMC 8 historical practice → years 2019, 2020, 2022, 2023, 2024, 2025 → 25 problems per year → external problem/answer/solution pages → amc8.html archive → explicitly credited external resources. No 2021 paper is invented.

## Boundaries and preservation

The independent pages never emit GAME_CLEAR_SUCCESS, call EconomySystem, or write school journey progress. Best first-attempt scores use piko-independent-practice:v1:<course>:<unit>. Existing school IDs, graph edges, stage counts and stored records remain unchanged. Deleting an independent best-score key resets only that practice unit. No migration or destructive cleanup is needed.

EIKEN modes are removed both from source curriculum metadata and the school runtime allowlist, so stale D1 curriculum metadata cannot re-enable them. Publishing changed source curriculum metadata requires the project's normal D1 import; this task does not publish or mutate the production database.

English retains the existing original bilingual meaning questions in a side-effect-free shared module. It is not a complete exam preparation course. AMC exercises are original and are not attributed to historical competitions. Each session has ten questions: choices have unique shuffled options; numeric and multi-field answers accept equivalent fractions/decimals; ordering uses keyboard-accessible up/down controls. Empty/invalid inputs do not consume attempts. Language changes preserve the question, typed answers and score. Eight first-attempt correct answers marks a practice set passed. Retrying with hints does not increase the score. Failed/abandoned sessions do not unlock school content or award currency.

## Sources checked 2026-09-12

- https://maa.org/student-programs/amc/ — competition format.
- https://maa.org/resource/sample-competition-2023-amc-8/ — official sample and solutions.
- https://live.poshenloh.com/past-contests/amc8/2019
- https://live.poshenloh.com/past-contests/amc8/2020
- https://live.poshenloh.com/past-contests/amc8/2022
- https://live.poshenloh.com/past-contests/amc8/2023
- https://live.poshenloh.com/past-contests/amc8/2024
- https://live.poshenloh.com/past-contests/amc8/2025

The LIVE problem pages state that they use problems with MAA permission. That statement describes the external host's permission; it does not license this repository to copy its content. The application links to these resources without copying contest text or solutions. External sessions do not synchronize scores into Piko.

## Validation

- `node tests/test_e2e_runner.js`: 212 existing tests pass, including subject/master curriculum parity and graph traceability.
- `node tests/test_independent_learning.mjs`: 1,890 localized exercises/examples (600 exercises + 30 examples in three languages), 30 independently calculated answer examples, language/ID parity, all four response types, mixed-session coverage, equivalent fractions, invalid input and score boundaries.
- `node scripts/build.mjs`: both new pages and modules included in the static build.
- `node tests/test_independent_learning_browser.mjs`: 1,213 checks in real Chrome across ja/zh/en and widths 320/390/768/1280, height 900. Home, expanded methods/examples, EIKEN 2/3, every answer type, explanations, pass/fail, review, next topic, language changes during input, blocked storage, unchanged school progress, footer positioning and absence of injected school UI. Screenshots in `.wrangler/independent-learning-tests-v2/`.
- One initial full-suite run hit the existing randomized QB12 focus-set collision in Grade 6 Japanese reading (11 unique sets vs 12). An unchanged rerun passed all 212 tests; the unrelated question-selection code was not modified.
- Production deployment and D1 import are outside this local change; no live website has been modified.
