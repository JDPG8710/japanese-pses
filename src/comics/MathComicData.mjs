const L=(zh,ja,en)=>({zh,ja,en});
const panel=(title,text,diagram)=>({title,text,diagram});
export const COMIC_LABELS={open:L('漫画讲解','まんがで まなぶ','Learn with comics'),close:L('返回学习','がくしゅうに もどる','Back to learning'),next:L('下一格','つぎへ','Next panel'),prev:L('上一格','まえへ','Previous panel'),check:L('试一试','やってみよう','Try it'),yes:L('对了！请看图里的关系。','できたね！ ずの つながりを みよう。','Yes! Look at the relationship in the diagram.'),no:L('再看一看图和单位，可以重新选择。','ずと たんいを みて、もういちど。','Look at the diagram and units, then try again.')};
export const COMICS={
 fractions:{scene:0,title:L('分数：一样大的份','ぶんすう：おなじ おおきさ','Fractions: equal parts'),panels:[
 panel(L('一起分享','いっしょに わけよう','Share together'),L('Piko：分享面包时，每一份都要一样大。下面用长条表示一个完整的面包。','ピコ：パンを おなじ おおきさに わけよう。したの テープが パン1こぶんだよ。','Piko: Each share must be equal. The strip below represents one whole loaf.'),'half'),
 panel(L('先确定一个整体','ぜんたいを きめよう','Choose one whole'),L('一个整体平均分成4份，其中1份是1/4。4表示总份数，1表示取了几份。','ぜんたいを おなじ おおきさの4つに わけるよ。その1つが1/4。4は ぜんぶの かず、1は とった かず。','Divide one whole into four equal parts. One part is 1/4: four parts in all, one selected.'),'quarter'),
 panel(L('分数也是数','ぶんすうも かず','A fraction is a number'),L('把同一个整体放到0到1的数轴上，1/2就在中间。整体一样大时，1/4小于1/2。','おなじ ぜんたいを0から1の すうちょくせんに おくと、1/2は まんなか。ぜんたいが おなじなら、1/4は1/2より ちいさい。','On a number line from 0 to 1, 1/2 is halfway. For the same whole, 1/4 is less than 1/2.'),'numberline'),
 panel(L('你来分享','きみも わけよう','Your turn'),L('同样大的长条，平均分成4份，涂色2份。涂色部分是多少？','おなじ テープを4つに わけ、2つ ぬったよ。ぬった ぶぶんは？','Two of four equal parts are shaded. What fraction is shaded?'),'twoquarters')],choices:['1/2','1/4','2/2'],answer:0},
 measure:{scene:1,title:L('周长：绕一圈','まわりの ながさ','Perimeter: all the way around'),panels:[
 panel(L('花园需要围栏','にわに さくを つくろう','A fence for the garden'),L('Piko：围栏沿花园的边界走。我们要知道绕一圈有多长。','ピコ：にわの まわりに さくを つくろう。ひとまわりの ながさは？','Piko: The fence follows the boundary. How far is it all the way around?'),'perimeter'),
 panel(L('四条边都要数','4つの へんを たそう','Include all four sides'),L('长方形长4米、宽2米。相对的两条边一样长。','たて2m、よこ4mの しかく。むかいあう へんは おなじ ながさだよ。','This rectangle is 4 m long and 2 m wide. Opposite sides have equal lengths.'),'perimeter'),
 panel(L('把边长相加','ながさを たそう','Add the lengths'),L('周长＝4＋2＋4＋2＝12米。单位是米，因为测量的是长度。','まわりは4＋2＋4＋2＝12m。ながさだから、たんいはmだよ。','Perimeter = 4 + 2 + 4 + 2 = 12 m. We use metres because we measure length.'),'perimeter'),
 panel(L('换一个花园','べつの にわ','Another garden'),L('新花园长3米、宽2米，绕一圈有多长？','よこ3m、たて2mの にわ。ひとまわりは？','A new garden is 3 m by 2 m. What is its perimeter?'),'perimeterTry')],choices:['6 m','10 m','5 m'],answer:1},
 area:{scene:1,title:L('面积：铺满里面','めんせき：なかを うめよう','Area: cover the inside'),panels:[
 panel(L('给花园铺地砖','にわに タイルを しこう','Tile the garden'),L('Piko：围栏量边界，地砖铺内部。面积表示内部有多大。','ピコ：さくは まわり。タイルは なかに しくよ。めんせきは なかの ひろさだよ。','Piko: Fences follow the edge; tiles cover the inside. Area measures the space inside.'),'area'),
 panel(L('选一块单位地砖','1まいの ひろさ','One unit tile'),L('每块正方形地砖边长1米，面积是1平方米，写作1 m²。','1まいは たて1m、よこ1m。その めんせきは1へいほうメートル、1 m²だよ。','Each square tile is 1 m by 1 m. Its area is one square metre, written 1 m².'),'unit'),
 panel(L('按行数更快','れつで かぞえよう','Count rows'),L('每行4块，共2行：4×2＝8平方米。这个花园的周长是12米，面积是8平方米。','1れつ4まいが2れつ。4×2＝8 m²。まわりの ながさは12m、めんせきは8 m²だよ。','Four tiles in each of two rows: 4 × 2 = 8 m². This garden has perimeter 12 m and area 8 m².'),'area'),
 panel(L('你来铺地砖','きみも しこう','Your turn to tile'),L('长3米、宽2米，每格1平方米。面积是多少？','よこ3m、たて2m。1ますは1 m²。めんせきは？','A 3 m by 2 m garden has 1 m² tiles. What is its area?'),'areaTry')],choices:['10 m²','6 m','6 m²'],answer:2},
 volume:{scene:2,title:L('体积：一层又一层','たいせき：だんで かぞえよう','Volume: layer by layer'),panels:[
 panel(L('小方块装满盒子','はこを いっぱいに','Fill a box'),L('Piko：用同样大的小正方体，不留空隙地装满盒子。体积表示占了多少空间。','ピコ：おなじ さいころの かたちで、すきまなく はこを うめよう。たいせきは ばしょの おおきさだよ。','Piko: Fill the box with equal cubes, leaving no gaps. Volume measures the space it occupies.'),'layers1'),
 panel(L('先数一层','まず1だん','Count one layer'),L('每个小正方体棱长1厘米，体积1立方厘米。每层3×2＝6个。图中每格表示一个小正方体的位置。','1この へんは1cm、たいせきは1 cm³。1だんは3×2＝6こ。ずの1ますは1この ばしょだよ。','Each cube has 1 cm edges and volume 1 cm³. One layer holds 3 × 2 = 6 cubes. Each diagram cell marks one cube position.'),'layers1'),
 panel(L('再数层数','だんを かぞえよう','Count the layers'),L('2层各有6个，共6×2＝12个，所以体积是12立方厘米。下图把两层分开显示。','6こずつ2だんで12こ。たいせきは12 cm³。したの ずは2だんを はなして みせているよ。','Two layers of six make 12 cubes: volume 12 cm³. The diagram shows the two layers separately.'),'layers2'),
 panel(L('再增加一层','もう1だん','Add another layer'),L('每层6个小正方体，堆3层，体积是多少？','1だん6こを3だん。たいせきは？','There are six 1 cm³ cubes per layer and three layers. What is the volume?'),'layers3')],choices:['18 cm³','12 cm³','18 cm²'],answer:0},
 percent:{scene:3,title:L('百分数：每100份','ひゃくぶんりつ：100のうち','Percent: out of 100'),panels:[
 panel(L('果汁占多少','ジュースは どれだけ？','How much juice?'),L('Piko：先把整杯饮料看成一个整体，再比较果汁占多少。','ピコ：のみもの ぜんぶを ひとつと みよう。ジュースは どれだけ？','Piko: Treat the entire drink as one whole. How much of it is juice?'),'percent25'),
 panel(L('整体分成100份','100に わけよう','Divide into 100 parts'),L('百格图一共100个相同小格，涂色25格，表示25/100，也就是25%。','おなじ ますが100こ。25こ ぬると25/100、つまり25%だよ。','There are 100 equal cells. Shading 25 represents 25/100, or 25%.'),'percent25'),
 panel(L('整体改变，数量也改变','ぜんぶの りょうを みよう','The whole matters'),L('100毫升的25%是25毫升；200毫升的25%是50毫升。比例相同，实际数量不同。','100mLの25%は25mL。200mLの25%は50mL。わりあいが おなじでも、りょうは かわるよ。','25% of 100 mL is 25 mL; 25% of 200 mL is 50 mL. The fraction is the same, but the amounts differ.'),'percent25'),
 panel(L('你来读图','ずを よもう','Read the diagram'),L('100格涂色50格，是百分之几？','100このうち50こ ぬったよ。なん%？','50 of 100 cells are shaded. What percentage is shaded?'),'percent50')],choices:['5%','50%','100%'],answer:1},
 ratio:{scene:3,title:L('比：一起扩大','ひ：いっしょに ふやそう','Ratio: scale together'),panels:[
 panel(L('保持一样的味道','おなじ あじに','Keep the same taste'),L('Piko：果汁与水的体积比是2∶3。每份的体积必须相同。','ピコ：ジュースと みずの ひは2:3。ひとつぶんの りょうは おなじだよ。','Piko: Juice and water have volume ratio 2:3. Every part must have the same volume.'),'ratio'),
 panel(L('2份和3份','2つぶんと3つぶん','Two parts and three parts'),L('果汁2份，水3份，一共5份。果汁占整杯的2/5，不是2/3。','ジュース2つぶん、みず3つぶん。ぜんぶで5つぶん。ジュースは ぜんぶの2/5だよ。2/3では ないよ。','Two parts juice and three parts water make five parts total. Juice is 2/5 of the whole, not 2/3.'),'ratio'),
 panel(L('两边乘同一个数','どちらも おなじ ばいに','Multiply both amounts'),L('果汁和水都变成原来的2倍，2∶3就变成4∶6，味道保持相同。','どちらも2ばいに すると、2:3は4:6。あじは おなじだよ。','Double both amounts: 2:3 becomes 4:6. The mixture keeps the same taste.'),'ratioDouble'),
 panel(L('你来调配','きみも つくろう','Mix your own'),L('果汁2份、水3份。如果果汁用6杯，同样大小的杯子需要几杯水？','ジュース2つぶん、みず3つぶん。ジュースを6ぱいに すると、みずは おなじ コップで なんばい？','For two parts juice to three parts water, six cups of juice need how many equal-sized cups of water?'),'ratio')],choices:['4','9','6'],answer:1}
};
export const LESSON_COMICS={fractions:'fractions',measure:'measure',area:'area',volume:'volume',percent:'percent',ratio:'ratio'};
export const JAPAN_COMICS={MATH_G3_DIV_FRACTION:['fractions'],MATH_G4_AREA_DECIMAL:['area'],MATH_G5_RATIO:['volume','percent'],MATH_G6_PROPORTION_SPEED:['ratio']};
