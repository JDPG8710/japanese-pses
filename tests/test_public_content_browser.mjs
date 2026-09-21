import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {startContentPreview} from '../scripts/preview-content.mjs';
const preview=await startContentPreview(),browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
const artifacts='.wrangler/public-content-tests';await mkdir(artifacts,{recursive:true});
try{
  const readOnly=await browser.newContext({javaScriptEnabled:false});
  const page=await readOnly.newPage();
  for(const route of ['/about','/world','/grades','/learn','/arena','/en/learning-guide','/ja/learning-guide','/zh/learning-guide','/en/','/ja/','/zh/']){
    await page.goto(preview.origin+route);
    assert.ok(await page.locator('main').isVisible(),route);
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});
      const overflowing=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,8).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,40)})));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflows at ${width}px: ${JSON.stringify(overflowing)}`);
    }
    const hrefs=await page.locator('main a[href],footer a[href]').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
    for(const href of new Set(hrefs)){
      const target=new URL(href,preview.origin+route);
      if(target.origin!==preview.origin)continue;
      const response=await readOnly.request.get(target.href);
      assert.equal(response.status(),200,`${route}: ${href}`);
      if(target.hash){assert.ok((await response.text()).includes(`id="${target.hash.slice(1)}"`),`missing anchor ${href}`);}
    }
    if(['/about','/world','/grades','/arena'].includes(route)){
      await page.screenshot({path:`${artifacts}/${route.slice(1)}-desktop.png`,fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:`${artifacts}/${route.slice(1)}-mobile.png`,fullPage:true});
    }
  }
  console.log('Public pages: no-JS content, internal links, anchors and 320/390/1280px layouts passed.');
  const context=await browser.newContext({viewport:{width:1280,height:900}}),play=await context.newPage(),errors=[];
  play.on('pageerror',error=>errors.push(error.message));
  // The preview intentionally has no API backend. Exercise guest practice and
  // navigation with unavailable cloud services; this does not simulate sign-in.
  await play.goto(`${preview.origin}/world?locale=en`);
  await play.locator('[data-consent="necessary"]').click();
  for(const game of ['circuit','sudoku','code','robot','set','balance','order','water','network']){
    await play.locator(`[data-action="play:${game}"]`).click();
    await play.locator('.pt-start').click();
    await play.locator(`.game-${game}`).waitFor();
    assert.ok(await play.locator('#stage').isVisible(),game);
    await play.locator('[data-action="home"]').click();
  }
  for(const locale of ['ja','zh']){
    await play.locator('#locale').selectOption(locale);
    await play.locator('[data-action="play:sudoku"]').click();
    await play.locator('.pt-start').click();
    await play.locator('.game-sudoku').waitFor();
    await play.locator('[data-action="home"]').click();
  }
  for(const [country,profile,year] of [['US','US','G1'],['CN','CN63','Y1']]){
    await play.goto(`${preview.origin}/grades?country=${country}&curriculum=${profile}&year=${year}&locale=en`);
    await play.locator('.subject-tabs').waitFor();
    const subjects=await play.locator('[data-subject]').evaluateAll(buttons=>buttons.map(b=>b.dataset.subject));
    assert.ok(!subjects.includes('art')&&!subjects.includes('music'));
    assert.equal(subjects.includes('english'),country==='CN');
    for(const subject of subjects){
      await play.locator(`[data-subject="${subject}"]`).click();
      assert.ok(await play.locator('.journey-gate').count()>0,`${profile}/${year}/${subject}`);
      assert.equal(await play.locator('.grade-empty').count(),0);
    }
    await play.locator('[data-subject="all"]').click();
    await play.setViewportSize({width:390,height:844});
    assert.ok(await play.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await play.screenshot({path:`${artifacts}/grades-${country}-live.png`,fullPage:true});
  }
  assert.deepEqual(errors,[],'No uncaught page errors');
  console.log('Interactive regression: all 9 guest games, Japanese/Chinese tutorials, populated US/China subject filters and mobile grade maps passed.');
}finally{await browser.close();await preview.close();}
