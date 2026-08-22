/**
 * tests/test_audio_fx.js - Unit and Integration Verification Suite for Milestone 2 & 3
 * AudioSynthesizer, FXSystem, and ErrorGuidanceSystem
 */

const fs = require('fs');
const path = require('path');

function register({ describe, test, it, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');

  function loadModuleExports(filePath) {
    const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
    return loader(filePath);
  }

  const { AudioSynthesizer } = loadModuleExports(path.join(rootDir, 'js', 'AudioSynthesizer.js'));
  const { FXSystem, Particle2D, FloatingText2D } = loadModuleExports(path.join(rootDir, 'js', 'FXSystem.js'));
  const { ErrorGuidanceSystem } = loadModuleExports(path.join(rootDir, 'js', 'ErrorGuidanceSystem.js'));

  describe('AudioSynthesizer Procedural Sound Synthesis', () => {
    test('A1: AudioSynthesizer initializes with mute persistence', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      assert.strictEqual(synth.isMuted(), false);

      synth.toggleMute();
      assert.strictEqual(synth.isMuted(), true);

      synth.setMuted(false);
      assert.strictEqual(synth.isMuted(), false);
    });

    test('A2: AudioSynthesizer plays chords without throwing errors in headless environment', () => {
      const synth = new AudioSynthesizer({ volume: 0.8 });
      synth.playPositive(1, 1);
      synth.playCombo(3);
      synth.playGentleError();
      synth.playButtonTap();
      synth.playFanfare();
      synth.playCoin();
      synth.playLaser();
      synth.playSlash();
      assert.ok(true);
    });
  });

  describe('FXSystem Particle Explosions & Screen Shake', () => {
    test('FX1: Particle2D and FloatingText2D update and decay correctly', () => {
      const p = new Particle2D(100, 100, { shape: 'star', speed: 5 });
      assert.isAbove(p.alpha, 0);
      assert.strictEqual(p.shape, 'star');

      while (p.alpha > 0) {
        p.update();
      }
      assert.isAtMost(p.alpha, 0);
    });

    test('FX2: FXSystem spawns particle bursts and floating text', () => {
      const fx = new FXSystem();
      fx.spawnStarBurst(200, 200, 20);
      fx.spawnCoinBurst(200, 200, 10);
      fx.spawnConfetti(800, 600, 30);
      fx.showFloatingScore(200, 200, '+100pt!');
      assert.isAbove(fx.particles.length, 0);
      assert.strictEqual(fx.floatingTexts.length, 1);
    });
  });

  describe('ErrorGuidanceSystem 3-Tier Scaffolding', () => {
    test('EG1: Tier 1, 2, and 3 error progression and reset', () => {
      const synth = new AudioSynthesizer();
      const fx = new FXSystem();
      const guidance = new ErrorGuidanceSystem({ audio: synth, fx });

      const questionId = 'Q_TEST_KANJI_1';

      // Tier 1
      const t1 = guidance.registerError({
        subject: '国語',
        questionId,
        questionData: { kanji: '花', correctAnswer: 'はな' }
      });
      assert.strictEqual(t1.tier, 1);
      assert.strictEqual(t1.action, 'WOBBLE_AND_RETRY');

      // Tier 2
      const t2 = guidance.registerError({
        subject: '国語',
        questionId,
        questionData: { kanji: '花', correctAnswer: 'はな' }
      });
      assert.strictEqual(t2.tier, 2);
      assert.strictEqual(t2.action, 'CLUE_HIGHLIGHTED');

      // Tier 3
      const t3 = guidance.registerError({
        subject: '国語',
        questionId,
        questionData: { kanji: '花', correctAnswer: 'はな' }
      });
      assert.strictEqual(t3.tier, 3);
      assert.strictEqual(t3.action, 'MASCOT_BUBBLE_OPENED');

      // Reset
      guidance.registerSuccess({ questionId });
      assert.strictEqual(guidance.getConsecutiveErrors(questionId), 0);
    });

    test('EG2: Generates valid clues and explanations for all 6 subjects', () => {
      const guidance = new ErrorGuidanceSystem();
      const subjects = [
        { subject: '国語', questionData: { kanji: '草', correctAnswer: 'くさ' } },
        { subject: '算数', questionData: { formula: '7 × 8', correctAnswer: '56' } },
        { subject: '理科', questionData: { targetLeft: 50, armLeft: 2, targetRight: 20, correctSlot: 5 } },
        { subject: '社会', questionData: { prefecture: '北海道', region: '北海道' } },
        { subject: '外国語・英語', questionData: { word: 'Apple' } },
        { subject: '生活', questionData: { topic: 'あさがお' } }
      ];

      subjects.forEach(sub => {
        const clue = guidance.generateSubjectClue(sub);
        const exp = guidance.generatePedagogicalExplanation(sub);
        assert.isAbove(clue.length, 3);
        assert.isAbove(exp.length, 5);
      });
    });
  });
}


module.exports = register;
module.exports.register = register;

if (require.main === module) {
  const { harness, describe, test, it, assert, loadESModule } = require('./test_e2e_runner.js');
  register({ describe, test, it, assert, loadESModule });
  harness.runAll().then((report) => {
    process.exitCode = report.summary.failed > 0 ? 1 : 0;
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
