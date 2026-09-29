/** Feedback belongs to the game viewport, including fullscreen and first-person play. */
export function createGameFeedback(viewport) {
 const element=document.createElement('div');
 element.className='game-feedback';element.hidden=true;element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');viewport.append(element);
 return {
  element,
  show({kind='success',title,detail='',animate=true}) {
   element.replaceChildren();element.dataset.kind=kind;element.dataset.animate=String(animate);element.hidden=false;
   const icon=document.createElement('span');icon.className='game-feedback-icon';icon.setAttribute('aria-hidden','true');icon.textContent=kind==='success'?'★':kind==='partial'?'✓':'↻';
   const text=document.createElement('div'),heading=document.createElement('strong'),body=document.createElement('p');heading.textContent=title;body.textContent=detail;text.append(heading);if(detail)text.append(body);element.append(icon,text);
   if(animate&&(kind==='success'||kind==='partial'))for(let i=0;i<8;i++){const star=document.createElement('i');star.className='game-feedback-spark';star.setAttribute('aria-hidden','true');star.textContent='✦';star.style.setProperty('--dx',`${Math.cos(i*Math.PI/4)*110}px`);star.style.setProperty('--dy',`${Math.sin(i*Math.PI/4)*65}px`);star.style.setProperty('--delay',`${i*.035}s`);element.append(star);}
  },
  clear(){element.hidden=true;element.replaceChildren();delete element.dataset.kind;},
  destroy(){element.remove();}
 };
}
