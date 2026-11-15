// Package only coordinate-verified calendar masters, never raw generation output.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const digest = (bytes, algorithm) => crypto.createHash(algorithm).update(bytes).digest('hex');
(async () => {
 const review=path.resolve('output/warm-sepia-open-panel-v2-review');
 const out=path.resolve('output/warm-sepia-open-panel-v2');
 const manifest=JSON.parse(await fs.readFile(path.join(review,'manifest.json')));
 const verified=JSON.parse(await fs.readFile(path.join(review,'verification.json')));
 if (manifest.files.length!==1 || verified.images!==1 || verified.viewportChecks!==7) throw new Error('Unverified review');
 const item=manifest.files[0];
 const png=await fs.readFile(path.join(review,item.file));
 if (digest(png,'sha256')!==verified.files[0].sha256) throw new Error('Review image changed');
 await fs.mkdir(path.join(out,'webp'),{recursive:true});
 await fs.writeFile(path.join(out,item.file),png);
 const webp=await sharp(png).webp({quality:95,effort:6}).toBuffer();
 await fs.writeFile(path.join(out,'webp/01-exercise.webp'),webp);
 const entry={...item,themeId:'warm-sepia-open-panel-01-exercise',design:'warm-sepia-open-panel-01',
 webpFile:'webp/01-exercise.webp',webpSha256:digest(webp,'sha256'),webpMd5:digest(webp,'md5'),webpBytes:webp.length};
 const pack={...manifest,revision:'warm-sepia-open-panel-v2',storageBucket:'character-illustrations',
 storagePrefix:'calendar-themes/warm-sepia-open-panel/20261112-v2/',imageCount:1,totalWebpBytes:webp.length,
 status:'coordinate-verified-ready-to-upload',files:[entry]};
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(pack,null,2)+'\n');
 await fs.copyFile(path.join(review,'verification.json'),path.join(out,'verification.json'));
 await fs.writeFile('src/pages/day-plan/lib/warmSepiaLayouts.ts',`import { EVERYDAY_CINEMA_GEOMETRY } from './everydayCinemaLayouts';
export const WARM_SEPIA_OPEN_PANEL_LAYOUTS = {
 'warm-sepia-open-panel-01-exercise': { ...EVERYDAY_CINEMA_GEOMETRY, sha256: '${entry.webpSha256}', md5: '${entry.webpMd5}' },
};
`);
 await sharp(png).resize({width:415}).webp({quality:90}).toFile('assets/store-previews/warm-sepia-open-panel.webp');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
