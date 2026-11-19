/** Export all 78 icons with their original canvas proportions and alpha. */
const fs=require('fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),doc=path.join(root,'docs/design/diary-item-quality-v2'),base=path.join(root,'output/diary-item-quality-v2');
(async()=>{
 const items=JSON.parse(fs.readFileSync(path.join(doc,'inventory.json')));const report=[];
 fs.mkdirSync(path.join(base,'exports'),{recursive:true});
 for(const x of items){
  const recordPath=path.join(doc,`generated-${x.index}.json`);
  if(!fs.existsSync(recordPath))continue;
  const record=JSON.parse(fs.readFileSync(recordPath));
  const original=await sharp(path.join(base,'originals',x.file)).metadata();
  const master=await sharp(record.master).metadata();
  if(!master.hasAlpha||Math.max(master.width,master.height)<1000)throw Error('Invalid master '+x.file);
  const factor=1536/Math.max(original.width,original.height);
  const width=Math.round(original.width*factor),height=Math.round(original.height*factor);
  const out=path.join(base,'exports',x.file);
  if(!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(record.master).mtimeMs) await sharp(record.master).trim().resize(width,height,{fit:'contain',background:'#00000000'}).webp({quality:95,alphaQuality:100,effort:4}).toFile(out);
  report.push({...x,width,height,master:record.master,bytes:fs.statSync(out).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex')});
 }
 fs.writeFileSync(path.join(doc,'manifest.json'),JSON.stringify(report,null,2));
 for(const cat of ['clip','camera','trash']){
  const rows=report.filter(x=>x.category===cat);const layers=[];
  for(let i=0;i<rows.length;i++){
   layers.push({input:await sharp(path.join(base,'exports',rows[i].file)).resize(200,170,{fit:'contain',background:'#F4EBE3'}).png().toBuffer(),left:i%6*220,top:Math.floor(i/6)*200});
   const label=Buffer.from(`<svg width="215" height="22"><text x="4" y="14" font-size="10" fill="#3e342e">${rows[i].id} ${rows[i].role}</text></svg>`);
   layers.push({input:label,left:i%6*220,top:Math.floor(i/6)*200+174});
  }
  await sharp({create:{width:1320,height:Math.ceil(rows.length/6)*200,channels:4,background:'#F4EBE3'}}).composite(layers).png().toFile(path.join(doc,`review-${cat}.png`));
 }
 console.log({count:report.length,bytes:report.reduce((n,x)=>n+x.bytes,0)});
})();
