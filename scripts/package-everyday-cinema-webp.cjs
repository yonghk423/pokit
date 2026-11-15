// Encode final PNG masters as WebP and refresh the runtime integrity manifest.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const dir=path.resolve(process.argv[2]||'output/everyday-cinema-rebuild/final-100');
const layoutPath=path.join(root,'src/pages/day-plan/lib/everydayCinemaLayouts.ts');
const hash=(bytes,algorithm)=>crypto.createHash(algorithm).update(bytes).digest('hex');
(async()=>{
 const manifestPath=path.join(dir,'manifest.json'),manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const webpDir=path.join(dir,'webp');await fs.mkdir(webpDir,{recursive:true});
 const published=new Map(),expectedWebps=new Set();let totalBytes=0;
 for(let i=0;i<manifest.files.length;i++){
  const item=manifest.files[i],source=path.join(dir,item.file),stem=item.file.replace(/\.png$/i,''),themeStem=stem==='12-coworking-booth'?'12-coworking':stem,webpFile=themeStem+'.webp',dest=path.join(webpDir,webpFile);
  expectedWebps.add(webpFile);
  try{await fs.access(dest);}catch{await sharp(source).webp({quality:88,effort:6,smartSubsample:true}).toFile(dest);}
  const bytes=await fs.readFile(dest),meta=await sharp(bytes).metadata();
  if(meta.width!==830||meta.height!==1896||meta.format!=='webp')throw new Error('Bad WebP output: '+webpFile);
  item.sha256=hash(await fs.readFile(source),'sha256');
  item.themeId='everyday-cinema-'+themeStem;item.webpFile='webp/'+webpFile;item.webpSha256=hash(bytes,'sha256');item.webpMd5=hash(bytes,'md5');item.webpBytes=bytes.length;
  delete item.svg;published.set('everyday-cinema-'+themeStem,[item.webpSha256,item.webpMd5]);totalBytes+=bytes.length;
  console.log(`${i+1}/${manifest.files.length} ${webpFile} ${bytes.length} bytes`);
 }
 if(manifest.files.length!==100)throw new Error('Expected 100 PNG masters');
 for(const name of await fs.readdir(webpDir))if(name.endsWith('.webp')&&!expectedWebps.has(name))await fs.rm(path.join(webpDir,name));
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 let layouts=await fs.readFile(layoutPath,'utf8'),replaced=0;
 layouts=layouts.replace(/'(everyday-cinema-[^']+)': \['[a-f0-9]{64}', '[a-f0-9]{32}'\],/g,(row,id)=>{
  const pair=published.get(id);if(!pair)return row;replaced++;return `'${id}': ['${pair[0]}', '${pair[1]}'],`;
 });
 if(replaced!==100)throw new Error(`Expected to refresh 100 runtime hashes; replaced ${replaced}`);
 await fs.writeFile(layoutPath,layouts);
 console.log(JSON.stringify({images:manifest.files.length,webpBytes:totalBytes,layoutHashes:replaced,quality:88}));
})().catch(error=>{console.error(error);process.exitCode=1;});
