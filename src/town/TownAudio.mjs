/**
 * Town + arcade audio: original string ensemble loop and procedural SFX.
 * Routes the decoded string score through the existing bgmGain and mute controls.
 * Headless-safe: no AudioContext / no hanging timers when window is missing.
 */
import {getAudioSynthesizer} from '../../AudioSynthesizer.js';
import {createTownStringMusic} from './TownStringMusic.mjs';

const THEMES = Object.fromEntries(['town','race','breakout','fruit','ninja','course','bubble','rhythm'].map(id=>[id,true]));

let singleton = null;

export function getTownAudio() {
  if (singleton) return singleton;
  singleton = createTownAudio();
  return singleton;
}

function createTownAudio() {
  const synth = getAudioSynthesizer({volume: 0.78});
  let themeId = null;

  let disposed = false;

  function ctxReady() {
    if (typeof window === 'undefined') return null;
    synth.unlock();
    return synth.initAudioContext?.() || synth.ctx || null;
  }

  const music=createTownStringMusic(ctxReady,ctx=>synth.bgmGain||synth.masterGain||ctx.destination);
  function clearTimer(){music.pause();}
  function scheduleStep(){if(!disposed&&themeId&&!synth.isMuted())void music.play(themeId);}

  function startTheme(id) {
    if (typeof window === 'undefined' || disposed) return;
    const next = THEMES[id] ? id : 'town';
    if (themeId === next && music.active) return;
    themeId = next;
    clearTimer();
    ctxReady();
    if (!synth.isMuted()) scheduleStep();
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
      startTheme('town');
    },
    enterArcade(gameId) {
      startTheme(THEMES[gameId] ? gameId : 'breakout');
    },
    enterCourse() {
      startTheme('course');
    },
    exitToTown() {
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
    raceHit(strength=12) {
      synth.unlock();
      const intensity=Math.min(1,Math.max(.15,strength/28));
      synth.createTone({freq:100+intensity*40,type:'triangle',duration:.22,peakGain:.22*intensity,filterFreq:500,pitchBend:{targetFreq:38,duration:.18}});
      // Short filtered noise supplies the tyre scrape / metal transient, behind the existing mute gain.
      const ctx=synth.ctx;if(!ctx||!synth.sfxGain)return;
      const duration=.12+intensity*.22,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;
      filter.type='lowpass';filter.frequency.value=900+intensity*1800;gain.gain.value=.22*intensity;
      source.connect(filter);filter.connect(gain);gain.connect(synth.sfxGain);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
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
      music.destroy();
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
