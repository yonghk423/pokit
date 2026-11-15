// Usage: node scripts/compose-city-calendar.cjs <p5 source dir> <v1 material dir> <review dir> [start] [end]
// Render the layered paper, ink and scene at the same scale as the reference WebP.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const template = require('../docs/design/photo-diary/city-calendar-template.json');
const [W, H] = template.size;
const [bx, by, bw, bh] = template.board;
const [gx, gy, gw, gh] = template.grid;
const cols = template.columns, rows = template.dateRows;
const ink = '#24221e';

// Material sample bounds are on a 270px-wide reference thumbnail of each old illustration.
// Only the ornamental rim and empty material swatches are taken from those plates.
// The foreground, six date rows and seven columns are built anew at reference coordinates.
const skins = [
  {id:'01-platform', kind:'flap', outer:[0,201,270,397], inner:[14,207,256,381], header:[27,209,242,225], cell:[18,255,42,262], footer:400, focus:.38, body:'#292925', light:'#f1e7d5', gap:3.5, r:2},
  {id:'02-pottery', kind:'glaze', outer:[0,190,270,410], inner:[15,225,254,406], header:[32,207,236,220], cell:[21,246,48,266], alt:[55,246,82,266], footer:412, focus:.34, body:'#d2cab9', light:'#f3ead8', gap:1.0, r:1},
  {id:'03-laundromat', kind:'pocket', outer:[6,185,264,391], inner:[11,202,258,378], header:[60,202,210,217], cell:[16,245,45,261], footer:394, focus:.37, body:'#8199a6', light:'#f1eadc', gap:2.5, r:3},
  {id:'04-museum', kind:'mat', outer:[0,194,270,401], inner:[14,204,256,381], header:[27,207,240,223], cell:[18,258,42,274], footer:404, focus:.27, body:'#bfb39a', light:'#f6efdf', gap:3.5, r:2},
  {id:'05-bakery', kind:'tray', outer:[0,185,270,383], inner:[22,193,249,373], header:[30,196,240,211], cell:[26,251,52,265], footer:387, focus:.14, body:'#6d5037', light:'#f3e5cb', gap:3.6, r:7},
  {id:'06-record-shop', kind:'groove', outer:[0,167,270,395], inner:[13,175,258,375], header:[30,178,239,192], cell:[19,224,43,246], footer:398, focus:.20, body:'#482534', light:'#f0e2ce', gap:2.2, r:2},
  {id:'07-airport', kind:'enamel', outer:[1,211,269,397], inner:[13,219,256,384], header:[29,222,241,233], cell:[35,221,60,234], footer:400, focus:.42, body:'#313735', light:'#f0e8d9', gap:3, r:3},
  {id:'08-bus-stop', kind:'shelter', outer:[1,196,269,393], inner:[15,207,255,373], header:[30,211,240,222], cell:[19,254,46,268], footer:396, focus:.22, body:'#555851', light:'#ebe5d8', gap:2.6, r:8},
  {id:'09-tailor', kind:'stitch', outer:[0,147,270,379], inner:[15,170,255,347], header:[32,174,237,188], cell:[18,219,46,232], footer:382, focus:.21, body:'#cabda8', light:'#f2e8d5', gap:2.0, r:1},
  {id:'10-swimming-pool', kind:'tile', outer:[0,203,270,399], inner:[14,209,255,382], header:[29,212,244,226], cell:[17,255,47,274], footer:402, focus:.36, body:'#6c9bb0', light:'#f2efe1', gap:2.0, r:5},
];
const kinds = ['flap','glaze','pocket','mat','tray','groove','enamel','shelter','stitch','tile'];
function contextualKind(id, number) {
  const name=id.toLowerCase();
  if(/cinema|opera|jazz|karaoke|soundstage|backstage|concert|records|radio/.test(name)) return 'groove';
  if(/workshop|repair|tailor|cobbler|carpentry|glassblow|watch|barber|hair-salon|bookbinding/.test(name)) return 'stitch';
  if(/pool|aquarium|surf|waterworks|beach|sailing|maritime/.test(name)) return 'tile';
  if(/office|science|clinic|control|laboratory|robotics|weather|simulator|observatory|planetarium/.test(name)) return 'enamel';
  if(/market|bakery|diner|kitchen|grocery|restaurant|sushi|ice-cream|cooking/.test(name)) return 'tray';
  if(/station|ferry|airport|transit|cable-car|subway|cockpit|aircraft|hangar/.test(name)) return 'shelter';
  if(/gym|sport|bowling|tennis|badminton|boxing|archery|skate|racing|kart|climb|trampoline|squash/.test(name)) return 'mat';
  return kinds[(number*7+id.length)%kinds.length];
}
function tint(hex, amount) {
  const rgb=hex.slice(1).match(/.{2}/g).map(v=>parseInt(v,16));
  return '#'+rgb.map(v=>Math.round(v*amount).toString(16).padStart(2,'0')).join('');
}
function mix(hexA,hexB,amount) {
  const a=hexA.slice(1).match(/.{2}/g).map(v=>parseInt(v,16));
  const b=hexB.slice(1).match(/.{2}/g).map(v=>parseInt(v,16));
  return '#'+a.map((v,i)=>Math.round(v*(1-amount)+b[i]*amount).toString(16).padStart(2,'0')).join('');
}
async function materialAccent(file) {
  const {data}=await sharp(file).resize(270,462,{fit:'fill'}).extract({left:7,top:228,width:5,height:5}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const channels=[0,1,2].map(c=>Math.round(Array.from({length:25},(_,i)=>data[i*3+c]).reduce((a,b)=>a+b,0)/25));
  const hex='#'+channels.map(v=>v.toString(16).padStart(2,'0')).join('');
  return mix(tint(hex,.72),'#28231D',.1);
}
function extendedSkin(id, number, materialAccentColor) {
  // Each theme keeps its own legacy material plate and its characteristic accent.
  // The calendar geometry remains entirely governed by city-calendar-template.json.
  const base=skins[(number-1)%skins.length];
  const accent=materialAccentColor||'#655b4d';
  return {...base,id,kind:contextualKind(id,number),
    outer:[0,178,270,417],inner:[12,188,258,405],header:[27,194,243,209],cell:[19,237,49,253],alt:[60,237,90,253],footer:420,
    body:ink,light:mix('#f5efdf',accent,.15),accent,
    gap:[1,1.5,2,2.5,3,3.5][(number*7+id.length)%6],r:[1,2,3,5,7,9][(number*3+id.length)%6],focus:[.18,.22,.27,.31,.36,.4][(number*5+id.length)%6]};
}
const rect = (x,y,w,h,fill,attr='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${attr}/>`;
const line = (x1,y1,x2,y2,color,width=1,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const svg = content => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${content}</svg>`;
const each = (count, fn) => Array.from({length:count}, (_,i)=>fn(i)).join('');
const slot = (box, c, r, i) => {
  const [x,y,w,h]=box;
  return [x+(i%c)*w/c,y+Math.floor(i/c)*h/r,w/c,h/r];
};
function skeleton() {
  const frame = box => rect(...box,'none',`stroke="${ink}" stroke-width="1.5"`);
  return svg(frame(template.board) + frame(template.monthPlate)
    + each(cols, i => frame(slot(template.weekdayPlate,cols,1,i)))
    + each(rows*cols, i => frame(slot(template.grid,cols,rows,i))));
}
async function embedded(file) {
  const input = sharp(file);
  const {width,height} = await input.metadata();
  // PNG retains the source values of the decoded artwork throughout composition.
  const buffer = await input.png().toBuffer();
  return {width,height,uri:'data:image/png;base64,'+buffer.toString('base64')};
}
function crop(id, sourceRect, dest, aspect='none') {
  const [x,y,w,h] = dest;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${sourceRect.join(' ')}" preserveAspectRatio="${aspect}" overflow="hidden"><use xlink:href="#${id}"/></svg>`;
}
const fromEdges = (l,t,r,b) => [l,t,r-l,b-t];
function rim(s) {
  const inset=s.kind==='tile'?7:5;
  const main=rect(bx+1,by+1,bw-2,bh-2,'none',`rx="${s.r+4}" stroke="${ink}" stroke-width="3"`);
  const inner=rect(bx+inset,by+inset,bw-inset*2,bh-inset*2,'none',`rx="${Math.max(0,s.r)}" stroke="${s.accent||ink}" stroke-width="2"`);
  if(['flap','enamel','shelter'].includes(s.kind)) {
    return main+inner+[[bx+15,by+15],[bx+bw-15,by+15],[bx+15,by+bh-15],[bx+bw-15,by+bh-15]]
      .map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="${s.accent||ink}" stroke="${ink}" stroke-width="1.2"/>`).join('');
  }
  return main+inner;
}
function surface(s, box, index, area) {
  const [x,y,w,h]=box;
  const gap=area==='title'?0:s.gap;
  const X=x+gap, Y=y+gap, width=w-2*gap, height=h-2*gap;
  const shape=rect(X,Y,width,height,s.light,`rx="${s.r}"`);
  const clipId=`clip-${area}-${index}`;
  const sample=area==='title' ? s.header : s.alt && ((index%cols+Math.floor(index/cols))%2) ? s.alt : s.cell;
  let detail='';
  if (s.kind==='flap' && area==='date') {
    detail=rect(X,Y+height*.51,3.5,9,ink)+rect(X+width-3.5,Y+height*.51,3.5,9,ink);
  } else if(s.kind==='pocket' || s.kind==='stitch') {
    detail=rect(X+3.5,Y+3.5,width-7,height-7,'none',`rx="2" stroke="#7b7063" stroke-width="1" stroke-dasharray="${s.kind==='pocket'?'4 2':'2 2'}"`);
  } else if(s.kind==='mat' || s.kind==='tile') {
    detail=line(X+3,Y+height-3,X+width-3,Y+height-3,'#827665',1)+line(X+3,Y+3,X+width-4,Y+3,'#fffbed',2);
  } else if(s.kind==='tray' || s.kind==='shelter') {
    detail=rect(X+3,Y+3,width-6,height-6,'none',`rx="${s.r-2}" stroke="#a89c88" stroke-width="1"`);
  } else if(s.kind==='enamel' && area==='weekday') {
    detail=line(X+4,Y+height-4,X+width-4,Y+height-4,'#aa9d85');
  }
  return `${shape}${detail}`+
    rect(X,Y,width,height,'none',`rx="${s.r}" stroke="${ink}" stroke-width="2.2"`);
}
function artwork(s, scene, skin) {
  const skH=270*skin.height/skin.width;
  const sceneH=W*scene.height/scene.width;
  // Portrait scenes retain their native aspect ratio. The panel covers the fade.
  const offset=Math.round((sceneH-by)*s.focus);
  const foot=[0,s.footer,270,skH-s.footer];
  const defs=`<defs>
    <image id="scene" width="${W}" height="${sceneH}" xlink:href="${scene.uri}"/>
    <image id="skin" width="270" height="${skH}" xlink:href="${skin.uri}"/>
    <linearGradient id="fade" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0.80" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
    <mask id="sceneFade">${rect(0,0,W,by+135,'url(#fade)')}</mask>
    <clipPath id="boardClip">${rect(bx,by,bw,bh,'white',`rx="${s.r+4}"`)}</clipPath>
    </defs>`;
  const backdrop=rect(0,0,W,H,'#e7dece')+
    `<g mask="url(#sceneFade)"><use xlink:href="#scene" y="-${offset}"/></g>`+
    crop('skin',foot,[0,by+bh,W,H-by-bh],'xMidYMid slice');
  const board=rect(bx,by,bw,bh,s.body)+rim(s)+
    surface(s,template.monthPlate,0,'title')+
    each(cols,i=>surface(s,slot(template.weekdayPlate,cols,1,i),i,'weekday'))+
    each(cols*rows,i=>surface(s,slot(template.grid,cols,rows,i),i,'date'));
  return svg(defs+backdrop+`<g clip-path="url(#boardClip)">${board}</g>`+
    rect(bx+1,by+1,bw-2,bh-2,'none',`rx="${s.r+4}" stroke="${ink}" stroke-width="2"`));
}
async function main() {
  const [sources,materialDir,out] = process.argv.slice(2);
  if (!out) throw new Error('Expected illustration, material and output directories');
  const files=await fs.readdir(sources), materialFiles=await fs.readdir(materialDir);
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'city-calendar-template.svg'),skeleton());
  const [start=1,end=10]=process.argv.slice(5).map(Number);
  const manifest={template, files:[]};
  for(let number=start;number<=end;number++) {
    const sourcePrefix=String(number).padStart(2,'0');
    const source=files.find(f=>f.startsWith('p5-'+sourcePrefix+'-') && f.endsWith('.png'));
    if(!source) throw new Error('Missing source for theme '+sourcePrefix);
    const material=materialFiles.find(f=>new RegExp('^'+sourcePrefix+'-.+\\.(webp|png)$').test(f));
    if(!material) throw new Error('Missing material for theme '+sourcePrefix);
    const id=material.replace(/\.(webp|png)$/,'');
    const scene=await embedded(path.join(sources,source));
    const materialPath=path.join(materialDir,material);
    const old=await embedded(materialPath);
    const skin=number<=10 ? skins[number-1] : extendedSkin(id,number,await materialAccent(materialPath));
    const bytes=await sharp(Buffer.from(artwork(skin,scene,old)),{limitInputPixels:false}).png().toBuffer();
    const file=skin.id+'.png';
    await fs.writeFile(path.join(out,file),bytes);
    manifest.files.push({file,source,material,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
if(require.main===module) main().catch(e=>{console.error(e);process.exitCode=1;});
