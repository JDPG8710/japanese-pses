import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ARTICLES,EXAMPLES} from '../content/learning-articles.mjs';
import {waterState} from '../src/world/WorldRules.mjs';
import {PROFILES,yearLabel,availableTasks} from '../src/world/GradePaths.mjs';
import {lessonsFor} from '../src/world/FoundationCatalog.mjs';
import {lessonObjective,guideUrl} from '../src/world/LearningObjectives.mjs';
import {TEXT} from '../src/world/WorldText.mjs';

const locales=['en','zh','ja'],site='https://piko-game.com',date='2026-09-21';
const copy={
 en:{home:'Learning library',intro:'Read an example, explain a step, then try an activity. These untimed guides cover selected skills; they are not a complete curriculum or an assessment.',ready:'Before you start',example:'Work through this example',steps:'Reason step by step',mistake:'A mistake worth understanding',practice:'Try it yourself',answer:'Show the answer and reasoning',next:'Use the idea in the game',play:'Open the activity',map:'Choose your school-year map',meta:'By Piko Game · Updated 21 September 2026',note:'These examples were written for Piko Game. Generated game questions may differ. A score describes a game attempt, not mastery of a school curriculum.',contact:'Found an error? Send the page address and the step that needs checking to',about:'About & help',coverage:'What each learning map contains',coverageIntro:'This catalogue lists the supplementary topics currently selected for each map. Year labels are navigation choices, not national equivalence or official alignment. The written guides cover only the linked topics. Language exercises use Chinese on China paths and English on the other paths; changing the interface language does not translate those exercises.',scope:'Published topics and activities',topics:'Lesson topics',games:'Logic activities',open:'Open this map',board:'Example board; dots mark empty cells',solved:'Completed board',state:'Operation',start:'Start',water:['Fill A','Fill B','Empty A','Empty B','Pour A into B','Pour B into A'],row:'Row',column:'Column',fraction:'One whole: four equal parts, three shaded',count:'Five dots: three above, two below',ten:'Split the five counters: two complete ten, three remain',town:'Example prices at maths level 1',item:'Item',quantity:'Quantity',price:'Unit price',apple:'Apple',bread:'Loaf of bread',group:['Logic games','Foundation maths','Learning town']},
 zh:{home:'学习资料库',intro:'先读例题、解释一步，再进入练习。这些不限时的指南覆盖精选技能，不是完整课程或学业评估。',ready:'开始前需要什么',example:'一起看一道例题',steps:'一步一步推理',mistake:'理解一个常见错误',practice:'自己试一题',answer:'展开答案与理由',next:'把方法用到游戏中',play:'进入对应活动',map:'选择自己的学年地图',meta:'Piko Game 编写 · 更新于2026年9月21日',note:'例题为Piko Game专门编写，游戏生成的题目可能不同。游戏得分仅表示一次练习表现，不代表掌握某年级的全部课程。',contact:'发现错误时，请把页面地址和需要核对的步骤发送至',about:'关于与帮助',coverage:'各学年地图实际包含什么',coverageIntro:'此目录列出各地图目前选取的辅助练习主题。年级标签用于导航，不表示各国学年等同，也不代表官方课程认证。书面指南只覆盖有链接的主题。中国学制的语言题使用中文，其他路径使用英文；更换界面语言不会翻译这些语言练习。',scope:'已提供的主题与活动',topics:'学科单元',games:'逻辑活动',open:'打开此学年地图',board:'示例棋盘：圆点表示待填格',solved:'完整答案棋盘',state:'操作',start:'开始',water:['装满A','装满B','倒空A','倒空B','A倒入B','B倒入A'],row:'行',column:'列',fraction:'一个整体：四个等份，三份涂色',count:'五个圆点：上面三个，下面两个',ten:'把五个圆片拆开：两个凑十，三个剩余',town:'数学难度1的示例价格',item:'商品',quantity:'数量',price:'单价',apple:'苹果',bread:'面包',group:['逻辑游戏','数学基础','学习小镇']},
 ja:{home:'学習ライブラリー',intro:'例題を よみ、1つの 手順を 説明してから、ゲームを 試しましょう。時間を はからず 選んだ 技能を 学ぶ ガイドです。全課程や 学力テストでは ありません。',ready:'はじめる 前に',example:'例題を 考えよう',steps:'順番に 考えよう',mistake:'まちがいの 理由',practice:'自分で 試そう',answer:'答えと 理由を ひらく',next:'ゲームで 試そう',play:'活動を ひらく',map:'自分の 学年マップを えらぶ',meta:'Piko Game 編 · 2026年9月21日 更新',note:'Piko Gameのために 書いた 例題です。ゲームの 問題は 異なる 場合が あります。得点は その回の 結果で、学年の 全課程の 習得を 示しません。',contact:'まちがいを 見つけたら、ページの アドレスと 確認する 手順を こちらへ',about:'サイト案内・ヘルプ',coverage:'学年マップの 内容',coverageIntro:'各マップで 現在 選べる 補助練習の 目録です。学年名は 案内の ためで、国どうしの 同等性や 公式な 課程認定を 表しません。文章の ガイドは リンクの ある テーマだけです。中国の 言語問題は 中国語、ほかの パスは 英語です。画面の 言語を 変えても、言語問題の 翻訳は されません。',scope:'公開中の テーマと 活動',topics:'学科の 単元',games:'論理の 活動',open:'この 学年マップへ',board:'例題の ばん：点は あいている マス',solved:'完成した ばん',state:'操作',start:'はじめ',water:['Aを 満たす','Bを 満たす','Aを 空に','Bを 空に','AからBへ','BからAへ'],row:'行',column:'列',fraction:'全体を 同じ4つに 分け、3つを ぬった 図',count:'5つの まる：上に3つ、下に2つ',ten:'5こを 分ける：2こで10、残り3こ',town:'算数レベル1の ねだん',item:'品物',quantity:'数',price:'1つの ねだん',apple:'りんご',bread:'パン',group:['論理ゲーム','算数の 基礎','まなびタウン']}
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hrefFor=(locale,slug)=>`/${locale}/guides/${slug||''}`;
function page(locale,slug,title,description,body){
 const w=copy[locale],url=hrefFor(locale,slug);
 return `<!doctype html><html lang="${locale==='zh'?'zh-Hans':locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Piko Game</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${site}${url}">${locales.map(l=>`<link rel="alternate" hreflang="${l==='zh'?'zh-Hans':l}" href="${site}${hrefFor(l,slug)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${site}${hrefFor('en',slug)}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/css/learning-guide.css?v=1"></head><body><header><a class="brand" href="/${locale}/">Piko Game</a><nav aria-label="${esc(w.home)}"><a href="/${locale}/guides/">${w.home}</a><a href="/about#${locale}">${w.about}</a></nav></header><main id="main"><p class="eyebrow">PIKO · LEARN &amp; EXPLAIN</p><h1>${esc(title)}</h1><p class="lead">${esc(description)}</p><p class="guide-meta">${w.meta}</p><nav class="guide-languages" aria-label="Language">${locales.map(l=>`<a href="${hrefFor(l,slug)}" lang="${l}"${l===locale?' aria-current="page"':''}>${({en:'English',zh:'中文',ja:'日本語'})[l]}</a>`).join('')}</nav>${body}<section><h2>${w.about}</h2><p>${w.note}</p><p>${w.contact} <a href="mailto:j565718319@gmail.com">j565718319@gmail.com</a>。</p><a href="/${locale}/guides/coverage">${w.coverage}</a></section></main><footer><a href="/${locale}/guides/">${w.home}</a> · <a href="/about#${locale}">${w.about}</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></footer></body></html>`;
}
function grid(values,size,caption,boxes=false){return `<table class="example-grid ${boxes?'sudoku-example':''}"><caption>${esc(caption)}</caption><tbody>${Array.from({length:size},(_,r)=>`<tr>${values.slice(r*size,(r+1)*size).map(v=>`<td>${esc(v||'·')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function illustration(slug,w){
 if(slug==='sudoku')return grid(EXAMPLES.sudoku.question.givens,4,w.board,true);
 if(slug==='robot')return grid(['S','·','·','·','#','·','·','·','G'],3,'S → G · #');
 if(slug==='water'){
  const e=EXAMPLES.water;
  return `<table class="guide-table"><caption>A: 3 L · B: 5 L</caption><thead><tr><th scope="col">${w.state}</th><th scope="col">A (L)</th><th scope="col">B (L)</th></tr></thead><tbody>${[[],...e.answer.map((_,i)=>e.answer.slice(0,i+1))].map((moves,i)=>{const state=waterState(e.question,moves);return `<tr><th scope="row">${i?`${i}. ${w.water[moves.at(-1)]}`:w.start}</th><td>${state[0]}</td><td>${state[1]}</td></tr>`;}).join('')}</tbody></table>`;
 }
 if(slug==='counting')return `<figure class="count-example"><figcaption>${w.count}</figcaption><div aria-hidden="true">● ● ●<br>● ●</div></figure>`;
 if(slug==='make-ten')return `<figure class="ten-example"><figcaption>${w.ten}</figcaption><p>5 = 2 + 3</p><p>8 + 5 = (8 + 2) + 3</p><p>= 10 + 3 = 13</p></figure>`;
 if(slug==='fractions')return `<figure><figcaption>${w.fraction}</figcaption><div class="fraction-example" aria-hidden="true">${[1,1,1,0].map(v=>`<span class="${v?'shaded':''}">${v?'●':'○'}</span>`).join('')}</div></figure>`;
 if(slug==='town-shop')return `<table class="guide-table"><caption>${w.town}</caption><thead><tr><th>${w.item}</th><th>${w.quantity}</th><th>${w.price}</th></tr></thead><tbody><tr><td>${w.apple} / apple</td><td>1</td><td>3 ✦</td></tr><tr><td>${w.bread} / loaf of bread</td><td>1</td><td>4 ✦</td></tr></tbody></table>`;
 return '';
}
function articleBody(article,locale){
 const w=copy[locale],a=article,p=s=>`<p>${esc(s[locale])}</p>`;
 const activity=['sudoku','robot','water'].includes(a.activity),town=a.activity==='town';
 const destination=activity?`/world?locale=${locale}#game-${a.activity}`:town?`/town?locale=${locale}`:`/grades?locale=${locale}`;
 return `<section><h2>${w.ready}</h2>${p(a.ready)}</section><section><h2>${w.example}</h2>${p(a.example)}${illustration(a.slug,w)}<h3>${w.steps}</h3><ol>${a.steps.map(s=>`<li>${esc(s[locale])}</li>`).join('')}</ol>${a.slug==='sudoku'?`<details><summary>${w.solved}</summary>${grid(EXAMPLES.sudoku.answer,4,w.solved,true)}</details>`:''}</section><section><h2>${w.mistake}</h2>${p(a.mistake)}</section><section><h2>${w.practice}</h2>${p(a.practice)}<details><summary>${w.answer}</summary>${p(a.answer)}</details></section><section><h2>${w.next}</h2>${p(a.transfer)}<a class="guide-play" href="${destination}">${activity||town?w.play:w.map} →</a></section>`;
}
function library(locale){
 const w=copy[locale];
 return [ARTICLES.slice(0,3),ARTICLES.slice(3,6),ARTICLES.slice(6)].map((group,i)=>`<section><h2>${w.group[i]}</h2><div class="guide-cards">${group.map(a=>`<article><h3><a href="${hrefFor(locale,a.slug)}">${esc(a.title[locale])}</a></h3><p>${esc(a.goal[locale])}</p></article>`).join('')}</div></section>`).join('')+`<section><h2>${w.coverage}</h2><p>${w.coverageIntro}</p><a href="${hrefFor(locale,'coverage')}">${w.scope} →</a></section>`;
}
function coverage(locale){
 const w=copy[locale];
 return Object.entries(PROFILES).map(([id,profile])=>`<section><h2>${esc(profile.names[locale])}</h2>${profile.years.map(year=>{
  const lessons=lessonsFor(id,year),q=new URLSearchParams({curriculum:id,year,locale});if(profile.country)q.set('country',profile.country);
  return `<details class="coverage-year"><summary>${esc(yearLabel(year,locale))}</summary><h3>${w.topics}</h3><ul>${lessons.map(lesson=>{const guide=guideUrl(lesson.id,locale);return `<li><strong>${guide?`<a href="${guide}">${esc(lesson.title[locale])}</a>`:esc(lesson.title[locale])}</strong> — ${esc(lessonObjective(lesson.id,locale,lesson.learningLanguage))}</li>`;}).join('')}</ul><h3>${w.games}</h3><p>${availableTasks(id,year).map(task=>esc(TEXT[locale].games[task.game][0])).join(' · ')}</p><a href="/grades?${esc(q)}">${w.open} →</a></details>`;
 }).join('')}</section>`).join('');
}
export async function buildLearningContent(output){
 const urls=[];
 for(const locale of locales){
  const folder=path.join(output,locale,'guides');await mkdir(folder,{recursive:true});
  const entries=[['',copy[locale].home,copy[locale].intro,library(locale)],['coverage',copy[locale].coverage,copy[locale].coverageIntro,coverage(locale)],...ARTICLES.map(a=>[a.slug,a.title[locale],a.goal[locale],articleBody(a,locale)])];
  for(const [slug,title,description,body] of entries){
   await writeFile(path.join(folder,`${slug||'index'}.html`),page(locale,slug,title,description,body));
   urls.push(`<url><loc>${site}${hrefFor(locale,slug)}</loc><lastmod>${date}</lastmod>${locales.map(l=>`<xhtml:link rel="alternate" hreflang="${l==='zh'?'zh-Hans':l}" href="${site}${hrefFor(l,slug)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${site}${hrefFor('en',slug)}"/></url>`);
  }
 }
 const sitemap=path.join(output,'sitemap.xml');
 await writeFile(sitemap,(await readFile(sitemap,'utf8')).replace('</urlset>',`${urls.join('\n')}\n</urlset>`));
}
