import {build} from 'esbuild';
import {parse,compileScript,compileStyle} from '@vue/compiler-sfc';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function buildExplorers(){
 await build({entryPoints:['src/explorers/main.ts'],bundle:true,format:'esm',outfile:'dist/assets/explorers/app.js',minify:true,alias:{vue:'vue/dist/vue.esm-bundler.js'},define:{__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false','process.env.NODE_ENV':'"production"'},plugins:[{name:'vue-sfc',setup(b){
  b.onLoad({filter:/\.vue$/},async args=>{const source=await readFile(args.path,'utf8');const {descriptor}=parse(source);const id='data-v-'+path.basename(args.path).replace(/[^a-zA-Z]/g,'');const script=compileScript(descriptor,{id,inlineTemplate:true,genDefaultAs:'__component'});return {contents:script.content+'\n__component.__scopeId='+JSON.stringify(id)+';export default __component;\n'+descriptor.styles.map(s=>`import ${JSON.stringify('sfc-style:'+compileStyle({source:s.content,filename:args.path,id,scoped:!!s.scoped}).code)}`).join('\n'),loader:'ts',resolveDir:path.dirname(args.path)};});
  b.onResolve({filter:/^sfc-style:/},args=>({path:args.path,namespace:'sfc-style'}));
  b.onLoad({filter:/.*/,namespace:'sfc-style'},args=>({contents:args.path.slice(10),loader:'css'}));
 }}]});
}
