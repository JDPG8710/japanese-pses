import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {amcBank} from '../src/competitions/PracticeData.mjs';
import {getEnglishQuestionBank} from '../src/competitions/EnglishQuestionBank.mjs';
const {chromium}=createRequire(import.meta.url)('playwright-core');
const root=path.resolve('dist'),out='.wrangler/independent-learning-tests-v2';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{
  let pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/')pathname='/index.html';
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep))throw Error('Path');
  const content=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});res.end(content);
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=process.env.PRACTICE_TEST_ORIGIN||`http://127.0.0.1:${server.address().port}`;
let browser,checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  async function layout(page,label){
    ok(!(await page.locator('body').innerText()).includes('undefined'),`${label}: no missing copy`);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: no horizontal overflow`);
    ok(await page.locator('#game-modal,#guidance-bubble,#global-fx-canvas').count()===0,`${label}: no injected school UI`);
    ok(await page.evaluate(()=>{const a=document.querySelector('main').getBoundingClientRect(),b=document.querySelector('footer').getBoundingClientRect();return b.top>=a.bottom-1;}),`${label}: footer below content`);
    ok(await page.evaluate(()=>[...document.body.children].every(e=>['HEADER','MAIN','FOOTER','SCRIPT'].includes(e.tagName))),`${label}: clean page bottom`);
  }
  function currentBank(course,unit){return course==='eiken'?getEnglishQuestionBank(unit):amcBank(unit,'en');}
  async function currentQuestion(page,course,unit){const id=await page.locator('[data-question-id]').getAttribute('data-question-id');return currentBank(course,unit).find(q=>q.id===id);}
  async function respond(page,q,correct=true){
    const kind=q.kind||'choice';
    if(kind==='choice'){
      const options=page.locator('[data-answer]');
      for(let i=0;i<await options.count();i++){
        const value=await options.nth(i).textContent();
        if(await options.nth(i).isEnabled()&&(correct?value===q.correct:value!==q.correct)){await options.nth(i).click();return;}
      }
      throw Error('No choice');
    }
    if(kind==='order'){
      const target=correct?q.correct:[...q.correct].reverse();
      for(let i=0;i<target.length;i++){
        let values=await page.locator('.order-value').allTextContents(),from=values.indexOf(target[i]);
        while(from>i){await page.locator(`[data-move="${from}"][data-direction="-1"]`).click();from--;}
      }
      await page.locator('[data-submit]').click();return;
    }
    const answers=kind==='multi'?q.fields.map(f=>f.answer):[q.correct];
    for(let i=0;i<answers.length;i++)await page.locator(`[data-field="${i}"]`).fill(correct?String(answers[i]):'999999');
    await page.locator('#answer-form button').click();
  }
  for(const width of [320,390,768,1280]){
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const locale of ['ja','zh','en'])for(const course of ['eiken','amc8']){
      await page.goto(`${origin}/${course}.html?lang=${locale}`);await page.locator('[data-start]').first().waitFor();
      await layout(page,`${course}-${locale}-${width}-home`);
      if(course==='amc8'){
        ok(await page.locator('.archive-list a').count()===6,'six archive links');
        ok(await page.locator('.archive button,.archive .action').count()===0,'archive uses text links');
        await page.locator('.topic-guide>summary').first().click();await page.locator('.example>summary').first().click();
        ok(await page.locator('.example[open] .explanation li').count()===3,'worked example has three reasoning steps');
        await layout(page,`example-${locale}-${width}`);
        await page.locator('.topic-guide>summary').first().click();
      }
      await page.locator(`[data-start="${course==='eiken'?'EIKEN3':'number'}"]`).click();await page.locator('#prompt').waitFor();
      await layout(page,`${course}-${locale}-${width}-question`);
      const q=await currentQuestion(page,course,course==='eiken'?'EIKEN3':'number');
      await respond(page,q);await page.locator('[data-next]').waitFor();await layout(page,`${course}-${locale}-${width}-explanation`);
      await page.locator('[data-home]').click();await layout(page,`${course}-${locale}-${width}-return`);
    }
    await page.goto(`${origin}/eiken.html?lang=ja`);await page.locator('[data-start="EIKEN2"]').click();await page.locator('#prompt').waitFor();
    await page.screenshot({path:`${out}/eiken-question-${width}.png`,fullPage:true});
    await layout(page,`EIKEN2-${width}`);
    for(let i=0;i<10;i++){await respond(page,await currentQuestion(page,'eiken','EIKEN2'));await page.locator('[data-next]').click();}
    ok(await page.locator('.review-item').count()===10,'EIKEN result has 10 collapsible reviews');
    await page.locator('.review-item summary').first().click();await layout(page,`EIKEN-result-${width}`);
    await page.screenshot({path:`${out}/eiken-result-${width}.png`,fullPage:true});
    await page.goto(`${origin}/amc8.html?lang=zh`);await page.screenshot({path:`${out}/amc-home-${width}.png`,fullPage:true});
    await page.evaluate(()=>localStorage.setItem('piko-grade-journey:sentinel','school-progress'));
    await page.locator('[data-start="fraction"]').click();
    const ids=new Set(),kinds=new Set();
    for(let i=0;i<10;i++){
      const q=await currentQuestion(page,'amc8','fraction');ids.add(q.id);kinds.add(q.kind);
      if(q.kind==='number'||q.kind==='multi'){
        await page.locator('#answer-form button').click();
        ok((await page.locator('.question-meta').textContent()).includes('0/3'),'blank input does not count as an attempt');
        await page.locator('[data-field="0"]').fill('1/0');await page.locator('#answer-form button').click();
        ok((await page.locator('.question-meta').textContent()).includes('0/3'),'invalid fraction does not count');
        await page.locator('[data-field="0"]').fill('123');
        await page.locator('#locale').selectOption('en');
        ok(await page.locator('[data-field="0"]').inputValue()==='123','language switch preserves typed answer');
        ok(await page.locator('[data-question-id]').getAttribute('data-question-id')===q.id,'language switch preserves question');
        await page.locator('#locale').selectOption('zh');
      }
      await respond(page,q,true);await page.locator('[data-next]').waitFor();
      ok(await page.locator('.question .explanation li').count()===3,'answer includes full explanation');
      ok(await page.locator('.check-note,.mistake-note').count()===2,'answer includes check and mistake');
      await layout(page,`AMC-${q.kind}-${width}`);
      if(!i)await page.screenshot({path:`${out}/amc-explanation-${width}.png`,fullPage:true});
      await page.locator('[data-next]').click();
    }
    ok(ids.size===10&&kinds.size===4,'mixed ten-question set includes all four interaction types');
    ok(await page.evaluate(()=>localStorage.getItem('piko-independent-practice:v1:amc8:fraction'))==='10','first-attempt score saved');
    await page.locator('.review-item summary').first().click();await layout(page,`AMC-result-${width}`);
    await page.locator('[data-start="geometry"]').click();
    for(let i=0;i<10;i++){
      const q=await currentQuestion(page,'amc8','geometry');
      for(let attempt=1;attempt<=3;attempt++){
        await respond(page,q,false);
        if(attempt<3){ok(await page.locator('[data-next]').count()===0,'no early next on wrong answer');ok(await page.locator('.explanation').count()===0,'hints do not reveal answer');}
      }
      await page.locator('[data-next]').click();
    }
    ok(await page.locator('[data-start="counting"]').count()===0,'failed set does not offer next topic');
    ok(await page.evaluate(()=>localStorage.getItem('piko-independent-practice:v1:amc8:geometry'))==='0','failure saves zero');
    ok(await page.evaluate(()=>localStorage.getItem('piko-grade-journey:sentinel'))==='school-progress','school progress unchanged');
    ok(errors.length===0,`no browser errors: ${errors.join(', ')}`);
    await context.close();
  }
  const blocked=await browser.newContext();const page=await blocked.newPage();
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}}));
  await page.goto(`${origin}/amc8.html?lang=en`);await page.locator('[data-start="number"]').click();await page.locator('#prompt').waitFor();
  ok((await page.locator('footer').textContent()).includes('cannot be saved'),'storage blocked still allows practice');await blocked.close();
  console.log(`Practice browser checks passed: ${checks}; 3 languages × 4 widths, all interaction types, hints/results, in-session translation and no injected game UI.`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
