// Grade labels are regional. The available tasks are supplementary skill practice,
// not a claim of full national curriculum coverage or equivalence between grades.
const years=(prefix,from,to)=>Array.from({length:to-from+1},(_,i)=>`${prefix}${i+from}`);
export const PROFILES={
  CN63:{country:'CN',names:{zh:'中国 · 六三制',en:'China · six-year primary',ja:'中国 · 6年制'},years:years('Y',1,6)},
  CN54:{country:'CN',names:{zh:'中国 · 五四制',en:'China · five-year primary',ja:'中国 · 5年制'},years:years('Y',1,5)},
  US:{country:'US',names:{en:'United States',zh:'美国',ja:'アメリカ'},years:['K',...years('G',1,6)],note:'US'},
  ENG:{country:'GB',names:{en:'England',zh:'英格兰',ja:'イングランド'},years:['R',...years('Y',1,6)]},
  SCT:{country:'GB',names:{en:'Scotland',zh:'苏格兰',ja:'スコットランド'},years:years('P',1,7)},
  WLS:{country:'GB',names:{en:'Wales',zh:'威尔士',ja:'ウェールズ'},years:['R',...years('Y',1,6)]},
  NIR:{country:'GB',names:{en:'Northern Ireland',zh:'北爱尔兰',ja:'北アイルランド'},years:years('P',1,7)},
  AU:{country:'AU',names:{en:'Australia',zh:'澳大利亚',ja:'オーストラリア'},years:['F',...years('Y',1,6)]},
  NZ:{country:'NZ',names:{en:'New Zealand',zh:'新西兰',ja:'ニュージーランド'},years:years('Y',0,8)},
  INT:{country:null,names:{en:'International practice',zh:'国际通用练习',ja:'せかいの れんしゅう'},years:years('G',1,6),note:'INT'}
};
export const SUBJECTS=['all','math','english','coding','art','music','language','science','thinking'];
export const TASKS={
  circuit:{subject:'coding',objective:'CT02',minimum:1,skill:{en:'Rotate and debug a connected route',zh:'旋转、连通与调试路径',ja:'つないで みちを なおす'}},
  sudoku:{subject:'math',objective:'MA09',minimum:1,skill:{en:'Use row, column and region constraints',zh:'运用行、列与宫格约束',ja:'たて・よこ・ブロックの すいり'}},
  code:{subject:'thinking',objective:'CG11',minimum:2,skill:{en:'Deduce a hidden code from feedback',zh:'根据反馈推断隐藏密码',ja:'ヒントから あんごうを とく'}},
  set:{subject:'thinking',objective:'CG12',minimum:1,skill:{en:'Classify three-feature relationships',zh:'辨认三个特征的组合关系',ja:'3つの とくちょうを くらべる'}},
  balance:{subject:'math',objective:'MA10',minimum:2,skill:{en:'Infer unknown weights from equations',zh:'根据等式推断未知重量',ja:'しきから おもさを すいりする'}},
  order:{subject:'language',objective:'LA-LOG',minimum:1,skill:{en:'Read clues and build a logical order',zh:'阅读线索并排列合理顺序',ja:'ことばの ヒントで ならべる'}},
  water:{subject:'science',objective:'SC03',minimum:2,skill:{en:'Plan volume transformations',zh:'规划容量变化步骤',ja:'みずの うつしかたを けいかくする'}},
  network:{subject:'thinking',objective:'CG14',minimum:2,skill:{en:'Connect a network at minimum cost',zh:'以最低成本连通网络',ja:'いちばん すくない コストで つなぐ'}}
};
export function defaultProfile(country){return {CN:'CN63',US:'US',AU:'AU',NZ:'NZ'}[country]||null;}
export function profileOptions(country){const local=Object.keys(PROFILES).filter(id=>PROFILES[id].country===country);return local.length?[...local,'INT']:Object.keys(PROFILES);}
export function yearLabel(year,locale='en'){
  if(year==='K')return {en:'Kindergarten',zh:'幼儿园 K',ja:'Kindergarten'}[locale];
  if(year==='R')return 'Reception';if(year==='F')return 'Foundation';
  if(locale==='zh')return year==='Y0'?'入学准备（Year 0）':`${Number(year.slice(1))}年级${year[0]==='P'?`（${year}）`:''}`;
  if(locale==='ja')return `${year[0]==='P'?'Primary ':year[0]==='G'?'Grade ':'Year '}${Number(year.slice(1))}`;
  return `${year[0]==='P'?'Primary ':year[0]==='G'?'Grade ':'Year '}${Number(year.slice(1))}`;
}
export function practiceBand(profile,year){
  const p=Object.hasOwn(PROFILES,profile)?PROFILES[profile]:null;if(!p?.years.includes(year))return null;
  // Editorial readiness bands, not international grade equivalence.
  const ordinal=p.years.indexOf(year)+1;
  return ordinal<=2?1:ordinal<=4?2:3;
}
export function availableTasks(profile,year,subject='all'){
  const band=practiceBand(profile,year);if(!band||!SUBJECTS.includes(subject))return [];
  const foundation=['K','R','F','Y0'].includes(year);
  return Object.entries(TASKS).filter(([game,task])=>(!foundation||['circuit','set','order'].includes(game))&&band>=task.minimum&&(subject==='all'||task.subject===subject)).map(([game,task])=>({...task,game,level:band===1?1:2,review:band===3}));
}
export function validateGradeRoute(params){
  const profile=params.get('curriculum'),year=params.get('year'),game=params.get('game'),subject=params.get('subject')||'all',stage=Number(params.get('stage')||1);
  if(!profile&&!year)return null;
  if(!Number.isInteger(stage)||stage<1||stage>40)return false;
  const task=availableTasks(profile,year,subject).find(t=>t.game===game&&t.level===Number(params.get('level')));
  return task?{profile,year,subject,stage,...task}:false;
}
