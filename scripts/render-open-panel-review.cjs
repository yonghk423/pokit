const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const ts = require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
const {fitCalendarArtwork}=require('../src/pages/day-plan/lib/illustrationCalendarGeometry.ts');
async function main() {
  const dir=path.resolve(process.argv[2]);
  const {template:t,files}=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const [W,H]=t.size;
  const text=(x,y,value,size)=>`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Baskerville, Georgia, serif" font-size="${size}" fill="#40392d">${value}</text>`;
  for(const item of files) {
    const png=fs.readFileSync(path.join(dir,item.file));
    let labels=text(W/2,t.month[1]+t.month[3]/2,'2026.11',32);
    labels+=text(t.month[0]+35,t.month[1]+t.month[3]/2,'‹',35)+text(t.month[0]+t.month[2]-35,t.month[1]+t.month[3]/2,'›',35);
    ['MON','TUE','WED','THU','FRI','SAT','SUN'].forEach((day,col)=>{ labels+=text(t.weekdays[0]+(col+.5)*t.weekdays[2]/7,t.weekdays[1]+t.weekdays[3]/2,day,18); });
    for(let day=1;day<=30;day++) {
      const slot=day+5,col=slot%7,row=Math.floor(slot/7);
      labels+=text(t.grid[0]+(col+.5)*t.grid[2]/7,t.grid[1]+row*t.grid[3]/6+23,day,25);
    }
    const artwork=`<image width="${W}" height="${H}" href="data:image/png;base64,${png.toString('base64')}"/>${labels}`;
    const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
    await sharp(svg(W,H,artwork)).resize(415,948).png().toFile(path.join(dir,item.file.replace('.png','-with-dates.png')));
    if(item.file !== '01-exercise.png') continue;
    const report=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
    for(const v of report.files[0].viewports) {
      const top={568:20,667:20,812:44,844:59,852:59,932:59,956:62}[v.height];
      const frame=fitCalendarArtwork(t.reference,v.width,v.height,top,110);
      const tabY=v.height-34-56;
      const body=`<g transform="translate(${frame.left},${frame.top}) scale(${frame.width/W})">${artwork}</g><rect x="${v.width*.15}" y="${tabY}" width="${v.width*.7}" height="50" rx="25" fill="#fffaf0" fill-opacity=".85" stroke="#eee1cd"/>${text(v.width*.3,tabY+25,'Diary',16)+text(v.width*.5,tabY+25,'Photo',16)+text(v.width*.7,tabY+25,'Store',16)}`;
      await sharp(svg(v.width,v.height,body)).png().toFile(path.join(dir,`preview-${v.width}x${v.height}.png`));
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
