// Shared helpers for the real-style AMC banks (AMC 8 / 10 / 12).
// Every problem is ORIGINAL: it copies the type, structure and difficulty of a
// real MAA problem but uses new numbers and wording. The real problem is only
// cited (with a link to the AoPS Wiki page), never reproduced, because the
// competition texts are copyrighted by the MAA.
export const T=(zh,en,ja)=>({zh,en,ja});
export const LETTERS=['A','B','C','D','E'];
export const aopsUrl=(contest,number)=>`https://artofproblemsolving.com/wiki/index.php/${contest.trim().replace(/\s+/g,'_')}_Problems/Problem_${number}`;
export function citation(model,locale){
  const {contest,number}=model;
  if(locale==='zh')return `仿照 ${contest} 第${number}题`;
  if(locale==='ja')return `${contest} 第${number}問を参考にしたオリジナル問題`;
  return `Modeled on ${contest} Problem ${number}`;
}
// Builds one problem record. steps is a list of T(zh,en,ja) entries.
export function problem(level,[id,area,band,contest,number,prompt,options,answer,steps]){
  return {id,level,area,band,model:{contest,number,url:aopsUrl(contest,number)},prompt,options,answer,steps};
}
export const makeBank=(level,rows)=>rows.map(row=>problem(level,row));
