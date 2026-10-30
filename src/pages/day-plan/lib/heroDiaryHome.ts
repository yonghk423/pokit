import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { comicDiaryDate } from './heroCalendar';
import { loadComicDiaryLibrary, saveComicDiaryLibrary } from './heroDiaryStorage';
import { clearComicNavigation } from './heroNavigation';

export const COMIC_DIARY_HOME_DATE_KEY = 'pokit:comic-home-date:v1';
export const COMIC_DIARY_HOME_SELECTION_KEY = 'pokit:comic-home-selection:v1';

/** Only an explicit history action may restore a past day's selection on today's home. */
export function rememberComicDiaryHistorySelection(date: string, diaryId: string) {
  localStorageClient.setJson(COMIC_DIARY_HOME_SELECTION_KEY, { date, diaryId });
}

/** A new day starts with today's latest diary, or the empty home. Explicit history browsing is retained within the day. */
export function loadComicDiaryHome(date: string, titleForNumber: (number: number) => string, forceToday = false) {
  const library = loadComicDiaryLibrary(date, titleForNumber);
  const sameDay = localStorageClient.getJson<string>(COMIC_DIARY_HOME_DATE_KEY) === date;
  const selected = library.diaries.find(diary => diary.id === library.activeId);
  const selectedDate = selected ? comicDiaryDate(selected) : null;
  const explicit = localStorageClient.getJson<{ date: string; diaryId: string }>(COMIC_DIARY_HOME_SELECTION_KEY);
  if (!forceToday && sameDay && (!selected || !selectedDate || selectedDate >= date || (explicit?.date === date && explicit.diaryId === library.activeId))) return library;
  localStorageClient.removeItem(COMIC_DIARY_HOME_SELECTION_KEY);
  const today = library.diaries.filter(diary => comicDiaryDate(diary) === date && diary.scenes.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt)[0];
  const next = { ...library, activeId: today?.id ?? null };
  clearComicNavigation();
  localStorageClient.setJson(COMIC_DIARY_HOME_DATE_KEY, date);
  saveComicDiaryLibrary(next);
  return next;
}
