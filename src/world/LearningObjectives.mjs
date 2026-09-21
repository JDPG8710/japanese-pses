// Goals describe the exercises that are actually available, not a whole syllabus.
const L=(en,zh,ja)=>({en,zh,ja});
export const OBJECTIVES={
 count:L('Count 0–10 dots once each, then identify the next number up to 21.','逐个数清0至10个圆点，再练习说出下一个数（到21）。','0〜10この まるを ひとつずつ かぞえ、21までの つぎの かずを みつけよう。'),
 add20:L('Add and subtract small numbers within 20; use making ten or the inverse operation to check.','练习20以内的小数目加减法，用凑十或逆运算检查答案。','20までの たしひき。10の まとまりや ぎゃくの けいさんで たしかめよう。'),
 add100:L('Add and subtract two numbers within 100, separating tens and ones.','把十位和个位分开，计算100以内的两数加减。','10のまとまりと 1に わけて、100までの たしひきを しよう。'),
 place:L('Read the tens digit of a two-digit number and connect it to groups of ten.','找出两位数的十位数字，理解一个十由十个一组成。','2けたの かずの 10のくらいを、10この まとまりで かんがえよう。'),
 money:L('Find change by subtracting a whole-number price from the amount paid.','用付款金额减去整数价格，算出应找回的零钱。','はらった かずから ねだんを ひいて、おつりを もとめよう。'),
 time:L('Find elapsed minutes between two times within the same hour.','计算同一小时内两个时刻之间经过的分钟数。','おなじ じかんの なかで、なんぷん たったかを もとめよう。'),
 multiply:L('Multiply the number of equal groups by the number in each group.','用组数乘每组数量，计算等量分组的总数。','まとまりの かずと、ひとつぶんの かずを かけよう。'),
 divide:L('Share counters equally with no remainder; check each share using multiplication.','把圆片平均分且没有剩余，用乘法检查每份数量。','あまりが でないように おなじ かずに わけ、かけざんで たしかめよう。'),
 fractions:L('Write the fraction of equal parts that are shaded; recognise equivalent answers.','把等分图中的涂色部分写成分数，认识数值相等的分数。','おなじ おおきさの ぶぶんを かぞえ、ぬった わりあいを ぶんすうで かこう。'),
 measure:L('Add all four sides to find the perimeter of a rectangle in centimetres.','把四条边的长度相加，求长方形周长，单位是厘米。','4つの へんを たして、長方形の まわりの ながさを cmで もとめよう。'),
 area:L('Multiply a rectangle’s length and width; give its area in square metres.','用长乘宽求长方形面积，区分平方米与米。','長方形の たてと よこを かけ、面積を m²で もとめよう。'),
 decimal:L('Add numbers with one decimal place by combining tenths.','把一位小数看成若干个十分之一，进行小数加法。','小数第1位までの かずを、10ぶんの1の まとまりで たそう。'),
 fractionSum:L('Add fractions with the same denominator and simplify the result when possible.','同分母分数相加时分母不变，分子相加，再尝试约分。','分母が おなじ 分数の 分子を たし、できれば 約分しよう。'),
 volume:L('Multiply length, width and height to find a box’s volume in cubic centimetres.','把长、宽、高相乘，求长方体体积，单位是立方厘米。','たて・よこ・高さを かけ、長方体の 体積を cm³で もとめよう。'),
 percent:L('Find 10%, 25%, 50% or 75% of a given quantity.','练习求一个数的10%、25%、50%或75%。','ある かずの 10%、25%、50%、75%を もとめよう。'),
 ratio:L('Use a blue:red ratio of 2:3 to find the missing quantity through one ratio part.','已知蓝红数量比为2∶3，先求一份，再求红色数量。','青と赤の 比2:3から、1つぶんを もとめて 赤の かずを だそう。'),
 integers:L('Add a positive temperature rise to a temperature that may be below zero.','计算气温上升后的温度，起始温度可能低于零。','0℃より ひくい 気温にも、上がった 温度を たそう。'),
 equations:L('Solve ax + b = c by subtracting b and dividing by a.','对ax＋b＝c，先减去b，再除以a，求未知数x。','ax＋b＝cで、bを ひいてから aで わり、xを もとめよう。'),
 science0:L('Match observations of colour, sound and smell to eyes, ears and nose.','把颜色、声音、气味与眼睛、耳朵、鼻子的感知对应起来。','いろ・おと・においを、め・みみ・はなの はたらきと つなげよう。'),
 science1:L('Match roots, leaves and flowers to their functions in flowering plants.','根据开花植物的结构和功能，辨认根、叶与花。','はなが さく しょくぶつの、ね・は・はなの はたらきを えらぼう。'),
 science2:L('Identify solids, liquids and gases in stated everyday conditions.','根据题目给定的条件，区分常见物质的固态、液态和气态。','もんだいの じょうけんを よみ、こたい・えきたい・きたいを わけよう。'),
 science3:L('Predict magnetic attraction from the material; recognise when the material is unknown.','根据材料判断磁铁是否吸引物体；材料不明时识别信息不足。','ざいりょうから じしゃくに つくかを かんがえ、ふめいなら まだ わからないと はんだんしよう。'),
 science4:L('Reason about whether a simple switch circuit forms a complete conducting path.','根据开关和连接状态，判断简单电路是否形成完整导电回路。','スイッチや つながりから、でんきの とおりみちが つづいているか かんがえよう。'),
 science5:L('Explain day and night, Moon phases, water-cycle changes and other Earth-science examples.','练习解释昼夜、月相、水循环变化等地球科学现象。','ひると よる、月の みえかた、水の へんかなどを かんがえよう。'),
 science6:L('Separate the variable deliberately changed from the conditions kept the same.','区分实验中主动改变的变量和需要保持相同的条件。','じっけんで かえる じょうけんと、おなじにする じょうけんを わけよう。'),
 science7:L('Choose what to measure in a repeated trial and explain why changing two factors weakens a conclusion.','判断重复实验要测量什么，解释同时改变多个条件为何使结论不可靠。','くりかえす じっけんで はかるものと、いくつも かえると こまる りゆうを えらぼう。'),
 science8:L('Review repeated measurements and judge whether the controlled conditions allow a clear conclusion.','复习重复测量，并判断控制条件是否足以支持清楚的结论。','くりかえしの 測定と、じょうけんから 結論が いえるかを たしかめよう。'),
};
const literacy=[
 L('Identify a word’s first letter.','辨认英文单词的首字母。','英単語の はじめの 文字を えらぼう。'),
 L('Identify the ending after a word’s starting consonant sound.','辨认英文单词去掉开头辅音后的词尾。','英単語の はじめの 子音の あとに つづく 文字を えらぼう。'),
 L('Choose suitable words and grammatical forms in short sentences.','在短句中辨认合适的词语与语法形式。','みじかい 文に あう ことばや 形を えらぼう。'),
 L('Use sentence clues to infer word meanings and check sentence structure.','结合句子线索理解词义，并检查句子结构。','文の てがかりから いみを よみ、文の つくりを たしかめよう。'),
 L('Connect ideas, identify relevant details and distinguish fact from opinion.','连接句意，找出相关细节，区分事实与观点。','文を つなぎ、かんけいする くわしいことや 事実と 意見を えらぼう。'),
 L('Infer meaning from written clues and choose a supported interpretation.','根据文字线索推断含义，选择有依据的解释。','書かれた てがかりから、こんきょの ある いみを えらぼう。'),
 L('Use evidence and editing choices to make statements clearer and better supported.','结合证据与修改选项，让表达更清楚、更有依据。','こんきょや 文の なおしかたを えらび、せつめいを わかりやすくしよう。'),
 L('Compare claims and select relevant evidence rather than personal preference.','比较观点，用相关证据而非个人喜好作判断。','意見を くらべ、すききらいではなく こんきょで かんがえよう。'),
 L('Judge arguments, consider opposing information and preserve a source’s meaning.','评价论证，考虑相反信息，引用时保留资料原意。','せつめいや はんたいの 情報を たしかめ、資料の いみを かえずに よもう。')
];
export function lessonObjective(id,locale='en',language='en'){
 const lang=['en','zh','ja'].includes(locale)?locale:'en';
 if(OBJECTIVES[id])return OBJECTIVES[id][lang];
 if(/^words[0-8]$/.test(id)){
  const stage=Number(id.slice(5));
  if(stage<=1&&language==='zh')return L('Match a familiar Chinese character to its pinyin, including the tone.','为常见汉字选择正确拼音，注意声母、韵母与声调。','中国語の 漢字に あう ピンインを、声調にも 気をつけて えらぼう。')[lang];
  return literacy[stage][lang];
 }
 if(/^english[1-6]$/.test(id))return L('Practise English–Chinese vocabulary, dialogue, word order and short reading. Level labels guide practice; they are not exam certification.','练习英汉词汇、对话、句序和短文阅读。难度标签用于选择练习，不代表考试认证。','英中の 語彙、会話、語順、短文を れんしゅう。レベルは めやすで、試験の 認定ではありません。')[lang];
 return '';
}
const GUIDE_IDS={count:'counting',add20:'make-ten',fractions:'fractions',sudoku:'sudoku',robot:'robot',water:'water',town:'town-shop'};
export function guideUrl(id,locale='en'){return GUIDE_IDS[id]?`/${['en','zh','ja'].includes(locale)?locale:'en'}/guides/${GUIDE_IDS[id]}`:null;}
export function guideLink(id,locale='en'){
 const url=guideUrl(id,locale);
 return url?`<a class="learning-link" href="${url}">${L('Worked example & explanation','例题与解题方法','例題と ときかた')[locale]||'Worked example & explanation'} →</a>`:'';
}
