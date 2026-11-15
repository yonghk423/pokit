// Encode the approved 11–100 masters and update the app integrity registry.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const hash = (bytes, algo) => crypto.createHash(algo).update(bytes).digest('hex');
(async () => {
  const dir = path.resolve('output/everyday-cinema-next-90/final');
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.assets.length !== 90) throw new Error('Expected 90 approved masters');
  await fs.mkdir(path.join(dir, 'webp'), { recursive: true });
  const pairs = new Map();
  for (const item of manifest.assets) {
    const png = await fs.readFile(path.join(dir, item.file));
    if (hash(png, 'sha256') !== item.sha256) throw new Error('Master changed: ' + item.file);
    const bytes = await sharp(png).webp({ quality: 90, effort: 6 }).toBuffer();
    const meta = await sharp(bytes).metadata();
    if (meta.width !== 830 || meta.height !== 1896) throw new Error('Invalid size');
    item.webpFile = 'webp/' + item.name + '.webp';
    item.webpSha256 = hash(bytes, 'sha256');
    item.webpMd5 = hash(bytes, 'md5');
    item.webpBytes = bytes.length;
    await fs.writeFile(path.join(dir, item.webpFile), bytes);
    pairs.set('everyday-cinema-' + item.name, item);
  }
  const registry = 'src/pages/day-plan/lib/everydayCinemaLayouts.ts';
  let count = 0;
  const text = (await fs.readFile(registry, 'utf8')).replace(/'(everyday-cinema-[^']+)': \['[a-f0-9]{64}', '[a-f0-9]{32}'\],/g, (row, id) => {
    const item = pairs.get(id);
    if (!item) return row;
    count++;
    return `'${id}': ['${item.webpSha256}', '${item.webpMd5}'],`;
  });
  if (count !== 90) throw new Error('Incomplete runtime mapping: ' + count);
  await fs.writeFile(registry, text);
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ encoded: count, bytes: manifest.assets.reduce((n, x) => n + x.webpBytes, 0) }));
})().catch(error => { console.error(error); process.exitCode = 1; });
