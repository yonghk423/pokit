const fs=require('fs'),path=require('path'),vm=require('vm');
const {createCanvas,loadImage,GlobalFonts}=require('/Users/yonghee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sharp=require('/Users/yonghee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=process.env.POKIT_PROJECT_ROOT||'/Users/yonghee/Documents/project/pokit';
const OUT=path.dirname(__dirname);
const TC=JSON.parse(fs.readFileSync(path.join(__dirname,'copy-zh-tw.json'),'utf8'));
const fontDir=path.join(require('os').tmpdir(),'yourday-store-traditional-fonts');
require('child_process').execFileSync('python3',[path.join(__dirname,'prepare-fonts.py'),fontDir]);
const ts=require(path.join(ROOT,'node_modules/typescript'));
const mod={exports:{}};const js=ts.transpileModule(fs.readFileSync(path.join(ROOT,'src/application/development/mockCopy.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(js,{exports:mod.exports,module:mod});const {mockCopy,bookstoreSceneCopy}=mod.exports;mockCopy['zh-TW']=TC.mock;bookstoreSceneCopy['zh-TW']=TC.bookstore;
GlobalFonts.registerFromPath(path.join(ROOT,'assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf'),'Corncorn');
GlobalFonts.registerFromPath('/System/Library/Fonts/Palatino.ttc','PalatinoStore');
GlobalFonts.registerFromPath('/System/Library/Fonts/AppleSDGothicNeo.ttc','KoreanSans');
GlobalFonts.registerFromPath(path.join(fontDir,'TraditionalSerif.ttf'),'TraditionalSerif');
GlobalFonts.registerFromPath(path.join(fontDir,'TraditionalUI.ttf'),'TraditionalUI');
GlobalFonts.registerFromPath('/System/Library/Fonts/Avenir Next.ttc','StoreSans');
const W=2048,H=2732,INK='#24251F',MUTED='#616657';
const COPY={'zh-TW':TC.headlines};
const localeMap={'zh-TW':'zh-TW'};
const names=['01-your-scenes','02-notes-and-todos','03-day-overview','04-mate-cards','05-large-widget','06-small-widget'];
let images={},paper,art={};const manifest=[];
function font(c,locale,size,kind='ui'){const family=kind==='heading'?(locale==='kr'?'Corncorn':locale==='zh-TW'?'TraditionalSerif':'PalatinoStore'):(locale==='zh-TW'?'TraditionalUI':locale==='kr'?'Corncorn':'Corncorn');c.font=`${size}px "${family}"`;}
function text(c,s,x,y,locale,size=40,max=1000,color=INK,kind='ui'){font(c,locale,size,kind);while(c.measureText(s).width>max&&size>18){size--;font(c,locale,size,kind);}c.fillStyle=color;c.textBaseline='top';c.fillText(s,x,y);}
function lines(c,s,x,y,width,locale,size,lineH,maxLines=99,color=INK){
 font(c,locale,size);const chars=locale==='us'?s.split(/(\s+)/).filter(Boolean):[...s];let rows=[],row='';
 const closing='，。！？、；：）】」』》〉…',opening='（【「『《〈';
 for(const ch of chars){
  if(ch==='\n'){rows.push(row.trim());row='';continue;}
  if(row&&c.measureText(row+ch).width>width){
   const letters=[...row];
   if(locale==='zh-TW'&&(closing.includes(ch)||opening.includes(letters[letters.length-1]))&&letters.length>1){const last=letters.pop();rows.push(letters.join('').trim());row=last+ch;}
   else{rows.push(row.trim());row=ch.trimStart();}
  }else row+=ch;
 }
 if(row)rows.push(row.trim());
 if(rows.length>maxLines){rows=rows.slice(0,maxLines);let last=rows[maxLines-1];while(c.measureText(last+'…').width>width)last=last.slice(0,-1);rows[maxLines-1]=last+'…';}
 rows.forEach((r,i)=>text(c,r,x,y+i*lineH,locale,size,width,color));return rows.length;
}
function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function shadowImage(c,img,x,y,w,h,r=42){c.save();c.shadowColor='#35352826';c.shadowBlur=36;c.shadowOffsetY=18;c.fillStyle='#FCFBF6';round(c,x,y,w,h,r);c.fill();c.restore();c.save();round(c,x,y,w,h,r);c.clip();c.drawImage(img,x,y,w,h);c.restore();c.strokeStyle='#38392E32';c.lineWidth=1.4;round(c,x,y,w,h,r);c.stroke();}
function penLine(c,x,y,w){c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.3,y-3,x+w*.6,y+3,x+w,y-1);c.stroke();}
const OLD=path.join(path.dirname(OUT),'2026-10-26-6.9-inch');
function padPatch(c,b,base,sample){const [x,y,w,h]=b;const tile=createCanvas(sample[2],sample[3]),t=tile.getContext('2d');t.drawImage(base,...sample,0,0,tile.width,tile.height);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(x,y,w,h);c.restore();}
function ptext(c,b,t,l,size,base,sample,linesMax=1,color=INK){padPatch(c,b,base,sample);lines(c,t,b[0]+3,b[1]+5,b[2]-10,l,size,size*1.33,linesMax,color);}
function ipadUI(kind,l){const base=images[kind],c=createCanvas(2048,2732),x=c.getContext('2d');x.drawImage(base,0,0);if(l==='kr')return c;const cp=mockCopy[localeMap[l]];const surface=[1000,150,80,50],card=[80,800,90,80],detail=[500,1510,100,35];
const status=l==='zh-TW'?'下午 1:53   10月26日 星期一   今日的主角':'1:53 PM   Mon Oct 26   YOUR DAY';ptext(x,[20,8,1300,44],status,l,26,base,[1450,10,100,40]);
if(kind==='hero'||kind==='overview'){
ptext(x,[118,234,1320,70],'10/26 · '+cp.titles[0],l,l==='zh-TW'?33:38,base,surface);ptext(x,[118,311,650,55],cp.name,l,35,base,surface);ptext(x,[1835,310,190,55],'18° · 首爾',l,29,base,surface);
}
if(kind==='hero'){
ptext(x,[489,2000,1065,64],cp.scenes[5][0],l,l==='zh-TW'?34:40,base,[1500,1980,20,20]);
ptext(x,[489,2070,1065,84],cp.scenes[5][1],l,l==='zh-TW'?24:29,base,[1500,1980,20,20],2,'#666A59');
}
if(kind==='overview'){
ptext(x,[29,394,850,45],l==='zh-TW'?'7 個場景':'7 scenes',l,28,base,surface);
for(const [xx,yy,ww,i]of [[46,1294,1044,0],[1175,1294,824,1],[46,2190,1953,2]]){ptext(x,[xx,yy,ww,50],cp.scenes[i][0],l,l==='zh-TW'?28:34,base,card);ptext(x,[xx,yy+58,ww,41],cp.scenes[i][1],l,l==='zh-TW'?23:28,base,card,1,'#74786D');}
}
if(kind==='mates'){
const order=[0,6,1,3,4,5];for(let i=0;i<6;i++){const xx=78+i%3*670,yy=569+Math.floor(i/3)*1125;const sample=[100,950,100,90];ptext(x,[xx,yy,560,128],cp.mateNames[order[i]],l,l==='zh-TW'?42:54,base,sample,2);ptext(x,[xx,yy+160,560,195],cp.summaries[order[i]],l,l==='zh-TW'?37:46,base,sample,3);}
}
if(kind==='detail'){
// The store crop isolates this panel, so the dimmed background remains out of frame.
const words=l==='zh-TW'?['更換場景','這個場景的備忘','今日待辦','新增待辦事項','一點一點，過出自己的日常。','刪除場景','關閉']:['Change scene','A note for this scene','Today’s to-dos','Add a to-do','One little step at a time.','Delete scene','Close'];
for(const [b,t,sz]of [[[480,1024,1070,70],words[0],38],[[480,1293,1070,77],words[1],39],[[480,1755,1070,70],words[2],39],[[480,1852,980,52],words[3],33],[[770,2372,660,56],words[4],28],[[1415,2447,180,58],words[5],19],[[1438,2580,115,52],words[6],30]])ptext(x,b,t,l,sz,base,detail,1,t===words[3]||t===words[4]?'#90928B':INK);
x.strokeStyle='#B6B6B0';x.lineWidth=1;x.beginPath();x.moveTo(484,1903);x.lineTo(1562,1903);x.stroke();
const labels=l==='zh-TW'?['起床','早餐','專注','散步','閱讀','運動','學習']:['Wake up','Breakfast','Focus','A walk','Reading','Exercise','Study'];for(let i=0;i<7;i++){const xx=490+i*168;if(xx>1555)break;ptext(x,[xx,1196,Math.min(155,1565-xx),43],labels[i],l,l==='zh-TW'?19:24,base,detail);}
padPatch(x,[480,1380,1080,340],base,detail);x.strokeStyle='#B6B6B0';x.lineWidth=1;for(let i=0;i<5;i++){x.beginPath();x.moveTo(484,1428+i*70);x.lineTo(1562,1428+i*70);x.stroke();}lines(x,cp.scenes[2][1],484,1392,1070,l,l==='zh-TW'?28:34,70,4);
for(let i=0;i<3;i++)ptext(x,[586,1927+i*96,920,73],cp.scenes[2][2][i],l,l==='zh-TW'?27:33,base,detail,1);
}
return c;}
function cropCanvas(canvas,box){const c=createCanvas(box[2],box[3]);c.getContext('2d').drawImage(canvas,...box,0,0,box[2],box[3]);return c;}
function ipadMarketing(l,n,screen){const c=createCanvas(W,H),x=c.getContext('2d');x.fillStyle='#F2EEE5';x.fillRect(0,0,W,H);x.globalAlpha=.22;x.drawImage(paper,0,0,W,H);x.globalAlpha=1;const cp=COPY[l][n];text(x,l==='kr'?'오늘의 주인공':l==='zh-TW'?'今日的主角':'YOUR DAY',122,74,l,34,1000,INK,'heading');text(x,'iPad · 13-inch',1595,81,'us',28,340,MUTED,'heading');x.strokeStyle='#C6C8B8';x.lineWidth=1;x.beginPath();x.moveTo(122,143);x.lineTo(1926,143);x.stroke();
const sz=l==='kr'?116:l==='zh-TW'?78:88,lh=l==='kr'?124:115;text(x,cp[0],116,193,l,sz,1280,INK,'heading');text(x,cp[1],116,193+lh,l,sz,1280,INK,'heading');text(x,cp[3],1470,218,l,28,450,MUTED);lines(x,cp[2],1470,279,450,l,l==='zh-TW'?30:36,48,3,MUTED);
if(n===0||n===2){shadowImage(x,screen,204,471,1640,2188,42);}
if(n===1){const focused=cropCanvas(screen,[444,992,1160,1670]);shadowImage(x,focused,414,550,1220,1756,45);const features=l==='kr'?'장면 · 메모 · 할 일 · 나의 색':l==='zh-TW'?'場景 · 備忘 · 待辦 · 我的配色':'Scenes · Notes · To-dos · Your colors';text(x,features,414,2420,l,l==='zh-TW'?42:48,1220,INK,l==='us'?'heading':'ui');penLine(x,414,2522,1220);}
if(n===3){const focused=cropCanvas(screen,[0,150,2048,2318]);shadowImage(x,focused,184,560,1680,1902,42);}
if(n===4){penLine(x,290,710,1468);shadowImage(x,screen,464,860,1120,1180,120);const a=l==='kr'?'장면도, 할 일도 한눈에.':l==='zh-TW'?'場景和待辦，一眼就看見。':'Your moment. Your next little step.';text(x,a,310,2220,l,l==='zh-TW'?50:64,1460,INK,l==='us'?'heading':'ui');}
if(n===5){penLine(x,290,760,1468);shadowImage(x,screen,574,975,900,900,130);const a=l==='kr'?'작은 공간에, 나의 한 장면.':l==='zh-TW'?'小小空間，裝著我的日常。':'A small space. A moment of your own.';text(x,a,310,2135,l,l==='zh-TW'?50:64,1460,INK,l==='us'?'heading':'ui');const b=l==='kr'?'기억하고 싶은 장면을 홈 화면 가까이에.':l==='zh-TW'?'想留住的日常，就在主畫面。':'Keep a scene from your day close to home.';lines(x,b,310,2260,1460,l,40,60,2,MUTED);}
text(x,'YOUR DAY  /  IPAD 13',124,2682,'us',24,1400,MUTED,'heading');text(x,String(n+1).padStart(2,'0')+' / 06',1792,2682,'us',24,170,MUTED,'heading');return c;}

(async()=>{
 for(const d of ['zh-TW','previews','source/localized-ui'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
 for(const key of ['hero','detail','overview','mates'])images[key]=await loadImage(path.join(OUT,'source/originals',key+'.png'));
 paper=await loadImage(path.join(ROOT,'assets/color-textures/clean-paper.webp'));
 const l='zh-TW',screens=['hero','detail','overview','mates'].map(k=>ipadUI(k,l));
 for(let n=4;n<6;n++){const im=await loadImage(path.join(OLD,'source/localized-ui',l+'-'+names[n]+'.png'));const c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);screens.push(c);}
 for(let n=0;n<6;n++){
  fs.writeFileSync(path.join(OUT,'source/localized-ui',l+'-'+names[n]+'.png'),screens[n].toBuffer('image/png'));
  const filename=names[n]+'.png',canvas=ipadMarketing(l,n,screens[n]);
  await sharp(canvas.toBuffer('image/png')).removeAlpha().toColourspace('srgb').withIccProfile('srgb').png({compressionLevel:6}).toFile(path.join(OUT,l,filename));
  manifest.push({locale:l,appStoreLocale:'zh-Hant',file:l+'/'+filename,width:W,height:H,headline:COPY[l][n].slice(0,2).join(' '),subtitle:COPY[l][n][2]});console.log(l,filename);
 }
 const sheet=createCanvas(1860,520),c=sheet.getContext('2d');c.fillStyle='#E6E3D9';c.fillRect(0,0,1860,520);
 for(let n=0;n<6;n++){const im=await loadImage(path.join(OUT,l,names[n]+'.png'));c.drawImage(im,15+n*308,20,290,387);}
 c.fillStyle=INK;c.font='24px TraditionalUI';c.fillText('繁體中文（台灣） · iPad 13-inch · 2048 × 2732 · 6 screenshots',20,470);
 fs.writeFileSync(path.join(OUT,'previews',l+'-overview.jpg'),sheet.toBuffer('image/jpeg'));
 fs.writeFileSync(path.join(OUT,'manifest-zh-TW.json'),JSON.stringify(manifest,null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
