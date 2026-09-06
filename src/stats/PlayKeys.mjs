import {GAMES} from '../world/WorldRules.mjs';
import {TOPICS} from '../world/FoundationCatalog.mjs';

const japaneseGames=['KANJI_SLASH','RADICAL_BUILDER','KOKUGO_CURRICULUM','KUKU_LINK','AETHER_SCALE','MATH_CURRICULUM','COSMIC_ORBIT','LEVER_PHYSICS','CIRCUIT_SANDBOX','SCIENCE_CURRICULUM','PREFECTURE_JIGSAW','SOCIAL_CURRICULUM','CONTEXT_MATCH','ENGLISH_CURRICULUM','CATEGORY_SORT','LIFE_CURRICULUM','GRADE_EXAM'];
const aliases={KANJI_CHALLENGE:'KANJI_SLASH',KANJI_READING:'KANJI_SLASH',CELESTIAL_ORBIT:'COSMIC_ORBIT',RATIO_SCALE:'AETHER_SCALE',SCIENCE_SANDBOX:'SCIENCE_CURRICULUM'};
export function japanesePlayKey(gameType,mode){
 const specialized=['KANJI_READING','KANJI_SLASH','RADICAL_BUILDER','KUKU_LINK','COSMIC_ORBIT','LEVER_PHYSICS','CIRCUIT_SANDBOX','CATEGORY_SORT','PREFECTURE_JIGSAW'];
 const value=specialized.includes(mode)?mode:gameType;
 return `jp:${aliases[value]||value}`;
}
export const PLAY_KEYS=Object.freeze([...japaneseGames.map(id=>`jp:${id}`),...GAMES.map(id=>`world:${id}`),...Object.keys(TOPICS).map(id=>`lesson:${id}`)]);
const allowed=new Set(PLAY_KEYS);
export const validPlayKey=key=>typeof key==='string'&&allowed.has(key);
export function formatPlayCount(value){
 if(!Number.isSafeInteger(value)||value<0)return '—';
 if(value<1000)return String(value);
 const unit=value>=1e9?1e9:value>=1e6?1e6:1e3,suffix=unit===1e9?'B':unit===1e6?'M':'K';
 return `${Math.floor(value/unit*10)/10}${suffix}`;
}
