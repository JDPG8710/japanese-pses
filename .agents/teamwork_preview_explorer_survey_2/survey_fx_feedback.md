# 日本小学校銀河知識星図 (Japanese PSES Galaxy Engine)
# Audio-Visual FX, Particles, Screen Shake & Child-Friendly Error Feedback Survey Report

**Author**: Explorer 2 (Audio-Visual FX & Feedback Systems Specialist)  
**Date**: 2026-08-22  
**Target Path**: `d:/Japanese PSES/.agents/teamwork_preview_explorer_survey_2/survey_fx_feedback.md`  
**Scope**: `index.html`, `GalaxyEngine.js`, `MiniGameSystem.js`, `KukuLinkGame.js`, `EconomySystem.js`, `ErrorInterceptor.js`, `AgentIntegration.js`, `CurriculumData.js`

---

## 1. Executive Summary & Codebase Audit Findings

A comprehensive inspection of the entire Japanese PSES Galaxy Engine codebase was performed to evaluate Audio-Visual FX, Screen Shake, 2D/3D Particle systems, Hitbox geometry, and Child-Friendly Error/Guidance Feedback mechanisms.

### Key Audit Highlights:
1. **Audio Handling (Current State: 0% / Non-Existent)**:
   - There is currently **zero** Web Audio API integration and zero HTML5 `<audio>` usage across all files (`index.html`, `GalaxyEngine.js`, `MiniGameSystem.js`, `KukuLinkGame.js`).
   - No sound effects (SFX) are played for positive actions (correct answers, combos, coin awards, node clears), negative actions (wrong taps, blocked paths), or UI clicks.
   - No audio toggle (Mute / Unmute / Volume control) exists in the top HUD.

2. **Visual FX & Particle Systems (Current State: Minimal / Siloed)**:
   - **3D Three.js Engine (`GalaxyEngine.js`)**:
     - Has 7,200 volumetric nebula particles (`armsPoints`, `GalaxyEngine.js:120-204`).
     - Has 800 nucleus particles (`nucleusParticles`, `GalaxyEngine.js:74-95`).
     - Has a localized 40-particle celebration burst on node clearing (`triggerLightingCelebration`, `GalaxyEngine.js:289-339`).
   - **2D Canvas Mini-Games (`MiniGameSystem.js`, `KukuLinkGame.js`)**:
     - `KukuLinkGame.js` declares `this.laserParticles = []` (`line 31`), but it is unused.
     - `KanjiSlashGame` renders a basic mouse trailing line (`lines 455-467`), but no spark explosions or star bursts upon slashing correct kanji.
     - No general-purpose 2D particle emitter exists for confetti, gold coins, stardust, or combo flares.

3. **Screen Shake & Motion Feedback (Current State: 0% / Non-Existent)**:
   - No screen shake implementation exists in CSS keyframes or Canvas render loops.
   - Incorrect clicks or high-impact events (laser connections, stage clears) produce no screen perturbation or elastic bounce.

4. **Error & Guidance Feedback for Elementary Students (Current State: Punitive & Abrupt)**:
   - In `KanjiSlashGame` (`MiniGameSystem.js:400-418`): Clicking an incorrect reading silently destroys the meteor (`m.alive = false`) and subtracts 30 points (`score = Math.max(0, score - 30)`). No explanation, no audio, and no clue highlighting.
   - In `KukuLinkGame` (`KukuLinkGame.js:257-260`): Selecting a non-matching pair resets combo to 0 silently. No indication of why it failed (e.g. wrong product vs. blocked line path).
   - In `LeverPhysicsGame` (`MiniGameSystem.js:594-607`): Any click on the right canvas side hardcodes a win (`placedRightSlot = correctSlot`), providing no interactive error state or moment calculation feedback.
   - In `PrefectureJigsawGame` (`MiniGameSystem.js:693-714`): Clicking a piece instantly snaps it; no drag-and-drop or misplaced piece handling.
   - No friendly mascot or speech bubble guidance exists for children needing hints or making repeated mistakes.

---

## 2. Detailed Inspection Matrix of Existing Files

| File | Component / Line Range | Observed Behavior | Deficiencies & Gaps |
|---|---|---|---|
| `index.html` | Header HUD (lines 35–81) | Profile button, Kanji mode, AI badge, Streak, Coins, Shop. | No audio mute/unmute button (🔊/🔇). No UI click sound triggers. |
| `index.html` | Stylesheet (lines 17–28) | Minimal styles: `#canvas-container`, `.glass-panel`, `.custom-scroll`. | No CSS keyframes for `@keyframes cartoon-shake`, `@keyframes float-up-fade`, `@keyframes pulse-glow`, `@keyframes bounce-in`. |
| `GalaxyEngine.js` | `triggerLightingCelebration` (lines 289–339) | 40 gold points burst when a node is cleared; animates for 35 frames. | Fixed to 3D Three.js space only. No audio chime triggered upon clear. |
| `GalaxyEngine.js` | `setupInteractions` (lines 414–455) | Raycaster pointerdown on node group; threshold = 8.0 (mobile) / 4.0 (PC). | No click audio feedback, no haptic feedback (`navigator.vibrate`), no node hover scale animation. |
| `MiniGameSystem.js` | `KanjiSlashGame.checkHit` (lines 400–418) | Checks distance `Math.hypot(m.x - x, m.y - y) <= m.radius + 15`. Correct: `+100pt`. Wrong: `-30pt`. | Wrong answer silently deletes meteor. No red cartoon shake, no "惜しい！" speech bubble, no correct reading clue reveal. |
| `MiniGameSystem.js` | `RatioScaleGame.handlePointer` (lines 503–518) | Slider pointer tracking on x-axis. Wins when `|current - target| <= 1`. | No sliding tick sound, no particle burst at 100%/target, no feedback when far off target. |
| `MiniGameSystem.js` | `LeverPhysicsGame.start` (lines 592–607) | Click anywhere `x > width/2` sets `placedRightSlot = correctSlot` and wins. | Hardcoded win without actual slot selection; no moment balance animation, no tilt oscillation physics, no audio. |
| `MiniGameSystem.js` | `PrefectureJigsawGame.start` (lines 693–714) | Click within 45px of piece snaps piece to target coordinates. | Only 3 prefectures; instant snap without drag-drop physics, no error wobble if dropped in wrong prefecture slot. |
| `KukuLinkGame.js` | `onTileClicked` (lines 225–261) | Connects tileA and tileB with laser path if matched. Wrong: resets `combo = 0`. | No audio synthesis for laser, match, combo, or error. No particle sparks along laser path. Hitbox on small screens (64x54) is tight for small fingers. |
| `ErrorInterceptor.js` | Telemetry & Watchdog (lines 1–213) | Intercepts JS errors, WebGL loss, FPS drops, UI deadlocks. | Does not track game-level pedagogical error rates (e.g. repeated wrong taps per node) to trigger proactive hints. |

---

## 3. Web Audio API Native Synthesizer Architecture (Zero External Dependencies)

To eliminate external asset loading latency, 404 network errors, and asset licensing issues, all sound effects must be generated procedurally via the browser's built-in Web Audio API (`AudioContext`).

```
                                 ┌─────────────────────────────────┐
                                 │       AudioSynthesizer          │
                                 │   (Web Audio API Native)        │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │          Master GainNode (Volume / Mute)          │
                        │           Persisted in localStorage               │
                        └──────────┬─────────────────────────────┬──────────┘
                                   │                             │
                                   ▼                             ▼
                    ┌──────────────────────────────┐ ┌──────────────────────────────┐
                    │       SFX Output Bus         │ │      BGM Output Bus (Soft)   │
                    └──────────────┬───────────────┘ └──────────────────────────────┘
                                   │
       ┌───────────────┬───────────┴───┬───────────────┬───────────────┐
       ▼               ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ playSuccess │ │  playError  │ │  playCombo  │ │ playVictory │ │ playClick/  │
│ (Chime C5-G5│ │ (Gentle     │ │ (Rising     │ │ (Fanfare    │ │  Tactile    │
│  Arpeggio)  │ │  Boing Sine)│ │  Glissando) │ │  Major 7th) │ │ (Short Pop) │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### 3.1 Audio Node Synthesis Formulations

#### A. Positive Feedback: `playSuccess()` (Clear & Melodic Chime)
- **Concept**: Double-tone bell arpeggio (C5 = 523.25 Hz $\rightarrow$ G5 = 783.99 Hz $\rightarrow$ C6 = 1046.50 Hz).
- **Oscillator Type**: `sine` with slight `triangle` overtone.
- **Envelope**: Instant attack (0.005s), exponential decay to 0 over 0.45s.
- **Formula**:
  $$\text{Gain}(t) = V_0 \cdot e^{-t / \tau} \quad (\tau \approx 0.12\text{s})$$

#### B. Combo Feedback: `playCombo(comboCount)` (Escalating Excitement)
- **Concept**: Pitch scales dynamically with combo multiplier:
  $$f_{\text{combo}} = f_{\text{base}} \cdot 2^{(\text{combo} - 1) / 12} \quad (f_{\text{base}} = 440\text{ Hz}, \text{semitone steps})$$
- **Harmonics**: Dual oscillator (Fundamental + Major 3rd interval = $f \times 1.2599$) creating a sparkling crystal harmony.
- **Duration**: 0.25s quick shimmer.

#### C. Negative / Encouraging Feedback: `playGentleError()` (Warm, Soft, Not Startling)
- **Concept**: Elementary school kids are sensitive to harsh buzzers. The sound should be a gentle, friendly cartoon "boing" / wooden xylophone note.
- **Oscillator Type**: `sine` with a gentle downward pitch bend ($260\text{ Hz} \rightarrow 180\text{ Hz}$ over $0.22\text{s}$).
- **Low-pass Filter**: BiquadFilter (`frequency = 800 Hz`, `Q = 1.0`) removing all harsh high frequencies.
- **Envelope**: Attack 0.01s, release 0.25s.

#### D. Victory / Stage Clear: `playVictory()` (Cosmic Fanfare)
- **Concept**: 4-note ascending chord arpeggio (C5 $\rightarrow$ E5 $\rightarrow$ G5 $\rightarrow$ C6) followed by a resonant shimmer chord (C5 + E5 + G5 + B5).
- **Total Duration**: 1.2s.

#### E. Tactile UI Click: `playClick()` (Crisp Bubble Pop)
- **Concept**: High-speed frequency drop ($900\text{ Hz} \rightarrow 200\text{ Hz}$ in $0.03\text{s}$) simulating a satisfying mechanical or bubble tap.

---

## 4. Visual FX, Particle Engines & Screen Shake Design

### 4.1 2D Canvas Particle Engine (`ParticleSystem2D`)

To provide visual fireworks for all mini-games without external libraries, a lightweight, zero-dependency particle engine is designed for direct integration into 2D Canvas render loops.

```javascript
export class Particle2D {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    const angle = options.angle ?? Math.random() * Math.PI * 2;
    const speed = options.speed ?? (2 + Math.random() * 5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = options.gravity ?? 0.15;
    this.drag = options.drag ?? 0.98;
    this.size = options.size ?? (4 + Math.random() * 6);
    this.color = options.color ?? '#f59e0b';
    this.alpha = 1.0;
    this.decay = options.decay ?? (0.02 + Math.random() * 0.02);
    this.shape = options.shape ?? 'star'; // 'star' | 'circle' | 'spark' | 'coin'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.alpha -= this.decay;
    return this.alpha > 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.shape === 'star') {
      this.drawStar(ctx, 0, 0, 5, this.size, this.size * 0.45, this.color);
    } else if (this.shape === 'coin') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.font = `bold ${Math.floor(this.size * 1.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 0, 0);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}
```

### 4.2 Multi-Tier Screen Shake System (`ScreenShakeFX`)

Screen Shake provides physical weight and tactile punch. Two complementary shake modes are required:

1. **Canvas-Level Camera Shake** (For in-game impacts, slashing, laser blasts):
   - In 2D game loops:
     ```javascript
     if (this.shakeTime > 0) {
       const intensity = this.shakeIntensity * (this.shakeTime / this.shakeMaxTime);
       const offsetX = (Math.random() - 0.5) * intensity * 2;
       const offsetY = (Math.random() - 0.5) * intensity * 2;
       ctx.translate(offsetX, offsetY);
       this.shakeTime--;
     }
     ```
2. **DOM-Level Cartoon Shake** (For wrong answers, UI warnings, modal feedback):
   - CSS Keyframes:
     ```css
     @keyframes cartoon-wobble {
       0% { transform: translateX(0) rotate(0deg); }
       15% { transform: translateX(-6px) rotate(-3deg); }
       30% { transform: translateX(5px) rotate(2.5deg); }
       45% { transform: translateX(-4px) rotate(-2deg); }
       60% { transform: translateX(3px) rotate(1deg); }
       75% { transform: translateX(-1px) rotate(-0.5deg); }
       100% { transform: translateX(0) rotate(0deg); }
     }
     .animate-cartoon-wobble {
       animation: cartoon-wobble 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
     }
     ```

### 4.3 Hitbox Geometry & Touch Area Optimization

| Screen Size | Target Element | Current Size | Recommended Min Size | Rationale & Fix |
|---|---|---|---|---|
| Mobile ($\le 480\text{px}$) | `KukuLinkGame` Cards | $64 \times 54\text{px}$ | $72 \times 60\text{px}$ + 8px hit padding | Elementary students (ages 6-8) have lower tapping accuracy; hit detection must expand $+10\text{px}$ beyond bounding box. |
| Mobile ($\le 768\text{px}$) | `KanjiSlashGame` Meteors | Radius $34\text{px}$ (Hit: $+15\text{px}$) | Hit tolerance $+25\text{px}$ | Fast-moving meteors require larger swipe trajectory capture window. |
| Mobile / PC | Subject Arm Buttons (`aside`) | $120 \times 32\text{px}$ | $140 \times 40\text{px}$ | Improve clickability on touch laptops and iPad screens. |
| Mobile | Mobile Bottom Sheet Drag Handle | $40 \times 4\text{px}$ | Touch zone $120 \times 24\text{px}$ | Expand transparent touchable container around visual pill. |

---

## 5. Child-Friendly Error Handling & Multi-Tier Guidance System

### 5.1 Cognitive Psychology Principles for Primary School Learners
- **No Penal Shame**: Elementary students lose motivation rapidly if met with loud red `X` marks or punitive buzzer sounds.
- **Actionable Guidance**: Instead of merely indicating an error, the system must highlight *where to look* or *why it is incorrect*.
- **Positive Scaffolding**: Progression from gentle cartoon wobble $\rightarrow$ subtle visual clue highlight $\rightarrow$ full mascot explanation bubble.

### 5.2 The 3-Tier Guidance Workflow

```
[Student Taps / Drags Answer]
            │
      Is it correct?
     ├─── YES ───► [Play Success Chime] ──► [Spawn Particle Explosion] ──► [Award Points + Combo]
     └─── NO
           │
     ┌─────┴───────────────────────────────────────────────────────┐
     │ Tier 1: Immediate Gentle Feedback (Attempt 1)                │
     │ - Play gentle soft "boing" (260Hz -> 180Hz sine wave)        │
     │ - Trigger gentle cartoon wobble animation on tapped item     │
     │ - Show friendly transient toast: 「おしい！ もう一度！」     │
     └─────┬───────────────────────────────────────────────────────┘
           │ (If 2nd consecutive error or hesitation > 5s)
     ┌─────┴───────────────────────────────────────────────────────┐
     │ Tier 2: Clue Highlighting & Visual Scaffolding (Attempt 2)   │
     │ - Golden pulse ring on relevant clue / matching candidate    │
     │ - In Kanji Slash: Highlight kanji radical / stroke clue      │
     │ - In Kuku Link: Softly illuminate the matching product/card │
     │ - In Lever Physics: Display moment balance formula hint      │
     └─────┬───────────────────────────────────────────────────────┘
           │ (If 3rd consecutive error or child requests hint)
     ┌─────┴───────────────────────────────────────────────────────┐
     │ Tier 3: Mascot Speech Bubble Guidance (Attempt 3+)           │
     │ - Animated mascot avatar (星の子ピコ 🛸) pops up             │
     │ - Cartoon speech bubble with friendly child-level explanation│
     │ - Proactive Hint button illuminates with bouncing animation  │
     └─────────────────────────────────────────────────────────────┘
```

### 5.3 Zero-Dependency Mascot & Speech Bubble UI Architecture

A lightweight, purely DOM/CSS-based mascot guidance system is designed for instant overlay without external image files:

```html
<!-- Friendly Mascot Speech Bubble Template -->
<div id="guidance-bubble" class="fixed bottom-20 right-6 z-50 flex items-end gap-3 max-w-sm pointer-events-none transition-all duration-300 transform translate-y-8 opacity-0">
  <div class="glass-panel p-4 rounded-3xl rounded-br-none border border-amber-400/50 bg-slate-900/95 shadow-2xl text-slate-100 text-xs relative animate-bounce-gentle">
    <div class="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
      <span>💡</span>
      <span id="guidance-title">星の子ピコからのヒント</span>
    </div>
    <p id="guidance-text" class="leading-relaxed text-slate-200">
      「花」の読み方は「はな」だよ！草かんむり（艹）が付いている漢字を探してみよう！
    </p>
    <!-- Speech bubble pointer arrow -->
    <div class="absolute -bottom-2 right-4 w-4 h-4 bg-slate-900 border-r border-b border-amber-400/50 transform rotate-45"></div>
  </div>
  <!-- Procedural SVG / Emoji Mascot Avatar -->
  <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 border-2 border-amber-300 flex items-center justify-center text-2xl shadow-lg flex-shrink-0 animate-pulse">
    🛸
  </div>
</div>
```

---

## 6. Comprehensive System Architecture Proposal

To cleanly organize and decouple Audio, Visual FX, Particles, Screen Shake, and Guidance systems, we propose modularizing the engine into four dedicated ES6 modules:

```
d:/Japanese PSES/
├── index.html                    (HUD with 🔊/🔇 toggle, guidance bubble container)
├── GalaxyEngine.js               (3D galaxy with node click chime, celebratory burst)
├── MiniGameSystem.js             (Integrated with AudioFX, Particle2D, GuidanceBubble)
├── KukuLinkGame.js               (Laser spark particles, combo chime, card shake)
├── AudioSynthesizer.js  [NEW]    (Web Audio API procedural sound engine)
├── FXSystem.js          [NEW]    (Particle2D, Confetti, ScreenShake, FloatingText)
├── GuidanceSystem.js    [NEW]    (3-tier error handling, mascot bubble, clue glow)
└── EconomySystem.js              (Persists audio preferences & sound state)
```

### Module Interface Contracts:

#### 1. `AudioSynthesizer.js`
```javascript
export class AudioSynthesizer {
  constructor()
  initAudioContext()
  toggleMute(): boolean
  isMuted: boolean
  playSuccess(frequencyMultiplier = 1.0)
  playError()
  playCombo(comboCount = 1)
  playVictory()
  playClick()
  playLaser()
  playSlash()
  playCoin()
}
```

#### 2. `FXSystem.js`
```javascript
export class FXSystem {
  constructor(canvas)
  spawnStarBurst(x, y, count = 30, color = '#f59e0b')
  spawnConfetti(canvasWidth, canvasHeight, count = 60)
  spawnLaserSparks(startX, startY, endX, endY)
  triggerScreenShake(containerOrCanvas, intensity = 8, durationMs = 300)
  showFloatingScore(x, y, text, color = '#fbbf24')
  updateAndDraw(ctx)
}
```

#### 3. `GuidanceSystem.js`
```javascript
export class GuidanceSystem {
  constructor()
  registerError(gameContext, errorDetails)
  showClue(elementSelectorOrCanvasCoord)
  showMascotHint(title, explanationText, autoDismissMs = 5000)
  dismissHint()
  resetConsecutiveErrors()
}
```

---

## 7. Next Steps & Implementation Roadmap

1. **Phase 1: Sound Synthesis Engine (`AudioSynthesizer.js`)**:
   - Implement the zero-dependency Web Audio API oscillator/gain graph.
   - Add volume/mute toggle icon (🔊/🔇) to the top status bar in `index.html`.
   - Wire audio calls into `GalaxyEngine.js` (node select, node clear) and `MiniGameSystem.js`.

2. **Phase 2: Visual FX & Screen Shake Engine (`FXSystem.js`)**:
   - Implement `Particle2D`, star bursts, laser sparks, confetti cannon.
   - Implement Canvas screen shake and CSS cartoon wobble keyframes.
   - Wire into `KanjiSlashGame` (slashing sparks, meteor burst) and `KukuLinkGame` (laser spark stream, combo fire).

3. **Phase 3: Child-Friendly Error & Guidance Scaffolding (`GuidanceSystem.js`)**:
   - Replace punitive score drops in `KanjiSlashGame` with friendly wobble + second-chance clue highlight.
   - Implement the mascot speech bubble (`星の子ピコ`) in `MiniGameSystem.js`.
   - Add hint and auto-clue triggers for hesitated or struggling students.

4. **Phase 4: Hitbox & Touch Polish**:
   - Increase touch padding across mobile layouts.
   - Verify multi-device compatibility (375px mobile to 1920px desktop).

---
*Report compiled and verified by Explorer 2.*
