export {TOPICS,FAMILIES,VARIANTS_PER_FAMILY,amcBank,topicExamples} from './AmcCurriculum.mjs';
export const ARCHIVE=[2019,2020,2022,2023,2024,2025].map(year=>({year,count:25,url:`https://live.poshenloh.com/past-contests/amc8/${year}`,source:'LIVE by Po-Shen Loh · MAA',verified:'2026-09-12'}));
export const OFFICIAL_SAMPLE='https://maa.org/resource/sample-competition-2023-amc-8/';
export function shuffle(items,random=Math.random){
  const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function createSession(bank,random=Math.random){
  if(bank.length<10||new Set(bank.map(q=>q.id)).size!==bank.length)throw new Error('Invalid question pool');
  const families=[...new Set(bank.map(q=>q.family).filter(Boolean))];
  const first=families.map(f=>shuffle(bank.filter(q=>q.family===f),random)[0]);
  const chosen=new Set(first.map(q=>q.id));
  const selected=shuffle([...first,...shuffle(bank.filter(q=>!chosen.has(q.id)),random).slice(0,10-first.length)],random);
  return selected.map(q=>{
    const kind=q.kind||'choice',result={...q,kind};
    if(kind==='choice'){
      const options=[...new Set(q.options.map(String))];
      if(options.length<4||!options.includes(String(q.correct)))throw new Error('Invalid answers');
      result.options=shuffle(options,random);
    }
    if(kind==='order'){
      result.orderItems=shuffle(q.orderItems,random);
      if(result.orderItems.every((value,i)=>value===q.correct[i]))result.orderItems.push(result.orderItems.shift());
    }
    return result;
  });
}
export function parseNumeric(value){
  const text=String(value).normalize('NFKC').trim().replace(/−/g,'-');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(text))return null;
  const [a,b='1']=text.split('/').map(Number),result=a/b;
  return b!==0&&Number.isFinite(result)?result:null;
}
export function gradeResponse(question,response){
  if(question.kind==='order')return {valid:Array.isArray(response)&&response.length===question.correct.length,correct:Array.isArray(response)&&response.length===question.correct.length&&response.every((v,i)=>v===question.correct[i])};
  if(question.kind==='multi'){
    if(!Array.isArray(response)||response.length!==question.fields.length)return {valid:false,correct:false};
    const values=response.map(parseNumeric),expected=question.fields.map(f=>parseNumeric(f.answer));
    return {valid:values.every(v=>v!==null),correct:values.every((v,i)=>v!==null&&Math.abs(v-expected[i])<1e-9)};
  }
  if(question.kind==='number'){
    const value=parseNumeric(response),expected=parseNumeric(question.correct);
    return {valid:value!==null,correct:value!==null&&Math.abs(value-expected)<1e-9};
  }
  return {valid:question.options.includes(String(response)),correct:String(response)===String(question.correct)};
}
export const resultFor=(score,total=10)=>({score,total,passed:total===10&&Number.isInteger(score)&&score>=8&&score<=total});
export const progressKey=(course,unit)=>`piko-independent-practice:v1:${course}:${unit}`;
