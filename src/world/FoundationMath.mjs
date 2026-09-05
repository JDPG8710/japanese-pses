import {L} from './FoundationCatalog.mjs';
const text=(v,locale)=>v[locale];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fraction=(a,b)=>{const g=gcd(a,b);return b/g===1?String(a/g):`${a/g}/${b/g}`;};
export function mathPool(topic,locale,profile){
 const out=[];
 const add=(prompt,answer,hint,explanation,visual)=>out.push({id:`${topic}-${out.length}`,kind:'number',prompt:text(prompt,locale),correct:String(answer),hint:text(hint,locale),explanation:text(explanation,locale),...(visual?{visual}:{} )});
 const calc=L('Work one step at a time.','可以分步计算。','ひとつずつ けいさんしよう。');
 const result=(s)=>L(`Calculation: ${s}`,`计算过程：${s}`,`けいさん：${s}`);
 for(let i=0;i<60;i++){
  const a=1+i%9,b=1+Math.floor(i/9)%7;
  if(topic==='count'){
   const n=i%11;
   if(i<11)add(L('How many dots?','有几个圆点？','まるは いくつ？'),n,L('Touch each dot once.','每个圆点只数一次。','ひとつずつ かぞえよう。'),result(String(n)),{type:'dots',count:n});
   else if(i<31){const x=i-10;add(L(`What number comes after ${x}?`,`紧接着${x}的数是多少？`,`${x}の つぎの かずは？`),x+1,L('Count one more.','再数一个。','ひとつ ふやそう。'),result(`${x} + 1 = ${x+1}`));}
  }
  if(topic==='add20'){const x=i%11,y=Math.floor(i/11)+1;if(i%2)add(L(`${x+y} − ${y} = ?`,`${x+y} − ${y} = ?`,`${x+y} − ${y} = ?`),x,calc,result(`${x+y} − ${y} = ${x}`));else add(L(`${x} + ${y} = ?`,`${x} + ${y} = ?`,`${x} + ${y} = ?`),x+y,calc,result(`${x} + ${y} = ${x+y}`));}
  if(topic==='add100'){const x=10+i,y=1+i%21;const sub=i%2;add(L(`${x} ${sub?'−':'+'} ${y} = ?`,`${x} ${sub?'−':'+'} ${y} = ?`,`${x} ${sub?'−':'+'} ${y} = ?`),sub?x-y:x+y,L('Split tens and ones.','把十位和个位分开想。','10のまとまりと 1に わけよう。'),result(`${x} ${sub?'−':'+'} ${y} = ${sub?x-y:x+y}`));}
  if(topic==='place'){const n=12+i;add(L(`How many tens are in ${n}?`,`数${n}的十位上是几？`,`${n}の 10のくらいは？`),Math.floor(n/10),L('A ten is a group of ten ones.','10个一组成一个十。','1が10こで 10だよ。'),result(`${n} = ${Math.floor(n/10)} × 10 + ${n%10}`));}
  if(topic==='money'){
   const currency=profile.startsWith('CN')?'CNY':profile==='US'?'USD':profile==='AU'?'AUD':profile==='NZ'?'NZD':['ENG','SCT','WLS','NIR'].includes(profile)?'GBP':null;
   const unit=currency||text(L('play tokens','游戏代币','ゲームの コイン'),locale),cost=i%20+1,paid=cost+Math.floor(i/20)+1;
   add(L(`A notebook costs ${cost} ${unit}. You pay ${paid} ${unit}. How much change, in ${unit}?`,`一本练习本价格${cost} ${unit}，付出${paid} ${unit}，应找回多少${unit}？`,`ノートは${cost} ${unit}。${paid} ${unit}を はらうと、おつりは いくつ？`),paid-cost,L('Subtract the price from the amount paid.','用付出的钱减去价格。','はらった かずから ねだんを ひこう。'),result(`${paid} − ${cost} = ${paid-cost} ${unit}`));
  }
  if(topic==='time'){
   const hour=8+Math.floor(i/12),minute=(i%12)*5;
   add(L(`An activity begins at ${hour}:00 and ends at ${hour}:${String(minute).padStart(2,'0')} (24-hour clock). How many minutes pass?`,`活动从${hour}:00开始，到${hour}:${String(minute).padStart(2,'0')}结束（24小时制）。经过了多少分钟？`,`${hour}:00から${hour}:${String(minute).padStart(2,'0')}まで（24じかんひょうじ）。なんぷん？`),minute,L('Both times are within the same hour. Compare the minutes.','两个时刻在同一小时内，比较分钟数。','おなじ じかんの なかで ふんを くらべよう。'),result(`${minute} − 0 = ${minute}`));
  }
  if(topic==='multiply')add(L(`${a} boxes hold ${b} counters each. How many counters?`,`${a}盒圆片，每盒${b}个，一共有多少个？`,`${a}はこに ${b}こずつ。ぜんぶで いくつ？`),a*b,L('Add equal groups, or multiply.','可以连加，也可以用乘法。','おなじ かずを たそう。'),result(`${a} × ${b} = ${a*b}`));
  if(topic==='divide')add(L(`Share ${a*b} counters equally among ${a} trays. How many in each?`,`${a*b}个圆片平均放进${a}个盘子，每盘几个？`,`${a*b}こを ${a}さらに おなじ かずずつ。1さらに いくつ？`),b,L('Use multiplication to check each equal share.','用乘法检查是否平均分。','かけざんで たしかめよう。'),result(`${a*b} ÷ ${a} = ${b}`));
  if(topic==='fractions'){const d=2+i%11,n=1+Math.floor(i/11)%(d-1);add(L(`${n} of ${d} equal parts are shaded. Write the fraction.`,`把整体平均分成${d}份，涂色${n}份。涂色部分占几分之几？`,`おなじ おおきさの ${d}こに わけ、${n}こ ぬりました。ぶんすうで？`),fraction(n,d),L('Equal parts go below the fraction bar; shaded parts go above.','总份数作分母，涂色份数作分子。','ぜんぶの かずが ぶんぼ、ぬった かずが ぶんし。'),result(`${n}/${d} = ${fraction(n,d)}`),{type:'fraction',parts:d,shaded:n});}
  if(topic==='measure'){const x=3+a,y=b;add(L(`A rectangle is ${x} cm long and ${y} cm wide. What is its perimeter in cm?`,`长方形长${x}厘米、宽${y}厘米，周长是多少厘米？`,`たて${x}cm、よこ${y}cmの しかく。まわりの ながさは なんcm？`),2*(x+y),L('Include all four sides.','四条边都要计算。','4つの へんを たそう。'),result(`2 × (${x} + ${y}) = ${2*(x+y)} cm`));}
  if(topic==='area')add(L(`A rectangle is ${a+2} m by ${b+1} m. Find its area in m².`,`长方形长${a+2}米、宽${b+1}米，面积是多少平方米？`,`${a+2}mと${b+1}mの 長方形。面積は なんm²？`),(a+2)*(b+1),L('Count rows of unit squares.','按行数一平方米的小方格。','1m²の ますを かぞえよう。'),result(`${a+2} × ${b+1} = ${(a+2)*(b+1)} m²`));
  if(topic==='decimal'){const x=10+i,y=1+i%9;add(L(`${(x/10).toFixed(1)} + ${(y/10).toFixed(1)} = ?`,`${(x/10).toFixed(1)} + ${(y/10).toFixed(1)} = ?`,`${(x/10).toFixed(1)} + ${(y/10).toFixed(1)} = ?`),((x+y)/10).toFixed(1),L('Line up the decimal points.','把小数点对齐。','小数点を そろえよう。'),result(`${x}/10 + ${y}/10 = ${(x+y)/10}`));}
  if(topic==='fractionSum'){const d=3+i%13,n=1+Math.floor(i/13);add(L(`${n}/${d} + 1/${d} = ?`,`${n}/${d} + 1/${d} = ?`,`${n}/${d} + 1/${d} = ?`),fraction(n+1,d),L('The pieces have the same size; add their counts.','每份大小相同，把份数相加。','ぶんぼが おなじなら ぶんしを たそう。'),result(`${n}/${d} + 1/${d} = ${fraction(n+1,d)}`));}
  if(topic==='volume')add(L(`A box is ${a} cm × ${b} cm × 3 cm. Find its volume in cm³.`,`长方体长${a}厘米、宽${b}厘米、高3厘米，体积是多少立方厘米？`,`長方体の たて${a}cm、よこ${b}cm、高さ3cm。体積は なんcm³？`),a*b*3,L('Find one layer, then multiply by the number of layers.','先算一层，再乘层数。','1だんの かずに だんすうを かけよう。'),result(`${a} × ${b} × 3 = ${a*b*3} cm³`));
  if(topic==='percent'){const n=(i+1)*20,p=[10,25,50,75][i%4];add(L(`What is ${p}% of ${n}?`,`${n}的${p}%是多少？`,`${n}の${p}%は？`),n*p/100,L('Percent means out of 100.','百分数表示每100份中的份数。','100ぶんの いくつかを かんがえよう。'),result(`${n} × ${p}/100 = ${n*p/100}`));}
  if(topic==='ratio')add(L(`Blue:red counters = 2:3. There are ${2*(i+1)} blue counters. How many red?`,`蓝色与红色圆片数量比是2∶3。蓝色有${2*(i+1)}个，红色有几个？`,`青と赤の かずの比は2:3。青が${2*(i+1)}こなら 赤は？`),3*(i+1),L('Find one ratio part first.','先求出一份是多少。','ひとつぶんを もとめよう。'),result(`${2*(i+1)} ÷ 2 × 3 = ${3*(i+1)}`));
  if(topic==='integers')add(L(`The temperature is ${i-30} °C. It rises by ${b} °C. What is the new temperature in °C?`,`气温是${i-30}℃，上升${b}℃后是多少℃？`,`気温${i-30}℃から ${b}℃上がりました。いまは なん℃？`),i-30+b,L('Move right along a number line.','在数轴上向右移动。','すうちょくせんを みぎへ。'),result(`${i-30} + ${b} = ${i-30+b}`));
  if(topic==='equations')add(L(`Solve: ${a+1}x + ${b} = ${(a+1)*(i+1)+b}`,`求x：${a+1}x + ${b} = ${(a+1)*(i+1)+b}`,`xを もとめよう：${a+1}x + ${b} = ${(a+1)*(i+1)+b}`),i+1,L('Undo addition, then undo multiplication.','先减去常数，再除以系数。','ひいてから わろう。'),result(`x = (${(a+1)*(i+1)+b} − ${b}) ÷ ${a+1} = ${i+1}`));
 }
 return [...new Map(out.map(q=>[q.prompt+JSON.stringify(q.visual||''),q])).values()];
}
export function numericEqual(input,expected){
 const parse=s=>{if(typeof s!=='string'||s.length>40)return NaN;const m=s.trim().match(/^([+-]?\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?$/);if(!m)return NaN;return Number(m[1])/(m[2]===undefined?1:Number(m[2]));};
 const a=parse(input),b=parse(expected);return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9;
}
