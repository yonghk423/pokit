const fs=require('fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const template=require('../docs/design/photo-diary/city-calendar-template.json');
(async()=>{const root=path.resolve(process.argv[2] || 'output/textured-watercolor-49'),out=path.join(root,'review');fs.mkdirSync(out,{recursive:true});let files=[];
for(const file of fs.readdirSync(path.join(root,'generated')).filter(f=>f.endsWith('.png')).sort()){
 const input=path.join(root,'generated',file),meta=await sharp(input).metadata(),w=meta.width,h=meta.height;
 const {data,info}=await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject:true});const rows=[];
 for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++){const i=(y*w+x)*info.channels;if(Math.min(data[i],data[i+1],data[i+2])<180)n++;}rows.push(n);}
 let end=Math.floor(h*.62);while(end>h*.32&&rows[end]<5)end--;
 let start=end;let gap=0;for(let y=end;y>Math.max(0,end-220);y--){if(rows[y]<5)gap++;else gap=0;if(gap>=8){start=y+gap;break;}}
 if(start===end)start=Math.max(1,end-50);
 const scene=await sharp(input).extract({left:0,top:0,width:w,height:start}).resize(830,760,{fit: 'contain',position:'attention',background:'#FFF5E7'}).toBuffer();
 const trim=await sharp(input).extract({left:0,top:start,width:w,height:Math.max(1,end-start+3)}).resize(830,24,{fit:'fill'}).toBuffer();
 const paper=await sharp(input).extract({left:0,top:Math.min(h-100,end+30),width:w,height:h-Math.min(h-100,end+30)}).resize(830,1112,{fit:'cover'}).linear(.3,178).toBuffer();
 const png=await sharp({create:{width:830,height:1896,channels:3,background:'#fff7eb'}}).composite([{input:scene,top:0,left:0},{input:trim,top:760,left:0},{input:paper,top:784,left:0}]).png().toBuffer();
 fs.writeFileSync(path.join(out,file),png);files.push({file,sha256:crypto.createHash('sha256').update(png).digest('hex'),source:input,sourceCrop:{sceneEnd:start,decorationEnd:end},composition:{scene:[0,0,830,760],topDecoration:template.artwork.topDecorationBounds,blankSurface:template.artwork.blankSurfaceBounds}});
}fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({template,status:'coordinate-composed-awaiting-review',files},null,2));console.log(files.length+' composed');})().catch(e=>{console.error(e);process.exit(1)});
