import {getAudioSynthesizer} from '../../AudioSynthesizer.js';

export function createInteractionFeedback(){
 const audio=getAudioSynthesizer({volume:.82});
 const vibrate=pattern=>{try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)navigator.vibrate?.(pattern);}catch{}};
 return {
  unlock(){audio.unlock();},
  tap(){audio.unlock();audio.playClick();vibrate(8);},
  correct(){audio.playSuccess(1,1);vibrate([12,28,18]);},
  error(){audio.playGentleError();vibrate(18);},
  victory(){audio.playVictory();vibrate([15,35,15,35,28]);},
  isMuted(){return audio.isMuted();},
  toggle(){audio.unlock();const muted=audio.toggleMute();if(!muted)audio.playClick();return muted;}
 };
}
