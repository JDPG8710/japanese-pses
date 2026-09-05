import {PROFILES} from './GradePaths.mjs';
export const CONTENT_VERSION='piko-foundations-1';
export const L=(en,zh,ja)=>({en,zh,ja});
export const TOPICS={
 count:{subject:'math',title:L('Count & compare','数数与比较','かずと おおきさ'),grade:0},
 add20:{subject:'math',title:L('Add & subtract to 20','20以内加减法','20までの たしひき'),grade:1},
 add100:{subject:'math',title:L('Add & subtract to 100','100以内加减法','100までの たしひき'),grade:2},
 place:{subject:'math',title:L('Place value','认识数位','くらいの しくみ'),grade:2},
 money:{subject:'math',title:L('A little shop','文具小商店','ちいさな おみせ'),grade:2},
 time:{subject:'math',title:L('Time between events','经过的时间','かかった じかん'),grade:2},
 multiply:{subject:'math',title:L('Equal groups','乘法与等量分组','おなじ かずの まとまり'),grade:2},
 divide:{subject:'math',title:L('Share equally','平均分与除法','おなじ かずに わける'),grade:3},
 fractions:{subject:'math',title:L('Parts of a whole','认识分数','ぶんすう'),grade:3},
 measure:{subject:'math',title:L('Length & perimeter','长度与周长','ながさと まわり'),grade:3},
 area:{subject:'math',title:L('Area of rectangles','长方形面积','しかくの めんせき'),grade:4},
 decimal:{subject:'math',title:L('Decimal calculations','小数计算','しょうすうの けいさん'),grade:4},
 fractionSum:{subject:'math',title:L('Add fractions','分数加法','ぶんすうの たしざん'),grade:5},
 volume:{subject:'math',title:L('Volume of boxes','长方体体积','はこの たいせき'),grade:5},
 percent:{subject:'math',title:L('Percentages','百分数','わりあい'),grade:6},
 ratio:{subject:'math',title:L('Ratios & scaling','比与按比例分配','ひと わりあい'),grade:6},
 integers:{subject:'math',title:L('Signed numbers','正负数拓展','せいふの かず'),grade:7},
 equations:{subject:'math',title:L('Find the unknown','寻找未知数','みちの かず'),grade:8},
};
const languageTitles=[L('Letters & sounds','拼音启蒙','ことばの はじめ'),L('Sounds & words','拼音与词语','おとと ことば'),L('Words in sentences','词语与句子','ぶんと ことば'),L('Read for meaning','阅读与词义','いみを よむ'),L('Connect ideas','段落与关联词','ぶんを つなぐ'),L('Read between the lines','推断与表达','かくれた いみ'),L('Evidence & editing','证据与修改','こんきょと すいこう'),L('Compare viewpoints','比较观点','いけんの ひかく'),L('Evaluate an argument','评价论证','せつめいを たしかめる')];
const scienceTitles=[L('Observe & sort','观察与分类','みて わける'),L('Living things','认识生物','いきもの'),L('Materials & changes','材料与变化','ものと へんか'),L('Forces & magnets','力与磁铁','ちからと じしゃく'),L('Switches & circuits','开关与电路','スイッチと かいろ'),L('Earth & space','地球与太空','ちきゅうと うちゅう'),L('Fair tests','公平实验与证据','じっけんと こんきょ'),L('Repeat & evaluate tests','重复实验与评价','じっけんを たしかめる'),L('Energy & models','能量与模型拓展','エネルギーと モデル')];
const englishTitles=[null,L('English picture words · Pre-A1','英语图词启蒙 · Pre-A1','英語の えことば · Pre-A1'),L('English classroom talk · Pre-A1','英语课堂对话 · Pre-A1','英語の きょうしつ会話 · Pre-A1'),L('English everyday talk · A1','英语日常对话 · A1','英語の 日常会話 · A1'),L('English sentence challenge · A1','英语句子挑战 · A1','英語の 文チャレンジ · A1'),L('English reading mission · A1+','英语阅读任务 · A1+','英語の よみとり · A1+'),L('English communication bridge · A2','英语沟通进阶 · A2','英語コミュニケーション · A2')];
for(let i=0;i<=8;i++){
 TOPICS[`words${i}`]={subject:'language',grade:i,title:languageTitles[i]};
 TOPICS[`science${i}`]={subject:'science',grade:i,title:scienceTitles[i]};
}
for(let i=1;i<=6;i++)TOPICS[`english${i}`]={subject:'english',grade:i,title:englishTitles[i],learningLanguage:'en',cefr:['','Pre-A1','Pre-A1','A1','A1','A1+','A2 bridge'][i]};
// Explicit editorial recommendations per profile. These are not national equivalence tables.
const commonMath=[['count'],['add20','count'],['add100','place'],['multiply','divide','fractions','measure'],['area','decimal','divide'],['fractionSum','volume','decimal'],['percent','ratio','volume'],['integers','ratio','percent'],['equations','integers','ratio']];
const cnMath=[['count'],['add20','count'],['add100','place','multiply'],['divide','fractions','measure'],['area','decimal','divide'],['fractionSum','volume','decimal'],['percent','ratio','volume']];
const engMath=[['count'],['add20','count'],['add100','multiply','measure'],['divide','fractions','measure'],['area','decimal','multiply'],['fractionSum','volume','decimal'],['percent','ratio','volume']];
export const YEAR_PATHS={
 CN63:{Y1:1,Y2:2,Y3:3,Y4:4,Y5:5,Y6:6}, CN54:{Y1:1,Y2:2,Y3:3,Y4:4,Y5:5},
 US:{K:0,G1:1,G2:2,G3:3,G4:4,G5:5,G6:6},
 ENG:{R:0,Y1:1,Y2:2,Y3:3,Y4:4,Y5:5,Y6:6},
 SCT:{P1:0,P2:1,P3:2,P4:3,P5:4,P6:5,P7:6},
 WLS:{R:0,Y1:1,Y2:2,Y3:3,Y4:4,Y5:5,Y6:6},
 NIR:{P1:0,P2:1,P3:2,P4:3,P5:4,P6:5,P7:6},
 AU:{F:0,Y1:1,Y2:2,Y3:3,Y4:4,Y5:5,Y6:6},
 NZ:{Y0:0,Y1:0,Y2:1,Y3:2,Y4:3,Y5:4,Y6:5,Y7:6,Y8:7},
 INT:{G1:1,G2:2,G3:3,G4:4,G5:5,G6:6}
};
export function learningLanguage(profile){return profile?.startsWith('CN')?'zh':'en';}
export function lessonsFor(profile,year,subject='all'){
 if(typeof profile!=='string'||!Object.hasOwn(PROFILES,profile)||!PROFILES[profile].years.includes(year))return [];
 const stage=YEAR_PATHS[profile]?.[year];if(stage===undefined)return [];
 const math=profile.startsWith('CN')?cnMath:profile==='ENG'?engMath:commonMath;
 const ids=[...math[stage],...(stage===2?['money','time']:[]),`words${stage}`,`science${stage}`,...(profile.startsWith('CN')&&stage>=1&&stage<=6?[`english${stage}`]:[])];
 return ids.filter(id=>subject==='all'||TOPICS[id].subject===subject).map(id=>({id,...TOPICS[id],profile,year,learningLanguage:TOPICS[id].learningLanguage||learningLanguage(profile)}));
}
export function validateFoundation(input){
 if(!input||!['profile','year','lesson','locale'].every(key=>typeof input[key]==='string')||!['en','zh','ja'].includes(input.locale))return null;
 const stage=Number(input.stage||1);if(!Number.isInteger(stage)||stage<1||stage>40)return null;
 const lesson=lessonsFor(input.profile,input.year).find(x=>x.id===input.lesson);
 return lesson?{profile:input.profile,year:input.year,lesson:input.lesson,locale:input.locale,subject:lesson.subject,learningLanguage:lesson.learningLanguage,stage}:null;
}
