// Normalize generated open-panel artwork, encode WebP, and maintain a resumable manifest.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const dir = path.resolve('output/everyday-cinema-open-panel');
const hash = (b, a = 'sha256') => crypto.createHash(a).update(b).digest('hex');
(async () => {
  fs.mkdirSync(path.join(dir, 'webp'), {recursive: true});
  const template = JSON.parse(fs.readFileSync('docs/design/photo-diary/city-calendar-template.json'));
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : {template, revision: 'open-panel-v2', files: []};
  for (const input of JSON.parse(fs.readFileSync(process.argv[2]))) {
    if (!fs.existsSync(input.generated)) throw new Error('Missing source: ' + input.generated);
    const stem = input.name.replace(/^p5-/, '').replace(/\.png$/, '');
    const file = stem + '.png';
    const original = await sharp(input.generated).metadata();
    // Aspect-preserving packaging only; semantic editing is performed by imagegen.
    const [width, height] = template.size;
    if (Math.abs(original.width * height / original.height - width) > 1) {
      throw new Error('Reframe artwork to the template aspect ratio before export: ' + input.generated);
    }
    await sharp(input.generated).resize(width, height, {fit: 'cover'}).png().toFile(path.join(dir, file));
    const webpFile = 'webp/' + (stem === '12-coworking-booth' ? '12-coworking' : stem) + '.webp';
    await sharp(path.join(dir, file)).webp({quality: 90, effort: 6}).toFile(path.join(dir, webpFile));
    const png = fs.readFileSync(path.join(dir, file)), webp = fs.readFileSync(path.join(dir, webpFile));
    const item = {...input, file, webpFile, originalSize: [original.width, original.height], size: [830,1896], sha256: hash(png), webpSha256: hash(webp), webpMd5: hash(webp, 'md5'), webpBytes: webp.length, geometryStatus: 'pending-open-panel-inspection'};
    manifest.files = manifest.files.filter(x => x.file !== file).concat(item);
  }
  manifest.files.sort((a,b) => parseInt(a.file) - parseInt(b.file));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest,null,2)+'\n');
  console.log('Prepared '+manifest.files.length+' open-panel PNG/WebP assets');
})().catch(e => {console.error(e);process.exitCode=1;});
