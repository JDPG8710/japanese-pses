// Shared quality rules for multiple-choice options (English learning items).
// The goal is that a child cannot find the answer by shape alone: the correct
// option must not be the odd one out by length, word count, punctuation,
// capitalisation, script, word form or topic, and it must not be the only
// option that copies words from the question. Pure module: safe in browser,
// worker and Node tests.

export const CHOICE_RULES=Object.freeze({
 minOptions:3,
 // Correct answer may not be the strict longest/shortest by more than this.
 outlierRatio:1.4,outlierChars:4,
 // Whole option set: longest <= max(shortest*spreadRatio, shortest+spreadChars).
 spreadRatio:1.8,spreadChars:5,
 // Word counts: longest - shortest <= max(spreadWords, shortest*0.6).
 spreadWords:2,
 // Generator tolerance when picking distractors.
 pickRatio:0.4,pickChars:2
});

const STOP=new Set('a an the to of in on at by for and or but is am are was were be been it its this that these those i you he she we they me my your his her our their them us do does did not no yes so as with from up out than then too very can will would could should may might must has have had there here what which who whom whose when where why how'.split(' '));
const LEXICON={
 color:'red blue green yellow pink purple orange black white brown grey gray',
 number:'one two three four five six seven eight nine ten eleven twelve twenty zero',
 day:'monday tuesday wednesday thursday friday saturday sunday',
 animal:'cat dog frog fish bird owl rabbit mouse mice horse cow pig hen fox bear duck lion tiger monkey',
 food:'apple apples banana bananas bread milk water rice egg eggs cake juice soup carrot carrots tomato tomatoes orange cabbage',
 sky:'sun moon star stars cloud rain snow',
 place:'library park bank station school store museum zoo gym kitchen garden beach',
 subject:'music science art math tennis history english'
};
const CATEGORY=new Map();for(const [k,v] of Object.entries(LEXICON))for(const w of v.split(' '))if(!CATEGORY.has(w))CATEGORY.set(w,k);

const EMOJI=/\p{Extended_Pictographic}/u,CJK=/[\u3400-\u9fff]/,KANA=/[\u3040-\u30ff]/,LATIN=/[A-Za-z]/;
export const visibleLength=text=>Array.from(String(text).normalize('NFKC').replace(/[\s.,!?;:'"“”‘’。、，！？：；「」（）()\-]/g,'')).length;
// Duplicate check: ignore case, spacing and the final full stop only, so
// punctuation items such as girl's / girls' stay distinct.
export const normalizeOption=text=>String(text).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().replace(/[.。!！]$/,'');
const TOKEN_CACHE=new Map();
const tokens=text=>{const key=String(text);let hit=TOKEN_CACHE.get(key);if(!hit){if(TOKEN_CACHE.size>5000)TOKEN_CACHE.clear();hit=key.toLowerCase().replace(/[’']/g,"'").match(/[a-z][a-z']*/g)||[];TOKEN_CACHE.set(key,hit);}return hit;};
export function wordCount(text){const latin=tokens(text);return latin.length||(String(text).trim()?1:0);}
function script(text){const s=String(text);return EMOJI.test(s)&&!LATIN.test(s)&&!CJK.test(s)?'emoji':KANA.test(s)?'kana':CJK.test(s)?'cjk':LATIN.test(s)?'latin':/\d/.test(s)?'digit':'other';}
function ending(text){const s=String(text).trim();return /[?？]$/.test(s)?'?':/[!！]$/.test(s)?'!':/[.。]$/.test(s)?'.':/[,，]$/.test(s)?',':/-$/.test(s)?'-':'none';}
function suffix(word){if(!/^[a-z]+$/.test(word)||word.length<4)return 'base';return /ing$/.test(word)?'ing':/ed$/.test(word)?'ed':/ly$/.test(word)?'ly':/[^s]s$/.test(word)?'s':'base';}
function category(text){const ws=tokens(text).filter(w=>!STOP.has(w));return ws.length===1?CATEGORY.get(ws[0])||null:null;}

const PROFILE_CACHE=new Map();
export function optionProfile(text){
 const key=String(text),hit=PROFILE_CACHE.get(key);if(hit)return hit;
 if(PROFILE_CACHE.size>5000)PROFILE_CACHE.clear();
 const profile=buildProfile(key);PROFILE_CACHE.set(key,profile);return profile;
}
function buildProfile(text){
 const s=String(text),ws=tokens(s),latin=script(s)==='latin',single=latin&&ws.length===1;
 return {text:s,norm:normalizeOption(s),length:visibleLength(s),words:wordCount(s),script:script(s),ending:ending(s),
  capital:latin?(/^[^A-Za-z]*[A-Z]/.test(s)?'upper':'lower'):'n/a',digits:/\d/.test(s),
  suffix:single?suffix(ws[0]):'n/a',category:latin?category(s):null,multiword:latin?ws.length>1:false};
}

// Returns a list of issues. An empty list means the set passes every rule.
export function auditChoiceSet({prompt='',correct,choices,allow=[]}){
 const issues=[],add=(rule,detail)=>{if(!allow.includes(rule))issues.push({rule,detail});};
 const list=(choices||[]).map(String),answer=String(correct);
 if(list.length<CHOICE_RULES.minOptions)add('too-few-options',`${list.length} options`);
 const norms=list.map(normalizeOption);if(new Set(norms).size!==norms.length)add('duplicate-option',list.join(' | '));
 const hits=list.filter(c=>c===answer).length;if(hits!==1)add('answer-count',`correct appears ${hits} times`);
 if(hits<1||list.length<2)return issues;
 const p=optionProfile(answer),others=list.filter(c=>c!==answer).map(optionProfile),all=[p,...others];
 const lens=all.map(x=>x.length),min=Math.min(...lens),max=Math.max(...lens),dMax=Math.max(...others.map(x=>x.length)),dMin=Math.min(...others.map(x=>x.length));
 if(p.length>dMax&&p.length>dMax*CHOICE_RULES.outlierRatio&&p.length-dMax>=CHOICE_RULES.outlierChars)add('answer-longest',`${p.length} vs ≤${dMax}`);
 if(p.length<dMin&&p.length*CHOICE_RULES.outlierRatio<dMin&&dMin-p.length>=CHOICE_RULES.outlierChars)add('answer-shortest',`${p.length} vs ≥${dMin}`);
 if(max>Math.max(min*CHOICE_RULES.spreadRatio,min+CHOICE_RULES.spreadChars))add('length-spread',`${min}..${max}`);
 const wc=all.map(x=>x.words),wMin=Math.min(...wc),wMax=Math.max(...wc);
 if(p.script==='latin'&&wMax-wMin>Math.max(CHOICE_RULES.spreadWords,Math.ceil(wMin*0.6)))add('word-spread',`${wMin}..${wMax} words`);
 // Odd-one-out: every distractor agrees on a feature and the answer differs.
 for(const feature of ['script','ending','capital','digits','suffix','multiword']){
  const values=new Set(others.map(x=>x[feature]));
  if(values.size!==1)continue;const shared=[...values][0];
  if(shared==='n/a'||p[feature]==='n/a')continue;
  if(p[feature]!==shared)add(`odd-${feature}`,`answer ${p[feature]} vs others ${shared}`);
 }
 // Topic: the answer is the only option from its known category (e.g. one
 // animal among colours) while at least two distractors have a known topic.
 const known=others.filter(x=>x.category);
 if(p.category&&known.length>=2&&!others.some(x=>x.category===p.category))add('odd-category',`answer ${p.category} vs others ${[...new Set(known.map(x=>x.category))].join('/')}`);
 // Stem echo: only the answer repeats content words from the prompt.
 const stem=new Set(tokens(prompt).filter(w=>w.length>=3&&!STOP.has(w)));
 if(stem.size){
  const echo=c=>tokens(c).some(w=>stem.has(w));
  if(echo(answer)&&!list.filter(c=>c!==answer).some(echo))add('stem-echo','only the answer repeats words from the question');
 }
 return issues;
}

// Character-bigram Dice similarity (0..1). A "near miss" distractor shares
// most of its letters/characters with the answer (e.g. 我喜欢苹果 / 我喜欢橙子).
export function similarity(a,b){
 const grams=t=>{const c=Array.from(normalizeOption(t).replace(/[^\p{L}\p{N}]/gu,''));const m=new Map();for(let i=0;i<c.length-1;i++){const g=c[i]+c[i+1];m.set(g,(m.get(g)||0)+1);}return m;};
 const x=grams(a),y=grams(b);let both=0,total=0;for(const v of x.values())total+=v;for(const v of y.values())total+=v;
 for(const [g,v] of x)both+=Math.min(v,y.get(g)||0);return total?2*both/total:0;
}

// Lower score = more similar to the answer (better distractor).
export function distractorDistance(answer,candidate){
 const a=optionProfile(answer),b=optionProfile(candidate);
 let score=Math.abs(a.length-b.length)/Math.max(1,a.length)*10+Math.abs(a.words-b.words)*2;
 for(const f of ['script','ending','capital','suffix','multiword'])if(a[f]!==b[f])score+=4;
 if(a.category&&b.category&&a.category!==b.category)score+=3;
 const ta=new Set(tokens(answer)),shared=tokens(candidate).filter(w=>ta.has(w)&&!STOP.has(w)).length;
 return score-Math.min(2,shared)*0.5;
}
export function withinPickTolerance(answer,candidate){
 const a=visibleLength(answer),b=visibleLength(candidate);
 return Math.abs(a-b)<=Math.max(CHOICE_RULES.pickChars,Math.round(a*CHOICE_RULES.pickRatio))&&wordCount(answer)===wordCount(candidate);
}

// Picks `count` distractors from `pool`, preferring candidates inside the
// length/word-count tolerance and the same shape. `variety` rotates among the
// best candidates so a deterministic generator still yields different sets.
// Every pick is re-audited; a candidate that makes the set fail is skipped.
export function pickDistractors(answer,pool,{count=3,prompt='',variety=0,fixed=[]}={}){
 const seen=new Set([normalizeOption(answer),...fixed.map(normalizeOption)]);
 const candidates=[...new Set(pool.map(String))].filter(c=>!seen.has(normalizeOption(c)))
  .map(c=>({c,d:distractorDistance(answer,c)+(withinPickTolerance(answer,c)?0:6)})).sort((x,y)=>x.d-y.d||(x.c<y.c?-1:1));
 const window=Math.min(candidates.length,Math.max(count*2,count+3)),start=window?Math.abs(variety)%window:0;
 const ordered=[...candidates.slice(0,window).slice(start),...candidates.slice(0,window).slice(0,start),...candidates.slice(window)].map(x=>x.c);
 const picked=[...fixed];
 for(const c of ordered){
  if(picked.length>=count)break;if(seen.has(normalizeOption(c)))continue;
  const trial=[answer,...picked,c];
  if(trial.length>=CHOICE_RULES.minOptions&&auditChoiceSet({prompt,correct:answer,choices:trial}).length)continue;
  picked.push(c);seen.add(normalizeOption(c));
 }
 // Fallback: fill with the closest remaining candidates even if imperfect.
 for(const c of ordered){if(picked.length>=count)break;if(!seen.has(normalizeOption(c))){picked.push(c);seen.add(normalizeOption(c));}}
 return picked.slice(0,count);
}

// Runtime guard: returns the choice list unchanged when it passes, otherwise
// replaces distractors from `pool` (if given) until it passes.
export function repairChoices(question,pool=[],{key='choices'}={}){
 const choices=question[key],answer=question.correct;
 if(!auditChoiceSet({prompt:question.prompt,correct:answer,choices}).length||!pool.length)return question;
 const better=pickDistractors(answer,[...choices.filter(c=>c!==answer),...pool],{count:choices.length-1,prompt:question.prompt});
 const candidate=[answer,...better];
 return auditChoiceSet({prompt:question.prompt,correct:answer,choices:candidate}).length?question:{...question,[key]:candidate};
}
