/** Validate the actual runtime geometry against every supported portrait viewport. */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', compiled)(exports, name => name.startsWith('.')
    ? load(path.relative(root, path.resolve(path.dirname(file), name + '.ts'))) : require(name));
  return exports;
}
const base = 'src/pages/day-plan/lib/';
const { CALENDAR_ARTWORK_LAYOUTS: layouts } = load(base + 'illustrationCalendarLayouts.ts');
const { fitCalendarArtwork, calendarCellContents } = load(base + 'illustrationCalendarGeometry.ts');
const devices = [[320,568,20,90],[375,667,20,90],[375,812,44,110],[390,844,59,110],[393,852,59,110],[430,932,59,110],[440,956,62,110]];
const failures = [];
const cases = [];
const epsilon = .05;
for (const [theme, layout] of Object.entries(layouts)) for (const [w,h,top,bottom] of devices) {
  const f = fitCalendarArtwork(theme,w,h,top,bottom);
  const problem = [];
  if (f.left > epsilon || f.top > epsilon || f.left+f.width < w-epsilon || f.top+f.height < h-epsilon) problem.push('background-gap');
  if (Math.abs(f.width/f.height-layout.size[0]/layout.size[1]) > 1e-8) problem.push('distorted');
  for (const name of ['month','weekdays','grid']) {
    const [x,y,rw,rh] = layout[name];
    const left=f.left+x*f.width, right=left+rw*f.width;
    const first=f.top+y*f.height, last=first+rh*f.height;
    if(left < -epsilon || right > w+epsilon) problem.push(name+'-horizontal-clipping');
    if(first < top+8-epsilon || last > h-bottom-8+epsilon) problem.push(name+'-safe-area-overlap');
  }
  const cellW=layout.grid[2]*f.width/7, cellH=layout.grid[3]*f.height/6;
  const c=calendarCellContents(cellW,cellH);
  if(c.photoTop <= c.numberTop+c.numberHeight || c.photoTop+c.photoHeight > cellH) problem.push('photo-overlap');
  if(layout.sourceRows.length !== 7) problem.push('not-six-rows');
  const result={theme,viewport:[w,h],frame:f,cell:[cellW,cellH],problems:problem};
  cases.push(result);
  if(problem.length) failures.push(result);
}
const report={themes:Object.keys(layouts).length,devices:devices.length,cases:cases.length,passed:!failures.length,failures,results:cases};
const dest=process.argv[2] || 'output/calendar-viewport-audit.json';
fs.mkdirSync(path.dirname(path.resolve(root,dest)),{recursive:true});
fs.writeFileSync(path.resolve(root,dest),JSON.stringify(report,null,2));
console.log(JSON.stringify({themes:report.themes,cases:report.cases,failed:failures.length,report:dest}));
process.exitCode=failures.length ? 1 : 0;
