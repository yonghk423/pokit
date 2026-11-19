/** Apply verified icon exports to local previews and invalidate old downloads. */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),doc=path.join(root,'docs/design/diary-item-quality-v2');
(async()=>{
 const items=JSON.parse(fs.readFileSync(path.join(doc,'manifest.json')));
 const verified=JSON.parse(fs.readFileSync(path.join(doc,'supabase-verification.json')));
 if(items.length!==78||verified.length!==67)throw Error('All exports and remote readbacks must be ready');
 for(const x of items){
  if(x.remote && !verified.some(v=>v.remote===x.remote && v.sha256===x.sha256))throw Error('Missing remote verification '+x.file);
  const src=path.join(root,'output/diary-item-quality-v2/exports',x.file);
  const old=await sharp(x.preview).metadata();
  // Preserve the source canvas proportions to avoid changing existing icon geometry.
  let out=sharp(src).resize({width:x.remote ? 400 : 768,withoutEnlargement:true});
  if(path.extname(x.preview)==='.png')out=out.png();else out=out.webp({quality:94,alphaQuality:100});
  await out.toFile(x.preview+'.replacement');fs.renameSync(x.preview+'.replacement',x.preview);
 }
 const ids=[...new Set(items.filter(x=>x.remote).map(x=>x.id))];
 const model=path.join(root,'src/pages/day-plan/model/diaryItemAssetRevision.ts');
 fs.writeFileSync(model,'/** High-definition icon revision; files are served by calendar-store. */\nexport const highDefinitionDiaryItemIds = new Set<string>('+JSON.stringify(ids,null,2)+');\n');
 const file=path.join(root,'src/pages/day-plan/lib/calendarStoreDownload.ts');let s=fs.readFileSync(file,'utf8');
 s="import { highDefinitionDiaryItemIds } from '../model/diaryItemAssetRevision';\n"+s;
 s=s.replace("const assetFolder = (id: string) => photoWallIds.has(id)","const assetFolder = (id: string) => highDefinitionDiaryItemIds.has(id) ? 'diary-store-v4/' : photoWallIds.has(id)");
 s=s.replace("const key = (id: string) => photoWallIds.has(id)","const key = (id: string) => highDefinitionDiaryItemIds.has(id) ? 'pokit:calendar-store:v4:' + id : photoWallIds.has(id)");
 s=s.replace("if (revisedItems.has(id) && Platform.OS", "if ((revisedItems.has(id) || highDefinitionDiaryItemIds.has(id)) && Platform.OS");
 s=s.replace("&& revisedItems.has(id);", "&& (revisedItems.has(id) || highDefinitionDiaryItemIds.has(id));");
 s=s.replace("const required = themedBin ? ['image', 'filled'] : ['image'];", "const required = id.startsWith('trash-') ? ['empty', 'filled'] : themedBin ? ['image', 'filled'] : ['image'];");
 s=s.replace("if (photoWallIds.has(id)) {", "if (photoWallIds.has(id) || highDefinitionDiaryItemIds.has(id)) {\n    if (highDefinitionDiaryItemIds.has(id)) localStorageClient.removeItem('pokit:calendar-store:v1:' + id);");
 fs.writeFileSync(file,s);
 console.log('Applied 78 previews and '+ids.length+' download revisions');
})();
