/** Export the individually designed transparent photo-wall headers and previews. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const doc = path.join(root, 'docs/design/photo-diary/photo-wall-renewal-v5');
const masters = path.join(root, 'output/photo-wall-renewal/masters');

(async () => {
  const sources = JSON.parse(fs.readFileSync(path.join(doc, 'sources.json')));
  if (sources.length !== 11 || new Set(sources.map(x => x.id)).size !== 11) throw Error('Expected 11 unique themes');
  const manifest = [];
  const dimensions = {};
  for (const source of sources) {
    const master = path.join(masters, `wall-${source.id}.png`);
    if (path.resolve(source.master) !== master) fs.copyFileSync(source.master, master);
    const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw Error(`Empty asset: ${source.id}`);
    const file = `wall-${source.id}.webp`;
    const target = path.join(root, 'assets/pro-photo-walls', file);
    const exported = await sharp(master).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: 2160, withoutEnlargement: true }).webp({ quality: 96, alphaQuality: 100, effort: 5 }).toBuffer();
    fs.writeFileSync(target, exported);
    const meta = await sharp(exported).metadata();
    if (!meta.hasAlpha || meta.width < 1500 || meta.height / meta.width > 0.35) throw Error(`Invalid header geometry: ${source.id}`);
    await sharp(exported).resize({ width: 400 }).webp({ quality: 94, alphaQuality: 100 })
      .toFile(path.join(root, 'assets/pro-diary-thumbs', file));
    dimensions[`wall-${source.id}`] = { width: meta.width, height: meta.height };
    manifest.push({ id: source.id, file, width: meta.width, height: meta.height, alpha: meta.hasAlpha,
      bytes: exported.length, sha256: crypto.createHash('sha256').update(exported).digest('hex') });
  }
  fs.writeFileSync(path.join(doc, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'src/pages/day-plan/model/proPhotoWallArtwork.ts'),
    '/** Dimensions of the renewed paid artwork downloaded from Supabase. */\n' +
    'export const proPhotoWallDimensions: Record<string, { width: number; height: number }> = ' + JSON.stringify(dimensions, null, 2) + ';\n');
  const layers = [];
  for (const [i, entry] of manifest.entries()) {
    layers.push({ input: await sharp(path.join(root, 'assets/pro-photo-walls', entry.file))
      .resize(800, 160, { fit: 'contain', background: '#F5F0E8' }).flatten({ background: '#F5F0E8' }).png().toBuffer(), left: 20, top: i * 190 + 24 });
    layers.push({ input: Buffer.from(`<svg width="800" height="22"><text x="0" y="16" font-size="14" fill="#555">${entry.id}</text></svg>`), left: 20, top: i * 190 });
  }
  await sharp({ create: { width: 840, height: 190 * manifest.length, channels: 4, background: '#F5F0E8' } })
    .composite(layers).png().toFile(path.join(doc, 'review.png'));
  console.log(`Exported ${manifest.length} unique headers and thumbnails`);
})();
