/** Read-only audit of bundled paid previews and downloaded production assets. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const remoteRoot = path.join(root, 'output/paid-image-audit-20261119/remote');
const reportDir = path.join(root, 'docs/audits/paid-image-assets-20261119');
function readModule(relative) {
  const file = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: id => {
    if (id.includes('translateUiText')) return { translateUiText: x => x };
    if (id.startsWith('.')) return path.resolve(path.dirname(file), id);
    throw Error(`Unexpected module: ${id}`);
  } });
  return exports;
}
async function inspect(file) {
  if (!fs.existsSync(file)) return { missing: true, path: path.relative(root, file) };
  const data = fs.readFileSync(file);
  const meta = await sharp(data).metadata();
  return { path: path.relative(root, file), extension: path.extname(file), format: meta.format,
    webpSignature: data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP',
    width: meta.width, height: meta.height, bytes: data.length, alpha: meta.hasAlpha };
}
(async () => {
  const catalog = readModule('src/pages/day-plan/model/proDiaryCatalog.ts').proDiaryCatalog;
  const folders = readModule('supabase/functions/calendar-store/proDiaryFolders.ts').proDiaryFolders;
  const records = [];
  for (const item of catalog) {
    const roles = item.id.startsWith('print-border-') ? ['image','tl','tr','bl','br','top','bottom','left','right'] : item.id.endsWith('-trash') ? ['image','filled'] : ['image'];
    const previews = [await inspect(item.preview)];
    if (item.filledPreview) previews.push(await inspect(item.filledPreview));
    const files = [];
    for (const role of roles) {
      const file = `${item.id}${role === 'image' ? '' : '-' + role}.webp`;
      const remotePath = `${folders[item.id]}/${file}`;
      files.push({ role, remotePath, ...await inspect(path.join(remoteRoot, 'calendar-store', remotePath)) });
    }
    records.push({ id: item.id, category: item.category, title: item.title, previews, files });
  }
  // Legacy paid clips, bins and cameras have a separate inventory and store paths.
  const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/design/diary-item-quality-v2/inventory.json')));
  const catalogIds = new Set(catalog.map(x => x.id));
  for (const item of inventory.filter(x => x.remote && !catalogIds.has(x.id))) {
    // These two camera styles are currently free even though remote originals exist.
    if (['camera-polaroid-now', 'camera-leica-sofort-2'].includes(item.id)) continue;
    let record = records.find(x => x.id === item.id);
    if (!record) { record = { id: item.id, category: item.category, previews: [], files: [] }; records.push(record); }
    record.previews.push(await inspect(item.preview));
    record.files.push({ role: item.role, remotePath: item.remote, ...await inspect(path.join(remoteRoot, 'calendar-store', item.remote)) });
  }
  const previewFiles = records.flatMap(x => x.previews);
  const fullFiles = records.flatMap(x => x.files);
  const summary = { products: records.length, byCategory: {}, previews: previewFiles.length, originals: fullFiles.length,
    missingOriginals: fullFiles.filter(x => x.missing).length,
    nonWebpPreviews: previewFiles.filter(x => !x.webpSignature), nonWebpOriginals: fullFiles.filter(x => !x.missing && !x.webpSignature),
    largePreviews: previewFiles.filter(x => x.bytes > 100 * 1024 || Math.max(x.width, x.height) > 512),
    fullImageUnder1024: records.flatMap(x => x.files.filter(f => !f.missing && ['image','empty','filled'].includes(f.role) && Math.max(f.width, f.height) < 1024).map(f => ({ id:x.id, category:x.category, ...f }))),
    originalsNotLargerThanPreview: records.filter(x => x.files.find(f => ['image','empty'].includes(f.role) && !f.missing && Math.max(f.width,f.height) <= Math.max(x.previews[0].width,x.previews[0].height))).map(x => x.id),
  };
  for (const r of records) summary.byCategory[r.category] = (summary.byCategory[r.category] || 0) + 1;
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'diary-assets.json'), JSON.stringify({ summary, records }, null, 2) + '\n');
  const packs = [
    ['everyday-cinema', 'everydayCinemaFiles.ts', 'EVERYDAY_CINEMA_FILES', '20261112-v2', 'everyday-cinema-top-only.webp'],
    ['warm-sepia-open-panel', 'warmSepiaFiles.ts', 'WARM_SEPIA_OPEN_PANEL_FILES', '20261112-v2', 'warm-sepia-open-panel.webp'],
    ['citypop-retro', 'citypopRetroFiles.ts', 'CITYPOP_RETRO_FILES', '20261112-v1', 'citypop-retro.webp'],
    ['textured-watercolor', 'texturedWatercolorFiles.ts', 'TEXTURED_WATERCOLOR_FILES', '20261113-v2', 'textured-watercolor.webp'],
    ['season-winter', 'seasonWinterFiles.ts', 'SEASON_WINTER_FILES', '20261114-v2', 'season-winter.webp'],
  ];
  const calendars = [];
  const packPreviews = [];
  for (const [pack, module, key, revision, preview] of packs) {
    packPreviews.push({ pack, ...await inspect(path.join(root, 'assets/store-previews', preview)) });
    const mapping = readModule('supabase/functions/calendar-theme/' + module)[key];
    for (const [themeId, file] of Object.entries(mapping)) {
      const version = themeId === 'textured-watercolor-01-fly-kite' ? '20261112-v1' : revision;
      const remotePath = `calendar-themes/${pack}/${version}/${file}`;
      calendars.push({ pack, themeId, remotePath, ...await inspect(path.join(remoteRoot, 'character-illustrations', remotePath)) });
    }
  }
  const seasons = readModule('supabase/functions/calendar-theme/seasonCollectionFiles.ts').SEASON_COLLECTION_FILES;
  for (const season of ['spring','summer','autumn']) packPreviews.push({ pack: 'season-' + season,
    ...await inspect(path.join(root, `assets/store-previews/season-${season}.webp`)) });
  for (const [themeId, value] of Object.entries(seasons)) {
    const remotePath = `calendar-themes/season-${value.season}/20261115-v1/${value.file}`;
    calendars.push({ pack: 'season-' + value.season, themeId, remotePath,
      ...await inspect(path.join(remoteRoot, 'character-illustrations', remotePath)) });
  }
  const scenePath = path.join(remoteRoot, 'character-illustrations/protagonist-7/card-960/p7-01.webp');
  const scene = await inspect(scenePath);
  const calendarSummary = { paidPacks: packPreviews.length, paidThemes: calendars.length,
    missingOriginals: calendars.filter(f => f.missing).length,
    nonWebpOriginals: calendars.filter(f => !f.missing && !f.webpSignature),
    nonWebpPackPreviews: packPreviews.filter(f => !f.webpSignature),
    themeListUsesOriginal: !fs.readFileSync(path.join(root, 'src/pages/day-plan/ui/IllustrationThemeCard.tsx'), 'utf8').includes('source={PAID_CALENDAR_THUMBNAILS['),
  };
  fs.writeFileSync(path.join(reportDir, 'calendar-assets.json'), JSON.stringify({ summary: calendarSummary, packPreviews, calendars,
    legacyScenePack: { activeAppFiles: 1, previewUsesSameFileAsDownload: false, image: scene } }, null, 2) + '\n');
  console.log(JSON.stringify({ diary: { products: records.length, previews: previewFiles.length, originals: fullFiles.length,
    missingOriginals: summary.missingOriginals, nonWebpPreviews: summary.nonWebpPreviews.length,
    nonWebpOriginals: summary.nonWebpOriginals.length, lowResolutionProducts: new Set(summary.fullImageUnder1024.map(x => x.id)).size,
    previewsOver100KiB: previewFiles.filter(x => x.bytes > 100 * 1024).length }, calendars: calendarSummary, legacyScene: scene }, null, 2));
})();
