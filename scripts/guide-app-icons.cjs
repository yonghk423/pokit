/** Render the app's own SVG components so walkthrough icons stay in sync. */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src/pages/day-plan/ui');
function icon(file, name, end, props) {
 const source = fs.readFileSync(path.join(root, file), 'utf8');
 const start = source.indexOf(`function ${name}(`);
 const stop = end ? source.indexOf(end, start) : source.length;
 const component = source.slice(start, stop);
 const js = ts.transpileModule(`const React=require('react'); const Svg=({accessible,pointerEvents,testID,...props})=>React.createElement('svg',props), Path='path', StyleSheet={absoluteFill:{}}; ${component}\nexport default ${name};`, {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module = {exports:{}};
 new Function('require','module','exports',js)(require,module,module.exports);
 return renderToStaticMarkup(require('react').createElement(module.exports.default, props));
}
module.exports = {
 photo: icon('HeroPhotoSource.tsx','HeroPhotoIcon','/** Selection', {colored:true,portrait:true,size:32}),
 camera: icon('HeroPhotoSource.tsx','HeroPhotoIcon','/** Selection', {colored:true,camera:true,size:32}),
 generate: icon('HeroGenerateIcon.tsx','HeroGenerateIcon',null,{ink:'#343933'}),
 writingMode: icon('HeroInlineComposer.tsx','StoryModeIcon','function DrawingProgress', {mode:'character',ink:'#343933',paper:'#F5E8CF',selected:false}),
 photoMode: icon('HeroInlineComposer.tsx','StoryModeIcon','function DrawingProgress', {mode:'photo',ink:'#343933',paper:'#F5E8CF',selected:false}),
};
