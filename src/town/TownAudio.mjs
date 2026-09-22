/**
 * Town + arcade procedural audio (Web Audio).
 * Wraps getAudioSynthesizer for SFX; schedules soft looping BGM into bgmGain.
 * Headless-safe: no AudioContext / no hanging timers when window is missing.
 */
import {getAudioSynthesizer} from '../../AudioSynthesizer.js';

const THEMES = {
  town: {
    bpm: 92,
    gain: 0.11,
    pattern: [0, 2, 4, 7, 4, 2, 0, 7, 9, 7, 4, 2],
    root: 261.63, // C4
    wave: 'triangle'
  },
  race: {
    bpm: 128,
    gain: 0.1,
    pattern: [0, 4, 7, 4, 9, 7, 4, 0],
    root: 196.0, // G3
    wave: 'sawtooth'
  },
  breakout: {
    bpm: 110,
    gain: 0.1,
    pattern: [0, 4, 7, 12, 7, 4, 2, 4],
    root: 293.66, // D4
    wave: 'square'
  },
  fruit: {
    bpm: 118,
    gain: 0.1,
    pattern: [0, 2, 4, 5, 7, 5, 4, 2],
    root: 329.63, // E4
    wave: 'triangle'
  },
  ninja: {
    bpm: 100,
    gain: 0.09,
    pattern: [0, 3, 7, 10, 7, 3, 5, 0],
    root: 220.0, // A3
    wave: 'sine'
  },
  course: {
    bpm: 96,
    gain: 0.1,
    pattern: [0, 2, 4, 7, 9, 7, 4, 2],
    root: 277.18, // C#4-ish soft
    wave: 'triangle'
  }
};

const STEP = Math.pow(2, 1 / 12);

let singleton = null;

export function getTownAudio() {
  if (singleton) return singleton;
  singleton = createTownAudio();
  return singleton;
}

function createTownAudio() {
  const synth = getAudioSynthesizer({volume: 0.78});
  let themeId = null;
  let timer = null;
  let stepIndex = 0;
  let ducking = false;
  let disposed = false;

  function ctxReady() {
    if (typeof window === 'undefined') return null;
    synth.unlock();
    return synth.initAudioContext?.() || synth.ctx || null;
  }

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function playBgmNote(freq, dur, peak) {
    const ctx = ctxReady();
    if (!ctx || synth.isMuted() || disposed) return;
    const theme = THEMES[themeId] || THEMES.town;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = theme.wave || 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(theme.wave === 'sawtooth' ? 900 : 1800, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(filter);
      filter.connect(gain);
      const dest = synth.bgmGain || synth.masterGain || ctx.destination;
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch {/* ignore */}
  }

  function scheduleStep() {
    if (disposed || !themeId || synth.isMuted()) return;
    const theme = THEMES[themeId] || THEMES.town;
    const beat = 60 / theme.bpm;
    const deg = theme.pattern[stepIndex % theme.pattern.length];
    const freq = theme.root * Math.pow(STEP, deg);
    const peak = (theme.gain || 0.1) * (ducking ? 0.35 : 1);
    playBgmNote(freq, beat * 0.85, peak);
    // soft bass every 4 steps
    if (stepIndex % 4 === 0) {
      playBgmNote(theme.root * 0.5, beat * 1.4, peak * 0.55);
    }
    stepIndex += 1;
    clearTimer();
    if (typeof setTimeout === 'function') {
      timer = setTimeout(scheduleStep, beat * 1000);
    }
  }

  function startTheme(id) {
    if (typeof window === 'undefined' || disposed) return;
    const next = THEMES[id] ? id : 'town';
    if (themeId === next && timer != null) return;
    themeId = next;
    stepIndex = 0;
    clearTimer();
    ctxReady();
    if (!synth.isMuted()) scheduleStep();
  }

  function stopTheme() {
    clearTimer();
    themeId = null;
  }

  const api = {
    unlock() {
      if (typeof window === 'undefined') return;
      synth.unlock();
    },
    isMuted() {
      return synth.isMuted();
    },
    toggleMute() {
      if (typeof window === 'undefined') return true;
      synth.unlock();
      const muted = synth.toggleMute();
      if (muted) clearTimer();
      else if (themeId) scheduleStep();
      else {
        themeId = 'town';
        scheduleStep();
      }
      if (!muted) synth.playClick();
      return muted;
    },
    setMuted(v) {
      synth.setMuted(v);
      if (synth.isMuted()) clearTimer();
      else if (themeId) scheduleStep();
    },
    startTown() {
      ducking = false;
      startTheme('town');
    },
    enterArcade(gameId) {
      ducking = false;
      startTheme(THEMES[gameId] ? gameId : 'breakout');
    },
    enterCourse() {
      ducking = false;
      startTheme('course');
    },
    exitToTown() {
      ducking = false;
      startTheme('town');
    },
    pauseBgm() {
      clearTimer();
    },
    resumeBgm() {
      if (themeId && !synth.isMuted()) scheduleStep();
    },
    // --- SFX ---
    click() { synth.unlock(); synth.playClick(); },
    brick() {
      synth.unlock();
      synth.createTone({freq: 520, type: 'triangle', duration: 0.12, peakGain: 0.2, pitchBend: {targetFreq: 180, duration: 0.1}});
      synth.createTone({freq: 880, type: 'sine', duration: 0.08, peakGain: 0.1, startTime: 0.02});
    },
    powerup() {
      synth.unlock();
      synth.playCoin();
    },
    slash() {
      synth.unlock();
      synth.playSlash();
    },
    fruitCut() {
      synth.unlock();
      synth.playSlash();
      synth.createTone({freq: 640, type: 'sine', duration: 0.1, peakGain: 0.16, pitchBend: {targetFreq: 320, duration: 0.09}});
    },
    bomb() {
      synth.unlock();
      synth.playGentleError();
    },
    raceHit() {
      synth.unlock();
      synth.createTone({freq: 140, type: 'sawtooth', duration: 0.18, peakGain: 0.18, filterFreq: 400, pitchBend: {targetFreq: 70, duration: 0.15}});
    },
    typeOk() {
      synth.unlock();
      synth.createTone({freq: 660, type: 'sine', duration: 0.07, peakGain: 0.14});
    },
    typeMiss() {
      synth.unlock();
      synth.playGentleError();
    },
    wordClear() {
      synth.unlock();
      synth.playSuccess(1, 2);
    },
    correct() { synth.unlock(); synth.playSuccess(1, 1); },
    error() { synth.unlock(); synth.playGentleError(); },
    victory() { synth.unlock(); synth.playVictory(); },
    destroy() {
      disposed = true;
      clearTimer();
      themeId = null;
    }
  };
  return api;
}

/** Optional no-op for tests / SSR. */
export function createSilentTownAudio() {
  const noop = () => {};
  return {
    unlock: noop, isMuted: () => true, toggleMute: () => true, setMuted: noop,
    startTown: noop, enterArcade: noop, enterCourse: noop, exitToTown: noop,
    pauseBgm: noop, resumeBgm: noop, click: noop, brick: noop, powerup: noop,
    slash: noop, fruitCut: noop, bomb: noop, raceHit: noop, typeOk: noop,
    typeMiss: noop, wordClear: noop, correct: noop, error: noop, victory: noop,
    destroy: noop
  };
}
