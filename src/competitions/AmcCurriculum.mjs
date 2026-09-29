// 30 authored problem families × 20 parameter variants. Translations share IDs and answers.
// All exercises are original preparation material, not historical AMC questions.
const L=(zh,ja,en)=>({zh,ja,en});
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fraction=(a,b)=>{const d=gcd(a,b);return `${a/d}/${b/d}`;};
export const TOPICS=[
  {id:'number',icon:'🔢',...L('数与规律','数と規則','Numbers & patterns'),goal:L('数列、整除、余数与数字计数','数列・倍数・余り・数字の数','Sequences, divisibility, remainders and digits')},
  {id:'fraction',icon:'🍰',...L('分数与比例','分数と割合','Fractions & ratios'),goal:L('部分与整体、折扣、比例与分数比较','全体と部分・割引・比・分数の比較','Parts, discounts, ratios and fraction comparisons')},
  {id:'geometry',icon:'📐',...L('几何与测量','図形と測定','Geometry & measurement'),goal:L('周长、面积、角度与单位换算','周りの長さ・面積・角度・単位','Perimeter, area, angles and units')},
  {id:'counting',icon:'🎲',...L('计数与概率','場合の数と確率','Counting & probability'),goal:L('有序计数、组合、路径与概率','もれなく数える・組合せ・経路・確率','Systematic counting, pairs, paths and probability')},
  {id:'logic',icon:'💡',...L('应用题与逻辑','文章題と論理','Word problems & logic'),goal:L('倒推、平均数、相遇、年龄与时间','逆算・平均・出会い・年齢・時間','Work backwards, averages, meetings, ages and time')}
];
const F=[];
function family(topic,id,title,kind,build){F.push({topic,id,title,kind,build});}
function item(prompt,answers,steps,hint,mistake,check,labels){return {prompt,answers:answers.map(String),steps,hint,mistake,check,labels};}

family('number','sequence',L('等差数列','同じ数ずつ増える数列','Arithmetic sequences'),'number',n=>{
  const a=n+3,d=n%4+2,k=n%5+7,r=a+d*(k-1);
  return item(L(`数列 ${a}, ${a+d}, ${a+2*d}, … 每次增加相同的数。第 ${k} 项是多少？`,`${a}, ${a+d}, ${a+2*d}, … と同じ数ずつ増えます。${k}番目は？`,`The sequence ${a}, ${a+d}, ${a+2*d}, … increases by the same amount each time. What is term ${k}?`),[r],[
    L(`相邻两项相减，公差是 ${a+d} − ${a} = ${d}。`,`となりの数の差は ${a+d} − ${a} = ${d}。`,`Subtract adjacent terms: the common difference is ${a+d} − ${a} = ${d}.`),
    L(`第一项已经存在，到第 ${k} 项只增加 ${k-1} 次。`,`1番目はすでにあるので、増える回数は ${k-1} 回。`,`The first term is already present, so reaching term ${k} takes ${k-1} increases.`),
    L(`第 ${k} 项 = ${a} + ${d} × ${k-1} = ${r}。`,`${k}番目 = ${a} + ${d} × ${k-1} = ${r}。`,`Term ${k} = ${a} + ${d} × ${k-1} = ${r}.`)
  ],L('数一数两个项之间有几个间隔。','数と数の間の数を数えよう。','Count the gaps between the terms.'),L('不要把项数当成增加次数。','増える回数は、項の数より1少ない。','Do not confuse the number of terms with the number of increases.'),L(`从 ${r} 减去 ${d*(k-1)}，应回到首项 ${a}。`,`${r} から ${d*(k-1)} を引くと最初の ${a} に戻る。`,`Subtract ${d*(k-1)} from ${r}; you return to ${a}.`));
});
family('number','multiples',L('倍数计数','倍数を数える','Counting multiples'),'multi',n=>{
  const a=n+4,m=a*6;
  return item(L(`从 1 到 ${m}（含两端），分别有多少个 3 的倍数和 6 的倍数？`,`1から${m}までに、3の倍数と6の倍数はそれぞれいくつ？`,`Among the integers from 1 through ${m}, how many are multiples of 3, and how many are multiples of 6?`),[a*2,a],[
    L('把倍数排成 3、6、9……，每个完整的 3 数组贡献一个。','3、6、9…と並べ、3ずつのまとまりを数える。','List 3, 6, 9, … . Each complete block of 3 contributes one multiple.'),
    L(`${m} ÷ 3 = ${a*2}，所以有 ${a*2} 个 3 的倍数。`,`${m} ÷ 3 = ${a*2} なので、3の倍数は ${a*2} こ。`,`${m} ÷ 3 = ${a*2}, so there are ${a*2} multiples of 3.`),
    L(`同理，${m} ÷ 6 = ${a}，所以有 ${a} 个 6 的倍数。`,`同じように ${m} ÷ 6 = ${a}。6の倍数は ${a} こ。`,`Likewise, ${m} ÷ 6 = ${a}, giving ${a} multiples of 6.`)
  ],L('分别按 3 个一组和 6 个一组划分。','3ずつ、6ずつに分けて考えよう。','Group the range into blocks of 3 and blocks of 6.'),L('0 不在本题范围内，不能多算一个。','この範囲に0は入らない。','Zero is not in the given range.'),L(`6 的倍数个数应是 3 的倍数个数的一半：${a*2} ÷ 2 = ${a}。`,`6の倍数の数は3の倍数の半分：${a*2} ÷ 2 = ${a}。`,`Every second multiple of 3 is a multiple of 6: ${a*2} ÷ 2 = ${a}.`),L(['3 的倍数个数','6 的倍数个数'],['3の倍数の数','6の倍数の数'],['Multiples of 3','Multiples of 6']));
});
family('number','remainder',L('分组与余数','まとまりと余り','Groups and remainders'),'number',n=>{
  const q=n+4,r=n%6+1,total=q*7+r;
  return item(L(`${total} 枚贴纸每 7 枚装一袋，尽可能装满。最后剩几枚？`,`シール${total}枚を7枚ずつ袋に入れます。できるだけ袋を作ると、何枚余る？`,`${total} stickers are packed into bags of 7. After filling as many bags as possible, how many stickers remain?`),[r],[
    L('余数是装完所有完整袋后留下的数量。','余りは、いっぱいの袋を作った後に残る枚数。','The remainder is what is left after making all complete groups.'),
    L(`${q} × 7 = ${q*7}，而 ${q+1} × 7 = ${(q+1)*7} 已超过总数。`,`${q} × 7 = ${q*7}。次の ${(q+1)*7} 枚には足りない。`,`${q} × 7 = ${q*7}; the next multiple, ${(q+1)*7}, is too large.`),
    L(`剩余 = ${total} − ${q*7} = ${r} 枚。`,`余り = ${total} − ${q*7} = ${r} 枚。`,`Remainder = ${total} − ${q*7} = ${r} stickers.`)
  ],L('先找到不超过总数的最大 7 的倍数。','全体をこえない最大の7の倍数を探そう。','Find the largest multiple of 7 no greater than the total.'),L('袋数不是余数；余数必须小于 7。','袋の数と余りは別。余りは7より小さい。','The number of bags is not the remainder; the remainder must be less than 7.'),L(`${q} × 7 + ${r} = ${total}，且 ${r} < 7。`,`${q} × 7 + ${r} = ${total}、${r} < 7。`,`${q} × 7 + ${r} = ${total}, with ${r} < 7.`));
});
family('number','gcd',L('最大公因数','最大公約数','Greatest common divisor'),'choice',n=>{
  const a=n+4;
  return item(L(`把 ${2*a} 个红珠和 ${3*a} 个蓝珠分成尽可能多的相同小包，不剩珠子。每包的颜色数量完全相同。最多分几包？`,`赤${2*a}こ、青${3*a}このビーズを、色ごとの数が同じ袋に分けます。余りなしで最大何袋？`,`${2*a} red beads and ${3*a} blue beads are divided into as many identical bags as possible with none left over. What is the maximum number of bags?`),[a],[
    L('袋数必须同时整除两种珠子的数量。','袋の数は、赤と青の両方を割り切る数。','The bag count must divide both bead counts.'),
    L(`${2*a} = 2 × ${a}，${3*a} = 3 × ${a}；2 和 3 没有大于 1 的公因数。`,`${2*a} = 2 × ${a}、${3*a} = 3 × ${a}。2と3の共通の約数は1だけ。`,`${2*a} = 2 × ${a} and ${3*a} = 3 × ${a}; 2 and 3 share no factor greater than 1.`),
    L(`所以最大公因数是 ${a}，可分成 ${a} 包，每包红 2 个、蓝 3 个。`,`最大公約数は ${a}。${a}袋に、赤2こ・青3こずつ入る。`,`Thus the greatest common divisor is ${a}: ${a} bags, each with 2 red and 3 blue beads.`)
  ],L('用“袋数能否整除两种数量”检查候选答案。','両方の数を割り切れるか調べよう。','A possible bag count must divide both quantities.'),L('要求最多的包数，不是每包最多的珠子数。','求めるのは1袋の中身ではなく、袋の最大数。','Maximize the number of bags, not beads per bag.'),L(`${a} 包分别装 2 红、3 蓝，正好得到 ${2*a} 红和 ${3*a} 蓝。`,`${a}袋×赤2こ・青3こで、元の数に戻る。`,`${a} bags with 2 red and 3 blue each recover the original totals.`));
});
family('number','digits',L('页码中的数字','ページ番号の数字','Counting printed digits'),'multi',n=>{
  const m=n+20,two=m-9,digits=9+two*2;
  return item(L(`一本小册子的页码从 1 写到 ${m}。两位数页码有几个？一共写了多少个数字？`,`1から${m}までページ番号を書きます。2けたのページは何ページ？使う数字は全部で何こ？`,`Pages are numbered from 1 to ${m}. How many page numbers have two digits, and how many digits are printed in total?`),[two,digits],[
    L('1 到 9 有 9 个一位数页码，共用 9 个数字。','1〜9は1けたで、数字を9こ使う。','Pages 1–9 use one digit each, for 9 digits.'),
    L(`10 到 ${m} 有 ${m} − 10 + 1 = ${two} 个页码。`,`10〜${m}は ${m} − 10 + 1 = ${two} ページ。`,`Pages 10–${m} give ${m} − 10 + 1 = ${two} two-digit page numbers.`),
    L(`数字总数 = 9 + 2 × ${two} = ${digits}。`,`数字の合計 = 9 + 2 × ${two} = ${digits}。`,`Total digits = 9 + 2 × ${two} = ${digits}.`)
  ],L('按一位数和两位数分组。','1けたと2けたに分けよう。','Separate one-digit and two-digit page numbers.'),L('区间两端都包含时，要加 1；页码数量不等于数字数量。','両はしを数えるので+1。ページ数と数字の数を区別しよう。','Inclusive intervals need +1. Page counts and digit counts differ.'),L(`${two} 个两位页码加 9 个一位页码，共 ${m} 页。`,`${two} + 9 = ${m} ページになる。`,`${two} two-digit pages plus 9 one-digit pages give ${m} pages.`),L(['两位页码个数','数字总数'],['2けたのページ数','数字の合計'],['Two-digit page numbers','Total printed digits']));
});
family('number','expression-order',L('算式结果排序','計算結果を並べる','Ordering expressions'),'order',n=>{
  const a=n+4,values=[a+1,a*2+1,a*3+1,a*4+1],labels=[`${a} + 1`,`${a} × 2 + 1`,`${a} × 3 + 1`,`${a} × 4 + 1`];
  const q=item(L('计算并按结果从小到大排列下列算式。','次の式を、答えの小さい順に並べよう。','Evaluate these expressions and arrange them from smallest result to largest.'),labels,[
    L('先乘除，后加减，不按文字长短比较。','かけ算を先にしてから、たし算をする。','Do multiplication before addition; do not compare the text length.'),
    L(`各算式的结果分别为 ${values.join('、')}。`,`それぞれの答えは ${values.join('、')}。`,`The results are ${values.join(', ')} respectively.`),
    L(`比较结果：${values.join(' < ')}，再对应回算式。`,`答えを ${values.join(' < ')} と比べ、式に戻す。`,`Compare ${values.join(' < ')} and match each result back to its expression.`)
  ],L('先在纸上写出每个算式的结果。','それぞれの答えを紙に書こう。','Write down each result first.'),L('移动的是整个算式，不是其中一个数字。','式の中の数字ではなく、式全体を動かそう。','Move whole expressions, not individual numbers.'),L(`从左到右的结果每次增加 ${a}。`,`答えは順に ${a} ずつ増える。`,`Consecutive results differ by ${a}.`));q.orderItems=labels;return q;
});

family('fraction','part',L('求整体的一部分','全体の一部を求める','Finding a fraction of a quantity'),'number',n=>{
  const a=n+4,total=8*a,r=3*a;
  return item(L(`${total} 颗珠子的 3/8 是蓝色。蓝色珠子有几颗？`,`ビーズ${total}この3/8は青。青は何こ？`,`Three eighths of ${total} beads are blue. How many are blue?`),[r],[L('分母 8 表示把整体平均分成 8 份。','分母8は、全体を8等分すること。','The denominator 8 means 8 equal parts.'),L(`一份有 ${total} ÷ 8 = ${a} 颗。`,`1つ分は ${total} ÷ 8 = ${a} こ。`,`One part contains ${total} ÷ 8 = ${a} beads.`),L(`取其中 3 份：${a} × 3 = ${r} 颗。`,`3つ分は ${a} × 3 = ${r} こ。`,`Take 3 parts: ${a} × 3 = ${r} beads.`)],L('先求八分之一，再求三份。','まず1/8を求めよう。','Find one eighth first.'),L('不能用总数除以分子 3。','分子3で全体を割らない。','Do not divide the total by the numerator 3.'),L(`${r} ÷ ${total} = 3/8。`,`${r} ÷ ${total} = 3/8。`,`${r} ÷ ${total} = 3/8.`));
});
family('fraction','discount',L('折扣与现价','割引と代金','Discounts and sale prices'),'multi',n=>{
  const price=(n+6)*20,off=price/4;
  return item(L(`原价 ${price} 元的商品降价 25%。省了多少元？现价多少元？`,`${price}円の品物が25%引き。何円安くなる？代金は何円？`,`An item costing ${price} dollars is discounted by 25%. How many dollars are saved, and what is the sale price?`),[off,price-off],[L('25% = 1/4，表示减去原价的四分之一。','25% = 1/4。もとの値段の1/4を引く。','25% = 1/4: the discount is one quarter of the original price.'),L(`省下 ${price} ÷ 4 = ${off}。`,`${price} ÷ 4 = ${off} 円安くなる。`,`Savings = ${price} ÷ 4 = ${off}.`),L(`现价 = ${price} − ${off} = ${price-off}。`,`代金 = ${price} − ${off} = ${price-off} 円。`,`Sale price = ${price} − ${off} = ${price-off}.`)],L('区分“减去的钱”和“还要付的钱”。','安くなる金額と、払う金額を分けよう。','Separate the amount saved from the amount paid.'),L('降价 25% 不等于支付原价的 25%。','25%引きは25%を払う意味ではない。','A 25% discount does not mean paying 25% of the original price.'),L(`${off} + ${price-off} = ${price}，两部分合成原价。`,`${off} + ${price-off} = ${price}。`,`Savings plus sale price: ${off} + ${price-off} = ${price}.`),L(['省下的金额','现价'],['安くなる金額','代金'],['Amount saved','Sale price']));
});
family('fraction','ratio',L('按比分配','比で分ける','Sharing in a ratio'),'multi',n=>{
  const a=n+3,total=a*5;
  return item(L(`把 ${total} 枚贴纸按 2∶3 分给甲、乙。两人各得几枚？`,`シール${total}枚をAとBに2：3で分けます。それぞれ何枚？`,`${total} stickers are shared by A and B in the ratio 2:3. How many does each receive?`),[a*2,a*3],[L('比例的总份数是 2 + 3 = 5。','全部の割合は2 + 3 = 5。','The ratio contains 2 + 3 = 5 total parts.'),L(`每份 = ${total} ÷ 5 = ${a}。`,`1つ分 = ${total} ÷ 5 = ${a}。`,`One part = ${total} ÷ 5 = ${a}.`),L(`甲得 2 × ${a} = ${a*2}，乙得 3 × ${a} = ${a*3}。`,`Aは2 × ${a} = ${a*2}、Bは3 × ${a} = ${a*3}。`,`A receives 2 × ${a} = ${a*2}; B receives 3 × ${a} = ${a*3}.`)],L('先把比例两项相加，确定总份数。','2と3を合わせ、全体の数を考えよう。','Add the ratio parts to find the whole.'),L('不能分别把总数除以 2 和 3。','全体を2と3で別々に割らない。','Do not divide the entire total separately by 2 and by 3.'),L(`${a*2} + ${a*3} = ${total}，且两人的数量比为 2∶3。`,`${a*2} + ${a*3} = ${total}、比は2：3。`,`${a*2} + ${a*3} = ${total}, and their ratio is 2:3.`),L(['甲的数量','乙的数量'],['Aの枚数','Bの枚数'],['A’s share','B’s share']));
});
family('fraction','remaining',L('剩余部分的分数','残りの割合','Fractions remaining'),'number',n=>{
  const d=n+7,r=fraction(d-3,d);
  return item(L(`一壶果汁先喝掉全壶的 1/${d}，又喝掉原来全壶的 2/${d}。还剩原来果汁的几分之几？`,`ジュースを全体の1/${d}、次に元の全体の2/${d}飲みました。元の何分のいくつが残る？`,`First 1/${d} of a jug of juice is drunk, then another 2/${d} of the original jug. What fraction of the original remains?`),[r],[L('两次分数都以原来的整壶为整体。','どちらも「元の全体」を基準にする。','Both fractions refer to the original full jug.'),L(`喝掉 1/${d} + 2/${d} = 3/${d}。`,`飲んだ量は1/${d} + 2/${d} = 3/${d}。`,`The fraction consumed is 1/${d} + 2/${d} = 3/${d}.`),L(`剩下 ${d}/${d} − 3/${d} = ${r}。`,`残りは${d}/${d} − 3/${d} = ${r}。`,`Remaining: ${d}/${d} − 3/${d} = ${r}.`)],L('把完整的一壶写成分母相同的分数。','全体の1を同じ分母で表そう。','Write one whole with the same denominator.'),L('同分母分数相加时，分母不相加。','分母が同じ分数では、分母を足さない。','Do not add denominators when adding like fractions.'),L(`剩余部分加上 3/${d} 应等于 1。`,`残りに3/${d}を足すと1になる。`,`The remaining fraction plus 3/${d} must equal 1.`));
});
family('fraction','unit-price',L('单位价格','1こあたりの値段','Unit prices'),'choice',n=>{
  const a=n+5;
  return item(L(`4 支同款笔共 ${a*4} 元。按同样单价买 7 支，需要多少元？`,`同じペン4本で${a*4}円。同じ単価で7本買うと何円？`,`Four identical pens cost ${a*4} dollars. At the same unit price, how much do 7 pens cost?`),[a*7],[L('总价除以数量，求出每支的价格。','合計金額を本数で割り、1本の値段を求める。','Divide the total cost by the quantity to find the unit price.'),L(`一支 = ${a*4} ÷ 4 = ${a}。`,`1本 = ${a*4} ÷ 4 = ${a} 円。`,`One pen costs ${a*4} ÷ 4 = ${a}.`),L(`7 支 = ${a} × 7 = ${a*7}。`,`7本 = ${a} × 7 = ${a*7} 円。`,`Seven pens cost ${a} × 7 = ${a*7}.`)],L('先算一支多少钱。','まず1本分を求めよう。','Find the cost of one pen first.'),L('数量增加 3 支，不代表价格增加 3 元。','3本増えても、3円だけ増えるわけではない。','Three more pens do not necessarily cost three more dollars.'),L(`${a*7} ÷ 7 = ${a}，和原单价一致。`,`${a*7} ÷ 7 = ${a}、単価は同じ。`,`${a*7} ÷ 7 = ${a}, matching the original unit price.`));
});
family('fraction','fraction-order',L('分数大小排序','分数を比べる','Ordering fractions'),'order',n=>{
  const d=n+4,labels=[`1/${d+3}`,`1/${d+2}`,`1/${d+1}`,`1/${d}`];
  const q=item(L('把下列分数从小到大排列。','次の分数を小さい順に並べよう。','Arrange these fractions from smallest to largest.'),labels,[L('所有分子的值都是 1，可比较一份的大小。','分子は全部1。1つ分の大きさを比べる。','All numerators are 1, so compare the sizes of single parts.'),L('同样大小的整体，平均分的份数越多，每份越小。','同じ全体を細かく分けるほど、1つ分は小さい。','Dividing the same whole into more equal parts makes each part smaller.'),L(`因此 ${labels.join(' < ')}。`,`だから ${labels.join(' < ')}。`,`Therefore ${labels.join(' < ')}.`)],L('想象把同一块饼分成不同数量的等份。','同じケーキを違う数に分けてみよう。','Imagine cutting the same cake into different numbers of equal pieces.'),L('分母越大，并不表示分数越大。','分母が大きいほど分数が大きいとは限らない。','A larger denominator does not mean a larger fraction.'),L(`1/${d+3} 的一份比 1/${d} 的一份更小。`,`1/${d+3}の1つ分は1/${d}より小さい。`,`A 1/${d+3} portion is smaller than a 1/${d} portion.`));q.orderItems=labels;return q;
});

family('geometry','rectangle',L('长方形的周长与面积','長方形の周りと面積','Perimeter and area'),'multi',n=>{
  const a=n+3,b=n+6,p=2*(a+b),s=a*b;
  return item(L(`长方形长 ${b} cm、宽 ${a} cm。周长是多少 cm？面积是多少 cm²？`,`たて${a}cm、よこ${b}cmの長方形。周りの長さ(cm)と面積(cm²)は？`,`A rectangle is ${b} cm long and ${a} cm wide. Find its perimeter in cm and area in cm².`),[p,s],[L('周长沿着边走一圈，共有两条长边、两条短边。','周りは長い辺2本と短い辺2本の合計。','The boundary contains two long and two short sides.'),L(`周长 = 2 × (${a} + ${b}) = ${p} cm。`,`周り = 2 × (${a} + ${b}) = ${p} cm。`,`Perimeter = 2 × (${a} + ${b}) = ${p} cm.`),L(`面积数的是内部单位正方形：${a} × ${b} = ${s} cm²。`,`面積は中の1cm²の数：${a} × ${b} = ${s} cm²。`,`Area counts unit squares inside: ${a} × ${b} = ${s} cm².`)],L('周长用加法描述边界，面积用行数乘列数。','周りと中の広さを分けて考えよう。','Distinguish distance around the edge from space inside.'),L('周长单位是 cm，面积单位是 cm²。','周りはcm、面積はcm²。','Perimeter uses cm; area uses cm².'),L(`把四边相加 ${a}+${b}+${a}+${b}=${p}。`,`${a}+${b}+${a}+${b}=${p}と確かめる。`,`Check all four sides: ${a}+${b}+${a}+${b}=${p}.`),L(['周长（cm）','面积（cm²）'],['周りの長さ（cm）','面積（cm²）'],['Perimeter (cm)','Area (cm²)']));
});
family('geometry','cutout',L('组合图形面积','切り取った図形','Area after a cut-out'),'number',n=>{
  const a=n+5,b=n+7,c=n%3+2,r=a*b-c*c;
  return item(L(`从 ${a} cm × ${b} cm 的长方形中剪去一个边长 ${c} cm 的正方形。剩余面积是多少 cm²？`,`${a}cm × ${b}cmの長方形から一辺${c}cmの正方形を切り取ります。残りの面積は何cm²？`,`A square of side ${c} cm is cut from a ${a} cm by ${b} cm rectangle. What area remains, in cm²?`),[r],[L(`原长方形面积 = ${a} × ${b} = ${a*b}。`,`もとの面積 = ${a} × ${b} = ${a*b}。`,`Original area = ${a} × ${b} = ${a*b}.`),L(`剪去的正方形面积 = ${c} × ${c} = ${c*c}。`,`切り取る面積 = ${c} × ${c} = ${c*c}。`,`Removed square area = ${c} × ${c} = ${c*c}.`),L(`剩余面积 = ${a*b} − ${c*c} = ${r} cm²。`,`残り = ${a*b} − ${c*c} = ${r} cm²。`,`Remaining area = ${a*b} − ${c*c} = ${r} cm².`)],L('先分别算大图形和剪掉部分的面积。','大きい面積と切り取る面積を別々に求めよう。','Find the two areas separately.'),L('要减去面积，不能只减去正方形边长。','辺の長さではなく、面積を引こう。','Subtract the removed area, not just its side length.'),L(`${r} + ${c*c} = ${a*b}，拼回原长方形。`,`${r} + ${c*c} = ${a*b}、元の長方形に戻る。`,`${r} + ${c*c} = ${a*b}, reconstructing the original rectangle.`));
});
family('geometry','triangle',L('三角形面积','三角形の面積','Triangle area'),'number',n=>{
  const b=2*(n+3),h=n%7+4,r=b*h/2;
  return item(L(`三角形的底为 ${b} cm，对应的垂直高度为 ${h} cm。面积是多少 cm²？`,`底辺${b}cm、その底辺に垂直な高さ${h}cmの三角形。面積は何cm²？`,`A triangle has base ${b} cm and perpendicular height ${h} cm. What is its area in cm²?`),[r],[L('两个相同三角形可以拼成同底同高的平行四边形。','同じ三角形2つで、同じ底辺・高さの平行四辺形ができる。','Two identical triangles make a parallelogram with the same base and height.'),L(`平行四边形面积 = ${b} × ${h} = ${b*h}。`,`平行四辺形の面積 = ${b} × ${h} = ${b*h}。`,`The parallelogram area is ${b} × ${h} = ${b*h}.`),L(`三角形占一半：${b*h} ÷ 2 = ${r} cm²。`,`三角形は半分：${b*h} ÷ 2 = ${r} cm²。`,`The triangle is half: ${b*h} ÷ 2 = ${r} cm².`)],L('考虑两个完全相同的三角形能拼成什么。','同じ三角形をもう1つ置いてみよう。','Imagine a second identical triangle.'),L('不能忘记除以 2；高必须垂直于所选的底。','2で割ること、高さが底辺に垂直なことに注意。','Remember to divide by 2 and use the perpendicular height.'),L(`面积加倍后 ${r} × 2 = ${b*h}，等于底乘高。`,`${r} × 2 = ${b*h}、底辺×高さになる。`,`Double the area: ${r} × 2 = ${b*h}, the base times height.`));
});
family('geometry','angles',L('三角形内角','三角形の角','Angles in a triangle'),'choice',n=>{
  const a=25+n,b=50+n%9,r=180-a-b;
  return item(L(`三角形两个内角分别为 ${a}° 和 ${b}°。第三个内角为多少度？`,`三角形の2つの角は${a}°と${b}°。残りの角は何度？`,`Two angles of a triangle are ${a}° and ${b}°. How many degrees is the third angle?`),[r],[L('三角形三个内角的总和是 180°。','三角形の3つの角の合計は180°。','The interior angles of a triangle sum to 180°.'),L(`已知两角合计 ${a} + ${b} = ${a+b}°。`,`わかっている角は ${a} + ${b} = ${a+b}°。`,`The known angles sum to ${a} + ${b} = ${a+b}°.`),L(`第三角 = 180 − ${a+b} = ${r}°。`,`残り = 180 − ${a+b} = ${r}°。`,`Third angle = 180 − ${a+b} = ${r}°.`)],L('先求已知两角的总和。','わかっている2つの角を合わせよう。','Add the two known angles first.'),L('三角形的内角和不是 360°。','三角形の内角の合計は360°ではない。','A triangle’s interior angle sum is not 360°.'),L(`${a} + ${b} + ${r} = 180。`,`${a} + ${b} + ${r} = 180。`,`${a} + ${b} + ${r} = 180.`));
});
family('geometry','units',L('长度单位换算','長さの単位','Converting length units'),'multi',n=>{
  const m=n+2,c=n%8*10+5,total=m*100+c;
  return item(L(`一条绳子长 ${m} 米 ${c} 厘米。总长多少厘米？若剪去 ${m} 厘米，还剩多少厘米？`,`ひもは${m}m${c}cm。全部で何cm？そこから${m}cm切ると残りは何cm？`,`A rope is ${m} metres ${c} centimetres long. What is its length in centimetres, and how many centimetres remain after cutting off ${m} cm?`),[total,total-m],[L('1 米 = 100 厘米，先统一单位。','1m = 100cm。単位をそろえる。','One metre is 100 centimetres; first use a single unit.'),L(`总长 = ${m} × 100 + ${c} = ${total} cm。`,`全体 = ${m} × 100 + ${c} = ${total} cm。`,`Total = ${m} × 100 + ${c} = ${total} cm.`),L(`剩余 = ${total} − ${m} = ${total-m} cm。`,`残り = ${total} − ${m} = ${total-m} cm。`,`Remaining = ${total} − ${m} = ${total-m} cm.`)],L('先把米换成厘米，再进行减法。','mをcmにしてから引こう。','Convert metres to centimetres before subtracting.'),L('米和厘米不能直接相加。','mとcmをそのまま足さない。','Do not add metres and centimetres without converting.'),L(`剩余加上剪去的 ${m} cm 应得到 ${total} cm。`,`残りに${m}cmを足すと${total}cmになる。`,`Remaining length plus ${m} cm must be ${total} cm.`),L(['总长（cm）','剩余（cm）'],['全部の長さ（cm）','残り（cm）'],['Original length (cm)','Remaining length (cm)']));
});
family('geometry','area-order',L('比较长方形面积','面積を比べる','Ordering rectangle areas'),'order',n=>{
  const a=n+3,labels=[`2 cm × ${a} cm`,`3 cm × ${a} cm`,`2 cm × ${2*a} cm`,`5 cm × ${a} cm`],values=[2*a,3*a,4*a,5*a];
  const q=item(L('按面积从小到大排列这些长方形。','面積が小さい順に長方形を並べよう。','Arrange these rectangles from smallest area to largest.'),labels,[L('每个长方形都用长乘宽求面积。','それぞれ、たて×よこで面積を求める。','Multiply each rectangle’s length by its width.'),L(`面积依次为 ${values.join('、')} cm²。`,`面積は ${values.join('、')} cm²。`,`The respective areas are ${values.join(', ')} cm².`),L(`按 ${values.join(' < ')} 排列。`,`${values.join(' < ')} の順になる。`,`Order the areas: ${values.join(' < ')}.`)],L('不能只比较其中一条边。','1本の辺だけで比べないでね。','Do not compare just one side.'),L('最长的单边不一定对应最大的面积。','一辺が最長でも、面積が最大とは限らない。','The longest individual side need not give the greatest area.'),L('所有比较都使用相同的面积单位 cm²。','すべて同じ面積の単位cm²で比べる。','Every comparison uses the same unit, cm².'));q.orderItems=labels;return q;
});

family('counting','outfits',L('乘法计数','組合せのかけ算','The multiplication principle'),'number',n=>{
  const a=n+2,b=n%4+3,r=a*b;
  return item(L(`有 ${a} 件不同上衣和 ${b} 条不同裤子，各选一件（条）。有多少种搭配？`,`上着${a}種類、ズボン${b}種類から1つずつ選びます。何通り？`,`There are ${a} different shirts and ${b} different pairs of trousers. How many outfits use one of each?`),[r],[L('先固定一件上衣，裤子有多种选择。','上着を1つ決めると、ズボンを選べる。','Fix one shirt first and count the trouser choices.'),L(`每件上衣有 ${b} 种搭配，共 ${a} 组。`,`上着1つにつき${b}通り、全部で${a}組ある。`,`Each shirt has ${b} choices of trousers, with ${a} such groups.`),L(`总数 = ${a} × ${b} = ${r}。`,`合計 = ${a} × ${b} = ${r} 通り。`,`Total = ${a} × ${b} = ${r} outfits.`)],L('画一张“上衣×裤子”的表格。','上着とズボンの表を作ろう。','Make a shirt-by-trousers table.'),L('各选一个用乘法，不是把两种数量相加。','1つずつ選ぶときは、足し算ではなくかけ算。','Choosing one of each calls for multiplication, not addition.'),L(`用表格数 ${a} 行、每行 ${b} 格，应有 ${r} 格。`,`表は${a}行、1行${b}こで${r}こ。`,`A table with ${a} rows and ${b} columns contains ${r} cells.`));
});
family('counting','pairs',L('不重复的配对','重複しないペア','Unordered pairs'),'choice',n=>{
  const a=n+3,r=a*(a-1)/2;
  return item(L(`${a} 位同学，每两人握手一次。共握手多少次？`,`${a}人が、どの2人とも1回ずつ握手します。全部で何回？`,`Each pair among ${a} students shakes hands exactly once. How many handshakes occur?`),[r],[L(`每位同学可与另外 ${a-1} 位握手。`,`1人はほかの${a-1}人と握手する。`,`Each student can shake hands with ${a-1} others.`),L(`${a} × ${a-1} = ${a*(a-1)}，但每次握手从两个人的角度各数了一遍。`,`${a} × ${a-1} = ${a*(a-1)} では、同じ握手を2回数えている。`,`${a} × ${a-1} = ${a*(a-1)} counts each handshake twice, once from each participant.`),L(`因此除以 2：${a*(a-1)} ÷ 2 = ${r}。`,`2で割って ${a*(a-1)} ÷ 2 = ${r} 回。`,`Divide by 2: ${a*(a-1)} ÷ 2 = ${r}.`)],L('甲和乙握手，与乙和甲握手，是同一次。','AとB、BとAの握手は同じ1回。','A with B and B with A are the same handshake.'),L('不能让自己和自己配对，也不能把一对数两次。','自分自身と組まず、同じペアを2回数えない。','Exclude self-pairs and avoid counting each pair twice.'),L(`也可相加 1 + 2 + … + ${a-1} = ${r}。`,`1 + 2 + … + ${a-1} = ${r} とも数えられる。`,`Alternatively, 1 + 2 + … + ${a-1} = ${r}.`));
});
family('counting','probability',L('有利结果与全部结果','確率の分母と分子','Favourable and total outcomes'),'number',n=>{
  const red=n+2,blue=n%5+3,total=red+blue,r=fraction(red,total);
  return item(L(`袋中有 ${red} 个红球、${blue} 个蓝球，每个球被取出的机会相同。取出一个红球的概率是多少？用分数或小数作答。`,`赤${red}こ、青${blue}この玉を同じ確率で1こ取ります。赤が出る確率は？分数か小数で答えよう。`,`A bag has ${red} red and ${blue} blue balls, each equally likely to be drawn. What is the probability of drawing red? Give a fraction or decimal.`),[r],[L(`全部可能结果有 ${red} + ${blue} = ${total} 个。`,`すべての玉は ${red} + ${blue} = ${total} こ。`,`There are ${red} + ${blue} = ${total} equally likely outcomes.`),L(`其中 ${red} 个结果符合“红球”。`,`そのうち赤は${red}こ。`,`${red} of these outcomes are favourable (red).`),L(`概率 = 有利结果 ÷ 全部结果 = ${red}/${total} = ${r}。`,`確率 = 赤の数 ÷ 全部の数 = ${red}/${total} = ${r}。`,`Probability = favourable ÷ total = ${red}/${total} = ${r}.`)],L('分母是所有球的数量，不只是另一种颜色。','分母は、すべての玉の数。','The denominator is the total number of balls.'),L('红球数除以蓝球数是比，不是取红球的概率。','赤÷青は比であり、赤の出る確率ではない。','Red divided by blue is a ratio, not the probability of red.'),L(`红球概率 ${red}/${total} 与蓝球概率 ${blue}/${total} 相加等于 1。`,`赤${red}/${total}と青${blue}/${total}を足すと1。`,`Red probability ${red}/${total} plus blue probability ${blue}/${total} equals 1.`));
});
family('counting','codes',L('允许与不允许重复','くり返しの有無','Codes with and without repetition'),'multi',n=>{
  const a=n+3;
  return item(L(`有 ${a} 个不同符号。组成有顺序的两符号密码：允许重复时有多少种？不允许重复时有多少种？`,`${a}種類の記号で、順序のある2文字の暗号を作ります。くり返しありと、なしではそれぞれ何通り？`,`There are ${a} distinct symbols. How many ordered two-symbol codes are possible with repetition allowed, and with repetition forbidden?`),[a*a,a*(a-1)],[L(`第一位始终有 ${a} 种选择。`,`1文字目はいつも${a}通り。`,`The first position always has ${a} choices.`),L(`允许重复：第二位仍有 ${a} 种，共 ${a} × ${a} = ${a*a}。`,`くり返しあり：2文字目も${a}通り、${a} × ${a} = ${a*a}。`,`With repetition: the second position has ${a} choices, giving ${a} × ${a} = ${a*a}.`),L(`不允许重复：第二位排除已用符号，有 ${a-1} 种，共 ${a*(a-1)}。`,`くり返しなし：2文字目は${a-1}通り、合計${a*(a-1)}。`,`Without repetition: the second position has ${a-1} choices, giving ${a*(a-1)}.`)],L('分别考虑密码的第一位和第二位。','1文字目と2文字目を分けよう。','Consider the first and second positions separately.'),L('密码有顺序，AB 与 BA 不同，所以不用除以 2。','順序があるのでABとBAは別。2で割らない。','Order matters: AB and BA are different. Do not divide by 2.'),L(`两种计数相差 ${a}，正好是每个符号重复两次的密码数。`,`差は${a}。同じ記号2つの暗号の数と一致。`,`The difference is ${a}, one doubled-symbol code per symbol.`),L(['允许重复','不允许重复'],['くり返しあり','くり返しなし'],['Repetition allowed','Repetition forbidden']));
});
family('counting','grid-paths',L('最短路径计数','最短経路を数える','Counting shortest paths'),'multi',n=>{
  const r=n+2,one=r+1,two=(r+2)*(r+1)/2;
  return item(L(`在方格路线上，只能向右或向上。向右 ${r} 步、向上 1 步的最短路线有几条？若向上改成 2 步呢？`,`右か上だけに進みます。右${r}歩・上1歩の最短経路は何通り？上2歩なら何通り？`,`On a grid, move only right or up. How many shortest paths use ${r} right steps and 1 up step? What if there are 2 up steps instead?`),[one,two],[L(`一次向上时，总共 ${r+1} 个位置，选择哪个位置向上即可。`,`上1歩なら全部で${r+1}歩。上に行く位置を選ぶ。`,`With one up step, choose its position among ${r+1} total steps.`),L(`两次向上时，在 ${r+2} 个位置中选两个：先选 ${r+2} 种，再选 ${r+1} 种。`,`上2歩なら${r+2}個の位置から2つ選ぶ。最初${r+2}通り、次${r+1}通り。`,`With two up steps, select two positions among ${r+2}: ${r+2} choices then ${r+1}.`),L(`两次向上没有先后标签，要除以 2：${r+2} × ${r+1} ÷ 2 = ${two}。`,`上の2歩は区別しないので2で割る：${r+2} × ${r+1} ÷ 2 = ${two}。`,`The two up steps are indistinguishable, so divide by 2: ${r+2} × ${r+1} ÷ 2 = ${two}.`)],L('把路线写成一串“右”和“上”。','経路を「右・上」の列で表そう。','Represent each path as a sequence of R and U.'),L('最短路线的总步数固定，不把绕路算进去。','最短経路では、遠回りを数えない。','Shortest paths have a fixed length; exclude detours.'),L(`一次向上的路线可以按位置 1 到 ${one} 逐个列出。`,`上1歩なら位置1〜${one}で全部を列挙できる。`,`List the one-up-step paths by placing U in positions 1 through ${one}.`),L(['向上 1 步','向上 2 步'],['上1歩','上2歩'],['One up step','Two up steps']));
});
family('counting','chance-order',L('比较中奖概率','確率を比べる','Ordering probabilities'),'order',n=>{
  const d=n+6,labels=[`1/${d}`,`2/${d}`,`3/${d}`,`4/${d}`];
  const q=item(L('四个游戏的中奖概率如下，请从最低到最高排列。','4つのゲームで当たる確率を、低い順に並べよう。','These are the winning probabilities of four games. Arrange them from least likely to most likely.'),labels,[L(`各概率分母都为 ${d}，全部结果数相同。`,`分母はすべて${d}で、全体の数は同じ。`,`All denominators are ${d}, so the total outcome count is the same.`),L('比较有利结果数：1、2、3、4。','当たりの数1、2、3、4を比べる。','Compare the favourable outcome counts: 1, 2, 3, 4.'),L(`所以 ${labels.join(' < ')}。`,`だから ${labels.join(' < ')}。`,`Therefore ${labels.join(' < ')}.`)],L('相同分母时，看分子。','分母が同じなら分子に注目。','With equal denominators, compare numerators.'),L('概率越大只是更可能发生，不表示一定中奖。','確率が高くても必ず当たるわけではない。','A higher probability is more likely, not guaranteed.'),L(`所有分子小于 ${d}，所以概率均在 0 与 1 之间。`,`分子はすべて${d}未満なので、確率は0と1の間。`,`Every numerator is less than ${d}, so each probability lies between 0 and 1.`));q.orderItems=labels;return q;
});

family('logic','backwards',L('逆向推理','逆から考える','Working backwards'),'number',n=>{
  const a=n+4,b=n%6+5,total=a*3+b;
  return item(L(`一个数乘以 3，再加 ${b}，得到 ${total}。原来的数是多少？`,`ある数を3倍して${b}を足すと${total}。もとの数は？`,`A number is multiplied by 3, then ${b} is added, giving ${total}. What was the original number?`),[a],[L('从最后的结果开始，用相反运算撤销最后一步。','最後の答えから、逆の計算で戻る。','Start from the final result and undo the last operation first.'),L(`先撤销加法：${total} − ${b} = ${a*3}。`,`足し算を戻す：${total} − ${b} = ${a*3}。`,`Undo addition: ${total} − ${b} = ${a*3}.`),L(`再撤销乘法：${a*3} ÷ 3 = ${a}。`,`かけ算を戻す：${a*3} ÷ 3 = ${a}。`,`Undo multiplication: ${a*3} ÷ 3 = ${a}.`)],L('最后做的是加法，倒推时先撤销它。','最後の足し算から戻そう。','Addition happened last, so undo it first.'),L('逆运算的顺序也要倒过来。','計算の順序も逆にしよう。','Reverse both the operations and their order.'),L(`代回原题：${a} × 3 + ${b} = ${total}。`,`元の式：${a} × 3 + ${b} = ${total}。`,`Substitute back: ${a} × 3 + ${b} = ${total}.`));
});
family('logic','average',L('平均数与总数','平均と合計','Averages and totals'),'multi',n=>{
  const a=n+10,avg=a+4,total=avg*3,third=a+9;
  return item(L(`三次得分的平均数为 ${avg}。前两次得分为 ${a}、${a+3}。三次总分是多少？第三次得分是多少？`,`3回の平均は${avg}点。最初の2回は${a}点、${a+3}点。合計と3回目は何点？`,`The average of three scores is ${avg}. The first two are ${a} and ${a+3}. Find the total and the third score.`),[total,third],[L('平均数乘次数，得到总分。','平均に回数をかけると合計になる。','Multiply the average by the number of scores to get the total.'),L(`总分 = ${avg} × 3 = ${total}。`,`合計 = ${avg} × 3 = ${total}。`,`Total = ${avg} × 3 = ${total}.`),L(`第三次 = ${total} − ${a} − ${a+3} = ${third}。`,`3回目 = ${total} − ${a} − ${a+3} = ${third}。`,`Third score = ${total} − ${a} − ${a+3} = ${third}.`)],L('先把平均分换成三次的总分。','平均から合計を求めよう。','Convert the average into the total first.'),L('第三次得分不一定等于平均数。','3回目が平均と同じとは限らない。','The third score need not equal the average.'),L(`(${a} + ${a+3} + ${third}) ÷ 3 = ${avg}。`,`(${a} + ${a+3} + ${third}) ÷ 3 = ${avg}。`,`(${a} + ${a+3} + ${third}) ÷ 3 = ${avg}.`),L(['总分','第三次得分'],['合計点','3回目'],['Total score','Third score']));
});
family('logic','meeting',L('相向而行','向かい合って進む','Meeting problems'),'number',n=>{
  const t=n+3,a=3+n%3,b=4+n%4,d=(a+b)*t;
  return item(L(`两人相距 ${d} 米，同时相向行走，速度分别为每分钟 ${a} 米和 ${b} 米。几分钟后相遇？`,`2人は${d}m離れ、同時に向かい合って毎分${a}mと${b}mで歩きます。何分後に会う？`,`Two walkers start ${d} metres apart and walk towards each other at ${a} and ${b} metres per minute. After how many minutes do they meet?`),[t],[L('两人都在缩短间距，因此速度相加。','2人とも間の距離を縮めるので、速さを足す。','Both walkers close the gap, so add their speeds.'),L(`每分钟缩短 ${a} + ${b} = ${a+b} 米。`,`1分で ${a} + ${b} = ${a+b} m縮む。`,`The gap closes by ${a} + ${b} = ${a+b} metres per minute.`),L(`时间 = ${d} ÷ ${a+b} = ${t} 分钟。`,`時間 = ${d} ÷ ${a+b} = ${t} 分。`,`Time = ${d} ÷ ${a+b} = ${t} minutes.`)],L('想想一分钟后，两人之间的距离一共少了多少。','1分で間の距離はどれだけ減る？','How much smaller is the gap after one minute?' ),L('相向而行用速度和；不能把一人的速度当成合速度。','向かい合うときは速さの和を使う。','Use the sum of speeds for motion towards each other.'),L(`${a} × ${t} + ${b} × ${t} = ${d} 米，正好覆盖间距。`,`${a} × ${t} + ${b} × ${t} = ${d} m。`,`${a} × ${t} + ${b} × ${t} = ${d} metres, the original gap.`));
});
family('logic','ages',L('年龄差不变','年齢の差','Age differences'),'multi',n=>{
  const a=n+6,gap=5+n%4,t=3;
  return item(L(`姐姐今年 ${a+gap} 岁，妹妹 ${a} 岁。${t} 年后姐姐几岁？那时两人相差几岁？`,`姉は${a+gap}歳、妹は${a}歳。${t}年後の姉の年齢と、そのときの年齢差は？`,`An older sister is ${a+gap} and a younger sister is ${a}. How old will the older sister be in ${t} years, and what will their age difference be then?`),[a+gap+t,gap],[L(`姐姐 ${t} 年后为 ${a+gap} + ${t} = ${a+gap+t} 岁。`,`姉は${a+gap} + ${t} = ${a+gap+t}歳になる。`,`The older sister will be ${a+gap} + ${t} = ${a+gap+t}.`),L(`妹妹也增加 ${t} 岁，变成 ${a+t} 岁。`,`妹も${t}歳増えて${a+t}歳になる。`,`The younger sister also ages by ${t} years, becoming ${a+t}.`),L(`两人年龄差 = ${a+gap+t} − ${a+t} = ${gap}，始终不变。`,`差は${a+gap+t} − ${a+t} = ${gap}で変わらない。`,`The difference is ${a+gap+t} − ${a+t} = ${gap}, unchanged.`)],L('时间过去时，两个人都会长大。','2人とも同じだけ年をとる。','Both people age by the same number of years.'),L('不要只给其中一个人增加年龄。','片方だけ年齢を増やさない。','Do not age only one of the people.'),L(`现在的差 ${a+gap} − ${a} 也等于 ${gap}。`,`今の差${a+gap} − ${a}も${gap}。`,`The current difference ${a+gap} − ${a} also equals ${gap}.`),L(['姐姐未来年龄','未来年龄差'],['姉の将来の年齢','将来の年齢差'],['Older sister’s future age','Future age difference']));
});
family('logic','heads-legs',L('鸡兔同笼','足の数から考える','Heads and legs'),'choice',n=>{
  const rabbits=n+2,chickens=n%6+4,heads=rabbits+chickens,legs=4*rabbits+2*chickens;
  return item(L(`鸡和兔共有 ${heads} 只，共 ${legs} 条腿。鸡有 2 条腿，兔有 4 条腿。兔有几只？`,`にわとりとウサギが${heads}匹、足は${legs}本。にわとりは2本、ウサギは4本です。ウサギは何匹？`,`There are ${heads} chickens and rabbits in total, with ${legs} legs. Chickens have 2 legs and rabbits 4. How many rabbits are there?`),[rabbits],[L(`先假设全是鸡，应有 ${heads} × 2 = ${heads*2} 条腿。`,`全部にわとりなら、${heads} × 2 = ${heads*2}本の足。`,`If all were chickens, there would be ${heads} × 2 = ${heads*2} legs.`),L(`实际多出 ${legs} − ${heads*2} = ${rabbits*2} 条腿。`,`実際は${legs} − ${heads*2} = ${rabbits*2}本多い。`,`There are ${legs} − ${heads*2} = ${rabbits*2} extra legs.`),L(`每把一只鸡换成兔就多 2 条腿，兔数 = ${rabbits*2} ÷ 2 = ${rabbits}。`,`1匹をウサギにすると2本増えるので、${rabbits*2} ÷ 2 = ${rabbits}匹。`,`Replacing a chicken by a rabbit adds 2 legs, so rabbits = ${rabbits*2} ÷ 2 = ${rabbits}.`)],L('先把所有动物都当成只有两条腿。','まず全部を2本足と考えよう。','Start by treating every animal as two-legged.'),L('多出来的腿数要除以 2，不是除以 4。','増える足は2本なので、4で割らない。','Divide the extra legs by 2, not by 4.'),L(`${rabbits} × 4 + ${chickens} × 2 = ${legs}，总只数也是 ${heads}。`,`${rabbits} × 4 + ${chickens} × 2 = ${legs}、匹数も${heads}。`,`${rabbits} × 4 + ${chickens} × 2 = ${legs}, with ${heads} animals.`));
});
family('logic','time-order',L('比较用时','時間を比べる','Ordering durations'),'order',n=>{
  const a=n+3,labels=[`${a} min`,`${a*60+20} s`,`${a+1} min`,`${(a+1)*60+40} s`],values=[a*60,a*60+20,(a+1)*60,(a+1)*60+40];
  const q=item(L('把四次挑战的用时从短到长排列。min 表示分钟，s 表示秒。','4つの時間を短い順に並べよう。minは分、sは秒。','Arrange these challenge durations from shortest to longest. “min” means minutes and “s” means seconds.'),labels,[L('比较前先统一单位：1 分钟 = 60 秒。','先に単位をそろえる。1分 = 60秒。','Use the same unit: 1 minute = 60 seconds.'),L(`换成秒分别是 ${values.join('、')}。`,`秒にすると ${values.join('、')}。`,`In seconds, the durations are ${values.join(', ')}.`),L(`按 ${values.join(' < ')} 排好，再保留原来的写法。`,`${values.join(' < ')}の順にし、元の表記で並べる。`,`Order ${values.join(' < ')} and keep the original labels.`)],L('先把带 min 的时间换成秒。','minの時間を秒に変えよう。','Convert each duration in minutes to seconds.'),L('分钟不是十进制的 100 秒。','1分は100秒ではない。','A minute is not 100 seconds.'),L(`相邻时间的差分别为 20、40、40 秒，均大于 0。`,`となりの差は20、40、40秒で、全部正の数。`,`Adjacent differences are 20, 40 and 40 seconds, all positive.`));q.orderItems=labels;return q;
});

export const FAMILIES=F.map(({topic,id,title,kind})=>({topic,id,title,kind}));
export const VARIANTS_PER_FAMILY=20;
function localize(f,n,locale){
  if(!['zh','ja','en'].includes(locale))throw new Error('Unknown language');
  const raw=f.build(n),pick=value=>value?.[locale];
  const correct=raw.answers.length===1?raw.answers[0]:raw.answers;
  const q={id:`amc-v2-${f.id}-${n}`,family:f.id,topic:f.topic,kind:f.kind,title:pick(f.title),prompt:pick(raw.prompt),correct,
    steps:raw.steps.map(pick),hint:pick(raw.hint),mistake:pick(raw.mistake),check:pick(raw.check),origin:'original',variant:n};
  if(f.kind==='choice'){
    const r=Number(correct),offsets=[[-3,-1,1,4],[-2,1,3,5],[-4,-2,-1,2]][n%3];
    q.options=[String(r),...offsets.map(offset=>String(r+offset))];
  }
  if(f.kind==='multi')q.fields=pick(raw.labels).map((label,i)=>({label,answer:raw.answers[i]}));
  if(f.kind==='order')q.orderItems=raw.orderItems;
  return q;
}
export function amcBank(topic,locale='ja'){
  const families=F.filter(f=>f.topic===topic);if(!families.length)throw new Error('Unknown topic');
  return families.flatMap(f=>Array.from({length:VARIANTS_PER_FAMILY},(_,i)=>localize(f,i+1,locale)));
}
export function topicExamples(topic,locale='ja'){return F.filter(f=>f.topic===topic).map(f=>localize(f,0,locale));}
