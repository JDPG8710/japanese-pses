import {execFileSync} from 'node:child_process';

// A Pages --branch main upload does not merge its source into Git main.
// Refuse a release from a checkout that omits already integrated production code.
const git=(...args)=>execFileSync('git',args,{stdio:'pipe',encoding:'utf8'}).trim();
try {
  git('fetch','origin','main');
  git('merge-base','--is-ancestor','origin/main','HEAD');
} catch(error) {
  throw new Error('Release blocked: fetch and merge the latest origin/main before deploying. Pages branch labels do not integrate source history.',{cause:error});
}
console.log(`Release source includes origin/main (${git('rev-parse','--short','origin/main')}).`);
