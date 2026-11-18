import * as fs from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { CALENDAR_ARTWORK_LAYOUTS } from './illustrationCalendarLayouts';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';
export type CalendarAssets = { background: string };
export const CALENDAR_ASSET_REVISION = '20261112-everyday-cinema-v1';
const previousRevision = '20261109-fullbleed-v2';
const isEveryday = (themeId: string) => themeId.startsWith('everyday-cinema-');
const previousEverydayRoot = () => `${fs.documentDirectory}calendar-themes/20261112-everyday-cinema-open-panel-v3/`;
const isWarmSepia = (themeId: string) => themeId.startsWith('warm-sepia-open-panel-');
const isCitypopRetro = (themeId: string) => themeId.startsWith('citypop-retro-');
const isTexturedWatercolor = (themeId: string) => themeId.startsWith('textured-watercolor-');
const legacyRoot = () => `${fs.documentDirectory}calendar-themes/${CALENDAR_ASSET_REVISION}/`;
const collectionSeason = (id: string) => /^season-(spring|summer|autumn)-/.exec(id)?.[1];
const cacheRoot = (themeId: string) => collectionSeason(themeId) ? `${fs.documentDirectory}calendar-themes/season-${collectionSeason(themeId)}-v1/` : themeId.startsWith('season-winter-') ? `${fs.documentDirectory}calendar-themes/season-winter-v2/` : themeId === 'textured-watercolor-01-fly-kite' ? `${fs.documentDirectory}calendar-themes/textured-watercolor-kite-v2/` : isEveryday(themeId)
  ? `${fs.documentDirectory}calendar-themes/20261112-everyday-cinema-top-only-v4/`
  : isWarmSepia(themeId) ? `${fs.documentDirectory}calendar-themes/warm-sepia-open-panel-v2/`
    : isCitypopRetro(themeId) ? `${fs.documentDirectory}calendar-themes/citypop-retro-v1/`
  : isTexturedWatercolor(themeId) ? `${fs.documentDirectory}calendar-themes/textured-watercolor-v2/` : legacyRoot();
const names = ['background'] as const;
const installing = new Map<string, Promise<CalendarAssets>>();
const pending = new Map<string, Promise<CalendarAssets>>();
const readyAssets = new Map<string, CalendarAssets>();
// Pack readiness can request 50 migrations together. Serialize installation so
// avoid concurrent migrations competing for storage and bandwidth.
let installationQueue: Promise<unknown> = Promise.resolve();
export function getLoadedIllustrationCalendarAssets(themeId = '01-rush-hour-commute') { return readyAssets.get(themeId) ?? null; }
async function pruneOlderThemes(themeId: string, verified = false) {
  const expected = CALENDAR_ARTWORK_LAYOUTS[themeId]?.md5;
  if (!fs.documentDirectory || !expected) return;
  const root = fs.documentDirectory + 'calendar-themes/';
  const revisions = ['city-animation-v2', previousRevision, '20261110-fullscreen-v8'];
  if (isEveryday(themeId)) revisions.push(CALENDAR_ASSET_REVISION, '20261112-everyday-cinema-v2', '20261112-everyday-cinema-open-panel-v3');
  if (isTexturedWatercolor(themeId)) revisions.push('textured-watercolor-v1');
  if (isWarmSepia(themeId)) revisions.push('warm-sepia-open-panel-v1');
  if (themeId.startsWith('season-winter-')) revisions.push('season-winter-v1');
  const folders = revisions.map(revision => root + revision + '/' + themeId + '/');
  if (!verified) {
    const old = await Promise.all(folders.map(folder => fs.getInfoAsync(folder)));
    if (!old.some(info => info.exists)) return;
    const current = await fs.getInfoAsync(illustrationCalendarBackgroundUri(themeId), { md5: true });
    if (!current.exists || current.md5 !== expected) return;
  }
  await Promise.all(folders.map(folder => fs.deleteAsync(folder, { idempotent: true })));
}

async function installFiles(themeId = '01-rush-hour-commute', refresh = false): Promise<CalendarAssets> {
  if (!fs.documentDirectory) throw new Error('storage_unavailable');
  const folder = `${cacheRoot(themeId)}${themeId}/`;
  await fs.makeDirectoryAsync(folder, { intermediates: true });
  const assets: CalendarAssets = { background: `${folder}background.webp` };
  const existing = await Promise.all(names.map(name => fs.getInfoAsync(assets[name])));
  if (!refresh && existing.every(file => file.exists && !file.isDirectory && file.size > 0)) { await pruneOlderThemes(themeId).catch(() => undefined); await removeUnusedCalendarDecorations(); return assets; }
  const everyday = isEveryday(themeId);
  const warmSepia = isWarmSepia(themeId);
  const citypopRetro = isCitypopRetro(themeId);
  const texturedWatercolor = isTexturedWatercolor(themeId);
  const revision = collectionSeason(themeId) ? `season-${collectionSeason(themeId)}-v1` : themeId.startsWith('season-winter-') ? 'season-winter-v2' : everyday ? 'everyday-cinema-v2' : warmSepia ? 'warm-sepia-open-panel-v2' : citypopRetro ? 'citypop-retro-v1' : texturedWatercolor ? themeId === 'textured-watercolor-01-fly-kite' ? 'textured-watercolor-v1' : 'textured-watercolor-v2' : 'fullbleed-v2';
  await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke('calendar-theme', { body: { themeId, revision } });
  if (error || data?.themeId !== themeId || data?.revision !== revision || !Array.isArray(data?.files)) {
    throw new Error('theme_download_unavailable');
  }
  for (const name of names) {
    const info = await fs.getInfoAsync(assets[name]);
    if (!refresh && info.exists && !info.isDirectory && info.size > 0) continue;
    const file = data.files.find((item: { name: string; url: string }) => item.name === `${name}.webp`);
    if (!file?.url?.startsWith('https://')) throw new Error('invalid_theme');
    const expectedPath = collectionSeason(themeId) ? `/calendar-themes/season-${collectionSeason(themeId)}/20261115-v1/${themeId.replace(`season-${collectionSeason(themeId)}-`, '')}.webp` : themeId.startsWith('season-winter-') ? `/calendar-themes/season-winter/20261114-v2/${themeId.replace('season-winter-', '')}.webp` : everyday
      ? `/calendar-themes/everyday-cinema/20261112-v2/${themeId.replace('everyday-cinema-', '')}.webp`
      : warmSepia
        ? `/calendar-themes/warm-sepia-open-panel/20261112-v2/${themeId.replace('warm-sepia-open-panel-', '')}.webp`
        : citypopRetro
          ? `/calendar-themes/citypop-retro/20261112-v1/${themeId.replace('citypop-retro-', '')}.webp`
          : texturedWatercolor ? themeId === 'textured-watercolor-01-fly-kite' ? `/calendar-themes/textured-watercolor/20261112-v1/01-fly-kite-v2.webp` : `/calendar-themes/textured-watercolor/20261113-v2/${themeId.replace('textured-watercolor-', '')}.webp`
          : `/calendar-themes/city-animation/${themeId}/${name}.webp`;
    if (!decodeURIComponent(new URL(file.url).pathname).endsWith(expectedPath)) throw new Error('theme_mismatch');
    const temp = assets[name] + '.part';
    const result = await fs.downloadAsync(file.url, temp, { headers: { 'Cache-Control': 'no-store' } });
    if (result.status !== 200) { await fs.deleteAsync(temp, { idempotent: true }); throw new Error('theme_download_failed'); }
    if (name === 'background') {
      const downloaded = await fs.getInfoAsync(temp, { md5: true });
      if (!downloaded.exists || downloaded.md5 !== CALENDAR_ARTWORK_LAYOUTS[themeId]?.md5) {
        await fs.deleteAsync(temp, { idempotent: true });
        throw new Error('theme_revision_mismatch');
      }
    }
    await fs.moveAsync({ from: temp, to: assets[name] });
  }
  await pruneOlderThemes(themeId, true).catch(() => undefined);
  await removeUnusedCalendarDecorations();
  return assets;
}
function install(themeId = '01-rush-hour-commute', refresh = false) {
  if (!installing.has(themeId)) {
    const task = installationQueue.then(() => installFiles(themeId, refresh));
    installationQueue = task.catch(() => undefined);
    installing.set(themeId, task.finally(() => installing.delete(themeId)));
  }
  return installing.get(themeId)!;
}
export function loadIllustrationCalendarAssets(themeId = '01-rush-hour-commute') {
  if (readyAssets.has(themeId)) {
    return Promise.resolve(readyAssets.get(themeId)!);
  }
  if (!pending.has(themeId)) pending.set(themeId, (async () => {
    if (!await isIllustrationCalendarInstalled(themeId) && !await hasLegacyDownload(themeId)) throw new Error('theme_not_downloaded');
    return install(themeId);
  })().then(async assets => {

    readyAssets.set(themeId, assets);
    return assets;
  }).catch(error => { pending.delete(themeId); throw error; }));
  return pending.get(themeId)!;
}

async function hasLegacyDownload(themeId: string) {
  if (!fs.documentDirectory) return false;
  if (themeId.startsWith('season-winter-')) {
    const old = await fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/season-winter-v1/${themeId}/background.webp`);
    return old.exists && !old.isDirectory && old.size > 0;
  }
  if (themeId === 'textured-watercolor-01-fly-kite') {
    const old = await fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/textured-watercolor-v1/${themeId}/background.webp`);
    return old.exists && !old.isDirectory && old.size > 0;
  }
  if (isEveryday(themeId)) {
    const previous = await fs.getInfoAsync(`${previousEverydayRoot()}${themeId}/background.webp`);
    if (previous.exists && !previous.isDirectory && previous.size > 0) return true;
    const old = await fs.getInfoAsync(`${legacyRoot()}${themeId}/background.webp`);
    return old.exists && !old.isDirectory && old.size > 0;
  }
  if (isTexturedWatercolor(themeId)) {
    const previousWatercolor = await fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/textured-watercolor-v1/${themeId}/background.webp`);
    return previousWatercolor.exists && !previousWatercolor.isDirectory && previousWatercolor.size > 0;
  }
  if (isWarmSepia(themeId) || isCitypopRetro(themeId)) return false;
  const previous = await fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/${previousRevision}/${themeId}/background.webp`);
  if (previous.exists && !previous.isDirectory && previous.size > 0) return true;
  const files = await Promise.all(names.map(name => fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/city-animation-v2/${themeId}/${name}.webp`)));
  return files.every(file => file.exists && !file.isDirectory && file.size > 0);
}

export async function isIllustrationCalendarInstalled(themeId: string): Promise<boolean> {
  if (!fs.documentDirectory) return false;
  const assets: CalendarAssets = { background: `${cacheRoot(themeId)}${themeId}/background.webp` };
  const files = await Promise.all(names.map(name => fs.getInfoAsync(assets[name])));
  if (files.every(file => file.exists && !file.isDirectory && file.size > 0)) { await pruneOlderThemes(themeId).catch(() => undefined); await removeUnusedCalendarDecorations(); return true; }
  if (await hasLegacyDownload(themeId)) {
    try { await install(themeId); return true; } catch { return false; }
  }
  return false;
}

export async function downloadIllustrationCalendarAssets(themeId: string) {
  const assets = await install(themeId);
  readyAssets.set(themeId, assets);
  pending.set(themeId, Promise.resolve(assets));
  return assets;
}
export function illustrationCalendarBackgroundUri(themeId: string) {
  return `${cacheRoot(themeId)}${themeId}/background.webp`;
}

export async function removeIllustrationCalendarDownloads() {
  await Promise.allSettled([...pending.values(), ...installing.values()]);
  pending.clear();
  readyAssets.clear();
  if (fs.documentDirectory) await fs.deleteAsync(`${fs.documentDirectory}calendar-themes/`, { idempotent: true });
  // Clear legacy image caches created before calendar images opted out of caching.
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
}

// Retired decorations are neither downloaded nor required for readiness.
async function removeUnusedCalendarDecorations() {
  if (!fs.documentDirectory) return;
  for (const name of ['paper.webp', 'leaf.webp']) {
    await fs.deleteAsync(`${legacyRoot()}shared/${name}`, { idempotent: true });
    await fs.deleteAsync(`${legacyRoot()}shared/${name}.part`, { idempotent: true });
  }
}

export async function removeIllustrationCalendarTheme(themeId: string) {
  await Promise.allSettled([pending.get(themeId), installing.get(themeId)].filter(Boolean));
  pending.delete(themeId); readyAssets.delete(themeId);
  if (fs.documentDirectory) await fs.deleteAsync(`${cacheRoot(themeId)}${themeId}/`, { idempotent: true });
}

/** City Animation and the retired Everyday pack shared a cache directory in v1. */
export async function removeRetiredEverydayFiles() {
  if (!fs.documentDirectory) return;
  const folder = legacyRoot();
  const info = await fs.getInfoAsync(folder);
  if (!info.exists || !info.isDirectory) return;
  const files = await fs.readDirectoryAsync(folder);
  await Promise.all(files.filter(isEveryday).map(name => pruneOlderThemes(name)));
}
