// Compose every p5 scene with the fixed City office geometry and a scene-specific calendar skin.
// Usage: node scripts/compose-everyday-cinema.cjs <p5 source dir> <output dir> [start] [end]
const fs = require('node:fs/promises');
const path = require('node:path');
const template = require('../docs/design/photo-diary/city-calendar-template.json');
const [W,H]=template.size, [bx,by,bw,bh]=template.board;
const [gx,gy,gw,gh]=template.grid;
const cols=template.columns, rows=template.dateRows, ink='#24221e';
const recipes={
  transit:{material:'enamel-and-brushed-steel',frame:'#233a45',trim:'#c29c56',body:'#182329',a:'#f3ead8',b:'#e7ddc8',pattern:'metal',radius:2,frameStyle:'riveted'},
  porcelain:{material:'blue-and-white-porcelain',frame:'#16467c',trim:'#527eaa',body:'#192b43',a:'#f8f4e8',b:'#e3eadf',pattern:'porcelain',radius:6,frameStyle:'floral'},
  textile:{material:'woven-linen-and-denim',frame:'#506d7c',trim:'#b6a88e',body:'#202a2d',a:'#eee8dc',b:'#e0e7e7',pattern:'woven',radius:4,frameStyle:'stitched'},
  antique:{material:'aged-brass-and-marble',frame:'#63523b',trim:'#bb9a5b',body:'#25231f',a:'#f2eadb',b:'#e7dfcf',pattern:'marble',radius:2,frameStyle:'ornate'},
  bakery:{material:'walnut-and-butter-paper',frame:'#70432c',trim:'#d09b54',body:'#281c17',a:'#f4e4c8',b:'#eddbbb',pattern:'wood',radius:7,frameStyle:'wood'},
  vinyl:{material:'record-grooves-and-plum-velvet',frame:'#5c2033',trim:'#c19555',body:'#23171c',a:'#f0e1ce',b:'#ead6c5',pattern:'groove',radius:2,frameStyle:'theatre'},
  cork:{material:'corkboard-and-paper',frame:'#916b47',trim:'#6c8d75',body:'#30271e',a:'#f4e9d4',b:'#e7decc',pattern:'cork',radius:3,frameStyle:'pinned'},
  felt:{material:'green-felt-and-walnut',frame:'#254d3c',trim:'#a8834b',body:'#17271f',a:'#eee6d3',b:'#e1e7d9',pattern:'felt',radius:3,frameStyle:'cornerPocket'},
  mail:{material:'jade-enamel-and-postmark',frame:'#175b55',trim:'#d2a95e',body:'#17332e',a:'#f4ead6',b:'#e9dfc9',pattern:'postmark',radius:5,frameStyle:'mail'},
  climbing:{material:'oak-and-climbing-holds',frame:'#735335',trim:'#304a60',body:'#28221b',a:'#f1e7d6',b:'#e6dfd3',pattern:'stone',radius:8,frameStyle:'holds'},
  marine:{material:'navy-leather-and-brass-rope',frame:'#172c48',trim:'#d1aa62',body:'#172338',a:'#f2e8d3',b:'#e1e4df',pattern:'waves',radius:7,frameStyle:'nautical'},
  neon:{material:'smoked-glass-and-neon-enamel',frame:'#38313e',trim:'#9b547e',body:'#211d27',a:'#f1e7dc',b:'#e8dfea',pattern:'glass',radius:9,frameStyle:'neon'},
  ice:{material:'frosted-glass-and-ice',frame:'#537f94',trim:'#c9e0df',body:'#274452',a:'#f2f5ee',b:'#e3eeed',pattern:'frost',radius:9,frameStyle:'frost'},
  diner:{material:'red-menu-board-and-tile',frame:'#812e2a',trim:'#d4ae65',body:'#321a18',a:'#f6e9d2',b:'#ede0ca',pattern:'checkered',radius:3,frameStyle:'ticket'},
  lab:{material:'brushed-aluminum-and-teal-glass',frame:'#3b6570',trim:'#c6d4ca',body:'#1d3035',a:'#eef1e7',b:'#dfe8e0',pattern:'grid',radius:3,frameStyle:'instrument'},
  appliance:{material:'pale-mint-appliance-enamel-and-chrome',frame:'#637e82',trim:'#b8c9be',body:'#304448',a:'#f3f2e8',b:'#e1e9e4',pattern:'metal',radius:5,frameStyle:'appliance'},
  shelter:{material:'smoked-shelter-glass-and-painted-steel',frame:'#455962',trim:'#aebaa9',body:'#26383d',a:'#edf1eb',b:'#dce5e2',pattern:'glass',radius:9,frameStyle:'shelter'},
  paper:{material:'inked-paper-and-bookcloth',frame:'#55483b',trim:'#a48661',body:'#211e1a',a:'#f4ecd9',b:'#e8e1d3',pattern:'paper',radius:1,frameStyle:'book'},
  water:{material:'pool-tile-and-rippled-glass',frame:'#28809a',trim:'#9dd4d4',body:'#153844',a:'#e7f4ec',b:'#d8ecea',pattern:'water',radius:5,frameStyle:'tile'},
  wood:{material:'oiled-oak-and-black-iron',frame:'#785334',trim:'#b7955e',body:'#26201a',a:'#f3e7cf',b:'#e9dcc2',pattern:'wood',radius:1,frameStyle:'wood'},
};
function family(id,n){
 const s=id.toLowerCase();
 if(/pool|aquarium|beach|surf|water|sailing|maritime/.test(s))return 'water';
 if(/cinema|opera|jazz|karaoke|soundstage|backstage|concert|film|radio|records|vinyl/.test(s))return 'vinyl';
 if(/pottery|ceramic|glassblow|sculpture/.test(s))return 'porcelain';
 if(/laund|tailor|costume|cobbler|ballroom|dance|wedding|sewing/.test(s))return 'textile';
 if(/station|ferry|airport|bus|transit|cable-car|subway|cockpit|aircraft|hangar|lighthouse/.test(s))return 'transit';
 if(/science|clinic|dental|mri|control|laboratory|robot|weather|simulator|observatory|planetarium|wind-tunnel/.test(s))return 'lab';
 if(/market|bakery|diner|kitchen|grocery|restaurant|sushi|ice-cream|cooking|dining/.test(s))return 'bakery';
 if(/gym|sport|bowling|tennis|badminton|boxing|archery|skate|racing|kart|climb|trampoline|squash|baseball|table-tennis/.test(s))return 'felt';
 if(/workshop|repair|garage|carpentry|watch|barber|hair-salon|auction|tattoo/.test(s))return 'wood';
 if(/post-office|mail|courier/.test(s))return 'mail';
 if(/arcade|hotel|salon|balloon|night|ice-rink/.test(s))return /ice|rink/.test(s)?'ice':'neon';
 if(/book|library|court|museum|hall|archive|print|animation|office|backstage/.test(s))return 'paper';
 if(/cork|coworking/.test(s))return 'cork';
 if(/climb/.test(s))return 'climbing';
 if(/ferry|boat/.test(s))return 'marine';
 return ['antique','cork','diner','climbing','paper','marine','ice'][n%7];
}
const hash=s=>Array.from(s).reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const rect=(x,y,w,h,fill,attr='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${attr}/>`;
const line=(x1,y1,x2,y2,stroke,width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const circle=(x,y,r,fill,stroke=ink,width=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const each=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
const slot=(box,c,r,i)=>{const[x,y,w,h]=box;return[x+(i%c)*w/c,y+Math.floor(i/c)*h/r,w/c,h/r];};
const svg=c=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${c}</svg>`;
function pattern(s){
 const p=s.pattern, a=s.trim;
 const art={
  porcelain:`<path d="M0 12 Q10 2 20 12T40 12M0 30 Q10 20 20 30T40 30" fill="none" stroke="${a}" stroke-width="1.2"/><circle cx="9" cy="9" r="1.4" fill="${a}"/><circle cx="29" cy="27" r="1.1" fill="${a}"/>`,
  metal:`<path d="M0 7H40M0 15H40M0 28H40M0 34H40" stroke="${a}" stroke-width=".65" opacity=".65"/><path d="M0 10H40M0 31H40" stroke="#fff" stroke-width=".7" opacity=".8"/>`,
  water:`<path d="M-4 8Q4 2 12 8T28 8T44 8M-4 20Q4 14 12 20T28 20T44 20M-4 32Q4 26 12 32T28 32T44 32" fill="none" stroke="${a}" stroke-width="1.2"/><circle cx="8" cy="9" r="1" fill="${a}"/><circle cx="31" cy="23" r=".8" fill="${a}"/>`,
  wood:`<path d="M0 7 Q10 3 20 7T40 7M0 20 Q12 16 24 20T48 20M4 34 Q16 29 28 34T52 34" fill="none" stroke="${a}" stroke-width="1.25"/><ellipse cx="18" cy="20" rx="5" ry="2.5" fill="none" stroke="${a}" stroke-width=".9"/>`,
  woven:`<path d="M0 5H40M0 15H40M0 25H40M0 35H40M5 0V40M15 0V40M25 0V40M35 0V40" stroke="${a}" stroke-width=".8"/><path d="M0 10H40M10 0V40" stroke="#fff" stroke-width=".7"/>`,
  marble:`<path d="M-5 33 Q5 25 9 16T25 -5M4 45Q14 36 18 27T34 4M24 44Q32 36 37 24T47 14" fill="none" stroke="${a}" stroke-width="1.3"/>`,
  groove:`<circle cx="20" cy="20" r="16" fill="none" stroke="${a}" stroke-width="1"/><circle cx="20" cy="20" r="11" fill="none" stroke="${a}" stroke-width=".8"/><circle cx="20" cy="20" r="6" fill="none" stroke="${a}" stroke-width=".8"/>`,
  cork:`<circle cx="5" cy="6" r="1.5" fill="${a}"/><circle cx="18" cy="12" r="1" fill="${a}"/><circle cx="31" cy="5" r="1.3" fill="${a}"/><circle cx="9" cy="27" r="1.2" fill="${a}"/><circle cx="25" cy="34" r="1.5" fill="${a}"/><circle cx="37" cy="24" r="1" fill="${a}"/>`,
  felt:`<circle cx="5" cy="6" r=".9" fill="${a}"/><circle cx="15" cy="11" r=".7" fill="${a}"/><circle cx="26" cy="7" r=".8" fill="${a}"/><circle cx="35" cy="18" r=".9" fill="${a}"/><circle cx="10" cy="31" r=".8" fill="${a}"/><circle cx="27" cy="33" r=".8" fill="${a}"/>`,
  postmark:`<path d="M-5 8H45M-5 13H45M-5 28H45M-5 33H45" stroke="${a}" stroke-width="1.1"/><circle cx="31" cy="20" r="7" fill="none" stroke="${a}" stroke-width="1"/><path d="M24 20H38M31 13V27" stroke="${a}" stroke-width=".8"/>`,
  stone:`<path d="M4 5L14 2 21 8 18 18 8 20 2 13ZM27 23L37 20 43 27 38 37 28 36 24 30Z" fill="none" stroke="${a}" stroke-width="1.2"/>`,
  waves:`<path d="M-4 8Q4 2 12 8T28 8T44 8M-4 20Q4 14 12 20T28 20T44 20M-4 32Q4 26 12 32T28 32T44 32" fill="none" stroke="${a}" stroke-width="1.2"/>`,
  glass:`<path d="M-5 36L36 -5M8 45L45 8M-5 20L20 -5" stroke="${a}" stroke-width="1.5"/><path d="M6 4L15 4M4 6L4 15" stroke="#fff" stroke-width="1.4"/>`,
  frost:`<path d="M20 2V38M4 11L36 29M4 29L36 11M20 2L17 7M20 2L23 7M36 29L30 29M36 29L33 24M4 11L10 11M4 11L7 16" fill="none" stroke="${a}" stroke-width="1"/>`,
  checkered:`<path d="M0 0H40V40H0Z M0 20H40M20 0V40" fill="none" stroke="${a}" stroke-width="1.2"/><path d="M0 0H20V20H0Z M20 20H40V40H20Z" fill="${a}" opacity=".25"/>`,
  grid:`<path d="M0 0H40V40H0Z M0 10H40M0 20H40M0 30H40M10 0V40M20 0V40M30 0V40" fill="none" stroke="${a}" stroke-width=".85"/>`,
  paper:`<path d="M2 8H22M18 29H39M7 36H17" stroke="${a}" stroke-width=".8"/><circle cx="31" cy="9" r=".8" fill="${a}"/><circle cx="7" cy="23" r=".7" fill="${a}"/>`,
 }[p]||`<path d="M0 20H40M20 0V40" stroke="${a}" stroke-width="1"/>`;
 return `<pattern id="material" width="40" height="40" patternUnits="userSpaceOnUse">${art}</pattern>`;
}
function ornament(s,x,y,r=6){
 switch(s.frameStyle){
  case 'theatre': return `${circle(x,y,r,'#c79d58','#241913',1.5)}${circle(x,y,r*.45,'#5b1d30','#241913',1)}`;
  case 'floral': return `<path d="M${x} ${y+r} C${x-r*1.5} ${y-r} ${x+r*1.5} ${y-r} ${x} ${y+r} M${x} ${y} C${x-r*2} ${y-r*1.5} ${x-r*2} ${y+r*1.5} ${x} ${y} C${x+r*2} ${y-r*1.5} ${x+r*2} ${y+r*1.5} ${x} ${y}" fill="none" stroke="${s.trim}" stroke-width="1.4"/>`;
  case 'mail': return `<path d="M${x-r} ${y-r*.55}H${x+r}V${y+r*.55}H${x-r}Z M${x-r} ${y-r*.55}L${x} ${y+r*.05}L${x+r} ${y-r*.55}" fill="none" stroke="${s.trim}" stroke-width="1.5"/>`;
  case 'nautical': return `<path d="M${x} ${y-r}V${y+r}M${x-r} ${y}H${x+r}M${x-r*.8} ${y+r*.7}Q${x} ${y+r*1.5} ${x+r*.8} ${y+r*.7}" fill="none" stroke="${s.trim}" stroke-width="1.7"/>`;
  case 'ticket': return `<path d="M${x-r} ${y-r}H${x+r}V${y-r*.3}Q${x} ${y} ${x+r} ${y+r*.3}V${y+r}H${x-r}V${y+r*.3}Q${x} ${y} ${x-r} ${y-r*.3}Z" fill="none" stroke="${s.trim}" stroke-width="1.3"/>`;
  case 'holds': return `<path d="M${x-r} ${y}L${x-r*.4} ${y-r}L${x+r*.6} ${y-r*.5}L${x+r} ${y+r*.4}L${x} ${y+r}Z" fill="${s.trim}" stroke="${ink}" stroke-width="1"/>`;
  case 'pinned': return `${circle(x,y,r,'#ad8d5b',ink,1)}${circle(x,y,r*.25,'#efe5d0',ink,.7)}`;
  case 'cornerPocket': return `${circle(x,y,r,'#17251d','#bd985a',1.2)}${circle(x,y,r*.45,'#101613','#bd985a',.8)}`;
  case 'riveted': return `${circle(x,y,r*.8,'#c1a36c',ink,1)}${circle(x,y,r*.2,'#514639','#514639',.4)}`;
  default: return `${circle(x,y,r*.65,s.trim,ink,1)}`;
 }
}
function frameArt(s,seed){
 const outer=rect(bx,by,bw,bh,s.frame,`rx="${s.radius+5}" stroke="${ink}" stroke-width="3"`);
 const inner=rect(bx+5,by+5,bw-10,bh-10,'none',`rx="${s.radius+3}" stroke="${s.trim}" stroke-width="2.5"`);
 const fasteners=[[bx+13,by+13],[bx+bw-13,by+13],[bx+13,by+bh-13],[bx+bw-13,by+bh-13]].map(([x,y])=>ornament(s,x,y,4.5)).join('');
 let motif='';
 if(s.frameStyle==='stitched') motif=rect(bx+10,by+10,bw-20,bh-20,'none',`rx="${s.radius}" stroke="${s.trim}" stroke-width="1.4" stroke-dasharray="3 4"`);
 if(s.frameStyle==='theatre') {
  motif=each(18,i=>{const x=bx+22+i*((bw-44)/17);return `${circle(x,by+12,1.8,'#d5b16b','#31151c',.5)}${circle(x,by+bh-12,1.8,'#d5b16b','#31151c',.5)}`;});
 }
 if(s.frameStyle==='wood') motif=line(bx+10,by+bh-22,bx+bw-10,by+bh-22,s.trim,2)+line(bx+10,by+bh-18,bx+bw-10,by+bh-18,'#d2b27c',1);
 if(s.frameStyle==='pinned') motif=each(7,i=>ornament(s,gx+(i+.5)*gw/7,by+10,3));
 if(s.frameStyle==='holds') motif=each(5,i=>ornament(s,bx+10+(i+1)*(bw-20)/6,by+10,4));
 if(s.frameStyle==='nautical') motif=`<path d="M${bx+25} ${by+12} Q${bx+bw/2} ${by+32} ${bx+bw-25} ${by+12}" fill="none" stroke="${s.trim}" stroke-width="2"/>`;
 if(s.frameStyle==='floral') motif=each(8,i=>`<path d="M${bx+18+i*((bw-36)/7)} ${by+8}q4 4 0 8q-4-4 0-8" fill="${s.trim}"/>`);
 if(s.frameStyle==='ticket') motif=line(bx+20,by+bh-17,bx+bw-20,by+bh-17,s.trim,2,'stroke-dasharray="8 5"');
 if(s.frameStyle==='frost') motif=each(6,i=>line(bx+20+i*((bw-40)/5),by+bh-12,bx+30+i*((bw-40)/5),by+bh-12,'#d9eeec',1.3));
 if(s.frameStyle==='instrument') motif=each(12,i=>{const x=bx+28+i*((bw-56)/11);return line(x,by+12,x,by+18,s.trim,1.2)+circle(x,by+27,1.5,s.trim,s.body,.5);});
 if(s.frameStyle==='appliance') motif=each(13,i=>line(bx+18+i*9,by+12,bx+18+i*9,by+16,s.trim,1.3));
 if(s.frameStyle==='shelter') motif=`${line(bx+bw*.35,by+8,bx+bw*.35,by+bh-8,s.trim,1.2)}${line(bx+bw*.65,by+8,bx+bw*.65,by+bh-8,s.trim,1.2)}${line(bx+10,by+bh-26,bx+bw-10,by+bh-26,s.trim,1.2)}`;
 return `${outer}${inner}<rect x="${bx+8}" y="${by+8}" width="${bw-16}" height="${bh-16}" fill="url(#material)" opacity=".55"/>${motif}${fasteners}`;
}
function titleDecoration(s){
 const y=template.monthPlate[1]+template.monthPlate[3]/2, left=template.monthPlate[0]+20,right=template.monthPlate[0]+template.monthPlate[2]-20;
 return ornament(s,left,y,5.5)+ornament(s,right,y,5.5);
}
function cellSurface(s,box,index,area){
 const [x,y,w,h]=box, gap=area==='title'?0:s.gap, X=x+gap,Y=y+gap,width=w-gap*2,height=h-gap*2;
 const radius=area==='title'?s.radius+4:s.radius;
 const alternate=area==='date'&&s.alternate&&((index%cols+Math.floor(index/cols))%2===1);
 const fill=alternate?s.b:s.a;
 const base=rect(X,Y,width,height,fill,`rx="${radius}"`);
 const texture=rect(X+1,Y+1,width-2,height-2,'url(#material)',`rx="${Math.max(0,radius-1)}" opacity="${area==='date'?.22:.32}"`);
 let detail='';
 if(area==='title'){
  detail=rect(X+2,Y+2,width-4,height-4,'none',`rx="${radius+2}" stroke="${s.trim}" stroke-width="${s.titleFrame}"`)+titleDecoration(s);
 } else if(area==='weekday'){
  if(s.weekStyle==='label') detail=line(X+5,Y+height-7,X+width-5,Y+height-7,s.trim,2);
  if(s.weekStyle==='stitch') detail=rect(X+3,Y+3,width-6,height-6,'none',`rx="${Math.max(0,radius-1)}" stroke="${s.trim}" stroke-dasharray="3 3" stroke-width="1.2"`);
  if(s.weekStyle==='tile') detail=rect(X+4,Y+4,width-8,height-8,'none',`rx="${radius}" stroke="${s.trim}" stroke-width="1.5"`);
 } else {
  if(s.cellStyle==='double') detail=rect(X+3,Y+3,width-6,height-6,'none',`rx="${Math.max(0,radius-2)}" stroke="${ink}" stroke-width="1.1"`);
  if(s.cellStyle==='stitch') detail=rect(X+4,Y+4,width-8,height-8,'none',`rx="${Math.max(0,radius-2)}" stroke="${s.trim}" stroke-width="1.1" stroke-dasharray="3 3"`);
  if(s.cellStyle==='bracket') detail=`<path d="M${X+4} ${Y+12}V${Y+4}H${X+15}M${X+width-15} ${Y+4}H${X+width-4}V${Y+12}M${X+4} ${Y+height-12}V${Y+height-4}H${X+15}M${X+width-15} ${Y+height-4}H${X+width-4}V${Y+height-12}" fill="none" stroke="${ink}" stroke-width="1.6"/>`;
  if(s.cellStyle==='tile') detail=line(X+4,Y+height-5,X+width-4,Y+height-5,s.trim,1.5);
 }
 const border=rect(X,Y,width,height,'none',`rx="${radius}" stroke="${s.lineColor}" stroke-width="2.2"`);
 return base+texture+detail+border;
}
function designFor(id,number,accent){
 const family=familyOf(id,number), base=recipes[family], seed=hash(id+number);
 const palettes={
  transit:['#243c49','#344e62','#5b4634'], porcelain:['#16467c','#275c89','#315c75'], textile:['#536f7d','#66584f','#56615e'],
  antique:['#67553c','#4d4438','#6a624e'], bakery:['#70432c','#6b513b','#765634'], vinyl:['#672237','#39263f','#7b2d39'],
  cork:['#8b6746','#73583c','#806044'], felt:['#24503d','#305741','#25443c'], mail:['#175b55','#335c4c','#6a4e43'],
  climbing:['#735335','#635543','#805a3b'], marine:['#192e4a','#234158','#4a3f34'], neon:['#433441','#62304b','#45424d'],
  ice:['#537f94','#587d89','#4f748a'], diner:['#812e2a','#75382e','#6c4631'], lab:['#3b6570','#426e66','#526a75'],
  appliance:['#637e82','#536e76','#6b7c70'], shelter:['#455962','#4c6266','#3f5760'],
  paper:['#55483b','#6b5143','#4e4e48'], water:['#28809a','#287889','#356e7c'], wood:['#785334','#68472e','#625544']};
 const frames=palettes[family]||['#55483b'];
 const variant=seed%frames.length, frame=frames[variant], rotation=(seed>>>5)%4;
 const kindVariant=['double','stitch','bracket','tile'][rotation];
 const patterns={
  transit:['metal','grid','glass','postmark'], porcelain:['porcelain','marble','checkered'], textile:['woven','paper','cork'],
  antique:['marble','metal','paper','porcelain'], bakery:['wood','paper','checkered','cork'], vinyl:['groove','glass','paper','marble'],
  cork:['cork','paper','postmark'], felt:['felt','stone','checkered'], mail:['postmark','paper','metal'],
  climbing:['stone','felt','wood'], marine:['waves','water','glass'], neon:['glass','groove','checkered'],
  ice:['frost','glass','water'], diner:['checkered','metal','wood'], lab:['grid','glass','metal','frost'],
  paper:['paper','marble','woven'], water:['water','waves','porcelain'], wood:['wood','paper','metal'],
  appliance:['metal','grid','porcelain'], shelter:['glass','metal','waves'],
 };
 const framesFor={
  transit:['riveted','instrument','shelter','mail'], porcelain:['floral','ornate','tile','ticket'], textile:['stitched','pinned','book','cornerPocket'],
  antique:['ornate','book','pinned'], bakery:['wood','ticket','pinned','book'], vinyl:['theatre','ticket','neon','ornate'],
  cork:['pinned','mail','stitched'], felt:['cornerPocket','holds','stitch','ticket'], mail:['mail','ticket','book'],
  climbing:['holds','cornerPocket','riveted'], marine:['nautical','holds','riveted'], neon:['neon','theatre','ticket'],
  ice:['frost','tile','instrument'], diner:['ticket','wood','pinned'], lab:['instrument','riveted','frost'],
  paper:['book','mail','ornate','stitched'], water:['tile','nautical','frost'], wood:['wood','riveted','book'],
  appliance:['appliance','instrument','riveted'], shelter:['shelter','instrument','riveted'],
 };
 const stylePattern=patterns[family]?.[(seed>>>8)%patterns[family].length]||base.pattern;
 const styleFrame=framesFor[family]?.[(seed>>>12)%framesFor[family].length]||base.frameStyle;
 return {...base,frame,trim:base.trim,body:base.body,lineColor:base.body,pattern:stylePattern,frameStyle:styleFrame,
  a:base.a,b:base.b,alternate:['water','porcelain','felt','diner','lab'].includes(family),
  radius:[base.radius,Math.max(0,base.radius-2),Math.min(12,base.radius+3),base.radius][rotation],
  gap:[1,2,2.7,3.2][(seed>>>8)%4],titleFrame:[1.5,2.3,3][(seed>>>11)%3],
  cellStyle:kindVariant,weekStyle:['label','stitch','tile','plain'][rotation],
  accent,seed,number,id,family};
}
function familyOf(id,n){
 const name=id.toLowerCase();
 if(/ferry|boat|maritime|sailing|lighthouse|rocky-pier/.test(name))return 'marine';
 if(/museum|hotel|wine-cellar|auction|clock-tower/.test(name))return 'antique';
 if(/record|cinema|opera|jazz|karaoke|soundstage|backstage|concert|film|radio|vinyl|piano/.test(name))return 'vinyl';
 if(/darkroom|bookshop|bookbinding|library|city-hall|courtroom|printmaking|animation-studio/.test(name))return 'paper';
 if(/coworking|night-market|grocery/.test(name))return 'cork';
 if(/night-diner|fire-station/.test(name))return 'diner';
 if(/sushi|pottery|ceramic|glassblow|sculpture/.test(name))return 'porcelain';
 if(/climbing/.test(name))return 'climbing';
 if(/laund/.test(name))return 'appliance';
 if(/bus-stop|shelter/.test(name))return 'shelter';
 if(/ice-rink|ice-cream|ski-slope|deicing/.test(name))return 'ice';
 if(/airport|aircraft|hangar|cockpit|wind-tunnel|waterworks|science|clinic|dental|mri|control-room|robot|weather|simulator|observatory|planetarium/.test(name))return 'lab';
 if(/platform|subway|station|cable-car|dining-car/.test(name))return 'transit';
 if(/pool|aquarium|beach|surf|water/.test(name))return 'water';
 if(/bakery|kitchen|restaurant|cooking|dining/.test(name))return 'bakery';
 if(/gym|sport|bowling|tennis|badminton|boxing|archery|skate|racing|kart|trampoline|squash|baseball|table-tennis|billiards|dog-agility/.test(name))return 'felt';
 if(/post-office|mail/.test(name))return 'mail';
 if(/tailor|costume|cobbler|barber|salon|wedding|sewing|dance/.test(name))return 'textile';
 if(/workshop|repair|garage|carpentry|watch|tattoo|model-studio/.test(name))return 'wood';
 if(/arcade|roller/.test(name))return 'neon';
 if(/office|archive|animation|book|library|court|city-hall|print|cork/.test(name))return 'paper';
 if(n===1)return 'transit';
 return ['antique','cork','diner','climbing','paper','marine','ice'][n%7];
}
async function embedded(file){
 const bytes=await fs.readFile(file);
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Expected PNG input: '+file);
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),uri:'data:image/png;base64,'+bytes.toString('base64')};
}
function artwork(s,scene){
 const scenicHeight=scene.height*.56, floorStart=scene.height*.89;
 const defs=`<defs>
   <image id="scene" width="${scene.width}" height="${scene.height}" xlink:href="${scene.uri}"/>
   ${pattern(s)}
   <clipPath id="boardClip">${rect(bx,by,bw,bh,'white',`rx="${s.radius+5}"`)}</clipPath>
 </defs>`;
 const backdrop=`<svg x="0" y="0" width="${W}" height="${by}" viewBox="0 0 ${scene.width} ${scenicHeight}" preserveAspectRatio="xMidYMid slice"><use xlink:href="#scene"/></svg>`+
   `<svg x="0" y="${by+bh}" width="${W}" height="${H-by-bh}" viewBox="0 ${floorStart} ${scene.width} ${scene.height-floorStart}" preserveAspectRatio="xMidYMid slice"><use xlink:href="#scene"/></svg>`;
 const board=frameArt(s, s.seed)+
   cellSurface(s,template.monthPlate,0,'title')+
   each(cols,i=>cellSurface(s,slot(template.weekdayPlate,cols,1,i),i,'weekday'))+
   each(cols*rows,i=>cellSurface(s,slot(template.grid,cols,rows,i),i,'date'));
 return svg(defs+backdrop+`<g clip-path="url(#boardClip)">${board}</g>`+
   rect(bx+1,by+1,bw-2,bh-2,'none',`rx="${s.radius+5}" stroke="${ink}" stroke-width="2.4"`));
}
async function main(){
 const [sources,out]=process.argv.slice(2);
 if(!sources||!out)throw new Error('Expected p5 source and output directories');
 const [start=1,end=100]=process.argv.slice(4).map(Number);
 const files=await fs.readdir(sources); await fs.mkdir(out,{recursive:true});
 const manifest={template,stylePolicy:'unique-scene-materials-fixed-city-geometry-v1',files:[]};
 for(let n=start;n<=end;n++){
  const prefix=String(n).padStart(2,'0');
  const source=files.find(f=>f.startsWith('p5-'+prefix+'-')&&f.endsWith('.png'));
  if(!source)throw new Error('Missing p5 source '+prefix);
  const id=source.slice(3,-4), scene=await embedded(path.join(sources,source));
  const accent=recipes[familyOf(id,n)].trim;
  const style=designFor(id,n,accent);
  const file=id+'.png', svgFile=id+'.svg'; await fs.writeFile(path.join(out,svgFile),artwork(style,scene));
  manifest.files.push({file,svg:svgFile,source,style:{family:style.family,material:style.material,pattern:style.pattern,frame:style.frame,frameStyle:style.frameStyle,cellStyle:style.cellStyle,accent}});
 }
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
