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
const W=1320,H=2868,INK='#24251F',MUTED='#616657';
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
function patch(c,b,base,kind='surface'){const [x,y,w,h]=b;const sample=kind==='cream'?[1035,1770,12,12]:kind==='detail'?[100,760,50,35]:kind==='mate'?[100,850,80,50]:kind==='card'?[90,700,50,80]:[600,450,100,35];const colorCanvas=createCanvas(1,1),cc=colorCanvas.getContext('2d');cc.drawImage(base,...sample,0,0,1,1);const p=cc.getImageData(0,0,1,1).data;c.fillStyle=`rgb(${p[0]},${p[1]},${p[2]})`;c.fillRect(x,y,w,h);c.save();c.globalAlpha=.13;c.drawImage(paper,x,y,w,h);c.restore();}
function mainHeader(c,base,l){const cp=mockCopy[localeMap[l]];patch(c,[175,245,850,82],base);text(c,'10/26 · '+cp.titles[0],182,262,l,l==='zh-TW'?35:42,830);patch(c,[170,354,350,78],base);text(c,cp.name,181,372,l,41,330);patch(c,[958,370,210,65],base);text(c,'18° · 首爾',965,385,l,34,200);}
function uiScreen(kind,l){const base=images[kind],c=createCanvas(1206,2622),x=c.getContext('2d');x.drawImage(base,0,0);if(l==='kr')return c;const cp=mockCopy[localeMap[l]],book=bookstoreSceneCopy[localeMap[l]];if(kind==='hero'||kind==='overview')mainHeader(x,base,l);
if(kind==='hero'){patch(x,[158,1802,875,80],base,'cream');text(x,book[0],162,1819,l,49,865);patch(x,[158,1898,882,193],base,'cream');lines(x,book[1],162,1914,870,l,l==='zh-TW'?34:39,55,3,'#5A5C50');}
if(kind==='detail'){
const fills=[[[90,272,780,68],l==='zh-TW'?'第 06 個場景':'Scene 06',95,282,42],[[90,425,1000,80],l==='zh-TW'?'更換場景':'Change scene',95,439,49],[[92,819,1020,85],l==='zh-TW'?'這個場景的備忘':'A note for this scene',95,840,49],[[92,1518,1020,85],l==='zh-TW'?'今日待辦':'Today’s to-dos',95,1535,49],[[92,1630,900,84],l==='zh-TW'?'新增待辦事項':'Add a to-do',95,1652,42],[[899,2209,190,73],l==='zh-TW'?'關閉':'Close',960,2228,40]];
for(const [b,t,tx,ty,sz]of fills){patch(x,b,base,'detail');text(x,t,tx,ty,l,sz,b[2]-20,ty===1652?'#91938F':INK);}
const labels=l==='zh-TW'?['起床','早餐','專注','散步']:['Wake up','Breakfast','Focus','A walk'];for(let i=0;i<4;i++){patch(x,[101+i*252,688,218,70],base,'detail');text(x,labels[i],105+i*252,701,l,31,211);}
patch(x,[94,952,1024,510],base,'detail');x.strokeStyle='#B6B6B0';x.lineWidth=1.2;for(let i=0;i<5;i++){x.beginPath();x.moveTo(96,1031+i*106);x.lineTo(1110,1031+i*106);x.stroke();}
let memo=book[1];if(l==='us')memo='After work, I compared three books at the bookshop and read a few opening pages. I chose an essay collection for busy evenings. The novel can wait until I finish the books at home.';
if(l==='zh-TW')memo=book[1];
lines(x,memo,96,973,1010,l,l==='zh-TW'?40:42,106,5);
for(let i=0;i<3;i++){patch(x,[250,1777+i*144,765,88],base,'detail');lines(x,book[2][i],257,1798+i*144,750,l,l==='zh-TW'?33:39,43,2);}
}
if(kind==='overview'){
patch(x,[45,482,500,65],base);text(x,l==='zh-TW'?'7 個場景':'7 scenes',48,495,l,33,490);
const rows=[[70,1093,560,1170,540,0],[702,1093,560,1170,435,1],[70,1745,560,1821,1040,2],[70,2340,0,0,500,3],[635,2340,0,0,500,4]];
for(const [xx,yy,mx,my,ww,idx]of rows){const tw=idx<2?ww:idx===2?1038:ww;patch(x,[xx,yy,tw,64],base,'card');text(x,cp.scenes[idx][0],xx,yy+9,l,l==='zh-TW'?30:35,tw-10);if(my){patch(x,[xx,my-12,(idx===0?648:1155)-xx,58],base,'card');lines(x,cp.scenes[idx][1],xx,my,tw-12,l,l==='zh-TW'?25:29,35,1,'#72776E');}}
}
if(kind==='overview')x.drawImage(base,0,2374,1206,248,0,2374,1206,248);
if(kind==='mates'){
const order=[0,6,1,3,4,5,2,7];for(let i=0;i<8;i++){const col=i%3,row=Math.floor(i/3),xx=70+col*383,yy=612+row*634;const title=cp.mateNames[order[i]],body=cp.summaries[order[i]];patch(x,[xx,yy,322,210],base,'mate');lines(x,title,xx,yy+8,310,l,l==='zh-TW'?27:34,39,2);lines(x,body,xx,yy+96,310,l,l==='zh-TW'?24:28,40,3);}
}
return c;}
function drawWeather(c,x,y,size=38){c.strokeStyle='#5B6257';c.lineWidth=3;c.beginPath();c.arc(x+10,y+9,7,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x+4,y+33);c.bezierCurveTo(x-8,y+24,x+4,y+17,x+12,y+20);c.bezierCurveTo(x+19,y+8,x+32,y+17,x+31,y+23);c.bezierCurveTo(x+47,y+24,x+43,y+36,x+33,y+35);c.lineTo(x+4,y+35);c.stroke();}
function check(c,x,y,yes,s=38){c.strokeStyle=INK;c.lineWidth=2.5;c.fillStyle=yes?'#ECE8D9':'#FFFEFA';c.beginPath();c.ellipse(x+s/2,y+s/2,s*.45,s*.47,-.08,0,Math.PI*2);c.fill();c.stroke();if(yes){c.lineWidth=3.2;c.beginPath();c.moveTo(x+s*.25,y+s*.51);c.lineTo(x+s*.44,y+s*.69);c.lineTo(x+s*.77,y+s*.29);c.stroke();}}
function cover(c,img,x,y,w,h,focus=.3){const scale=Math.max(w/img.width,h/img.height);const sw=w/scale,sh=h/scale;const sy=Math.max(0,Math.min(img.height-sh,img.height*focus-sh*.4));c.drawImage(img,(img.width-sw)/2,sy,sw,sh,x,y,w,h);}
function widget(l,small=false){const ww=small?900:1120,hh=small?900:1180,c=createCanvas(ww,hh),x=c.getContext('2d');const cp=mockCopy[localeMap[l]],s=cp.scenes[small?5:0];round(x,0,0,ww,hh,small?130:120);x.clip();x.fillStyle='#FAFAF6';x.fillRect(0,0,ww,hh);x.globalAlpha=.35;x.drawImage(paper,0,0,ww,hh);x.globalAlpha=1;const imageH=small?650:550;cover(x,art[small?'night':'wake'],0,0,ww,imageH,small?.29:.18);drawWeather(x,ww-345,40);text(x,'18° · 首爾',ww-285,44,l,39,270,'#384437');if(small){lines(x,s[0],50,703,800,l,l==='zh-TW'?44:50,63,2);}else{lines(x,s[0],48,585,1024,l,l==='zh-TW'?46:52,61,1);lines(x,s[1],48,663,1020,l,l==='zh-TW'?32:38,46,2);text(x,l==='kr'?'오늘 할 일':l==='zh-TW'?'今日待辦':'Today’s to-dos',48,782,l,35,1000,'#747A6C');for(let i=0;i<3;i++){check(x,50,858+i*90,i<2,46);const tc=i<2?'#84877C':INK;text(x,s[2][i],122,862+i*90,l,l==='zh-TW'?31:36,935,tc);if(i<2){font(x,l,l==='zh-TW'?31:36);x.strokeStyle='#84877C';x.lineWidth=1.5;x.beginPath();x.moveTo(122,888+i*90);x.lineTo(Math.min(1060,122+x.measureText(s[2][i]).width),888+i*90);x.stroke();}}}return c;}
function background(n){const c=createCanvas(W,H),x=c.getContext('2d');x.fillStyle='#F2EEE5';x.fillRect(0,0,W,H);x.globalAlpha=.22;x.drawImage(paper,0,0,W,H);x.globalAlpha=1;x.strokeStyle='#CBCAB9';x.lineWidth=1;x.beginPath();x.moveTo(98,174);x.lineTo(1222,174);x.stroke();return c;}
function shadowImage(c,img,x,y,w,h,r=42){c.save();c.shadowColor='#35352826';c.shadowBlur=36;c.shadowOffsetY=18;c.fillStyle='#FCFBF6';round(c,x,y,w,h,r);c.fill();c.restore();c.save();round(c,x,y,w,h,r);c.clip();c.drawImage(img,x,y,w,h);c.restore();c.strokeStyle='#38392E32';c.lineWidth=1.4;round(c,x,y,w,h,r);c.stroke();}
function penLine(c,x,y,w){c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.3,y-3,x+w*.6,y+3,x+w,y-1);c.stroke();}
function marketing(l,n,screen){const c=background(n),x=c.getContext('2d'),cp=COPY[l][n];text(x,l==='kr'?'오늘의 주인공':l==='zh-TW'?'今日的主角':'YOUR DAY',100,93,l,31,680,INK,'heading');text(x,String(n+1).padStart(2,'0')+' / 06',1086,96,'us',26,150,MUTED,'heading');text(x,cp[3],100,215,l,28,1100,MUTED);const titleSize=l==='kr'?119:l==='zh-TW'?83:96;const lineHeight=l==='kr'?130:l==='zh-TW'?121:116;text(x,cp[0],94,287,l,titleSize,1130,INK,'heading');text(x,cp[1],94,287+lineHeight,l,titleSize,1130,INK,'heading');text(x,cp[2],102,553,l,l==='zh-TW'?32:35,1120,MUTED,l==='us'?'heading':'ui');
if(n<4){shadowImage(x,screen,170,665,980,2130,54);}else{const sm=n===5;const w=sm?900:1120,h=sm?900:1180,xx=(W-w)/2,yy=sm?1050:900;penLine(x,205,sm?970:820,910);shadowImage(x,screen,xx,yy,w,h,sm?130:120);const title=l==='kr'?(sm?'작은 공간에, 나의 한 장면.':'장면도, 할 일도 한눈에.') :l==='zh-TW'?(sm?'小小空間，裝著我的日常。':'場景和待辦，一眼就看見。'):(sm?'A small space. A moment of your own.':'Your moment. Your next little step.');text(x,title,140,sm?2130:2260,l,l==='kr'?57:l==='zh-TW'?43:51,1040,INK,l==='us'?'heading':'ui');const sub=l==='kr'?'기록한 장면을 홈 화면 위젯으로 만나보세요.':l==='zh-TW'?'把記下的日常，放進主畫面的小工具。':'Bring a scene from your day to your Home Screen.';lines(x,sub,140,sm?2240:2370,1040,l,l==='zh-TW'?32:37,52,2,MUTED);text(x,'YOUR DAY',100,2745,'us',29,800,MUTED,'heading');}
return c;}

(async()=>{
 for(const d of ['zh-TW','previews','source/localized-ui'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
 for(const key of ['hero','detail','overview','mates'])images[key]=await loadImage(path.join(OUT,'source/originals',key+'.png'));
 paper=await loadImage(path.join(ROOT,'assets/color-textures/clean-paper.webp'));
 art.wake=await loadImage(path.join(ROOT,'assets/activity-illustrations/protagonist-1/23-morning-stretch-960.webp'));
 art.night=await loadImage(path.join(ROOT,'assets/activity-illustrations/protagonist-1/53-diary-in-bed-960.webp'));
 const l='zh-TW';const screens=['hero','detail','overview','mates'].map(k=>uiScreen(k,l));screens.push(widget(l),widget(l,true));
 for(let n=0;n<6;n++){
  fs.writeFileSync(path.join(OUT,'source/localized-ui',l+'-'+names[n]+'.png'),screens[n].toBuffer('image/png'));
  const filename=names[n]+'.png',canvas=marketing(l,n,screens[n]);
  await sharp(canvas.toBuffer('image/png')).removeAlpha().toColourspace('srgb').withIccProfile('srgb').png({compressionLevel:6}).toFile(path.join(OUT,l,filename));
  manifest.push({locale:l,appStoreLocale:'zh-Hant',file:l+'/'+filename,width:W,height:H,headline:COPY[l][n].slice(0,2).join(' '),subtitle:COPY[l][n][2]});console.log(l,filename);
 }
 const sheet=createCanvas(1650,700),c=sheet.getContext('2d');c.fillStyle='#E6E3D9';c.fillRect(0,0,1650,700);
 for(let n=0;n<6;n++){const im=await loadImage(path.join(OUT,l,names[n]+'.png'));c.drawImage(im,15+n*273,30,258,560);}
 c.fillStyle=INK;c.font='24px TraditionalUI';c.fillText('繁體中文（台灣） · 1320 × 2868 · 6 screenshots',20,650);
 fs.writeFileSync(path.join(OUT,'previews',l+'-overview.jpg'),sheet.toBuffer('image/jpeg'));
 fs.writeFileSync(path.join(OUT,'manifest-zh-TW.json'),JSON.stringify(manifest,null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
