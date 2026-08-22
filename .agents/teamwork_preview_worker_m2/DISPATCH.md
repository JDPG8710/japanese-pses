## 2026-08-22T01:52:37Z
Scope & Task (Milestone 2):
1. Build `js/AudioSynthesizer.js`:
   - Lightweight, zero-external-dependency Web Audio API procedural sound synthesis engine.
   - Positive feedback arpeggios/chords (ascending pentatonic/major), combo pitch multiplier tones, gentle error wobble boop (soft F3->Eb3, no harsh buzzers), crisp button tap/pop, game clear fanfare.
   - Master volume, mute/unmute toggle state management and HUD control button integration.
2. Build `js/FXSystem.js` & update `css/style.css`:
   - 2D Canvas & CSS particle explosion engine for star dust, gold coins, celebratory confetti, and laser sparks.
   - Screen shake & gentle cartoon wobble effects (decay translation/rotation).
3. Build `js/ErrorGuidanceSystem.js`:
   - 3-tier child-friendly error scaffolding: Tier 1 gentle wobble + soft sound (no harsh punitive score penalty), Tier 2 highlight correct clues / eliminate a distractor, Tier 3 Mascot speech bubble ("星の子ピコ" tooltip / explanation guidance).
4. Update `index.html` and `css/style.css` to load and style the audio mute button, particle canvas layer, screen shake wrapper, and guidance tooltips.
5. Verify syntax and unit functionality with node/browser runner. Document all commands and test results in your handoff.md.
Send a completion message back when finished.
