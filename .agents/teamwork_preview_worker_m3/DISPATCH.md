## 2026-08-22T01:58:41Z
Scope & Task (Milestone 3 - Gameplay Variety & Child-Friendly Interactivity Across All 6 Subjects):
1. Expand and polish mini-games in `js/MiniGameSystem.js` and `js/games/` (or dedicated game modules) for all 6 subjects:
   - **Kokugo**: Kanji Radical Assembly (偏旁部首拼装, combining radicals/components into complete Kanji, e.g., 木+木=林, 日+月=明, 氵+青=清, 禾+火=秋) + Star Stream Kanji Slash (falling kanji/readings).
   - **Sansu**: Kuku Multiplication Space Combo + Starship Pan Balance Scale (星舰天平, interactive two-pan scale with unknown weights/energy crystals where students drag weights to achieve equilibrium).
   - **Rika**: Interactive Experiment Sandboxes: Celestial Orbits (solar system / moon phases / gravity), Lever Physics Balance (distance x force fulcrum calculation), and Electric Circuit Sandbox (battery, wires, switch, light bulbs).
   - **Shakai**: 47 Prefectures Map & Region Puzzle (covering 8 regions and 47 prefectures) + Regional Specialty & Landmark Treasure Hunt.
   - **Eigo & Seikatsu**: Contextual Scene Matching (school, room, nature scene vocabulary & item association) + Drag-and-Drop Category Sorting (daily routines, seasons, recycling sorting).
2. Wire all mini-games with `AudioSynthesizer` (`window.audioSynth`), `FXSystem` (`window.fxSystem`), and `ErrorGuidanceSystem` (`window.errorGuidance`):
   - Positive sound and star bursts on correct answers.
   - Combo multiplier audio pitch escalation.
   - 3-Tier error guidance (soft boop & gentle wobble, clue highlighting, and Mascot "星の子ピコ" explanation bubble).
3. Ensure child-friendly touch & mouse hitboxes (min 56px touch target padding, responsive layout on mobile/desktop, zero unhandled errors).
4. Update `MiniGameSystem.js`, `index.html`, and `css/style.css` so that clicking any subject node in the 3D galaxy opens its corresponding upgraded mini-game.
5. Verify all games by running tests (e.g. `node tests/test_games.js` or test runner).
6. Write handoff.md in your working directory and send a completion message back.
