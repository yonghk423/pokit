// Assemble generated scene/material artwork into the shared calendar coordinates.
// Usage: node scripts/compose-top-only-calendar.cjs <generated PNG> <output PNG>
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const template = require('../docs/design/photo-diary/city-calendar-template.json');

async function compose(source, destination) {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const flat = [];
  const means = [];
  for (let y = 0; y < info.height; y++) {
    let sum = 0;
    let squares = 0;
    let count = 0;
    for (let x = 8; x < info.width - 8; x += 4) {
      const offset = (y * info.width + x) * info.channels;
      const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
      sum += brightness;
      squares += brightness * brightness;
      count++;
    }
    const mean = sum / count;
    means.push(mean);
    flat.push(mean >= 215 && Math.sqrt(Math.max(0, squares / count - mean * mean)) < 15);
  }
  let paperStart = info.height - 1;
  let nonPaperRows = 0;
  for (let y = info.height - 1; y > info.height * .28; y--) {
    nonPaperRows = flat[y] ? 0 : nonPaperRows + 1;
    if (nonPaperRows === 4) {
      paperStart = y + 4;
      break;
    }
  }
  if (paperStart < info.height * .3 || paperStart > info.height * .8) {
    throw new Error('Blank surface needs inspection: ' + source);
  }
  const [width, height] = template.size;
  const [, stripTop, , stripHeight] = template.artwork.topDecorationBounds;
  const blankTop = stripTop + stripHeight;
  let sourceStripTop = paperStart - Math.round(info.width * 32 / 830);
  let strongestEdge = 0;
  for (let y = Math.max(3, paperStart - Math.round(info.width * 180 / 830)); y < paperStart - 8; y++) {
    const edge = means[y] - means[y - 3];
    if (edge < strongestEdge) {
      strongestEdge = edge;
      sourceStripTop = y;
    }
  }
  const sourceStripHeight = paperStart - sourceStripTop;
  const scene = await sharp(source).extract({ left: 0, top: 0, width: info.width, height: sourceStripTop })
    .resize(width, stripTop, { fit: 'cover', position: 'centre' }).toBuffer();
  const strip = await sharp(source).extract({ left: 0, top: sourceStripTop, width: info.width, height: sourceStripHeight })
    .resize(width, stripHeight).toBuffer();
  const surfaceTop = paperStart + 8;
  const surface = await sharp(source).extract({ left: 0, top: surfaceTop, width: info.width, height: info.height - surfaceTop })
    .resize(width, height - blankTop, { fit: 'cover' }).toBuffer();
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: '#f4ecdf' } }).composite([
    { input: scene, left: 0, top: 0 },
    { input: strip, left: 0, top: stripTop },
    { input: surface, left: 0, top: blankTop },
  ]).png().toFile(destination);
  const metadata = { source, sourceStrip: [0, sourceStripTop, info.width, sourceStripHeight], sourcePaperTop: paperStart,
    size: [width, height], decoration: [0, stripTop, width, stripHeight], blankSurface: [0, blankTop, width, height - blankTop] };
  fs.writeFileSync(destination.replace(/\.png$/, '.layout.json'), JSON.stringify(metadata, null, 2) + '\n');
  console.log(path.basename(destination));
}
compose(process.argv[2], process.argv[3]).catch(error => { console.error(error.message); process.exitCode = 1; });
