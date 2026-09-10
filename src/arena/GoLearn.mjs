import { newGame, play } from './GoRules.mjs';

const copy = {
 zh: { back:'上一步', title:'围棋新手学堂', close:'返回大厅', next:'下一步', again:'再练一次', done:'完成啦！去试试围棋', good:'做到了！', retry:'再观察一下，试试看。', count:'请找齐四个方向的空点。', hint:'看上下左右紧挨着的交叉点，斜着不算。', reveal:'金色圆点给你一个提示，再动手试试。', point:'交叉点', pass:'停一手', confirm:'双方确认', lessons:[['把棋子放在哪里？','围棋比谁围出的范围更大。黑棋先走，然后一人一步。棋子放在线交叉的地方，不放在格子中间。试着点一个空交叉点。'],['棋子也要“呼吸”','紧挨棋子上下左右的空交叉点，叫作“气”。斜着不算。请找出中间这颗黑棋的4口气。'],['围住就能提子','白棋只剩最后一口气了。你是黑棋，把那里填上，白棋就会被拿走。找到最后一口气。'],['学会围地','吃子不是唯一目标，也要围住空地。找找看：哪一个空点被黑棋从上下左右围住了？'],['什么时候结束？','觉得不用再下时，可以停一手。双方连续停一手，才开始计分。试着替双方各停一手，然后共同确认。']], end:'正式对局要一起确认哪些棋已经无法逃生；意见不同就恢复行棋。中国规则数活子和围住的空点，白贴7.5目；日本规则数地和提子，白贴6.5目。先选好规则。这个练习只学习结束流程。' },
 en: { back:'Previous', title:'Your first Go lesson', close:'Back to lobby', next:'Next step', again:'Try again', done:'All done! Try a game', good:'You did it!', retry:'Take another look and try again.', count:'Find all four empty neighbors.', hint:'Look just above, below, left and right. Diagonals do not count.', reveal:'Gold dots give you a hint. Try tapping one.', point:'Intersection', pass:'Pass', confirm:'Both agree', lessons:[['Where do stones go?','Try to surround more of the board. Black goes first, then take turns. Stones go where lines cross, not inside the squares. Tap an empty crossing.'],['Give stones room to breathe','An empty crossing just above, below, left or right is a liberty. Diagonals do not count. Find all 4 liberties of the black stone.'],['Surround and capture','White has just one liberty left. You are Black. Fill that liberty and the white stone comes off the board. Find the last liberty.'],['Surround empty space','Capturing is not the only goal. Surround empty space too. Which empty crossing has black stones above, below, left and right?'],['How does a game end?','If you do not need another move, you may pass. Two passes in a row begin scoring. Pass once for each player, then agree together.']], end:'In a real game, agree on which stones cannot escape. If you disagree, resume playing. Chinese scoring counts living stones and surrounded space, with 7.5 extra for White. Japanese scoring counts territory and captures, with 6.5 extra for White. Choose the rules first. This exercise only teaches the ending steps.' },
 ja: { back:'まえへ', title:'はじめてのいご', close:'ロビーにもどる', next:'つぎへ', again:'もういちど', done:'できた！いごであそぼう', good:'できたね！', retry:'よくみて、もういちどためそう。', count:'4つのあいたところをみつけよう。', hint:'すぐうえ、した、ひだり、みぎをみよう。ななめはかぞえないよ。', reveal:'きんいろのまるがヒントだよ。おしてみよう。', point:'せんがまじわるところ', pass:'パス', confirm:'ふたりでかくにん', lessons:[['いしはどこにおく？','よりひろくかこむことをめざそう。くろがさき、つぎはしろ。じゅんばんにおくよ。いしは、せんがまじわるところにおくよ。あいているところをおしてみよう。'],['いしの「いき」をみつけよう','いしのすぐうえ、した、ひだり、みぎのあいたところが「いき」だよ。ななめはかぞえないよ。くろいいしの4つのいきをみつけよう。'],['かこんで、とってみよう','しろいいしのいきは、あとひとつ。あなたはくろだよ。さいごのいきをふさぐと、しろいいしがとれるよ。'],['あいたところをかこもう','いしをとるだけでなく、あいたところもかこもう。うえ、した、ひだり、みぎをくろにかこまれたところはどこかな？'],['いつおわるの？','もうおかなくていいとおもったら「パス」。ふたりつづけてパスしたら、てんをかぞえるよ。ふたりのぶんをパスして、かくにんしよう。']], end:'ほんとうのたいきょくでは、にげられないいしをふたりでかくにんするよ。きまらなければ、またうつよ。ちゅうごくルールは、いきたいしとかこんだところをかぞえ、しろに7.5てん。にほんルールは、じととったいしをかぞえ、しろに6.5てん。さきにルールをえらぼう。ここでは、おわりかただけれんしゅうするよ。' }
};
export function lessonState(step) {
  const game = newGame();
  if (step === 1) game.board[20] = 1;
  if (step === 2) { game.board[20] = 2; [11,19,21].forEach(p => game.board[p] = 1); }
  if (step === 3) [11,19,21,29].forEach(p => game.board[p] = 1);
  game.history = [game.board.join('')]; return game;
}
export function mountGoLearn(host, { locale, progress = 0, onProgress, onClose }) {
  const text = copy[locale] || copy.en;
  let step = progress >= 5 ? 0 : Math.min(progress, 4), game, solved, picked, mistakes, feedback;
  function reset() { game = lessonState(step); solved = false; picked = new Set(); mistakes = 0; feedback = ''; render(); }
  function complete() { solved = true; feedback = text.good; onProgress(step + 1); }
  function render() {
    const targets = step === 1 ? [11,19,21,29] : step === 2 ? [29] : step === 3 ? [20] : [];
    host.innerHTML = `<section class="panel learn-panel"><div class="learn-top"><span>✦ ${text.title}</span><button data-learn="close">${text.close}</button></div><p class="eyebrow">${step + 1} / 5</p><h2>${text.lessons[step][0]}</h2><p>${text.lessons[step][1]}</p><div class="learn-board-scroll"><div class="learn-board" role="group" aria-label="${text.title}">${Array.from({length:25},(_,i)=>{const p=Math.floor(i/5)*9+i%5;return `<button data-learn-point="${p}" aria-label="${text.point} ${Math.floor(i/5)+1}, ${i%5+1}" ${solved||step===4?'disabled':''} class="${picked.has(p)?'picked':''} ${mistakes>=3&&targets.includes(p)?'hint-point':''}">${game.board[p]?`<span class="stone ${game.board[p]===1?'black':'white'}"></span>`:''}</button>`;}).join('')}</div></div><p class="learn-feedback" role="status">${feedback}</p>${step===4?`<p>${text.end}</p><button data-learn="pass" ${game.phase==='scoring'?'disabled':''}>${text.pass} (${game.passes}/2)</button> <button data-learn="confirm" ${game.phase!=='scoring'||solved?'disabled':''}>${text.confirm}</button>`:''}<div class="actions"><button data-learn="back" ${step===0?'disabled':''}>${text.back}</button><button data-learn="reset">${text.again}</button><button class="primary" data-learn="next" ${!solved?'disabled':''}>${step===4?text.done:text.next}</button></div></section>`;
  }
  host.onclick = e => {
    const p = e.target.closest('[data-learn-point]');
    if (p && !solved) {
      const point = Number(p.dataset.learnPoint);
      if (step === 0) { game = play(game, point); complete(); }
      else if (step === 1 && [11,19,21,29].includes(point)) { picked.add(point); if (picked.size === 4) complete(); else feedback = text.count; }
      else if (step === 2 && point === 29) { game = play(game, point); complete(); }
      else if (step === 3 && point === 20) { picked.add(point); complete(); }
      else { mistakes++; feedback = mistakes >= 3 ? text.reveal : mistakes === 2 ? text.hint : text.retry; }
      render(); return;
    }
    const action = e.target.closest('[data-learn]')?.dataset.learn;
    if (action === 'close') onClose();
    if (action === 'reset') reset();
    if (action === 'back' && step > 0) { step--; reset(); }
    if (action === 'next' && solved) { if (step === 4) onClose(); else { step++; reset(); } }
    if (action === 'pass' && game.phase === 'playing') { game = play(game,null); render(); }
    if (action === 'confirm' && game.phase === 'scoring') { complete(); render(); }
  };
  reset(); return () => { host.onclick = null; host.replaceChildren(); };
}
