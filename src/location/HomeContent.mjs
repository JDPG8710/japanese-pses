export const HOME_COPY={
  "en": {
    "title": "One world.<br><em>Many ways to learn.</em>",
    "intro": "Explore how children in other countries learn. Choose a school-year path, discover maths, languages and science, and create your own ideas.",
    "path": "Explore learning paths",
    "routes": "Choose a route. Discover another classroom.",
    "note": "Choose any route, wherever you live. School-year paths offer selected supplementary practice, not complete national curricula. Interface language and lesson language may differ.",
    "names": [
      "China",
      "Japan",
      "United States",
      "United Kingdom",
      "Australia",
      "New Zealand",
      "International practice"
    ],
    "details": [
      "6–3 and 5–4 school systems",
      "Primary years 1–6 · Japanese lessons",
      "Kindergarten and primary grades",
      "England, Scotland, Wales and Northern Ireland",
      "Foundation and primary years",
      "Year 0 and primary years",
      "General primary-year practice"
    ],
    "townTitle": "Piko Town: let curiosity come alive.",
    "townIntro": "Explore streets, challenge games and design your own creations. Walk, drive and fly through a world of playful discovery.",
    "enter": "Enter Piko Town",
    "language": "Interface language",
    "free": "Try a short logic challenge",
    "library": "Learning library",
    "resume": "Continue a learning route"
  },
  "zh": {
    "title": "一个世界，<br><em>很多种学习方式。</em>",
    "intro": "探索其他国家小朋友的学习路线。在数学、语言、科学和创作中，发现共同点，也认识不同的世界。",
    "path": "探索各国学习路线",
    "routes": "选择一条路线，认识另一间课堂。",
    "note": "无论住在哪里，都可以自由选择路线。学年路径提供已开放的补充练习，不代表完整国家课程；界面语言与课程原文可能不同。",
    "names": [
      "中国",
      "日本",
      "美国",
      "英国",
      "澳大利亚",
      "新西兰",
      "国际通用练习"
    ],
    "details": [
      "六三制与五四制",
      "小学一年级至六年级 · 日语课程原文",
      "幼儿园与小学年级",
      "英格兰、苏格兰、威尔士与北爱尔兰",
      "Foundation 与小学学年",
      "Year 0 与小学学年",
      "通用小学年级标签"
    ],
    "townTitle": "走进 Piko 小镇，让好奇心动起来。",
    "townIntro": "探索街区、挑战游戏、设计自己的作品。散步、驾车和飞行，在玩耍中发现和创造。",
    "enter": "进入 Piko 小镇",
    "language": "界面语言",
    "free": "先试一个逻辑小挑战",
    "library": "学习资料库",
    "resume": "继续一条学习路线"
  },
  "ja": {
    "title": "ひとつの世界。<br><em>いろいろな学び方。</em>",
    "intro": "ほかの国の子どもたちの学びをたんけん。算数、ことば、科学やものづくりで、同じところとちがうところを見つけよう。",
    "path": "世界の学習コースをえらぶ",
    "routes": "コースをえらんで、世界の教室へ。",
    "note": "住んでいる国に関係なくコースをえらべます。公開済みの補助練習で、国の全カリキュラムではありません。画面のことばと教材のことばは異なる場合があります。",
    "names": [
      "中国",
      "日本",
      "アメリカ",
      "イギリス",
      "オーストラリア",
      "ニュージーランド",
      "世界の基本練習"
    ],
    "details": [
      "6–3制と5–4制",
      "小学1〜6年 · 日本語の教材",
      "Kindergartenと小学校の学年",
      "イングランド・スコットランド・ウェールズ・北アイルランド",
      "Foundationと小学校の学年",
      "Year 0と小学校の学年",
      "共通の学年ラベル"
    ],
    "townTitle": "Piko まなびタウンで、好奇心を動かそう。",
    "townIntro": "まちをたんけんして、ゲームにちょうせん。自分の作品をつくり、歩いたり車や飛行機で出かけたりしよう。",
    "enter": "Piko まなびタウンへ",
    "language": "画面のことば",
    "free": "短いパズルにちょうせん",
    "library": "学習ライブラリー",
    "resume": "学習コースをつづける"
  }
};

const codes=['CN','JP','US','GB','AU','NZ','INT'];
export function learningSections(locale){
 const c=HOME_COPY[locale]||HOME_COPY.en;
 return '<section class="global-routes" id="learning-routes" aria-labelledby="route-title"><h2 id="route-title">'+c.routes+'</h2><p>'+c.note+'</p><div class="route-grid">'+codes.map((country,i)=>'<a class="route-card" data-learning-route="'+country+'" href="'+(country==='JP'?'/?course=jp':'/grades?locale='+locale+(country==='INT'?'&curriculum=INT':'&country='+country))+'"><span aria-hidden="true">'+['🧮','🌸','🔬','📚','🦘','🌿','🌍'][i]+'</span><h3>'+c.names[i]+'</h3><p>'+c.details[i]+'</p><b aria-hidden="true">→</b></a>').join('')+'</div></section><section class="home-town-banner" aria-labelledby="town-banner-title"><div class="town-banner-art" aria-hidden="true"><span>🏘️</span><small>🚗　🎨　✈️</small></div><div><p class="banner-kicker">PIKO TOWN</p><h2 id="town-banner-title">'+c.townTitle+'</h2><p>'+c.townIntro+'</p><a id="home-town-entry" data-town-link class="banner-button" href="/town?locale='+locale+'">'+c.enter+' →</a></div></section><nav class="global-resources" aria-label="'+c.library+'"><a href="/world?locale='+locale+'">'+c.free+' →</a><a href="/'+locale+'/guides/">'+c.library+' →</a><a href="/grades?locale='+locale+'">'+c.resume+' →</a></nav>';
}
