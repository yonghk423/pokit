import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { EVERYDAY_CINEMA_THEMES, WARM_SEPIA_OPEN_PANEL_THEMES, CITYPOP_RETRO_THEMES, TEXTURED_WATERCOLOR_THEMES, CITY_CALENDAR_THEMES, readHeroCalendarDesign, applyHeroCalendarDesign } from '../model/heroCalendarDesign';
import { isIllustrationCalendarInstalled, downloadIllustrationCalendarAssets, removeIllustrationCalendarDownloads, removeIllustrationCalendarTheme, removeRetiredEverydayFiles } from './illustrationCalendarAssets';
import { SEASON_WINTER_THEMES } from '../model/seasonWinterThemes';
import { SEASON_COLLECTION_THEMES } from '../model/seasonCollectionThemes';
export type CalendarPackId = 'season-spring' | 'season-summer' | 'season-autumn' | 'season-winter' | 'everyday' | 'city' | 'warm-sepia' | 'citypop-retro' | 'textured-watercolor';
/** City Animation remains free; all additional illustration packs are Pro. */
export const isProCalendarPack = (pack: CalendarPackId) => pack !== 'city';
export const calendarPackThemes = (pack: CalendarPackId) => pack === 'city'
  ? CITY_CALENDAR_THEMES.filter(t => !t.themeId.startsWith('season-') && !t.themeId.startsWith('everyday-cinema-') && !t.themeId.startsWith('warm-sepia-open-panel-') && !t.themeId.startsWith('citypop-retro-') && !t.themeId.startsWith('textured-watercolor-'))
  : pack === 'season-spring' ? SEASON_COLLECTION_THEMES.spring : pack === 'season-summer' ? SEASON_COLLECTION_THEMES.summer : pack === 'season-autumn' ? SEASON_COLLECTION_THEMES.autumn : pack === 'season-winter' ? SEASON_WINTER_THEMES : pack === 'warm-sepia' ? WARM_SEPIA_OPEN_PANEL_THEMES
    : pack === 'citypop-retro' ? CITYPOP_RETRO_THEMES : pack === 'textured-watercolor' ? TEXTURED_WATERCOLOR_THEMES : EVERYDAY_CINEMA_THEMES;
const oldEverydayKey = 'pokit:everyday-cinema-pack:20261112-v1';
const key = (pack: CalendarPackId) => ['season-spring', 'season-summer', 'season-autumn'].includes(pack) ? `pokit:${pack}-pack:20261115-v1` : pack === 'season-winter' ? 'pokit:season-winter-pack:20261114-v2' : pack === 'city' ? 'pokit:city-calendar-pack:completed-v2'
  : pack === 'warm-sepia' ? 'pokit:warm-sepia-open-panel-pack:20261113-100-v2'
    : pack === 'citypop-retro' ? 'pokit:citypop-retro-pack:20261112-v1'
    : pack === 'textured-watercolor' ? 'pokit:textured-watercolor-pack:20261112-v1'
    : 'pokit:everyday-cinema-pack:20261112-top-only-v4';
export async function isCityCalendarPackReady(pack: CalendarPackId = 'everyday') {
  const migrating = pack === 'everyday' && localStorageClient.getJson(oldEverydayKey) === true;
  if (!migrating && localStorageClient.getJson(key(pack)) !== true) return false;
  const ready = (await Promise.all(calendarPackThemes(pack).map(t => isIllustrationCalendarInstalled(t.themeId)))).every(Boolean);
  if (ready && migrating) await finishDownload(pack);
  return ready;
}
async function finishDownload(pack: CalendarPackId) {
  if (pack === 'everyday') {
    await removeRetiredEverydayFiles();
    localStorageClient.removeItem(oldEverydayKey);
  }
  localStorageClient.setJson(key(pack), true);
}
let downloadGeneration = 0;

type PackDownloadState = { status: 'idle' | 'downloading' | 'ready' | 'error'; count: number };
const idleDownload: PackDownloadState = { status: 'idle', count: 0 };
const downloadStates = new Map<CalendarPackId, PackDownloadState>();
const downloadTasks = new Map<CalendarPackId, Promise<void>>();
const downloadListeners = new Set<() => void>();
export const getCalendarPackDownload = (pack: CalendarPackId) => downloadStates.get(pack) ?? idleDownload;
export function subscribeCalendarPackDownloads(listener: () => void) {
  downloadListeners.add(listener);
  return () => { downloadListeners.delete(listener); };
}
function publishDownload(pack: CalendarPackId, state: PackDownloadState) {
  downloadStates.set(pack, state);
  downloadListeners.forEach(listener => listener());
}
export async function downloadCityCalendarPack(progress: (count: number) => void, pack: CalendarPackId = 'everyday') {
  const existing = downloadTasks.get(pack);
  if (existing) { progress(getCalendarPackDownload(pack).count); return existing; }
  localStorageClient.setJson(key(pack), false);
  const generation = downloadGeneration;
  publishDownload(pack, { status: 'downloading', count: 0 });
  const task = (async () => {
    try {
      const themes = calendarPackThemes(pack);
      for (let i = 0; i < themes.length; i++) {
        await downloadIllustrationCalendarAssets(themes[i].themeId);
        if (generation !== downloadGeneration) throw new Error('calendar_download_cancelled');
        publishDownload(pack, { status: 'downloading', count: i + 1 });
        progress(i + 1);
      }
      await finishDownload(pack);
      publishDownload(pack, { status: 'ready', count: themes.length });
    } catch (error) {
      publishDownload(pack, { status: 'error', count: getCalendarPackDownload(pack).count });
      throw error;
    } finally { downloadTasks.delete(pack); }
  })();
  downloadTasks.set(pack, task);
  return task;
}

export async function removeCityCalendarPack(pack: CalendarPackId = 'everyday') {
  await downloadTasks.get(pack)?.catch(() => undefined);
  publishDownload(pack, idleDownload);
  localStorageClient.setJson(key(pack), false);
  if (pack === 'everyday') {
    localStorageClient.removeItem(oldEverydayKey);
    await removeRetiredEverydayFiles();
  }
  const themes = calendarPackThemes(pack);
  if (themes.some(t => t.design === readHeroCalendarDesign())) applyHeroCalendarDesign('bold');
  for (const theme of themes) await removeIllustrationCalendarTheme(theme.themeId);
}

export async function clearCityCalendarDownloads() {
  downloadGeneration++;
  await Promise.allSettled([...downloadTasks.values()]);
  await removeIllustrationCalendarDownloads();
  downloadStates.clear();
  downloadListeners.forEach(listener => listener());
}
