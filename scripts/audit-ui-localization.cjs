const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'src/shared/lib/i18n/model/messages');
const locales = ['ko', 'en', 'ja', 'zh-TW'];
const messages = Object.fromEntries(locales.map(l => [l, JSON.parse(fs.readFileSync(path.join(dir, l+'.json'), 'utf8'))]));
const placeholders = s => [...String(s).matchAll(/\{([\w]+)\}/g)].map(m => m[1]).sort().join(',');
const dictionaries = Object.fromEntries(locales.slice(1).map(l => [l, {
 keys: Object.keys(messages[l]).length,
 missing: Object.keys(messages.ko).filter(k => !(k in messages[l])).map(key => ({key, korean:messages.ko[key], english: messages.en[key]})),
 empty: Object.entries(messages[l]).filter(([k,v]) => !v && messages.ko[k]).map(([key])=>key),
 hangul: Object.entries(messages[l]).filter(([,v])=>/[가-힣]/.test(v)),
 placeholderMismatch: Object.keys(messages.ko).filter(k => k in messages[l] && placeholders(messages.ko[k]) !== placeholders(messages[l][k])).map(key=>({key,ko:messages.ko[key],value:messages[l][key]})),
 sameAsKorean: Object.keys(messages.ko).filter(k=>messages[l][k]===messages.ko[k] && /[A-Za-z가-힣]/.test(messages.ko[k])).map(key=>({key,value:messages[l][key]}))
}]));
function walk(dir) {return fs.existsSync(dir) ? fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=> e.isDirectory()?walk(path.join(dir,e.name)) : /\.[cm]?[jt]sx?$/.test(e.name)&&!/(\.test\.|\.spec\.|\.d\.ts$)/.test(e.name)?[path.join(dir,e.name)]:[]) : [];}
const files = [...walk(path.join(root,'src')), ...walk(path.join(root,'app'))];
const koreanLiterals=[], binaryLocaleBranches=[], unknownTranslationKeys=[], parseErrors=[];
for(const file of files){
 const source=fs.readFileSync(file,'utf8'), rel=path.relative(root,file);
 let ast;try{ast=parser.parse(source,{sourceType:'unambiguous',plugins:['typescript','jsx']});}catch(e){parseErrors.push({file:rel,error:e.message});continue;}
 const location = p => ({file:rel,line:p.node.loc.start.line});
 traverse(ast,{
  ConditionalExpression(p){ const test=source.slice(p.node.test.start,p.node.test.end);if(/\bko\b|===?\s*['"]ko['"]/.test(test)) { const a=source.slice(p.node.consequent.start,p.node.consequent.end), b=source.slice(p.node.alternate.start,p.node.alternate.end);if(/[가-힣]/.test(a)&&/[a-zA-Z]/.test(b)&& !/locale\s*===/.test(b))binaryLocaleBranches.push({...location(p),korean:a,other:b});}},
  CallExpression(p){const callee=p.node.callee; if(callee.type!=='Identifier'||callee.name!=='t')return;const k=p.node.arguments[0];if(k?.type==='StringLiteral'&&!(k.value in messages.ko))unknownTranslationKeys.push({...location(p),key:k.value});},
  'StringLiteral|JSXText|TemplateElement'(p){const value=p.node.type==='TemplateElement'?p.node.value.raw:p.node.value;if(!/[가-힣]/.test(value))return;
   const conditional=p.findParent(a=>a.isConditionalExpression());
   const object=p.findParent(a=>a.isObjectProperty() && ['ko','ja','en','zh-TW'].includes(a.node.key.name??a.node.key.value));
   const call=p.findParent(a=>a.isCallExpression());const callee=call?source.slice(call.node.callee.start,call.node.callee.end):'';
   const jsx=p.findParent(a=>a.isJSXAttribute());
   koreanLiterals.push({...location(p),text:value.trim(),context:object?'locale-object':conditional?'conditional':/console|Error|log/.test(callee)?'diagnostic':jsx?'jsx-attribute':'literal',attribute:jsx?.node.name.name,callee});
  }
 });
}
const result={generatedAt:new Date().toISOString(),scope:{files:files.length,roots:['src','app'],excludes:['tests','declarations'],note:'Static candidates require reachability and UI review; Korean locale branches are expected, not all candidates are untranslated.'},dictionaries,binaryLocaleBranches,koreanLiterals,unknownTranslationKeys,parseErrors};
const out=path.join(root,'output/i18n-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({files:files.length,dictionaries:Object.fromEntries(Object.entries(dictionaries).map(([k,v])=>[k,{keys:v.keys,missing:v.missing.length,empty:v.empty.length,placeholderMismatch:v.placeholderMismatch.length}])),koreanLiterals:koreanLiterals.length,binaryLocaleBranches:binaryLocaleBranches.length,unknownTranslationKeys,parseErrors},null,2));
