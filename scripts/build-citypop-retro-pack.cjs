// Rebuild app/download maps and a flat upload directory from the pack catalog.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'docs/ops/citypop-retro-catalog.json');
const assetRoot = path.join(root, 'assets/calendar-illustrations/citypop-retro');
const uploadRoot = path.join(root, 'output/citypop-retro-upload');
const revision = '20261112-v1';

async function main() {
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
  if (catalog.length !== 50 || catalog.some((item, index) => item.number !== index + 1)) throw new Error('catalog_must_contain_50_sequential_items');
  await fs.rm(uploadRoot, { recursive: true, force: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  const themes = [];
  const layouts = [];
  const files = [];
  const manifest = [];
  for (const item of catalog) {
    const num = String(item.number).padStart(2, '0');
    const folder = `${num}-${item.slug}`;
    const local = path.join(assetRoot, folder, 'background.webp');
    const bytes = await fs.readFile(local);
    const metadata = await sharp(bytes).metadata();
    if (metadata.width !== 830 || metadata.height !== 1896 || metadata.format !== 'webp') throw new Error(`invalid_artwork_geometry:${folder}`);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const md5 = crypto.createHash('md5').update(bytes).digest('hex');
    const filename = `${folder}.webp`;
    const storagePath = `calendar-themes/citypop-retro/${revision}/${filename}`;
    themes.push(`  { design: 'citypop-retro-${num}', themeId: 'citypop-retro-${num}-${item.slug}', title: '${item.title}', concept: '${item.concept}' }`);
    layouts.push(`  'citypop-retro-${num}-${item.slug}': { ...EVERYDAY_CINEMA_GEOMETRY, sha256: '${sha256}', md5: '${md5}' }`);
    files.push(`  'citypop-retro-${num}-${item.slug}': '${filename}'`);
    manifest.push({ number: item.number, themeId: `citypop-retro-${num}-${item.slug}`, title: item.title, localPath: path.relative(root, local), storagePath, bytes: bytes.length, sha256, md5, upload: item.number === 1 ? 'already-present' : 'pending' });
    if (item.number > 1) await fs.copyFile(local, path.join(uploadRoot, filename));
  }
  await fs.writeFile(path.join(root, 'src/pages/day-plan/model/citypopRetroThemes.ts'), `export const CITYPOP_RETRO_THEMES = [\n${themes.join(',\n')}\n] as const;\n`);
  await fs.writeFile(path.join(root, 'src/pages/day-plan/lib/citypopRetroLayouts.ts'), `import { EVERYDAY_CINEMA_GEOMETRY } from './everydayCinemaLayouts';\n\nexport const CITYPOP_RETRO_LAYOUTS = {\n${layouts.join(',\n')}\n};\n`);
  await fs.writeFile(path.join(root, 'supabase/functions/calendar-theme/citypopRetroFiles.ts'), `export const CITYPOP_RETRO_FILES: Record<string, string> = {\n${files.join(',\n')}\n};\n`);
  await fs.writeFile(path.join(root, 'docs/ops/citypop-retro-v1-upload-manifest.json'), JSON.stringify({ bucket: 'character-illustrations', pack: 'citypop-retro', revision, themeCount: 50, uploadPending: 49, files: manifest }, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
