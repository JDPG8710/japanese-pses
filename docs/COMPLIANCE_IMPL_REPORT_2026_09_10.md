# Piko Game child-safety compliance implementation report

**Branch:** `fix/child-safety-compliance`  
**Date:** 2026-09-10 (Asia/Tokyo)  
**Base:** `origin/codex/cloudflare-platform-refactor` @ e4170d1  
**Spec:** `docs/COMPLIANCE_ENGINEERING_REQUIREMENTS_2026_09_10.md`

## Checklist R1–R8

### R1 — Learner profile minimization + privacy alignment — **PASS**
- Evidence: `src/profile/LearnerProfile.js` stores `ageBand` enums (`under_6`/`6_8`/`9_11`/`12_14`/`prefer_not`); `age` forced `null` on normalize/write; gender optional/default skip.
- Nickname filter shared via `src/privacy/NicknameFilter.mjs` (also used by Worker playroom).
- `privacy.html` field list updated (IndexedDB/D1, age band, optional gender, ads default off, `DELETE /api/state`).
- `index.html` `buildSynchronizedProfile` writes `learner_age_band` (not `learner_age`); Worker `validateGameState` strips precise ages.
- Delete: UI button + `DELETE /api/state` in `worker/index.js`.
- Tests: `tests/test_learning_entry_and_progression.js`, `tests/test_privacy_consent.mjs`.

### R2 — Parental gate — **PASS**
- Evidence: `src/privacy/ParentalGate.mjs` (+ `tests/test_parental_gate.mjs`): math challenge + guardian checkbox; `parental_ack` version/`ackedAt`/purposes in localStorage.
- Required for: ads opt-in (`ConsentManager`), Stripe checkout (`MembershipManager` + Worker body flags), cloud sync bind / login CTA (`index.html`), arena public visibility & matchmaking.
- Fail-closed without DOM; no `advertisingAllowed=true` / checkout session without success.

### R3 — Child-directed ads + load gating — **PASS**
- Evidence: `index.html` meta `data-tag-for-child-directed-treatment="1"` / `data-tag-for-under-age-of-consent="1"`; `H5AdManager` still sets dataset tags on dynamic script; default `advertisingAllowed=false`.
- Load only if consent **and** parental ack **and** not EEA/UK/CH **and** not CN safe mode (`ConsentManager.advertisingAllowedForCurrentVisitor`).
- Listens to `PIKO_PRIVACY_CHOICE_CHANGED` and stops when withdrawn.
- Publisher ID: page meta kept for AdSense verification; membership API may mirror public `GOOGLE_H5_ADS_CLIENT` (documented; not duplicated as a second loader).
- Tests: CS8 + privacy consent suite.

### R4 — Membership / refunds / checkout — **PASS**
- Evidence: `terms.html#purchases` Purchases section (Piko Game digital ad-free, ¥500 JPY, guardian purchase, statutory rights + email refund channel, CN note).
- Checkout UI: terms checkbox + parental gate; Worker rejects missing `parentalGateAck`/`termsAccepted`; Stripe product renamed to **Piko Game Ad-Free Membership**.
- Docs: worker README no longer implies payment permanently disabled; status driven by `paymentAvailable`/`checkoutAllowed`.

### R5 — Arena safety — **PASS**
- Evidence: `src/arena/` already in repo; public list default off; visibility requires `parentalGateAck`; presence without ack forced private; go/chess `match` requires `parentalGateAck` (client + server).
- Shared nickname validation server-side; report/block APIs + `migrations/0015_arena_safety.sql`; UI report/block buttons in `PlayroomUI.mjs`.
- Family rooms + AI practice remain available without public match.
- Tests: `npm run test:playroom`, `test:go`, `test:chess` green after ack wiring.

### R6 — Data source disclaimers — **PASS**
- Evidence: `data/kanji_1026.json`, `prefectures_47.json`, `subjects_curriculum.json` titles/descriptions rewritten to “参照 / 独自編成 / 非公式 / 非転載”.
- `docs/CONTENT_POLICY.md` + note in `CHINA_PRIMARY_OUTLINE.md`; README footer note; terms educational disclaimer.
- Residual: historical mention of removed marketing phrases remains in the compliance requirements doc itself (spec text).

### R7 — CN safe mode — **PASS**
- Evidence: `wrangler.toml` `CN_SAFE_MODE = "true"` (default); `Country.mjs` / `/api/location` returns `cnSafeMode`/`adsBlocked`/`checkoutBlocked`; membership `checkoutAllowed=false` + checkout `403 CN_SAFE_MODE`; ads blocked for CN; UI note + hidden purchase button.
- Guest local play unaffected.

### R8 — Repo sync / regression / docs — **PASS**
- Evidence: arena already present; ads gating aligned; tests extended (`test_parental_gate.mjs`, privacy/CS8/learning/playroom/go); `worker/README.md` + `updates.html` changelog blurb; `package.json` `test:privacy` includes parental gate.
- `npm` e2e runner: **212/212 pass**; `test:privacy`, `test:auth`, `test:playroom`, `test:go`, `test:chess` pass on this branch.

## Residual risks
1. Parental gate is **not** COPPA VPC (no third-party identity proof) — intentional for this iteration.
2. Report/block is best-effort logging; no moderator console yet.
3. `preview_database_id` still equals production (out of scope).
4. China ICP / licensing / WeChat pay not in scope; CN safe mode is a product degradation, not legal clearance.
5. Soft client→server `parentalGateAck` boolean can be spoofed by a determined client; defense-in-depth is UI friction + default-deny + server reject without flag.
6. Large JSON pretty-print diffs for curriculum/prefecture files from title edits — content payload otherwise unchanged aside from metadata fields.

## Suggested PR acceptance body
Use the checklist in the requirements doc (R1–R8) with the PASS items above checked.
