/**
 * AudioSynthesizer.js - Zero-Dependency Web Audio API Procedural Sound Engine
 * 
 * Generates all sound effects (positive chimes, combo pitch glissandos, soft wobble boops,
 * crisp tactile clicks, fanfare celebrations, laser streams) mathematically in real-time
 * without downloading any external audio files.
 */

export class AudioSynthesizer {
  constructor(options = {}) {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.muted = false;
    this.volume = options.volume ?? 0.8;
    this.isUnlocked = false;

    // Load persisted mute preference
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('pses_audio_muted');
        if (saved !== null) {
          this.muted = saved === 'true';
        }
      } catch (e) {
        // Safe fallback if localStorage is blocked
      }
    }

    // Auto-setup user unlock interaction listeners in browser
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
        ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(evt => {
          window.removeEventListener(evt, unlockHandler, { capture: true });
        });
      };
      ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, unlockHandler, { capture: true, once: true, passive: true });
      });
    }
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture.
   */
  initAudioContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();

      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      console.warn('[AudioSynthesizer] AudioContext initialization failed:', err);
    }

    return this.ctx;
  }

  /**
   * Unlocks AudioContext on user interaction to comply with browser autoplay policies.
   */
  unlock() {
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (this.ctx) {
      this.isUnlocked = true;
    }
  }

  /**
   * Checks if audio is currently muted.
   */
  isMuted() {
    return this.muted;
  }

  /**
   * Sets mute state and updates gain node.
   */
  setMuted(isMuted) {
    this.muted = !!isMuted;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('pses_audio_muted', this.muted ? 'true' : 'false');
      } catch (e) {}
    }

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, now);
    }

    // Broadcast audio mute change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('AUDIO_MUTE_TOGGLED', {
        detail: { muted: this.muted }
      }));
    }

    return this.muted;
  }

  /**
   * Toggles mute state.
   */
  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /**
   * Sets master volume (0.0 to 1.0).
   */
  setMasterVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.volume, now);
    }
  }

  /**
   * Helper to create a single synthesized tone with ADSR envelope.
   */
  createTone({
    freq = 440,
    type = 'sine',
    startTime = 0,
    duration = 0.2,
    attack = 0.005,
    decay = 0.15,
    sustainLevel = 0.0,
    peakGain = 0.25,
    pitchBend = null, // { targetFreq, duration }
    filterFreq = null
  } = {}) {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return null;

    try {
      const now = ctx.currentTime + startTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      if (pitchBend) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, pitchBend.targetFreq),
          now + pitchBend.duration
        );
      }

      // Envelope
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + attack);
      if (sustainLevel > 0) {
        gain.gain.linearRampToValueAtTime(peakGain * sustainLevel, now + attack + decay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      } else {
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      }

      let lastNode = osc;

      if (filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(1.0, now);
        lastNode.connect(filter);
        lastNode = filter;
      }

      lastNode.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      return osc;
    } catch (e) {
      return null;
    }
  }

  /**
   * Positive Feedback Chime (Ascending Major / Pentatonic Arpeggio)
   */
  playPositive(grade = 1, combo = 1) {
    return this.playSuccess(grade, combo);
  }

  playSuccess(grade = 1, combo = 1) {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // Base arpeggios depending on grade complexity
    // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), D6 (1174.66)
    const baseFreqs = [523.25, 659.25, 783.99, 1046.50];
    const comboBoost = Math.min(1.5, 1.0 + (combo - 1) * 0.05);

    baseFreqs.forEach((freq, index) => {
      const start = index * 0.06;
      this.createTone({
        freq: freq * comboBoost,
        type: 'sine',
        startTime: start,
        duration: 0.35,
        attack: 0.005,
        decay: 0.25,
        peakGain: 0.22
      });

      // Subtle warm triangle harmonic
      this.createTone({
        freq: freq * comboBoost * 2,
        type: 'triangle',
        startTime: start,
        duration: 0.2,
        attack: 0.005,
        decay: 0.15,
        peakGain: 0.08
      });
    });
  }

  /**
   * Combo Feedback (Rising Pitch Glissando & Shimmering Crystal Harmony)
   */
  playCombo(comboCount = 1) {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // Semitone pitch shift based on combo
    const semitones = Math.min(24, Math.max(0, comboCount - 1));
    const baseFreq = 440 * Math.pow(2, semitones / 12); // A4 upward
    const majorThird = baseFreq * 1.2599; // Harmonic Major 3rd
    const fifth = baseFreq * 1.4983;

    // Fast sparkling arpeggio
    [baseFreq, majorThird, fifth].forEach((f, idx) => {
      this.createTone({
        freq: f,
        type: 'sine',
        startTime: idx * 0.04,
        duration: 0.28,
        attack: 0.004,
        decay: 0.2,
        peakGain: 0.2
      });

      this.createTone({
        freq: f * 2,
        type: 'triangle',
        startTime: idx * 0.04 + 0.01,
        duration: 0.18,
        attack: 0.004,
        decay: 0.12,
        peakGain: 0.07
      });
    });
  }

  /**
   * Gentle, Child-Friendly Error Feedback
   * Warm cartoon "boing" / wooden xylophone note with downward pitch bend (260Hz -> 175Hz / F3 -> Eb3).
   * Strictly no harsh buzzers or loud discordant frequencies.
   */
  playGentleError() {
    return this.playError();
  }

  playError() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // F3 (174.61 Hz) to Eb3 (155.56 Hz) gentle rounded sine wave
    this.createTone({
      freq: 240,
      type: 'sine',
      startTime: 0,
      duration: 0.26,
      attack: 0.01,
      decay: 0.22,
      peakGain: 0.22,
      pitchBend: { targetFreq: 160, duration: 0.22 },
      filterFreq: 650
    });

    // Secondary subtle soft sub-bass cushion
    this.createTone({
      freq: 120,
      type: 'sine',
      startTime: 0.02,
      duration: 0.2,
      attack: 0.01,
      decay: 0.18,
      peakGain: 0.12,
      pitchBend: { targetFreq: 90, duration: 0.18 },
      filterFreq: 400
    });
  }

  /**
   * Tactile Button Click / Pop
   * High-speed pitch sweep (850Hz -> 180Hz in 30ms) simulating an iOS/Game mechanical bubble pop.
   */
  playButtonTap() {
    return this.playClick();
  }

  playClick() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    this.createTone({
      freq: 850,
      type: 'sine',
      startTime: 0,
      duration: 0.045,
      attack: 0.002,
      decay: 0.04,
      peakGain: 0.18,
      pitchBend: { targetFreq: 220, duration: 0.04 }
    });
  }

  /**
   * Game Clear Fanfare (Cosmic Major 7th Celebration)
   */
  playFanfare() {
    return this.playVictory();
  }

  playVictory() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // Ascending melody: C5 -> E5 -> G5 -> B5 -> C6 -> E6
    const notes = [
      { f: 523.25, t: 0.00, d: 0.2 },
      { f: 659.25, t: 0.12, d: 0.2 },
      { f: 783.99, t: 0.24, d: 0.2 },
      { f: 987.77, t: 0.36, d: 0.25 },
      { f: 1046.50, t: 0.50, d: 0.6 },
      { f: 1318.51, t: 0.50, d: 0.6 } // High harmony
    ];

    notes.forEach(n => {
      this.createTone({
        freq: n.f,
        type: 'sine',
        startTime: n.t,
        duration: n.d,
        attack: 0.006,
        decay: n.d * 0.85,
        peakGain: 0.22
      });

      this.createTone({
        freq: n.f * 2,
        type: 'triangle',
        startTime: n.t,
        duration: n.d * 0.6,
        attack: 0.006,
        decay: n.d * 0.5,
        peakGain: 0.07
      });
    });

    // Sustained celebratory cosmic shimmer chord at 0.65s
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((f, idx) => {
      this.createTone({
        freq: f,
        type: 'sine',
        startTime: 0.65,
        duration: 0.9,
        attack: 0.02,
        decay: 0.85,
        peakGain: 0.15
      });
    });
  }

  /**
   * Star Coin Acquisition Chime
   */
  playCoin() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // Dual high bell chime: B5 -> E6
    this.createTone({
      freq: 987.77,
      type: 'sine',
      startTime: 0,
      duration: 0.18,
      attack: 0.003,
      decay: 0.15,
      peakGain: 0.22
    });
    this.createTone({
      freq: 1318.51,
      type: 'sine',
      startTime: 0.07,
      duration: 0.35,
      attack: 0.003,
      decay: 0.32,
      peakGain: 0.25
    });
  }

  /**
   * Laser Beam / Star Line Connect Sound
   */
  playLaser() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    this.createTone({
      freq: 920,
      type: 'sawtooth',
      startTime: 0,
      duration: 0.15,
      attack: 0.003,
      decay: 0.14,
      peakGain: 0.15,
      pitchBend: { targetFreq: 240, duration: 0.14 },
      filterFreq: 1800
    });
  }

  /**
   * Kanji Slash / Meteor Strike Sound
   */
  playSlash() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    // Quick swoosh + punch
    this.createTone({
      freq: 600,
      type: 'triangle',
      startTime: 0,
      duration: 0.12,
      attack: 0.002,
      decay: 0.11,
      peakGain: 0.25,
      pitchBend: { targetFreq: 120, duration: 0.11 }
    });
  }

  /**
   * Hint / Clue Highlight Sound
   */
  playClue() {
    const ctx = this.initAudioContext();
    if (!ctx || this.muted) return;

    [659.25, 880.00, 1174.66].forEach((f, idx) => {
      this.createTone({
        freq: f,
        type: 'sine',
        startTime: idx * 0.05,
        duration: 0.25,
        attack: 0.005,
        decay: 0.2,
        peakGain: 0.18
      });
    });
  }
}

// Global Singleton Initialization
let globalAudioSynth = null;
export function getAudioSynthesizer(options) {
  if (!globalAudioSynth) {
    globalAudioSynth = new AudioSynthesizer(options);
  }
  return globalAudioSynth;
}

if (typeof window !== 'undefined') {
  window.AudioSynthesizer = AudioSynthesizer;
  window.audioSynth = getAudioSynthesizer();
}
