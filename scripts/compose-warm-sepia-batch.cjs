// Compose available generated scene/material assets without changing published 01.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const template = require('../docs/design/photo-diary/city-calendar-template.json');
const root=path.resolve('output/warm-sepia-open-panel-v2-review');
const out=path.resolve('output/warm-sepia-open-panel-v2-100-review');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function compose(job) {
  const source=path.join(root,'scenes',job.id+'.png');
  const {width:sw,height:sh}=await sharp(source).metadata();
  const {data,info}=await sharp(source).resize({width:260}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const means=Array.from({length:info.height},(_,y)=>{
    let sum=0;
    for(let x=0;x<info.width;x++)for(let c=0;c<3;c++)sum+=data[(y*info.width+x)*3+c];
    return sum/info.width/3;
  });
  // Measure the largest full-width material transition in the bottom 8%.
  // The prompt reserves 3.3%; per-image measurement avoids trusting generation coordinates.
  let edge=-1,score=-Infinity;
  for(let y=Math.floor(info.height*.92);y<info.height-3;y++) {
    const before=(means[y-2]+means[y-1])/2;
    const after=(means[y]+means[y+1]+means[y+2])/3;
    const delta=Math.abs(before-after);
    if(delta>score){score=delta;edge=y;}
  }
  if(score<8)throw new Error(job.id+': no measurable material boundary; visual review required');
  let bandTop=Math.round(edge*sh/info.height);
  // Refine the measured transition at native resolution.
  const lo=Math.max(0,bandTop-Math.ceil(sh/info.height)*2),hi=Math.min(sh-3,bandTop+Math.ceil(sh/info.height)*2);
  const rows=await sharp(source).extract({left:0,top:lo,width:sw,height:hi-lo+2}).removeAlpha().raw().toBuffer();
  const values=[];
  for(let y=0;y<hi-lo+2;y++) {
    let sum=0;for(let x=0;x<sw;x++)for(let c=0;c<3;c++)sum+=rows[(y*sw+x)*3+c];
    values.push(sum/sw/3);
  }
  let jump=-1;
  for(let i=1;i<values.length-1;i++) {
    const d=Math.abs(values[i]-values[i-1]);
    if(d>jump){jump=d;bandTop=lo+i;}
  }
  const overridesPath=path.join(root,'binding-overrides.json');
  const overrides=fs.existsSync(overridesPath)?JSON.parse(fs.readFileSync(overridesPath)):{};
  // Include the fine antialiased lip above a measured material edge.
  bandTop=Math.max(0,bandTop-3);
  if(Number.isInteger(overrides[job.id])) bandTop=overrides[job.id];
  const [W,H]=template.size;
  const [,top,,th]=template.artwork.topDecorationBounds;
  const [,surfaceTop]=template.artwork.blankSurfaceBounds;
  const scene=await sharp(source).extract({left:0,top:0,width:sw,height:bandTop}).resize(W,top,{fit:'cover',position:'centre'}).png().toBuffer();
  const trim=await sharp(source).extract({left:0,top:bandTop,width:sw,height:sh-bandTop}).resize(W,th,{fit:'fill'}).png().toBuffer();
  const paper=Buffer.alloc(W*H*3);let seed=20261112;
  for(let i=0;i<W*H;i++) {seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed>>>29)-4;[253,239,218].forEach((v,c)=>paper[i*3+c]=Math.min(255,v+n));}
  const png=await sharp(paper,{raw:{width:W,height:H,channels:3}}).composite([{input:scene,left:0,top:0},{input:trim,left:0,top}]).png().toBuffer();
  const file=job.id+'.png';
  fs.writeFileSync(path.join(out,file),png);
  const entry={file,number:job.number,themeId:'warm-sepia-open-panel-'+job.id,sha256:hash(png),
    source:job.source,generatedSource:source,material:job.material,prompt:job.prompt,
    composition:{scene:[0,0,W,top],topDecoration:[0,top,W,th],blankSurface:[0,surfaceTop,W,H-surfaceTop],sourceBindingTop:bandTop,sourceSize:[sw,sh],boundaryContrast:score},
    visualReview:'pending',generatedWith:'built-in image_gen'};
  fs.writeFileSync(path.join(out,'entries',job.id+'.json'),JSON.stringify(entry,null,2)+'\n');
  console.log(job.id+' composed, measured material y='+bandTop+'/'+sh);
}
async function main() {
  fs.mkdirSync(path.join(out,'entries'),{recursive:true});
  const base=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  fs.copyFileSync(path.join(root,'01-exercise.png'),path.join(out,'01-exercise.png'));
  for(const name of fs.readdirSync(path.join(root,'generated')).filter(f=>f.endsWith('.json')).sort()) {
    const entryPath=path.join(out,'entries',name);
    if(fs.existsSync(entryPath))continue;
    const job=JSON.parse(fs.readFileSync(path.join(root,'generated',name)));
    try {await compose(job);}catch(e){console.log('REVIEW REQUIRED '+String(e.message));}
  }
  const entries=fs.readdirSync(path.join(out,'entries')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(out,'entries',f)))).sort((a,b)=>a.number-b.number);
  const manifest={template,status:'local-batch-pending-visual-review',files:[base.files[0],...entries]};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(manifest.files.length+'/100 composed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
