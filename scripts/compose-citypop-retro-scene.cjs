// Compose a generated scenic crop into the shared city-pop retro calendar canvas.
// Usage: node scripts/compose-citypop-retro-scene.cjs <scene.png> <background.png>
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const W = 830, H = 1896, SCENE_H = 760, TRIM_H = 24;
const PANEL = '#fff6e5';

async function main() {
  const [scenePath, outputPath] = process.argv.slice(2);
  if (!scenePath || !outputPath) throw new Error('Expected scenic crop and output PNG paths');
  const scene = sharp(scenePath).rotate();
  const meta = await scene.metadata();
  if (!meta.width || !meta.height) throw new Error('Unable to read scenic crop');
  // Generated prompts place one scene-specific ornamental detail along the top
  // edge. Move that detail to the measured calendar header zone so it does not
  // repeat in the scenic crop.
  const stripHeight = Math.max(48, Math.round(meta.height * 0.08));
  const bodyHeight = meta.height - stripHeight;
  const resized = await sharp(scenePath).rotate().extract({ left: 0, top: stripHeight, width: meta.width, height: bodyHeight })
    .resize(W, SCENE_H, { fit: 'cover', position: 'centre' }).png().toBuffer();
  const strip = await sharp(scenePath).rotate().extract({ left: 0, top: 0, width: meta.width, height: stripHeight })
    .resize(W, TRIM_H, { fit: 'fill' }).png().toBuffer();
  const panel = { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H-SCENE_H-TRIM_H}"><rect width="100%" height="100%" fill="${PANEL}"/></svg>`), top: SCENE_H + TRIM_H, left: 0 };
  const trim = { input: strip, top: SCENE_H, left: 0 };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: PANEL } })
    .composite([{ input: resized, top: 0, left: 0 }, trim, panel])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
