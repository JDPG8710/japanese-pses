import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startContentPreview} from '../scripts/preview-content.mjs';
const preview=await startContentPreview(),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(preview.origin+'/about');
 const result=await page.evaluate(async()=>{
  const {LoginModal}=await import('/src/auth/LoginModal.js');
  document.documentElement.lang='zh';
  const trigger=document.createElement('button');trigger.textContent='Open login';document.body.append(trigger);trigger.focus();
  document.body.style.overflow='auto';
  const modal=new LoginModal({siteKey:'local-test'});
  // Slow external verification must not prevent dismissal or return to a game.
  let finish;modal.ensureTurnstile=()=>new Promise(resolve=>{finish=resolve;});
  const first=modal.show();const repeated=modal.show();
  const title=modal.element.querySelector('#auth-title').textContent;
  modal.element.querySelector('[data-action="close"]').click();
  const settled=await Promise.race([Promise.all([first,repeated]),new Promise(resolve=>setTimeout(()=>resolve('hung'),150))]);
  const restored=document.activeElement===trigger&&document.body.style.overflow==='auto';finish();
  document.documentElement.lang='ja';const next=modal.show();
  modal.element.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const escaped=await Promise.race([next,new Promise(resolve=>setTimeout(()=>resolve('hung'),150))]);finish();
  return {title,settled,restored,escaped,hidden:modal.element.classList.contains('hidden')};
 });
 assert.equal(result.title,'保存你的学习记录');
 assert.deepEqual(result.settled,[{dismissed:true},{dismissed:true}]);
 assert.equal(result.restored,true);
 assert.deepEqual(result.escaped,{dismissed:true});assert.equal(result.hidden,true);
 console.log('Login: slow verification dismissal, repeated open, locale switch, Escape and focus/scroll restoration passed.');
}finally{await browser.close();await preview.close();}
