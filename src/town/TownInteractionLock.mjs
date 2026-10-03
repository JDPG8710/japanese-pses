/** Keep browser gestures from interrupting play; text fields retain editing shortcuts. */
export function setupTownInteractionLock(root = document) {
 const abort=new AbortController(),signal=abort.signal;
 const editable=e=>e.target instanceof Element&&!!e.target.closest('input,textarea,[contenteditable="true"],[data-allow-selection]');
 const prevent=e=>{if(!editable(e))e.preventDefault();};
 root.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
 root.addEventListener('selectstart',prevent,{signal});
 root.addEventListener('dragstart',prevent,{signal});
 root.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&!editable(e)){e.preventDefault();e.stopPropagation();}},{signal,capture:true});
 return ()=>abort.abort();
}
