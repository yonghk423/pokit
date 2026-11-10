import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { CITY_CALENDAR_THEMES, applyHeroCalendarDesign } from '../model/heroCalendarDesign';
import { isIllustrationCalendarInstalled, downloadIllustrationCalendarAssets, removeIllustrationCalendarDownloads } from './illustrationCalendarAssets';
const KEY = 'pokit:city-calendar-pack:completed-v2';
export async function isCityCalendarPackReady() {
  // One-time reset of the development preview downloads requested on Nov 9.
  if (__DEV__ && localStorageClient.getJson('pokit:city-calendar-reset-20261109-1328') !== true) {
    localStorageClient.setJson(KEY, false);
    applyHeroCalendarDesign('bold');
    localStorageClient.setJson('pokit:city-calendar-reset-20261109-1328', true);
    return false;
  }
  if (localStorageClient.getJson(KEY) !== true) return false;
  return (await Promise.all(CITY_CALENDAR_THEMES.map(t => isIllustrationCalendarInstalled(t.themeId)))).every(Boolean);
}
export async function downloadCityCalendarPack(progress: (count: number) => void) {
  localStorageClient.setJson(KEY, false);
  for (let i = 0; i < CITY_CALENDAR_THEMES.length; i++) {
    await downloadIllustrationCalendarAssets(CITY_CALENDAR_THEMES[i].themeId);
    progress(i + 1);
  }
  localStorageClient.setJson(KEY, true);
}

export async function removeCityCalendarPack() {
  localStorageClient.setJson(KEY, false);
  localStorageClient.setJson('pokit:city-calendar-pack:completed-v1', false);
  applyHeroCalendarDesign('bold');
  await removeIllustrationCalendarDownloads();
}
