import * as fs from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { CALENDAR_ARTWORK_LAYOUTS } from './illustrationCalendarLayouts';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';
export type CalendarAssets = { background: string; paper: string; leaf: string };
export const CALENDAR_ASSET_REVISION = '20261110-fullscreen-v8';
const previousRevision = '20261109-fullbleed-v2';
const cacheRoot = () => `${fs.documentDirectory}calendar-themes/${CALENDAR_ASSET_REVISION}/`;
const names = ['background', 'paper', 'leaf'] as const;
const installing = new Map<string, Promise<CalendarAssets>>();
const pending = new Map<string, Promise<CalendarAssets>>();
const readyAssets = new Map<string, CalendarAssets>();
// Pack readiness can request 50 migrations together. Serialize installation so
// shared paper/leaf temporary files cannot be moved by two themes at once.
let installationQueue: Promise<unknown> = Promise.resolve();
export function getLoadedIllustrationCalendarAssets(themeId = '01-rush-hour-commute') { return readyAssets.get(themeId) ?? null; }
async function installFiles(themeId = '01-rush-hour-commute', refresh = false): Promise<CalendarAssets> {
  if (!fs.documentDirectory) throw new Error('storage_unavailable');
  const folder = `${cacheRoot()}${themeId}/`;
  const sharedFolder = `${cacheRoot()}shared/`;
  await Promise.all([folder, sharedFolder].map(path => fs.makeDirectoryAsync(path, { intermediates: true })));
  const assets: CalendarAssets = { background: `${folder}background.webp`, paper: `${sharedFolder}paper.webp`, leaf: `${sharedFolder}leaf.webp` };
  const existing = await Promise.all(names.map(name => fs.getInfoAsync(assets[name])));
  if (!refresh && existing.every(file => file.exists && !file.isDirectory && file.size > 0)) return assets;
  await getHeroAiAccessToken();
  const { data, error } = await getHeroAiAuthClient().functions.invoke('calendar-theme', { body: { themeId, revision: 'fullbleed-v2' } });
  if (error || data?.themeId !== themeId || data?.revision !== 'fullbleed-v2' || !Array.isArray(data?.files)) throw new Error('theme_download_unavailable');
  for (const name of names) {
    const info = await fs.getInfoAsync(assets[name]);
    if (!refresh && info.exists && !info.isDirectory && info.size > 0) continue;
    const file = data.files.find((item: { name: string; url: string }) => item.name === `${name}.webp`);
    if (!file?.url?.startsWith('https://')) throw new Error('invalid_theme');
    const expectedPath = name === 'background'
      ? `/calendar-themes/city-animation/${themeId}/${name}.webp`
      : `/calendar-themes/city-animation/shared/${name}.webp`;
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
  await fs.deleteAsync(`${fs.documentDirectory}calendar-themes/city-animation-v2/${themeId}/`, { idempotent: true });
  await fs.deleteAsync(`${fs.documentDirectory}calendar-themes/${previousRevision}/${themeId}/`, { idempotent: true });
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
  const previous = await fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/${previousRevision}/${themeId}/background.webp`);
  if (previous.exists && !previous.isDirectory && previous.size > 0) return true;
  const files = await Promise.all(names.map(name => fs.getInfoAsync(`${fs.documentDirectory}calendar-themes/city-animation-v2/${themeId}/${name}.webp`)));
  return files.every(file => file.exists && !file.isDirectory && file.size > 0);
}

export async function isIllustrationCalendarInstalled(themeId: string): Promise<boolean> {
  if (!fs.documentDirectory) return false;
  const assets: CalendarAssets = { background: `${cacheRoot()}${themeId}/background.webp`, paper: `${cacheRoot()}shared/paper.webp`, leaf: `${cacheRoot()}shared/leaf.webp` };
  const files = await Promise.all(names.map(name => fs.getInfoAsync(assets[name])));
  if (files.every(file => file.exists && !file.isDirectory && file.size > 0)) return true;
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
  return `${cacheRoot()}${themeId}/background.webp`;
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
