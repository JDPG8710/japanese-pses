import {robotState,waterState} from './WorldRules.mjs';

// Inspect the submitted work only. Never solve a puzzle to produce an early hint.
export function diagnoseAnswer(game,q,answer){
 if(!q||!Array.isArray(answer))return null;
 if(game==='sudoku'){
  const n=q.size;
  if(answer.length!==n*n||answer.some(v=>!Number.isInteger(v)||v<1||v>n))return {kind:'incomplete',n};
  if(q.givens.some((v,i)=>v&&v!==answer[i]))return {kind:'given'};
  const duplicate=indices=>{const seen=new Set();for(const i of indices){if(seen.has(answer[i]))return answer[i];seen.add(answer[i]);}return null;};
  for(let r=0;r<n;r++){const value=duplicate(Array.from({length:n},(_,c)=>r*n+c));if(value)return {kind:'row',index:r+1,value};}
  for(let c=0;c<n;c++){const value=duplicate(Array.from({length:n},(_,r)=>r*n+c));if(value)return {kind:'column',index:c+1,value};}
  for(let r=0;r<n;r+=q.boxRows)for(let c=0;c<n;c+=q.boxCols){const value=duplicate(Array.from({length:q.boxRows},(_,dr)=>Array.from({length:q.boxCols},(_,dc)=>(r+dr)*n+c+dc)).flat());if(value)return {kind:'box',row:r+1,column:c+1,value};}
 }
 if(game==='robot'){
  const state=robotState(q,answer);
  if(!state.valid)return {kind:'blocked',step:state.blockedAt+1,row:state.position[1]+1,column:state.position[0]+1};
  if(state.position.some((v,i)=>v!==q.goal[i]))return {kind:'destination',row:state.position[1]+1,column:state.position[0]+1};
  if(answer.length>q.limit)return {kind:'limit',used:answer.length,limit:q.limit};
 }
 if(game==='water'){
  if(answer.some(n=>!Number.isInteger(n)||n<0||n>5))return null;
  if(answer.length>q.limit)return {kind:'limit',used:answer.length,limit:q.limit};
  const state=waterState(q,answer);
  if(!state.includes(q.target))return {kind:'water',a:state[0],b:state[1],target:q.target};
 }
 return null;
}
export function answerFeedback(game,q,answer,locale='en'){
 const d=diagnoseAnswer(game,q,answer);if(!d)return '';
 const messages={
  incomplete:[`Fill every cell with a number from 1 to ${d.n}.`,`请在每个格子填入1至${d.n}的数字。`,`すべての マスに 1〜${d.n}を いれよう。`],
  given:['Keep the numbers supplied by the puzzle unchanged.','题目预先给出的数字不能更改。','はじめから ある 数字は かえないでね。'],
  row:[`Row ${d.index} repeats ${d.value}. Check that row, then its columns and boxes.`,`第${d.index}行的${d.value}重复了。先检查这一行，再检查相关列和小宫。`,`${d.index}行目に ${d.value}が 2つ以上 あるよ。行、列、小さい わくを たしかめよう。`],
  column:[`Column ${d.index} repeats ${d.value}. A valid row can still conflict with a column.`,`第${d.index}列的${d.value}重复了。行内不重复，还不代表列内也正确。`,`${d.index}列目に ${d.value}が 2つ以上 あるよ。行だけでなく 列も たしかめよう。`],
  box:[`The box starting at row ${d.row}, column ${d.column} repeats ${d.value}. Check the whole box.`,`左上角位于第${d.row}行、第${d.column}列的小宫中，${d.value}重复了。请检查整个小宫。`,`${d.row}行・${d.column}列からの 小さい わくで ${d.value}が 重なるよ。わくの なかを たしかめよう。`],
  blocked:[`Step ${d.step} hits an obstacle or leaves the board. Just before it, the robot is at row ${d.row}, column ${d.column}. Revise this arrow first.`,`第${d.step}步会撞到障碍或走出棋盘。此前机器人在第${d.row}行、第${d.column}列，先修改这一步。`,`${d.step}歩目で いしに ぶつかるか、ばんの そとに でるよ。その まえは ${d.row}行・${d.column}列。まず この やじるしを なおそう。`],
  destination:[`Your route ends at row ${d.row}, column ${d.column}, not at the goal. Trace each arrow from the start.`,`这条路线停在第${d.row}行、第${d.column}列，还未到终点。请从起点逐个检查箭头。`,`${d.row}行・${d.column}列で とまっているよ。スタートから やじるしを ひとつずつ たどろう。`],
  limit:[`You used ${d.used} steps; the limit is ${d.limit}. Look for unnecessary operations.`,`你用了${d.used}步，本题限制${d.limit}步。检查是否有多余操作。`,`${d.used}歩 つかったよ。上限は ${d.limit}歩。いらない そうさが ないか たしかめよう。`],
  water:[`After your operations, A holds ${d.a} L and B holds ${d.b} L. Neither holds ${d.target} L. For a pour, use the smaller of the source amount and the receiving jug’s free space.`,`操作后A有${d.a}升、B有${d.b}升，尚未得到${d.target}升。倒水量取“现有水量”和“接水容器剩余空间”中较小的值。`,`そうさの あと、Aは ${d.a}L、Bは ${d.b}L。${d.target}Lに なっていないよ。うつす りょうは、ある 水と あいている ところの 小さい ほうだよ。`]
 };
 return messages[d.kind]?.[{en:0,zh:1,ja:2}[locale]??0]||'';
}
