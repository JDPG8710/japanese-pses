// AMC 8 learning guide: what the competition is, a staged roadmap and seven
// topic lessons. Every lesson links to the existing practice bank by topic id.
// Competition facts were checked against MAA pages on 2026-10-03 (see SOURCES).
const T=(zh,en,ja)=>({zh,en,ja});

export const FACTS_CHECKED='2026-10-03';
export const SOURCES=[
  {url:'https://maa.org/student-programs/amc/',label:T('MAA：American Mathematics Competitions（AMC 8 简介）','MAA: American Mathematics Competitions (AMC 8 overview)','MAA：American Mathematics Competitions（AMC 8 の説明）')},
  {url:'https://maa.org/amcreg/',label:T('MAA：AMC 报名与日期','MAA: AMC registration and dates','MAA：AMC の申し込みと日程')},
  {url:'https://artofproblemsolving.com/wiki/index.php/2026_AMC_8_Problems',label:T('2026 AMC 8 试卷说明（AoPS Wiki 转载）','2026 AMC 8 test instructions (reproduced on the AoPS Wiki)','2026 AMC 8 の試験の注意（AoPS Wiki に掲載）')}
];

export const LEARN_TEXT={
  zh:{practiceTab:'练习',learnTab:'学习',learnTitle:'第一次接触 AMC 8？从这里开始',learnIntro:'先用几分钟了解比赛是什么，再按路线一步一步学习。每一课都有简单讲解、例题和常见陷阱，学完可以直接去做相关练习。',
    whatTitle:'AMC 8 是什么？',whatIntro:'AMC 8 是美国数学协会（MAA）举办的数学竞赛，适合 8 年级及以下的学生。它考的不是背公式，而是“读懂问题、想出办法”。',
    forKids:'小学生也能参加吗？可以。AMC 8 面向 8 年级及以下，前面的题多数只需要扎实的小学算术和认真读题，越往后越有挑战。第一次参加时，不必追求全对，目标可以是“比上次多做对几题”。',
    topicsTitle:'会考哪些内容？',topicsBody:'MAA 列出的重点包括：计数与概率、估算、比例推理、初等几何（含勾股定理）、空间想象，以及读懂图表。后面的一些题可能涉及初步代数，比如一次或二次函数、坐标几何。',
    howJoin:'怎么报名？学生和家长不能直接向 MAA 报名，要通过举办比赛的学校、大学、数学社团或学习中心参加。美国和加拿大以外的地区，可以查询 MAA 的 AMC International 项目，具体日期以当地考点为准。',
    sources:'资料来源',checked:'资料核对日期',
    roadmapTitle:'学习路线图',roadmapIntro:'按三个阶段前进。每个阶段先读课程，再做 10 题练习；第一次就答对 8 题，就可以进入下一步。',
    lessonsTitle:'专题课程',lessonsIntro:'七个专题覆盖 AMC 8 常见的知识点。点开一课，读完后按“我学会了”记录进度。',
    open:'打开课程',done:'已学完',notStarted:'未学',progress:'已学完',of:'/',
    backToLearn:'← 返回学习目录',inShort:'一句话理解',ideas:'核心要点',example:'例题',stepByStep:'一步一步解',answer:'答案',traps:'常见陷阱',amcTip:'在 AMC 8 里',practiceTitle:'去练一练',practiceIntro:'下面的练习来自本站题库，每组 10 题，带分步讲解。',related:'相关题型',practiceButton:'练习：',markDone:'我学会了 ✓',markUndo:'标记为未学',prev:'← 上一课',next:'下一课 →',stage:'阶段',lessonsInStage:'本阶段课程',learnLink:'学习讲解',saved:'课程进度只保存在这台设备的浏览器里。',stageGoal:'目标'},
  en:{practiceTab:'Practise',learnTab:'Learn',learnTitle:'New to AMC 8? Start here',learnIntro:'Spend a few minutes finding out what the competition is, then follow the roadmap one step at a time. Each lesson has a simple explanation, a worked example and common traps, and links straight to related practice.',
    whatTitle:'What is AMC 8?',whatIntro:'AMC 8 is a maths competition run by the Mathematical Association of America (MAA) for students in grade 8 and below. It is less about memorising formulas and more about understanding a problem and finding a way to solve it.',
    forKids:'Can primary pupils take part? Yes. AMC 8 is open to students in grade 8 and below. Most early questions need solid primary arithmetic and careful reading; the questions get more challenging as you go. On a first try you do not need a perfect score — aim to get a few more right than last time.',
    topicsTitle:'What does it cover?',topicsBody:'The MAA lists counting and probability, estimation, proportional reasoning, elementary geometry (including the Pythagorean theorem), spatial visualisation, and reading graphs and tables. Some later questions may touch on beginning algebra, such as linear or quadratic functions and coordinate geometry.',
    howJoin:'How do you enter? Students and parents do not register with the MAA directly. You take part through a school, university, maths circle or learning centre that hosts the competition. Outside the USA and Canada, check the MAA’s AMC International programme; dates are set by your local host.',
    sources:'Sources',checked:'Facts checked on',
    roadmapTitle:'Learning roadmap',roadmapIntro:'Move through three stages. In each stage, read the lessons, then try a 10-question set. When you get 8 right on the first try, you are ready for the next step.',
    lessonsTitle:'Topic lessons',lessonsIntro:'Seven topics cover the ideas that appear most often in AMC 8. Open a lesson, read it, then press “I’ve got it” to record your progress.',
    open:'Open lesson',done:'Done',notStarted:'Not started',progress:'Completed',of:'/',
    backToLearn:'← Back to lessons',inShort:'In one sentence',ideas:'Key ideas',example:'Worked example',stepByStep:'Step by step',answer:'Answer',traps:'Common traps',amcTip:'In AMC 8',practiceTitle:'Practise it',practiceIntro:'These sets come from our question bank: 10 questions each, with step-by-step explanations.',related:'Related question types',practiceButton:'Practise: ',markDone:'I’ve got it ✓',markUndo:'Mark as not done',prev:'← Previous lesson',next:'Next lesson →',stage:'Stage',lessonsInStage:'Lessons in this stage',learnLink:'Learn this topic',saved:'Lesson progress is saved only in this browser on this device.',stageGoal:'Goal'},
  ja:{practiceTab:'練習する',learnTab:'学ぶ',learnTitle:'はじめての AMC 8 は、ここから',learnIntro:'まず数分で「どんな大会か」を知り、ロードマップにそって一歩ずつ進もう。どの課にも、やさしい説明・例題・よくあるまちがいがあり、読んだらすぐ関連する練習ができます。',
    whatTitle:'AMC 8 ってなに？',whatIntro:'AMC 8 は、アメリカ数学協会（MAA）が開く算数・数学の大会で、8年生（日本の中学2年生）以下が対象です。公式を覚えているかより、「問題を読みとって、解き方を考える力」がためされます。',
    forKids:'小学生も参加できる？　できます。AMC 8 は8年生以下が対象です。はじめのほうの問題は、小学校の計算をしっかりできて、問題文をていねいに読めば解けるものが多く、後になるほどむずかしくなります。初めてなら満点をねらわなくて大丈夫。「前より何問か多く正解する」を目標にしよう。',
    topicsTitle:'どんな内容が出るの？',topicsBody:'MAA があげている主な内容は、場合の数と確率、見積もり、比や割合の考え方、図形の基本（三平方の定理をふくむ）、空間のイメージ、グラフや表の読みとりです。後半の問題では、一次関数・二次関数や座標など、文字式のはじめの内容が出ることもあります。',
    howJoin:'どうやって申し込むの？　生徒や保護者が MAA に直接申し込むことはできません。大会を開く学校・大学・数学サークル・塾などを通して参加します。アメリカとカナダ以外では、MAA の AMC International のプログラムを確認しよう。日程は各会場によって決まります。',
    sources:'情報源',checked:'情報を確認した日',
    roadmapTitle:'学習ロードマップ',roadmapIntro:'3つのステージで進みます。各ステージで課を読み、10問の練習にちょうせん。1回目で8問正解できたら、次へ進もう。',
    lessonsTitle:'テーマ別の課',lessonsIntro:'AMC 8 によく出る7つのテーマです。課を開いて読み終えたら「わかった！」をおして記録しよう。',
    open:'課を開く',done:'学習ずみ',notStarted:'まだ',progress:'学習ずみ',of:'/',
    backToLearn:'← 課の一覧へ',inShort:'ひとことで言うと',ideas:'大切なポイント',example:'例題',stepByStep:'順番に解こう',answer:'答え',traps:'よくあるまちがい',amcTip:'AMC 8 では',practiceTitle:'練習してみよう',practiceIntro:'このサイトの問題集から10問ずつ出ます。どの問題にも、順を追った解説があります。',related:'関連する問題のタイプ',practiceButton:'練習：',markDone:'わかった！ ✓',markUndo:'「まだ」にもどす',prev:'← 前の課',next:'次の課 →',stage:'ステージ',lessonsInStage:'このステージの課',learnLink:'このテーマを学ぶ',saved:'課の進み具合は、この端末のブラウザーにだけ保存されます。',stageGoal:'目標'}
};

export const FACTS=[
  {icon:'📝',title:T('25 道选择题','25 multiple-choice questions','25問の選択問題'),body:T('每题有 A–E 五个选项，只有一个是正确答案。','Each question has five answers, A to E. Exactly one is correct.','どの問題も A〜E の5つから選び、正しいのは1つだけ。')},
  {icon:'⏱️',title:T('40 分钟','40 minutes','40分間'),body:T('平均每题不到 2 分钟，所以先做有把握的题。','That is under 2 minutes per question on average, so do the ones you are sure of first.','1問あたり2分ないので、自信のある問題から解こう。')},
  {icon:'⭐',title:T('答对 1 分，答错不扣分','1 point each, no penalty','正解で1点、まちがえても減点なし'),body:T('满分 25 分。不会的题也可以先估算、排除，再选一个答案。','The top score is 25. Even on a hard question, estimate, rule out answers and choose one.','満点は25点。わからない問題も、見積もりで答えをしぼって1つ選ぼう。')},
  {icon:'🎒',title:T('8 年级及以下','Grade 8 and below','8年生（中2）以下'),body:T('比赛当天须未满 15.5 岁，每年只能参加一次。','You must be under 15.5 years old on the day, and you can take it once a year.','大会の日に15.5歳未満であること。参加は1年に1回だけ。')},
  {icon:'📅',title:T('每年 1 月，为期约一周','Every January, over about a week','毎年1月、約1週間のあいだ'),body:T('MAA 公布的 2026–27 年度日期：2027 年 1 月 21–27 日（美国与加拿大）。','MAA dates for 2026–27: 21–27 January 2027 (USA and Canada).','MAA が発表した2026–27年度の日程：2027年1月21〜27日（アメリカとカナダ）。')},
  {icon:'✏️',title:T('不能用计算器','No calculators','電卓は使えない'),body:T('只能用草稿纸、笔、直尺和橡皮；方格纸、圆规、量角器、手机等都不能用。图形不一定按比例画。','Only plain scratch paper, pencils, a ruler and an eraser. No graph paper, compasses, protractors or phones. Figures are not necessarily drawn to scale.','使えるのは白い計算用紙・えんぴつ・定規・消しゴムだけ。方眼紙・コンパス・分度器・スマホは使えません。図は正確な大きさとはかぎりません。')}
];

export const STAGES=[
  {id:'start',icon:'🌱',title:T('入门：先熟悉题型','Beginner: get to know the problems','はじめ：問題になれる'),
   goal:T('会读题、画图、检查答案；能把基础计算和分数做稳。','Read carefully, draw a picture and check your answer; make arithmetic and fractions reliable.','問題をていねいに読み、図をかき、答えをたしかめる。計算と分数を安定させる。'),
   steps:[T('读“数感与巧算”“分数、比与百分数”“逻辑与规律”三课。','Read “Number sense”, “Fractions, ratios & percentages” and “Logic & patterns”.','「数の感覚とくふうした計算」「分数・比・百分率」「論理ときまり」の3つの課を読む。'),T('每课读完后做对应的 10 题练习，看讲解订正错题。','After each lesson, try the matching 10-question set and read the explanations for any mistakes.','課を読んだら関連する10問の練習をして、まちがえた問題は解説で直す。')],
   lessons:['arithmetic','fraction','logic']},
  {id:'grow',icon:'🌿',title:T('提高：学会关键方法','Intermediate: learn the key methods','のびる：大切な解き方を身につける'),
   goal:T('学会割补求面积、分类计数、整除与余数、设未知数。','Learn to split shapes, count case by case, use divisibility and remainders, and name an unknown.','図形を分けたり足したりする方法、場合分けの数え方、倍数と余り、わからない数を文字で表す方法を身につける。'),
   steps:[T('读“几何”“计数与概率”“数论”“代数入门”四课。','Read “Geometry”, “Counting & probability”, “Number theory” and “Algebra basics”.','「図形」「場合の数と確率」「整数の性質」「文字と式のはじめ」の4つの課を読む。'),T('每个专题练习争取第一次就答对 8 题以上。','Aim for 8 or more right on the first try in each topic set.','どのテーマの練習でも、1回目で8問以上の正解をめざす。')],
   lessons:['geometry','counting','numbertheory','algebra']},
  {id:'ready',icon:'🌳',title:T('备赛：用真题练习','Ready: practise with past papers','本番にそなえる：過去問で練習'),
   goal:T('熟悉真题的难度和节奏，40 分钟内稳定拿分。','Get used to the level and pace of real papers and score steadily within 40 minutes.','本物の問題のむずかしさと時間の使い方になれ、40分で安定して点をとる。'),
   steps:[T('打开下方“往届试题”，每次只做 5 题，不计时，做完对照解答。','Open the past papers below. Do 5 questions at a time, untimed, then compare with the solutions.','下の「過去問」を開き、時間を気にせず5問ずつ解いて、解答とくらべる。'),T('再做完整 25 题，限时 40 分钟。题目一般越往后越难，先做有把握的。','Then try a full 25-question paper in 40 minutes. Questions usually get harder towards the end, so do the ones you are sure of first.','次に25問を40分で通して解く。後ろの問題ほどむずかしいことが多いので、自信のある問題から。'),T('准备一本错题本：写下“错在哪一步”，过几天再做一次。','Keep a mistakes notebook: write down which step went wrong, and try the question again a few days later.','まちがいノートを作り、「どの段階でまちがえたか」を書いて、数日後にもう一度解く。')],
   lessons:[]}
];

export const LESSONS=[
  {id:'arithmetic',icon:'🧮',stage:'start',practice:['number'],families:['sequence','expression-order'],
   title:T('数感与巧算','Number sense & smart calculation','数の感覚とくふうした計算'),
   summary:T('不用计算器也能算得又快又准。','Calculate quickly and accurately without a calculator.','電卓なしでも、速く正確に計算する。'),
   short:T('先观察数字之间的关系，再动笔计算，常常能找到更简单的算法。','Look at how the numbers are related before you calculate; there is often a much easier way.','計算を始める前に数どうしの関係を見ると、もっと楽な計算の仕方が見つかることが多い。'),
   body:T('AMC 8 不能用计算器，但题目很少需要又长又难的计算。出题人通常把数字设计得“刚刚好”，只要发现其中的规律，就能轻松算出来。','You cannot use a calculator in AMC 8, but the questions rarely need long, difficult calculations. The numbers are usually chosen to work out nicely once you notice the pattern.','AMC 8 では電卓が使えませんが、長くてむずかしい計算が必要な問題はあまりありません。数はたいてい「うまくいく」ように作られていて、しくみに気づけば楽に計算できます。'),
   ideas:[T('先乘除、后加减；括号里的最先算。','Multiply and divide before you add and subtract; brackets come first.','かけ算・わり算を先に、たし算・ひき算は後。かっこの中がいちばん先。'),
     T('凑整：先把能凑成 10、100 的数放在一起，比如 37 + 48 + 63 = (37 + 63) + 48。','Make tens and hundreds: group numbers that make 10 or 100, e.g. 37 + 48 + 63 = (37 + 63) + 48.','10や100のまとまりを作る：37 + 48 + 63 = (37 + 63) + 48 のように組み合わせる。'),
     T('拆数：99 × 7 = 100 × 7 − 7 = 693；25 × 36 = 25 × 4 × 9 = 900。','Split numbers: 99 × 7 = 100 × 7 − 7 = 693, and 25 × 36 = 25 × 4 × 9 = 900.','数を分ける：99 × 7 = 100 × 7 − 7 = 693、25 × 36 = 25 × 4 × 9 = 900。'),
     T('估算：先估计答案大概是多少，就能排除明显不对的选项。','Estimate first: knowing roughly how big the answer is lets you rule out choices that cannot be right.','見積もり：答えがだいたいどのくらいかを先に考えると、ありえない選択肢を消せる。')],
   example:{problem:T('计算：25 × 48 + 25 × 52','Work out 25 × 48 + 25 × 52.','25 × 48 + 25 × 52 を計算しよう。'),
     steps:[T('观察：两个乘法里都有 25。','Notice that both products contain 25.','どちらのかけ算にも 25 があることに気づく。'),T('把 25 提出来：25 × (48 + 52)。','Take out the 25: 25 × (48 + 52).','25 をまとめる：25 × (48 + 52)。'),T('48 + 52 = 100，正好凑整。','48 + 52 = 100, a nice round number.','48 + 52 = 100 で、ちょうどきりのよい数になる。'),T('25 × 100 = 2500。','25 × 100 = 2500.','25 × 100 = 2500。')],
     answer:T('2500','2500','2500')},
   traps:[T('从左到右硬算，忘了先乘后加。','Working strictly left to right and forgetting to multiply before adding.','左から順に計算して、かけ算を先にするのを忘れる。'),T('算完不估算，结果差了 10 倍也没发现。','Not estimating at the end, so an answer that is 10 times too big goes unnoticed.','最後に見積もらず、答えが10倍ずれていても気づかない。')],
   tip:T('前几题常常是计算题。先找巧算方法，可以省下时间留给后面的难题。','The first few questions are often calculations. Spotting a shortcut saves time for the harder questions later.','はじめの数問は計算問題が多い。くふうして時間を節約し、後半のむずかしい問題に回そう。')},

  {id:'fraction',icon:'🍰',stage:'start',practice:['fraction'],families:['part','discount','ratio','remaining','unit-price','fraction-order'],
   title:T('分数、比与百分数','Fractions, ratios & percentages','分数・比・百分率'),
   summary:T('弄清“谁是整体”，部分就好算了。','Work out what the whole is, and the parts become easy.','「全体はどれか」がわかれば、部分は楽に求められる。'),
   short:T('分数、比和百分数，都是在比较“部分”和“整体”。','Fractions, ratios and percentages all compare a part with a whole.','分数も比も百分率も、「部分」と「全体」をくらべる言い方。'),
   body:T('3/5 表示把整体平均分成 5 份，取其中 3 份。比 2∶3 表示一共 5 份，一边 2 份、一边 3 份。25% 就是 25/100，也就是 1/4。做题时先问自己：这里的“整体”是什么？','3/5 means split the whole into 5 equal parts and take 3 of them. A ratio of 2:3 means 5 parts in total: 2 on one side and 3 on the other. 25% is 25/100, which is 1/4. Always ask first: what is the whole here?','3/5 は、全体を5等分したうちの3つ分。比 2：3 は、全部で5つ分のうち、一方が2つ分、もう一方が3つ分。25% は 25/100、つまり 1/4。まず「ここでの全体は何？」と考えよう。'),
   ideas:[T('分母 = 平均分成的份数，分子 = 取了几份。','Denominator = how many equal parts; numerator = how many you take.','分母は「いくつに等分したか」、分子は「そのうちいくつ分か」。'),
     T('按比分配：先求总份数，再求一份是多少。','Sharing in a ratio: find the total number of parts, then the size of one part.','比で分けるとき：全部で何つ分かを出し、1つ分がいくつかを求める。'),
     T('常用的百分数：50% = 1/2，25% = 1/4，20% = 1/5，10% = 1/10。','Useful percentages: 50% = 1/2, 25% = 1/4, 20% = 1/5, 10% = 1/10.','よく使う百分率：50% = 1/2、25% = 1/4、20% = 1/5、10% = 1/10。'),
     T('打 8 折（便宜 20%）就是付原价的 80%。','A 20% discount means you pay 80% of the original price.','20% 引きは、もとの値段の 80% をはらうこと。')],
   example:{problem:T('一个班有 30 名学生，男生和女生人数的比是 2∶3。女生有多少人？','A class has 30 pupils. The ratio of boys to girls is 2:3. How many girls are there?','クラスに30人いて、男子と女子の人数の比は 2：3 です。女子は何人？'),
     steps:[T('总份数：2 + 3 = 5 份。','Total parts: 2 + 3 = 5.','全部で 2 + 3 = 5 つ分。'),T('一份是多少人：30 ÷ 5 = 6 人。','One part: 30 ÷ 5 = 6 pupils.','1つ分は 30 ÷ 5 = 6 人。'),T('女生占 3 份：6 × 3 = 18 人。','Girls are 3 parts: 6 × 3 = 18.','女子は3つ分なので 6 × 3 = 18 人。'),T('检查：男生 6 × 2 = 12 人，12 + 18 = 30 ✓。','Check: boys are 6 × 2 = 12, and 12 + 18 = 30 ✓.','たしかめ：男子は 6 × 2 = 12 人、12 + 18 = 30 ✓。')],
     answer:T('18 人','18 girls','18人')},
   traps:[T('把总数分别除以 2 和 3（30 ÷ 3 = 10 是错的）。','Dividing the total by 2 and by 3 separately (30 ÷ 3 = 10 is wrong).','全体を2や3で別々に割ってしまう（30 ÷ 3 = 10 はまちがい）。'),T('先降价 10% 再涨价 10%，并不会回到原价，因为两次的“整体”不同。','Going down 10% and then up 10% does not get you back to the start, because the whole is different each time.','10% 下げてから 10% 上げても、もとの値段にはもどらない。2回の「全体」がちがうから。')],
   tip:T('比例推理是 MAA 列出的重点内容之一，购物、配方、地图比例尺都可能出现。','Proportional reasoning is one of the main areas the MAA lists; look out for shopping, recipes and map scales.','比や割合の考え方は、MAA があげる主な内容の1つ。買い物・料理の分量・地図の縮尺などで出てくる。')},

  {id:'logic',icon:'💡',stage:'start',practice:['logic','number'],families:['heads-legs','time-order','sequence'],
   title:T('逻辑与规律','Logic & patterns','論理ときまり'),
   summary:T('像侦探一样整理线索、找出规律。','Sort out the clues like a detective and spot the pattern.','探偵のように手がかりを整理して、きまりを見つける。'),
   short:T('找规律就是看“每一次怎样变化”；逻辑题就是把条件一条一条用上。','A pattern is about how things change each time; a logic puzzle is about using every clue, one at a time.','きまりを見つけるとは「毎回どう変わるか」を見ること。論理の問題は、条件を1つずつ使うこと。'),
   body:T('遇到看起来很长的问题，不要着急。先从小的情况试一试：第 1 个、第 2 个、第 3 个分别是多少？把结果列成表，规律常常就出现了。逻辑题也一样，用表格记下每条线索，把不可能的情况划掉。','When a question looks long, do not rush. Try small cases first: what happens for 1, 2 and 3? Put the results in a table and the pattern often appears. Logic puzzles work the same way: record each clue in a table and cross out what is impossible.','長く見える問題でも、あわてないで。まず小さい場合をためそう。1番目、2番目、3番目はいくつ？　表にすると、きまりが見えてくることが多い。論理の問題も同じで、手がかりを表に書き、ありえないものに×をつけよう。'),
   ideas:[T('看相邻两项的差：每次都加同一个数，就是等差规律。','Look at the difference between neighbouring terms: adding the same amount each time is an arithmetic pattern.','となりどうしの差を見る。毎回同じ数ずつ増えるなら、等差のきまり。'),
     T('数“间隔”：从第 1 个到第 n 个，只变化了 n − 1 次。','Count the gaps: from the 1st to the nth term there are only n − 1 changes.','間の数を数える：1番目から n 番目までに変わるのは n − 1 回。'),
     T('假设法：先假设全是同一种，再看差了多少（比如鸡兔同笼）。','Suppose first: imagine everything is the same kind, then see how far off you are (as in heads-and-legs puzzles).','もしも法：全部が同じ種類だと仮定して、どれだけずれるかを見る（つるかめ算など）。'),
     T('画表格整理条件，用“×”排除不可能的情况。','Use a table to organise the clues and mark impossible cases with ×.','表を作って条件を整理し、ありえない場合に×をつける。')],
   example:{problem:T('用火柴棒摆一排正方形：1 个正方形用 4 根，2 个用 7 根，3 个用 10 根……摆 10 个正方形需要多少根？','Matchsticks make a row of squares: 1 square uses 4 sticks, 2 squares use 7, 3 squares use 10, and so on. How many sticks are needed for 10 squares?','マッチ棒で正方形を横に並べます。1個で4本、2個で7本、3個で10本……。正方形を10個つくるには何本いる？'),
     steps:[T('列出前几项：4、7、10，每多一个正方形多 3 根。','List the first terms: 4, 7, 10. Each extra square adds 3 sticks.','はじめの数を書く：4、7、10。正方形が1個増えるごとに3本増える。'),T('为什么是 3 根？新正方形和前一个共用一条边。','Why 3? The new square shares one side with the one before.','なぜ3本？　新しい正方形は、となりと1本を共有するから。'),T('从 1 个到 10 个，增加了 10 − 1 = 9 次。','From 1 square to 10 squares there are 10 − 1 = 9 additions.','1個から10個までに増えるのは 10 − 1 = 9 回。'),T('4 + 3 × 9 = 31 根。','4 + 3 × 9 = 31 sticks.','4 + 3 × 9 = 31 本。')],
     answer:T('31 根','31 sticks','31本')},
   traps:[T('把“项数”当成“增加的次数”：算成 4 + 3 × 10 = 34。','Confusing the number of terms with the number of increases: 4 + 3 × 10 = 34.','項の数と増える回数をまちがえて 4 + 3 × 10 = 34 にしてしまう。'),T('只看前两项就下结论，至少要验证三项。','Deciding on a pattern from only two terms; check at least three.','2つだけ見てきまりを決めてしまう。少なくとも3つはたしかめよう。')],
   tip:T('AMC 8 常有“看图找规律”和需要整理条件的推理题。先试小情况，是最可靠的第一步。','AMC 8 often includes picture patterns and puzzles where you must organise the clues. Trying small cases is the most reliable first step.','AMC 8 には、図のきまりを見つける問題や、条件を整理する問題がよく出る。小さい場合をためすのが、いちばん確実な第一歩。')},

  {id:'geometry',icon:'📐',stage:'grow',practice:['geometry'],families:['rectangle','cutout','triangle','angles','units','area-order'],
   title:T('几何：周长、面积与角','Geometry: perimeter, area & angles','図形：周りの長さ・面積・角'),
   summary:T('先画图，再把复杂图形拆成简单图形。','Draw a picture, then break hard shapes into easy ones.','まず図をかき、むずかしい形を簡単な形に分ける。'),
   short:T('周长是沿边走一圈的长度，面积是里面能铺多少个小正方形。','Perimeter is the distance around the edge; area is how many unit squares fit inside.','周りの長さはふちを1周する長さ、面積は中に1辺1の正方形が何こ入るか。'),
   body:T('几何题第一步永远是画图并标上已知数据。看到奇怪的形状，可以把它拆成几个长方形或三角形，也可以把它补成一个大长方形，再减去多出来的部分。','The first step in any geometry question is to draw a picture and label what you know. For an unusual shape, split it into rectangles and triangles, or fill it out into a big rectangle and subtract the extra piece.','図形の問題では、まず図をかいて、わかっている長さを書きこもう。変わった形は、長方形や三角形に分けるか、大きな長方形にしてから、よけいな部分をひこう。'),
   ideas:[T('长方形面积 = 长 × 宽；三角形面积 = 底 × 高 ÷ 2（高要和底垂直）。','Rectangle area = length × width; triangle area = base × height ÷ 2 (the height must be perpendicular to the base).','長方形の面積 = たて × よこ。三角形の面積 = 底辺 × 高さ ÷ 2（高さは底辺に垂直）。'),
     T('三角形三个内角的和是 180°，四边形是 360°。','The angles in a triangle add up to 180°; in a quadrilateral, 360°.','三角形の3つの角の和は 180°、四角形は 360°。'),
     T('割补法：拆开分别算，或者补成大图形再减去。','Split or fill: add up the pieces, or complete a bigger shape and subtract.','分ける・たす方法：分けて計算するか、大きい形にしてからひく。'),
     T('直角三角形：两条直角边的平方和等于斜边的平方（勾股定理）。比如边长 3、4、5：9 + 16 = 25。','Right-angled triangles: the squares of the two shorter sides add up to the square of the longest side (Pythagoras). For sides 3, 4 and 5: 9 + 16 = 25.','直角三角形：短い2辺をそれぞれ2乗（同じ数どうしをかける）してたすと、いちばん長い辺の2乗になる（三平方の定理）。辺が 3、4、5 なら 9 + 16 = 25。')],
   example:{problem:T('一个长 8 cm、宽 6 cm 的长方形，从一个角剪去长 3 cm、宽 2 cm 的小长方形。剩下的面积是多少？','A rectangle is 8 cm long and 6 cm wide. A small 3 cm by 2 cm rectangle is cut from one corner. What area is left?','たて6cm、よこ8cmの長方形の角から、たて2cm、よこ3cmの長方形を切り取ります。残りの面積は？'),
     steps:[T('把它看成“完整的大长方形减去小长方形”。','Think of it as the whole rectangle minus the small one.','「大きい長方形 − 小さい長方形」と考える。'),T('大长方形：8 × 6 = 48 cm²。','Big rectangle: 8 × 6 = 48 cm².','大きい長方形：8 × 6 = 48 cm²。'),T('剪去的部分：3 × 2 = 6 cm²。','The piece cut off: 3 × 2 = 6 cm².','切り取った部分：3 × 2 = 6 cm²。'),T('剩下：48 − 6 = 42 cm²。','What is left: 48 − 6 = 42 cm².','残り：48 − 6 = 42 cm²。')],
     answer:T('42 cm²','42 cm²','42 cm²')},
   traps:[T('用斜着的边当三角形的高；高必须和底垂直。','Using a slanted side as the height of a triangle; the height must meet the base at a right angle.','ななめの辺を高さにしてしまう。高さは底辺に垂直でなければならない。'),T('周长用 cm，面积用 cm²，单位不能混。','Perimeter is in cm and area is in cm²; do not mix the units.','周りの長さは cm、面積は cm²。単位をまぜない。'),T('AMC 8 的图不一定按比例画，不能用尺子量出答案。','AMC 8 figures are not necessarily drawn to scale, so do not measure them with a ruler to get the answer.','AMC 8 の図は正確な大きさとはかぎらないので、定規で測って答えを出してはいけない。')],
   tip:T('初等几何和勾股定理是 MAA 列出的重点内容。很多题只要多画一条线，就能变简单。','Elementary geometry, including Pythagoras, is a main area in the MAA description. Many questions become easy once you draw one extra line.','図形の基本と三平方の定理は、MAA があげる主な内容。線を1本かき足すだけで簡単になる問題も多い。')},

  {id:'counting',icon:'🎲',stage:'grow',practice:['counting'],families:['outfits','pairs','probability','codes','grid-paths','chance-order'],
   title:T('计数与概率','Counting & probability','場合の数と確率'),
   summary:T('有顺序地数，不重复也不遗漏。','Count in an orderly way, with no repeats and nothing missed.','順番に数えて、重なりも数えもれもなくす。'),
   short:T('计数题问“有多少种”；概率 = 想要的结果数 ÷ 所有可能的结果数。','Counting asks “how many ways?”; probability = favourable outcomes ÷ all equally likely outcomes.','場合の数は「何通り？」。確率 = 当てはまる場合の数 ÷ 起こりうるすべての場合の数。'),
   body:T('数数听起来简单，但很容易重复或漏掉。秘诀是按顺序列举：先固定第一个，再变化第二个。画树状图或表格最可靠。求概率时，要先确认每种结果出现的机会相同。','Counting sounds easy, but it is easy to count something twice or miss it. The trick is to list things in order: fix the first choice, then vary the second. Tree diagrams and tables are the most reliable tools. For probability, first check that every outcome is equally likely.','数えるのは簡単そうでも、同じものを2回数えたり、数えもらしたりしやすい。コツは順番に書き出すこと。1つ目を決めてから、2つ目を変えていく。樹形図や表がいちばん確実。確率では、どの場合も同じように起こるかを先にたしかめよう。'),
   ideas:[T('分步做用乘法：3 件上衣、4 条裤子，搭配有 3 × 4 = 12 种。','Steps in a row multiply: 3 shirts and 4 pairs of trousers give 3 × 4 = 12 outfits.','続けて選ぶときはかけ算：上着3種類・ズボン4種類なら 3 × 4 = 12 通り。'),
     T('分类做用加法：几种互不重叠的情况，分别数完再相加。','Separate cases add: count each non-overlapping case, then add them up.','場合分けはたし算：重ならない場合ごとに数えて、最後にたす。'),
     T('有没有顺序？选两个人握手不分先后，要除以 2。','Does order matter? A handshake between two people has no order, so divide by 2.','順番は関係ある？　2人の握手は順番がないので、2でわる。'),
     T('概率一定在 0 和 1 之间；所有结果的概率加起来等于 1。','A probability is always between 0 and 1, and the probabilities of all outcomes add up to 1.','確率はいつも0から1のあいだ。すべての場合の確率をたすと1になる。')],
   example:{problem:T('用数字 1、2、3、4 组成两位数，十位和个位的数字不能相同。能组成多少个两位数？随机选一个，它是偶数的概率是多少？','Make two-digit numbers from the digits 1, 2, 3 and 4, with different tens and units digits. How many can you make? If one is chosen at random, what is the probability that it is even?','1、2、3、4 の数字で、十の位と一の位がちがう2けたの数を作ります。何こできる？　1つを選ぶとき、偶数である確率は？'),
     steps:[T('十位有 4 种选法；个位不能和十位相同，剩 3 种。','The tens digit has 4 choices; the units digit must be different, leaving 3.','十の位は4通り。一の位は十の位とちがう数なので3通り。'),T('一共 4 × 3 = 12 个两位数。','In total there are 4 × 3 = 12 numbers.','全部で 4 × 3 = 12 こ。'),T('偶数的个位是 2 或 4。个位是 2 时十位有 3 种，个位是 4 时也有 3 种，共 6 个。','An even number ends in 2 or 4. Ending in 2 leaves 3 tens digits, and ending in 4 also leaves 3: 6 numbers.','偶数は一の位が2か4。一の位が2のとき十の位は3通り、4のときも3通りで、合わせて6こ。'),T('概率 = 6 ÷ 12 = 1/2。','Probability = 6 ÷ 12 = 1/2.','確率 = 6 ÷ 12 = 1/2。')],
     answer:T('12 个；概率是 1/2','12 numbers; probability 1/2','12こ、確率は 1/2')},
   traps:[T('把 AB 和 BA 当成同一种（或不同种）之前，先想清楚顺序重不重要。','Before treating AB and BA as the same (or different), decide whether order matters.','AB と BA を同じと見るか別と見るか、まず順番が関係あるかを考える。'),T('概率的分母要用“所有结果数”，不是“另一种结果数”。','The denominator of a probability is all the outcomes, not just the other kind.','確率の分母は「すべての場合の数」。「もう一方の数」ではない。')],
   tip:T('计数与概率是 MAA 列出的第一个重点。题目会写“how many ways”或“probability”。','Counting and probability is the first area in the MAA description. Look for “how many ways” or “probability”.','場合の数と確率は、MAA があげる主な内容の最初の1つ。“how many ways” や “probability” という言葉に注目。')},

  {id:'numbertheory',icon:'🔢',stage:'grow',practice:['number'],families:['multiples','remainder','gcd','digits'],
   title:T('数论：倍数、因数与余数','Number theory: multiples, factors & remainders','整数の性質：倍数・約数・余り'),
   summary:T('用整除和余数，把难题变简单。','Use divisibility and remainders to make hard questions simple.','わり切れるか・余りはいくつかで、むずかしい問題を簡単にする。'),
   short:T('数论研究整数：谁能整除谁、余几、有哪些因数。','Number theory is about whole numbers: what divides what, what is left over, and which factors a number has.','整数について「何でわり切れるか」「余りはいくつか」「約数は何か」を考える。'),
   body:T('很多题看起来要算很大的数，其实只要关心“除以某个数余几”。比如星期每 7 天重复一次，所以只要知道天数除以 7 的余数，就知道是星期几。','Many questions seem to involve huge numbers, but you only need the remainder after dividing by something. Days of the week repeat every 7 days, so the remainder after dividing by 7 tells you the day.','大きな数が出てきても、「ある数でわった余り」だけを考えればよいことが多い。たとえば曜日は7日ごとにくり返すので、日数を7でわった余りがわかれば曜日がわかる。'),
   ideas:[T('整除口诀：2 看个位是不是偶数；5 看个位是不是 0 或 5；3 和 9 看各位数字之和。','Divisibility tests: for 2, is the last digit even? For 5, is it 0 or 5? For 3 and 9, add up the digits.','わり切れるかの見分け方：2は一の位が偶数か、5は一の位が0か5か、3と9は各位の数字の和を見る。'),
     T('质数只有 1 和它本身两个因数，比如 2、3、5、7、11；1 不是质数。','A prime has exactly two factors, 1 and itself: 2, 3, 5, 7, 11 … ; 1 is not prime.','素数は約数が1とその数の2つだけの数。2、3、5、7、11 など。1は素数ではない。'),
     T('分解质因数：60 = 2 × 2 × 3 × 5，用来求最大公因数和最小公倍数。','Prime factorisation: 60 = 2 × 2 × 3 × 5. It helps you find the greatest common factor and the lowest common multiple.','素因数分解：60 = 2 × 2 × 3 × 5。最大公約数や最小公倍数を求めるのに使う。'),
     T('从 1 到 n 有几个 k 的倍数？算 n ÷ k，只取整数部分。','How many multiples of k are there from 1 to n? Work out n ÷ k and keep the whole-number part.','1から n までに k の倍数はいくつ？　n ÷ k の整数の部分を見る。')],
   example:{problem:T('今天是星期一。100 天后是星期几？','Today is Monday. What day of the week will it be in 100 days?','今日は月曜日です。100日後は何曜日？'),
     steps:[T('星期每 7 天循环一次。','The days of the week repeat every 7 days.','曜日は7日ごとにくり返す。'),T('100 ÷ 7 = 14 余 2：先过了 14 个整周，还是星期一。','100 ÷ 7 = 14 remainder 2: after 14 full weeks it is Monday again.','100 ÷ 7 = 14 余り 2。ちょうど14週たつと、また月曜日。'),T('再往后数 2 天：星期二、星期三。','Count on 2 more days: Tuesday, Wednesday.','あと2日進める：火曜日、水曜日。')],
     answer:T('星期三','Wednesday','水曜日')},
   traps:[T('余数必须比除数小；“14 余 9”这种写法一定错了。','A remainder must be smaller than the divisor; “14 remainder 9” after dividing by 7 is wrong.','余りはわる数より小さい。7でわって「14余り9」はまちがい。'),T('把 1 当成质数，或者漏掉质数 2。','Counting 1 as a prime, or forgetting that 2 is prime.','1を素数にしたり、2が素数であることを忘れたりする。')],
   tip:T('AMC 8 常考数字、倍数和余数的题。遇到很大的数，先想“只需要知道余数吗？”','AMC 8 often asks about digits, multiples and remainders. When you see a huge number, ask yourself: do I only need the remainder?','AMC 8 には、数字・倍数・余りの問題がよく出る。大きな数を見たら「余りだけわかればいい？」と考えよう。')},

  {id:'algebra',icon:'⚖️',stage:'grow',practice:['logic'],families:['backwards','average','meeting','ages'],
   title:T('代数入门：未知数与等式','Algebra basics: unknowns & equations','文字と式のはじめ'),
   summary:T('给不知道的数起个名字，像天平一样求出来。','Give the unknown a name and balance it out like scales.','わからない数に名前をつけて、てんびんのように求める。'),
   short:T('代数就是用 □ 或 x 代表不知道的数，再按题意写出两边相等的式子。','Algebra means using □ or x for an unknown number and writing a statement where both sides are equal.','わからない数を □ や x で表し、両方が等しい式を作ること。'),
   body:T('等式就像天平：左边和右边一样重。两边同时加、减同一个数，或同时乘、除同一个数（不是 0），天平仍然平衡。这样一步一步，就能把未知数单独留在一边。','An equation is like a pair of scales: both sides weigh the same. Add or subtract the same number on both sides, or multiply or divide both sides by the same number (not 0), and it stays balanced. Step by step, you leave the unknown on its own.','式はてんびんのようなもの。左と右は同じ重さ。両方に同じ数をたしたりひいたり、同じ数（0以外）をかけたりわったりしても、つり合ったまま。こうして一歩ずつ、わからない数だけを片方に残そう。'),
   ideas:[T('先写清楚：x 代表什么？（比如“妹妹现在的年龄”）','First say clearly what x stands for (for example, “my sister’s age now”).','まず x が何を表すかをはっきり書く（たとえば「妹の今の年齢」）。'),
     T('倒推：最后做的运算最先撤销，加法用减法撤销，乘法用除法撤销。','Work backwards: undo the last operation first. Undo adding by subtracting, and multiplying by dividing.','逆にたどる：最後の計算から先にもどす。たし算はひき算で、かけ算はわり算でもどす。'),
     T('平均数 × 个数 = 总数，这是很多应用题的突破口。','Average × number of items = total. This unlocks many word problems.','平均 × 個数 = 合計。多くの文章題のカギになる。'),
     T('求出答案后代回原题检查。','Put your answer back into the question to check it.','答えが出たら、もとの問題に入れてたしかめる。')],
   example:{problem:T('3 × □ + 7 = 31，□ 是多少？','3 × □ + 7 = 31. What number goes in the box?','3 × □ + 7 = 31 のとき、□ にあてはまる数は？'),
     steps:[T('最后做的是“+ 7”，先撤销：两边都减 7，得到 3 × □ = 24。','The last step was “+ 7”, so undo it first: subtract 7 from both sides to get 3 × □ = 24.','最後の計算は「+ 7」なので先にもどす。両方から7をひくと 3 × □ = 24。'),T('再撤销“× 3”：两边都除以 3，得到 □ = 8。','Then undo “× 3”: divide both sides by 3 to get □ = 8.','次に「× 3」をもどす。両方を3でわると □ = 8。'),T('检查：3 × 8 + 7 = 24 + 7 = 31 ✓。','Check: 3 × 8 + 7 = 24 + 7 = 31 ✓.','たしかめ：3 × 8 + 7 = 24 + 7 = 31 ✓。')],
     answer:T('8','8','8')},
   traps:[T('撤销的顺序反了：先除以 3 再减 7，会得到错误答案。','Undoing in the wrong order: dividing by 3 before subtracting 7 gives the wrong answer.','もどす順番が逆になる。先に3でわってから7をひくと、まちがった答えになる。'),T('只在天平的一边做运算，另一边忘了做。','Changing only one side of the scales and forgetting the other.','てんびんの片方だけ計算して、もう片方を忘れる。')],
   tip:T('MAA 提到后面的题可能涉及初步代数。小学阶段先把“倒推”和“□ 等式”练熟就够了。','The MAA notes that later questions may use beginning algebra. At primary level, getting comfortable with working backwards and box equations is plenty.','MAA によると、後半の問題には文字式のはじめの内容が出ることもある。小学生のうちは「逆にたどる」と「□ の式」になれておけば十分。')}
];

export const LESSON_KEY='piko-amc8-lessons:v1';
const TOPIC_LESSON={number:'numbertheory',fraction:'fraction',geometry:'geometry',counting:'counting',logic:'logic'};
export const lessonForTopic=topic=>TOPIC_LESSON[topic];
