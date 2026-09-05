import {writeFile} from 'node:fs/promises';
import {PROFILES} from '../src/world/GradePaths.mjs';
import {lessonsFor,CONTENT_VERSION} from '../src/world/FoundationCatalog.mjs';
import {questionPool} from '../src/world/FoundationRules.mjs';
const lines=['# 分年级基础练习实际覆盖表','',`题库版本：${CONTENT_VERSION}`,'','以下是实际可进入的学习目标，不是完整课程认证。数学包含数值变体；语言与科学含人工编写条目。不同学制共用经过选择的技能题池，不能把语言/学制组合数当作独立游戏数量。','', '| 学制 | 学年 | 数学目标 | 语言目标 | 科学目标 |','| --- | --- | --- | --- | --- |'];
const pools=new Map();let paths=0;
for(const [profile,p] of Object.entries(PROFILES))for(const year of p.years){const lessons=lessonsFor(profile,year);lines.push(`| ${p.names.zh} | ${year} | ${lessons.filter(x=>x.subject==='math').map(x=>x.title.zh).join('、')} | ${lessons.filter(x=>x.subject==='language').map(x=>x.title.zh).join('、')} | ${lessons.filter(x=>x.subject==='science').map(x=>x.title.zh).join('、')} |`);for(const lesson of lessons)for(const locale of ['en','zh','ja']){paths++;const route={profile,year,lesson:lesson.id,locale};const pool=questionPool(route);pools.set(`${lesson.id}/${lesson.subject==='language'?lesson.learningLanguage:locale}`,pool.length);}}
lines.push('','## 题池清单','','| 目标/语言 | 条目数（含数值变体） |','| --- | --- |',...[...pools].sort(([a],[b])=>a.localeCompare(b)).map(([key,count])=>`| ${key} | ${count} |`),'',`可验证路径组合：${paths}。每局10题、题目与选项分别打乱、局内不重复。`,'','日本原课程保留在 index.html?course=jp，其假名、汉字、社会与外国语课程未被替换成英语母语题。新模块提供数学/科学的三语呈现及独立中英文母语基础题，尚不包含原日本全题库的逐题中英文翻译，也不构成各地全科全年教材。');
await writeFile('docs/curriculum/FOUNDATION_COVERAGE.md',lines.join('\n')+'\n');console.log(`Coverage written: ${paths} routes, ${pools.size} topic/language pools.`);
