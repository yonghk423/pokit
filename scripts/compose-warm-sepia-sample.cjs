// Coordinate-locked composition. Generated art supplies only the scene and material.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const template = require('../docs/design/photo-diary/city-calendar-template.json');

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error('Pass the generated scene PNG');
  const out = path.resolve(process.argv[3] || 'output/warm-sepia-open-panel-v2-review');
  fs.mkdirSync(out, { recursive: true });
  const [width, height] = template.size;
  const [, trimTop, , trimHeight] = template.artwork.topDecorationBounds;
  const [, surfaceTop] = template.artwork.blankSurfaceBounds;
  const meta = await sharp(source).metadata();
  // Measured on the generated exercise scene: the olive binding starts at row 1178.
  const bindingTop = 1178;
  if (meta.height !== 1200) throw new Error('Re-measure material crop for this source');
  const scene = await sharp(source).extract({ left: 0, top: 0, width: meta.width, height: bindingTop })
    .resize(width, trimTop, { fit: 'cover', position: 'centre' }).png().toBuffer();
  const trim = await sharp(source).extract({ left: 0, top: bindingTop, width: meta.width, height: meta.height - bindingTop })
    .resize(width, trimHeight, { fit: 'fill' }).png().toBuffer();
  const paper = Buffer.alloc(width * height * 3);
  let seed = 20261112;
  for (let i = 0; i < width * height; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed >>> 29) - 4;
    [253, 239, 218].forEach((v, c) => { paper[i * 3 + c] = Math.min(255, v + noise); });
  }
  const file = '01-exercise.png';
  const png = await sharp(paper, { raw: { width, height, channels: 3 } })
    .composite([{ input: scene, left: 0, top: 0 }, { input: trim, left: 0, top: trimTop }]).png().toBuffer();
  fs.writeFileSync(path.join(out, file), png);
  fs.copyFileSync(source, path.join(out, '01-exercise-scene-source.png'));
  const manifest = { template, status: 'review-only-not-published', files: [{ file,
    sha256: crypto.createHash('sha256').update(png).digest('hex'),
    composition: { scene: [0, 0, width, trimTop], topDecoration: [0, trimTop, width, trimHeight],
      blankSurface: [0, surfaceTop, width, height - surfaceTop], sourceBindingTop: bindingTop },
    source, generatedWith: 'built-in image_gen',
  }] };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(out);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
