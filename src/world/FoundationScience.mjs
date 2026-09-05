import {L} from './FoundationCatalog.mjs';
export function sciencePool(stage,locale){
 const out=[],v=x=>x[locale];
 const add=(prompt,correct,choices,hint,explanation,visual)=>out.push({id:`science-${stage}-${out.length}`,kind:'choice',prompt:v(prompt),correct:v(correct),choices:choices.map(v),hint:v(hint),explanation:v(explanation),...(visual?{visual}:{})});
 const observe=L('Use the observation, not a guess.','根据观察或已知条件判断，不要猜。','かんさつや じょうけんを たしかめよう。');
 if(stage===0){
  const senses=[L('Eyes','眼睛','め'),L('Ears','耳朵','みみ'),L('Nose','鼻子','はな')];
  const rows=[['the colour of a leaf','叶子的颜色','はっぱの いろ',0],['a bell ringing','铃铛的声音','すずの おと',1],['the scent of a flower','花的香味','はなの におい',2],['the shape of a cloud','云的形状','くもの かたち',0],['a bird singing','鸟的叫声','とりの こえ',1],['the smell of bread','面包的气味','パンの におい',2],['the pattern on a shell','贝壳的花纹','かいの もよう',0],['rain tapping the window','雨打窗户的声音','あまおとの ひびき',1],['the smell of an orange','橙子的气味','オレンジの におい',2],['the number of petals','花瓣的数量','はなびらの かず',0],['a drum beat','鼓声','たいこの おと',1],['the scent of mint','薄荷的气味','ミントの におい',2]];
  for(const [en,zh,ja,index] of rows)add(L(`Which sense organ helps you notice ${en}?`,`主要用哪个器官感知${zh}？`,`${ja}を しらべるのは？`),senses[index],senses,observe,L('Eyes detect light, ears detect sound, and the nose detects smells.','眼睛感知光，耳朵感知声音，鼻子感知气味。','めは ひかり、みみは おと、はなは においを かんじるよ。'));
 }
 if(stage===1){
  const parts=[L('Roots','根','ね'),L('Leaves','叶','は'),L('Flowers','花','はな')];
  const rows=[['take in water from soil','从土壤中吸收水分','つちから みずを すう',0],['anchor a plant in the soil','把植物固定在土壤中','つちに しょくぶつを ささえる',0],['take in minerals from soil','从土壤中吸收无机盐','つちから えいようを とる',0],['usually spread through the soil','通常在土壤中伸展','つちの なかに ひろがる',0],['capture light to help make food','接收光，帮助制造养料','ひかりで ようぶんを つくる',1],['usually have broad green surfaces that collect light','通常有绿色的宽表面接收光','みどりの ひろい めんで ひかりを うける',1],['have tiny pores used for gas exchange','有用于交换气体的小孔','きたいを こうかんする あなが ある',1],['lose water vapour through small pores','通过小孔散失水蒸气','あなから すいじょうきを だす',1],['often contain petals','常有花瓣','はなびらを もつ',2],['produce pollen in many plants','在许多植物中产生花粉','かふんを つくる',2],['can develop into fruit after fertilisation','受精后其中的子房可以发育成果实','じゅふんなどの あと みになる',2],['may attract pollinators with colour and scent','可能用颜色和气味吸引传粉者','いろや においで むしを よぶ',2]];
  for(const [en,zh,ja,index] of rows)add(L(`In a typical flowering plant, which parts ${en}?`,`常见开花植物的哪个部分${zh}？`,`はなが さく しょくぶつで、${ja}のは？`),parts[index],parts,observe,L(`${v(parts[index])}: this function helps the plant live or reproduce.`,`${v(parts[index])}具有题目描述的结构或功能，帮助植物生活或繁殖。`,`${v(parts[index])}の はたらきだよ。しょくぶつが いきることや ふえることを たすけるよ。`));
 }
 if(stage===2){
  const states=[L('Solid','固态','こたい'),L('Liquid','液态','えきたい'),L('Gas','气态','きたい')];
  const rows=[['an ice cube below 0 °C','低于0℃的冰块','0℃より ひくい こおり',0],['a wooden block','木块','きの ブロック',0],['a metal spoon at room temperature','室温下的金属勺','へやに ある きんぞくの スプーン',0],['a stone','石头','いし',0],['water at 20 °C','20℃的水','20℃の みず',1],['cooking oil at room temperature','室温下的食用油','へやに ある あぶら',1],['milk at room temperature','室温下的牛奶','へやに ある ぎゅうにゅう',1],['juice in a glass','杯中的果汁','コップの ジュース',1],['oxygen in the air','空气中的氧气','くうきの さんそ',2],['nitrogen in the air','空气中的氮气','くうきの ちっそ',2],['water vapour in the air (invisible)','空气中看不见的水蒸气','くうきの なかの みえない すいじょうき',2],['helium inside a balloon','气球里的氦气','ふうせんの ヘリウム',2]];
  for(const [en,zh,ja,index] of rows)add(L(`What state of matter is ${en}?`,`${zh}属于哪种物质状态？`,`${ja}の じょうたいは？`),states[index],states,L('Think about shape and whether it fills its container.','想想它的形状，以及会不会充满容器。','かたちや ひろがりを かんがえよう。'),L('Solids keep their shape. Liquids flow and have a fixed volume. Gases spread to fill a container.','固体有一定形状；液体能流动且有一定体积；气体会充满容器。白色雾气是小水滴，不是水蒸气。','こたいは かたちを たもち、えきたいは ながれ、きたいは ひろがるよ。'));
 }
 if(stage===3){
  const choices=[L('Attracted','会被吸引','ひきつける'),L('Not attracted','不会被吸引','ひきつけない'),L('Not enough information','信息不足','まだ わからない')];
  const rows=[['an iron nail','铁钉','てつの くぎ',0],['an iron washer','铁垫圈','てつの ワッシャー',0],['an iron rod','铁棒','てつの ぼう',0],['an iron screw','铁螺丝','てつの ねじ',0],['a wooden ruler','木尺','きの ものさし',1],['a plastic button','塑料纽扣','プラスチックの ボタン',1],['a glass bead','玻璃珠','ガラスの たま',1],['a rubber eraser','橡皮','けしゴム',1],['a copper wire','铜线','どうの せん',1],['an aluminium sheet','铝片','アルミの いた',1],['a metal object of unknown composition','材料不明的金属物体','しゅるいの わからない きんぞく',2],['a painted object whose material is unknown','被油漆覆盖且材料不明的物体','ざいりょうの わからない ぬった もの',2]];
  for(const [en,zh,ja,index] of rows)add(L(`Predict how an ordinary bar magnet behaves near ${en}.`,`普通条形磁铁靠近${zh}，最合理的预测是什么？`,`ふつうの じしゃくを ${ja}に ちかづけると？`),choices[index],choices,L('Check the material. Not all metals are attracted.','先看材料，不是所有金属都会被磁铁吸引。','ざいりょうを みよう。きんぞくでも つかない ものが あるよ。'),L('Iron is attracted. Wood, plastic, glass, rubber, copper and aluminium are not noticeably attracted by an ordinary magnet. Unknown materials need testing.','铁会被吸引；木、塑料、玻璃、橡胶、铜和铝不会被普通磁铁明显吸引。材料不明时需要测试。','てつは つくよ。き、プラスチック、ガラス、ゴム、どう、アルミは ふつうの じしゃくに つかないよ。'));
 }
 if(stage===4){
  const choices=[L('The bulb lights','灯泡亮','でんきが つく'),L('The bulb stays dark','灯泡不亮','でんきが つかない')];
   const yes=L('closed','闭合','とじる'),no=L('open','断开','ひらく');
  for(const series of [true,false])for(let mask=0;mask<8;mask++){
   const switches=[0,1,2].map(i=>!!(mask&(1<<i))),lit=series?switches.every(Boolean):switches.some(Boolean);
   add(L(`A working battery and bulb are in series with a switch group. Within this group, three switches form ${series?'one series path':'three parallel paths'}. Switches A/B/C: ${switches.map(x=>v(x?yes:no)).join(' / ')}. What happens?`,`电池、灯泡与开关组串联，元件均正常。开关组内三个开关${series?'串联在同一条支路上':'分别位于三条并联支路上'}，控制灯泡。A/B/C开关状态：${switches.map(x=>v(x?yes:no)).join(' / ')}。灯泡会怎样？`,`でんち、でんきゅう、スイッチの グループは ちょくれつ。グループの なかの 3つの スイッチは ${series?'ひとつの みちに ちょくれつ':'3つの へいれつの みち'}。A/B/C：${switches.map(x=>v(x?yes:no)).join(' / ')}。どうなる？`),choices[lit?0:1],choices,L('Trace a complete path through the battery and bulb.','检查经过电池与灯泡的通路是否完整。','でんちから でんきゅうを とおる みちを たどろう。'),L(series?'All series switches must be closed.':'At least one parallel switch path must be closed.',series?'串联的三个开关都闭合，电路才形成通路。':'并联开关至少有一条支路闭合，灯泡就有完整通路。',series?'ちょくれつは ぜんぶ とじると つくよ。':'へいれつは ひとつでも みちが つながれば つくよ。'));
  }
 }
 if(stage===5){
  const rows=[
   [L('What mainly causes day and night?','昼夜交替主要由什么引起？','ひると よるが かわる おもな りゆうは？'),['Earth rotates','地球自转','ちきゅうの じてん'],['The Moon shines','月亮发光','つきが ひかる'],['Clouds move','云移动','くもが うごく']],
   [L('What produces the light we see from the Moon?','我们看到的月光主要来自哪里？','つきの あかりは どこから？'),['Reflected sunlight','反射的太阳光','たいようの ひかりの はんしゃ'],['Moon fire','月球上的火','つきの ほのお'],['City lamps','城市灯光','まちの あかり']],
   [L('Which object is a star?','哪个天体是恒星？','こうせいは どれ？'),['The Sun','太阳','たいよう'],['Earth','地球','ちきゅう'],['The Moon','月球','つき']],
   [L('What keeps planets in orbit around the Sun?','什么作用使行星绕太阳运动？','わくせいを たいようの まわりに とどめる ちからは？'),['Gravity','引力','じゅうりょく'],['Sound','声音','おと'],['Wind','风','かぜ']],
   [L('What is evaporation?','什么是蒸发？','じょうはつは どれ？'),['Liquid water becomes water vapour','液态水变成水蒸气','みずが すいじょうきに なる'],['Water freezes','水结冰','みずが こおる'],['Rock breaks','岩石破碎','いしが われる']],
   [L('What is condensation?','什么是凝结？','ぎょうけつは どれ？'),['Water vapour becomes liquid water','水蒸气变成液态水','すいじょうきが みずに なる'],['Ice melts','冰融化','こおりが とける'],['Soil dries','土壤变干','つちが かわく']],
   [L('What is weathering?','什么是风化作用？','ふうかとは？'),['Rock breaks down in place','岩石在原地破碎或分解','いしが そのばで くだけたり へんかする'],['Earth stops rotating','地球停止自转','ちきゅうが とまる'],['The Moon grows','月球长大','つきが そだつ']],
   [L('Which is a renewable energy source?','哪一种是可再生能源？','さいせいかのうな エネルギーは？'),['Sunlight','太阳能','たいようこう'],['Coal','煤','せきたん'],['Oil','石油','せきゆ']],
   [L('Why do we see different Moon phases?','为什么会看到不同的月相？','つきの かたちが ちがって みえるのは？'),['We see different amounts of its sunlit half','我们看到被太阳照亮部分的比例不同','ひかる はんぶんの みえかたが かわる'],['The Moon changes its actual shape','月球本身形状不断改变','つき じたいの かたちが かわる'],['Clouds always cut the Moon','总是云把月亮切开','いつも くもが つきを きる']],
   [L('What mainly causes seasons?','四季变化主要与什么有关？','きせつの おもな りゆうは？'),['Earth’s tilted axis as it orbits the Sun','地轴倾斜且地球绕太阳公转','じくが かたむいた ちきゅうの こうてん'],['Daily cloud changes','每天云量变化','まいにちの くも'],['The Moon blocks sunlight all winter','月球整个冬季遮住阳光','ふゆは ずっと つきが ひかりを さえぎる']],
   [L('Which tool measures temperature?','哪种工具测量温度？','おんどを はかる どうぐは？'),['Thermometer','温度计','おんどけい'],['Ruler','直尺','ものさし'],['Compass','指南针','ほういじしん']],
   [L('Where does water falling as rain go?','雨水落到地面后可能去哪里？','あめの みずは どこへ？'),['Into soil, rivers or other stores','渗入土壤、流入河流等','つちや かわなど'],['It all disappears forever','全部永久消失','ぜんぶ えいえんに きえる'],['It all turns into rock','全部变成岩石','ぜんぶ いしに なる']]
  ];
  for(const [prompt,a,b,c] of rows){const choices=[L(...a),L(...b),L(...c)];add(prompt,choices[0],choices,observe,L(`Explanation: ${a[0]}.`,`解释：${a[1]}。`,`せつめい：${a[2]}。`));}
 }
 if(stage>=6){
  const contexts=[
   [L('Plant growth','植物生长','しょくぶつの せいちょう'),L('Light exposure','光照时间','ひかりの じかん'),L('Water amount','水量','みずの りょう'),L('Growth in height','高度的增加量','たかさの ふえかた')],
   [L('Paper towel absorption','纸巾吸水','かみの きゅうすい'),L('Paper type','纸巾种类','かみの しゅるい'),L('Paper area','纸巾面积','かみの めんせき'),L('Water absorbed','吸收的水量','すった みずの りょう')],
   [L('A toy car on a ramp','斜坡上的玩具车','さかの おもちゃの くるま'),L('Ramp surface','坡面材料','さかの ざいりょう'),L('Starting height','起始高度','はじめの たかさ'),L('Distance travelled','行驶距离','すすんだ きょり')],
   [L('Sugar dissolving','糖的溶解','さとうの とけかた'),L('Water temperature','水温','みずの おんど'),L('Sugar mass','糖的质量','さとうの おもさ'),L('Time to dissolve','溶解所用时间','とける じかん')],
   [L('Keeping water warm','水的保温','みずの ほおん'),L('Wrapping material','包裹材料','つつむ ざいりょう'),L('Starting temperature','初始温度','はじめの おんど'),L('Final temperature after ten minutes','十分钟后的温度','10ぷんごの おんど')],
   [L('A paper bridge','纸桥承重','かみの はし'),L('Fold pattern','折叠方式','おりかた'),L('Paper size','纸张大小','かみの おおきさ'),L('Maximum load held','能承受的最大载荷','ささえられる おもさ')]
  ];
  for(const [name,changed,controlled,measured] of contexts){
   const setup=L(`Trial: ${name.en}. Change ${changed.en.toLowerCase()}; keep ${controlled.en.toLowerCase()} the same; record ${measured.en.toLowerCase()}.`,`实验：${name.zh}。改变${changed.zh}，保持${controlled.zh}相同，记录${measured.zh}。`,`じっけん：${name.ja}。${changed.ja}を かえ、${controlled.ja}は おなじにし、${measured.ja}を きろく。`);
   const questions=stage===6?[
    [L('Which is the independent variable?','哪个是主动改变的变量？','じぶんで かえる じょうけんは？'),changed,[changed,controlled,measured]],
    [L('Which is a controlled variable?','哪个是需要控制不变的条件？','おなじにする じょうけんは？'),controlled,[changed,controlled,measured]]
   ]:[
    [L('What should a repeated trial measure?','重复实验时应测量什么？','くりかえすとき なにを はかる？'),measured,[changed,controlled,measured]],
    [L('If the controlled variable also changes, how should the result be judged?','如果控制变量也变了，应怎样评价结果？','おなじにする じょうけんも かわったら？'),L('The cause is less certain','更难确定变化的原因','げんいんが わかりにくい'),[L('The cause is less certain','更难确定变化的原因','げんいんが わかりにくい'),L('The result proves every case','结果证明了所有情况','すべての ばあいを しょうめい'),L('Measurements are unnecessary','不需要测量','はからなくて よい')]]
   ];
   for(const [ask,correct,choices] of questions)add(L(...['en','zh','ja'].map(l=>`${setup[l]}\n${ask[l]}`)),correct,choices,L('Separate the changed, controlled and measured variables.','分清改变、控制和测量的变量。','かえること、おなじこと、はかることを わけよう。'),L(`Change: ${changed.en}. Control: ${controlled.en}. Measure: ${measured.en}. Changing more than one factor can make the cause unclear.`,`改变：${changed.zh}；控制：${controlled.zh}；测量：${measured.zh}。同时改变多个条件会使原因难以确定。`,`${changed.ja}を かえ、${controlled.ja}を おなじにし、${measured.ja}を はかるよ。いくつも かえると げんいんが わかりにくいよ。`));
  }
  return out;
 }
 return out;
}
