import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {assertChoiceSet} from '../src/runtime/ChoiceQuality.mjs';
import {getEnglishQuestionBank} from '../src/competitions/EnglishQuestionBank.mjs';
import {englishPool} from '../src/world/FoundationEnglish.mjs';

// Browser check of the English answer screens (ported from the DING worktree):
// every answer is rendered in full, in one font size, inside the viewport,
// so a child cannot spot the answer by a smaller font or a cut-off line.
// Serve current sources: stale dist output must never make a content fix pass.
const root=process.cwd(),artifacts=path.join(root,'.wrangler','english-options-browser');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
    const session=url.pathname.includes('/session');
    res.writeHead(session?401:200,{'content-type':'application/json'});
    res.end(JSON.stringify(session?{authenticated:false}:{country:'CN',entries:[],counts:{}}));return;
  }
  if(url.pathname==='/__english-fixture'){
    res.writeHead(200,{'content-type':'text/html'});
    // These layout utilities normally come from the index page's Tailwind CDN.
    // Keep this focused modal fixture offline and preserve its positioned stage.
    res.end('<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><style>*{box-sizing:border-box}body{margin:0}.hidden{display:none!important}#game-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:8px}#game-modal>div{position:relative;width:100%;max-width:768px;background:#0f172a;color:white}#game-stage{position:relative;width:100%;height:420px;overflow:hidden}#game-overlay-ui{position:absolute;inset:0;pointer-events:none}#game-modal>div>div:first-child{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}#game-modal>div>div:first-child>div:last-child{display:flex;align-items:center;flex-wrap:wrap;max-width:46vw}#game-modal button{max-width:100%}</style></head><body></body></html>');return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const content=await readFile(file);
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(content);
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser,activePage,phase='',checks=0;
function ok(value,message){assert.ok(value,message);checks++;}
async function readable(page,selector,label){
  const boxes=await page.locator(selector).evaluateAll(nodes=>nodes.map(el=>{
    const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {text:el.textContent,width:rect.width,height:rect.height,left:rect.left,right:rect.right,
      scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
      font:style.fontSize,overflowY:style.overflowY};
  }));
  ok(boxes.length===4,`${label}: four answers`);
  ok(new Set(boxes.map(b=>b.font)).size===1,`${label}: common answer font`);
  for(const b of boxes){
    ok(b.height>=44&&b.width>0,`${label}: reachable answer ${b.text}`);
    ok(b.left>=-1&&b.right<=page.viewportSize().width+1,`${label}: answer stays in viewport`);
    ok(b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1,`${label}: complete answer text ${JSON.stringify(b)}`);
  }
  const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,
    elements:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right}))}));
  if(overflow.width>overflow.viewport+1)await page.screenshot({path:path.join(artifacts,`overflow-${label}.png`),fullPage:true});
  ok(overflow.width<=overflow.viewport+1,`${label}: no horizontal page overflow ${JSON.stringify(overflow)}`);
}
async function contextFor(width){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width===320?2:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    localStorage.setItem('piko-privacy-choice-v1',JSON.stringify({version:1,optionalAds:false,savedAt:Date.now()}));
  });
  const page=await context.newPage(),errors=[];activePage=page;page.on('pageerror',e=>errors.push(e.message));
  return {context,page,errors};
}
async function foundationQuestion(page,grade){
  const prompt=await page.locator('.quest-prompt').textContent();
  const q=englishPool(grade,'zh').find(question=>question.prompt===prompt);
  ok(q,`foundation ${grade}: displayed question belongs to this grade`);
  assertChoiceSet(q,{key:'choices'});
  return q;
}
async function chooseFoundation(page,q,correct){
  const options=page.locator('[data-choice]');
  for(let i=0;i<4;i++){
    const text=await options.nth(i).evaluate(el=>[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(''));
    if((text===q.correct)===correct){await options.nth(i).click();await page.locator('[data-action="check"]').click();return;}
  }
  throw Error(`No foundation ${correct?'correct':'wrong'} option: ${q.id}`);
}
try{
  await mkdir(artifacts,{recursive:true});
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  for(const width of [320,1280]){
    // The real Japanese modal owns the English screen and its lifecycle.
    const {context,page,errors}=await contextFor(width);
    await page.goto(`${origin}/__english-fixture`);
    await page.evaluate(async()=>{const {MiniGameModal}=await import('/MiniGameSystem.js');window.englishModal=new MiniGameModal();});
    for(const mode of ['BASIC','EIKEN3','EIKEN2','SHORT_READING','LONG_READING']){
      phase=`Japanese ${mode} ${width}`;
      await page.evaluate(mode=>englishModal.open({id:`english-${mode}`,name:'English',grade:6,subject:'外国語・英語',gameType:'ENGLISH_CURRICULUM',gameData:{selectedMode:mode}}),mode);
      await page.locator('dialog .pt-start').click();
      await page.locator('[data-english-prompt]').waitFor();
      const session=await page.evaluate(()=>englishModal.currentGame.questions);
      ok(session.length===10&&new Set(session.map(q=>q.id)).size===10,`${mode}: ten distinct questions`);
      session.forEach(q=>assertChoiceSet(q));
      // Exercise the longest prompt and longest answer, not a lucky short draw.
      const bank=getEnglishQuestionBank(mode);
      const extremes=[bank.reduce((a,b)=>a.prompt.length>b.prompt.length?a:b),bank.reduce((a,b)=>Math.max(...a.options.map(x=>x.length))>Math.max(...b.options.map(x=>x.length))?a:b)];
      for(const q of new Map(extremes.map(q=>[q.id,q])).values()){
        await page.evaluate(q=>{
          const game=englishModal.currentGame,requestFrame=window.requestAnimationFrame;
          game.questions[0]=q;game.qIndex=0;window.requestAnimationFrame=()=>0;
          try{game.loop();}finally{window.requestAnimationFrame=requestFrame;}
        },q);
        ok(await page.locator('[data-english-prompt]').textContent()===q.prompt,`${mode}: complete prompt and reading passage`);
        await readable(page,'[data-english-options] button',`${mode}-${width}`);
        const text=await page.locator('[data-english-options]').textContent();
        ok(q.options.every(option=>text.includes(option)),`${mode}: all four complete answers rendered`);
        // Scrolling must expose the final line and the last answer on phones.
        await page.locator('[data-english-options] button').last().scrollIntoViewIfNeeded();
        ok(await page.locator('[data-english-options] button').last().isVisible(),`${mode}: last answer remains reachable`);
      }
      await page.screenshot({path:path.join(artifacts,`japanese-${mode}-${width}.png`),fullPage:true});
      const answer=await page.evaluate(()=>englishModal.currentGame.questions[0].correct);
      const options=page.locator('[data-english-options] button');
      for(let i=0;i<4;i++)if((await options.nth(i).textContent()).includes(answer)){await options.nth(i).click();break;}
      await page.waitForFunction(()=>englishModal.currentGame?.qIndex===1);
      ok(await page.evaluate(()=>englishModal.currentGame.correctCount===1),`${mode}: rendered answer retains scoring`);
      await page.evaluate(()=>englishModal.close());
      ok(await page.locator('[data-english-prompt]').count()===0,`${mode}: panel removed on close`);
    }
    ok(errors.length===0,`Japanese ${width}: ${errors.join('\n')}`);await context.close();console.log(`Japanese five modes ${width}px passed.`);

    for(const [profile,grade] of [['CN63',1],['CN63',6],['CN54',1],['CN54',5]]){
      const {context,page,errors}=await contextFor(width),label=`${profile}-Y${grade}-${width}`;
      await page.goto(`${origin}/learn.html?curriculum=${profile}&year=Y${grade}&lesson=english${grade}&locale=zh&country=CN`);
      await page.locator('[data-action="start"]').click();await page.locator('dialog .pt-start').click();
      const ids=new Set(),fail=profile==='CN54'&&grade===5;
      for(let index=0;index<10;index++){
        phase=`Foundation ${label} question ${index+1}`;
        await page.locator('.quest-prompt').waitFor();
        const q=await foundationQuestion(page,grade);ids.add(q.id);
        await readable(page,'[data-choice]',`${label}-${index}`);
        ok(await page.locator('.quest-explain').count()===0,`${label}: no initial answer/hint`);
        if(index===0||fail){
          for(let attempt=1;attempt<=3;attempt++){
            await chooseFoundation(page,q,false);
            if(attempt===1)ok(await page.locator('.quest-explain').count()===0,`${label}: first mistake is gentle`);
            if(attempt===2){ok(await page.locator('.quest-explain').count()===1,`${label}: second mistake gives a hint`);ok(await page.locator('[data-action="next"]').count()===0,`${label}: second mistake cannot skip question`);}
          }
          ok((await page.locator('.quest-explain').last().textContent()).includes(q.explanation),`${label}: third mistake explains the answer`);
        }else await chooseFoundation(page,q,true);
        if(index===0)await page.screenshot({path:path.join(artifacts,`foundation-${label}.png`),fullPage:true});
        // The pointer is still where "check" was; world.css lifts a hovered
        // pill by 2px, which can make the new button jitter under it.
        await page.mouse.move(0,0);
        await page.locator('[data-action="next"]').click();
      }
      ok(ids.size===10,`${label}: ten distinct questions`);
      ok((await page.locator('.target').textContent()).includes(`${fail?0:900}/1000`),`${label}: first-question failure is reflected in score`);
      ok(await page.locator('a[href*="stage=2"]').count()===(fail?0:1),`${label}: only a passing run offers the next stage`);
      ok(errors.length===0,`${label}: ${errors.join('\n')}`);await context.close();console.log(`Foundation ${label} passed.`);
    }

  }
  console.log(`English browser checks passed: ${checks}; Japanese five modes, CN63/CN54 grades, complete text, equal answer font, staged hints and ten-question results at 320/1280px.`);
}catch(error){
  console.error(`Failed at ${phase}`);
  if(activePage&&!activePage.isClosed()){
    await activePage.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true});
    console.error(await activePage.locator('[data-action="next"]').evaluateAll(nodes=>nodes.map(el=>({text:el.textContent,rect:el.getBoundingClientRect().toJSON(),style:getComputedStyle(el).transform}))));
  }
  throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
