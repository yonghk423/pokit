const fs=require('node:fs/promises');
const path=require('node:path');
const [dir,out,startArg,endArg]=process.argv.slice(2);
if(!dir||!out)throw new Error('Usage: node create-calendar-contact-sheet.cjs <image directory> <contact SVG> [start] [end]');
(async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 const start=Math.max(1,Number(startArg)||1),end=Math.min(manifest.files.length,Number(endArg)||manifest.files.length);
 const items=manifest.files.slice(start-1,end),cols=4,thumbW=240,thumbH=548,labelH=34,gap=12,margin=14;
 const rows=Math.ceil(items.length/cols),W=margin*2+cols*thumbW+(cols-1)*gap,H=margin*2+rows*(thumbH+labelH)+(rows-1)*gap;
 const images=[];
 for(let i=0;i<items.length;i++){
  const item=items[i],data=(await fs.readFile(path.join(dir,item.file))).toString('base64');
  const x=margin+(i%cols)*(thumbW+gap),y=margin+Math.floor(i/cols)*(thumbH+labelH+gap);
  images.push(`<g><rect x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" rx="9" fill="#fff"/><image x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${data}"/><text x="${x+thumbW/2}" y="${y+thumbH+23}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#222">${String(i+start).padStart(2,'0')} · ${item.file.replace(/\.png$/,'')}</text></g>`);
 }
 await fs.writeFile(out,`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#e9e4dc"/>${images.join('')}</svg>`);
 console.log(`${items.length} thumbnails: ${W}×${H}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
