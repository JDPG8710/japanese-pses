const L=(en,zh,ja)=>({en,zh,ja});
// Small, authored examples; deliberately separate from generated live questions.
export const REASONING_EXAMPLES={
 balance:{question:{equations:[{counts:[1,1,0],total:7},{counts:[0,1,1],total:9},{counts:[1,0,1],total:8}],target:0,max:9},answer:[3]},
 network:{question:{count:4,edges:[[0,1,1],[1,2,2],[0,2,3],[2,3,4],[1,3,6],[0,3,8]]},answer:[0,1,3],wrong:[0,1,2]}
};
export const REASONING_ARTICLES=[{
 slug:'balance',activity:'balance',group:'logic',updated:'2026-09-29',
 title:L('Balance Lab: find a hidden weight using all the clues','平衡实验室：用全部线索找出重量','バランスラボ：3つの 手がかりから 重さを 見つけよう'),
 goal:L('Compare paired totals to find three unknown weights, then check your answer against every clue.','比较两两相加的总量，求出三个未知重量，再用全部条件检查。','2つずつの 合計を くらべて、3つの 重さを 考えます。答えは すべての 手がかりで たしかめます。'),
 ready:L('Use addition and subtraction up to 24. A, B and C are three objects, each with a different whole-number weight from 1 to 9. The unit is the same throughout. Paper counters can help.','需要会24以内加减法。A、B、C代表三件物品，重量是1至9中互不相同的整数，单位相同。可以用纸片帮助思考。','24までの たし算と ひき算を 使います。A・B・Cは ちがう 重さの 品物で、重さは1〜9の 整数です。単位は すべて 同じです。紙に 書いても かまいません。'),
 example:L('A + B = 7, B + C = 9, and A + C = 8. Find A. Each letter keeps the same weight in every clue.','A+B=7，B+C=9，A+C=8。求A。每条线索中同一个字母代表相同重量。','A + B = 7、B + C = 9、A + C = 8です。Aは いくつでしょう。同じ 文字の 重さは かわりません。'),
 steps:[L('Add the three totals: 7 + 9 + 8 = 24. Each object appears twice, so two copies of A + B + C weigh 24. One copy weighs 12.','三个总量相加：7+9+8=24。每件物品都出现两次，所以一组A+B+C是24的一半，即12。','3つの 合計を たすと7 + 9 + 8 = 24。どの 品物も2回ずつ あるので、A・B・Cを1つずつにすると 半分の12です。'),L('Remove B + C, which weighs 9, from the total 12. A = 12 − 9 = 3. Similarly B = 12 − 8 = 4 and C = 12 − 7 = 5.','从12中去掉B+C的9，得到A=3。同理B=12−8=4，C=12−7=5。','全部の12から BとCの9を ひくと、Aは3。同じように Bは12 − 8 = 4、Cは12 − 7 = 5です。'),L('Check all clues: 3 + 4 = 7, 4 + 5 = 9, 3 + 5 = 8. The weights are different and within 1–9. Submit 3 when the target is A.','逐条检查：3+4=7、4+5=9、3+5=8。重量互不相同且都在1至9内。题目问A，因此提交3。','3 + 4 = 7、4 + 5 = 9、3 + 5 = 8。全部に あい、重さも ちがいます。きかれている Aの3を 答えます。')],
 mistake:L('A = 2 and B = 5 fit the first clue. The second then gives C = 4, but A + C would be 6, not 8. Fitting one or two clues is not enough.','A=2、B=5符合第一条，第二条给出C=4，但A+C=6而不是8。只满足一两条条件还不够。','Aを2、Bを5にすると 最初には あいます。次から Cは4ですが、A + Cが6になり、8に なりません。1つの 手がかりだけでは 決められません。'),
 practice:L('New clues: A + B = 9, B + C = 11, A + C = 10. Find B and verify the other two weights.','新线索：A+B=9、B+C=11、A+C=10。求B，并检查另外两个重量。','次は A + B = 9、B + C = 11、A + C = 10。Bは いくつ？ ほかの 重さも たしかめよう。'),
 answer:L('The three totals add to 30, so A + B + C = 15. B = 15 − 10 = 5; A = 4 and C = 6. Check 4 + 5 = 9, 5 + 6 = 11, and 4 + 6 = 10.','总量相加为30，因此A+B+C=15。B=15−10=5，A=4，C=6。4+5=9、5+6=11、4+6=10全部成立。','合計30の 半分は15。Bは15 − 10 = 5、Aは4、Cは6。4 + 5 = 9、5 + 6 = 11、4 + 6 = 10で たしかめられます。'),
 transfer:L('Start with the first difficulty in Balance Lab. Translate each shape into a letter. At higher difficulty, some clues contain two copies of a shape: count them before calculating. The “halve the total” shortcut only works when every object occurs exactly twice.','从平衡实验室第一难度开始，把形状记作字母。较高难度会在一条条件中重复某个形状，先数清数量。只有每种物品总共出现两次时，才能直接把三个总量之和除以二。','バランスラボの 最初の 難しさから 試しましょう。形を 文字に 置きかえます。むずかしい 問題では 同じ 形が2つ あることも。全部を 半分にする 方法は、どの 形も 合計2回ずつ あるときだけ 使えます。')
}];
