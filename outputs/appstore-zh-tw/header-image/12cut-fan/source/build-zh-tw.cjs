const fs=require('fs'),path=require('path');
const {createCanvas,loadImage,GlobalFonts}=require('/Users/yonghee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const R=process.env.POKIT_PROJECT_ROOT||'/Users/yonghee/Documents/project/pokit',LANG='zh-TW',O=path.join(__dirname,'..',LANG);
const fontDir=path.join(require('os').tmpdir(),'yourday-store-traditional-fonts');
require('child_process').execFileSync('python3',[path.join(__dirname,'prepare-fonts.py'),fontDir]);
GlobalFonts.registerFromPath(path.join(fontDir,'TraditionalSerif.ttf'),'TraditionalPen');
const face='TraditionalPen';
const smoother=v=>{v=Math.max(0,Math.min(1,v));return v*v*v*(v*(v*6-15)+10)};
const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
(async()=>{fs.mkdirSync(O,{recursive:true});const paper=await loadImage(R+'/assets/color-textures/clean-paper.webp');const arts=await Promise.all(['56-bookstore','10-park-walk','11-photography','19-hiking','09-coffee-tablet','33-grocery-shopping','35-bus-ride','28-cooking','41-pet-walk','38-listening-music','07-movie-home','53-diary-in-bed'].map(n=>loadImage(R+'/assets/activity-illustrations/protagonist-1/'+n+'-960.webp')));
const c=createCanvas(3840,1646),x=c.getContext('2d');

const copy=JSON.parse(fs.readFileSync(path.join(__dirname,'copy-zh-tw.json'),'utf8'));
function wrap(text,maxWidth,size,maxLines){
 x.font=size+'px '+face;const rows=[];let line='';const close='，。！？、；：）】」』',open='（【「『';
 for(const ch of text){
  if(line&&x.measureText(line+ch).width>maxWidth){
   if(close.includes(ch)||open.includes(line.at(-1))){const last=line.at(-1);rows.push(line.slice(0,-1));line=last+ch;}
   else {rows.push(line);line=ch;}
  }else line+=ch;
 }
 if(line)rows.push(line);
 if(rows.length>maxLines){rows.length=maxLines;let last=rows[maxLines-1];while(x.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);rows[maxLines-1]=last+'…';}
 return rows;
}
const boxes=[];const rows=[[430,510,360,400],[480,370,450,400],[380,460,500,360]];for(let row=0;row<3;row++){let bx=80;for(let col=0;col<4;col++){let w=rows[row][col];boxes.push({cx:bx+w/2,cy:164+row*247,w,h:225});bx+=w+20;}}
function lerp(a,b,p){return a+(b-a)*p;}
const faces=[[.50,.34],[.47,.25],[.47,.25],[.50,.25],[.43,.29],[.50,.19],[.42,.23],[.50,.22],[.34,.23],[.46,.28],[.72,.37],[.38,.31]];
function cropOffset(length,visible,center){const padding=Math.min(12,visible*.07),lo=Math.max(0,(center+.09)*length+padding-visible),hi=Math.min(length-visible,(center-.09)*length-padding),preferred=center*length-visible*.48;return lo<=hi?Math.max(lo,Math.min(hi,preferred)):Math.max(0,Math.min(length-visible,center*length-visible/2));}
function draw(i,cx,cy,w,h,rot=0){x.save();x.translate(cx,cy);x.rotate(rot);x.shadowColor='#392B2045';x.shadowBlur=13;x.shadowOffsetY=9;x.fillStyle='#F1E4C8';x.beginPath();x.roundRect(-w/2-4,-h/2-4,w+8,h+8,10);x.fill();x.shadowColor='transparent';let footer=113,imageH=h-footer;const im=arts[i],sc=Math.max(w/im.width,imageH/im.height);
x.save();x.beginPath();x.roundRect(-w/2,-h/2,w,h,8);x.clip();x.beginPath();x.rect(-w/2,-h/2,w,imageH);x.clip();x.drawImage(im,-w/2-cropOffset(im.width*sc,w,faces[i][0]),-h/2-cropOffset(im.height*sc,imageH,faces[i][1]),im.width*sc,im.height*sc);x.restore();const pad=11,top=-h/2+imageH;x.strokeStyle='#8A846E';x.lineWidth=.7;x.beginPath();x.moveTo(-w/2+pad,top);x.lineTo(w/2-pad,top);x.stroke();x.fillStyle='#30342B';const title=wrap(copy[i][0],w-pad*2,14,2);x.font='14px '+face;title.forEach((line,n)=>x.fillText(line,-w/2+pad,top+20+n*17));const lines=wrap(copy[i][1],w-pad*2,11,4);x.fillStyle='#606251';x.font='11px '+face;lines.forEach((line,n)=>x.fillText(line,-w/2+pad,top+59+n*13));x.strokeStyle='#555044';x.lineWidth=.7;x.beginPath();x.roundRect(-w/2,-h/2,w,h,8);x.stroke();x.restore();}
x.scale(2,2);x.fillStyle='#F2EEE5';x.fillRect(0,0,1920,823);x.globalAlpha=.28;x.drawImage(paper,0,0,1920,823);x.globalAlpha=1;
x.translate(960,411.5);x.scale(.92,.92);x.translate(-960,-411.5);
// A shallow semicircular arc opens twelve portrait cards like a hand-held fan.
for(let i=0;i<12;i++){const v=(i-5.5)/5.5;draw(i,960+v*790,390+110*v*v,190,520,v*.44);}
const sharp=require('/Users/yonghee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');const png=O+'/your-day-header-fan-'+LANG+'.png';await sharp(c.toBuffer('image/png')).removeAlpha().toColourspace('srgb').withIccProfile('srgb').png().toFile(png);await sharp(png).resize(1920).jpeg({quality:90}).toFile(O+'/preview.jpg');console.log(png);})();
