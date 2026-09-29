import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.BASE_URL||'https://piko-game.com';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];const out='.wrangler/production-audit';await mkdir(out,{recursive:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  for(const route of ['/','/?country=JP','/ja/','/world?locale=zh','/grades?country=CN&curriculum=CN63&year=Y1&locale=zh','/learn?country=CN&curriculum=CN63&year=Y1&lesson=add20&locale=zh','/town?locale=zh','/arena?lang=zh','/ja/guides/','/about']){
   const page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/auth/session'))failed.push({url:r.url(),status:r.status()});});
   try{
    const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:20000});
    const consent=page.locator('[data-consent="necessary"]');if(await consent.isVisible())await consent.click();
    const state=await page.evaluate(()=>({title:document.title,headings:[...document.querySelectorAll('h1')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth>innerWidth,overflowing:[...document.querySelectorAll('body *')].filter(x=>{const r=x.getBoundingClientRect();return r.width&&r.right>innerWidth+2;}).slice(0,5).map(x=>({tag:x.tagName,class:x.className,text:x.textContent.slice(0,60)})),text:document.body.innerText.slice(0,1600),links:[...document.querySelectorAll('a[href]')].map(x=>x.href)}));
    results.push({route,width,status:response.status(),errors,failed,...state});
    await page.screenshot({path:`${out}/${width}-${results.length}.png`,fullPage:true});
    console.log(JSON.stringify({route,width,status:response.status(),errors,failed,overflow:state.overflow,headings:state.headings}));
   }catch(e){results.push({route,width,error:e.message,errors,failed});console.log(route,e.message);}
   await page.close();
  }
  await context.close();
 }
 const links=[...new Set(results.flatMap(x=>x.links||[]))].filter(x=>x.startsWith(origin));
 const broken=[];
 for(let i=0;i<links.length;i+=8)await Promise.all(links.slice(i,i+8).map(async link=>{try{const r=await fetch(link,{signal:AbortSignal.timeout(15000)});if(r.status()>=400)broken.push({link,status:r.status()});await r.body?.cancel();}catch(e){broken.push({link,error:e.message});}}));
 console.log('Broken links:',JSON.stringify(broken));
 await writeFile(`${out}/report.json`,JSON.stringify({origin,results,broken},null,2));
}finally{await browser.close();}
