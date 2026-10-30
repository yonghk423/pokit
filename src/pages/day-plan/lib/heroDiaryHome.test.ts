import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { COMIC_DIARY_HOME_DATE_KEY, COMIC_DIARY_HOME_SELECTION_KEY, rememberComicDiaryHistorySelection, loadComicDiaryHome } from './heroDiaryHome';
import { COMIC_DIARY_STORAGE_KEY, saveComicDiaryLibrary, type ComicDiaryLibrary } from './heroDiaryStorage';
import { clearComicNavigation, loadComicNavigation, saveComicNavigation } from './heroNavigation';
import { newComicScene } from './heroDayStorage';

const title = (number: number) => `Diary ${number}`;
const old = { id: 'old', title: 'Yesterday', characterId: 'protagonist-1', scenes: [newComicScene('Yesterday scene')], createdAt: new Date(2026, 9, 28, 20).getTime(), updatedAt: 0 };
beforeEach(() => {
  localStorageClient.removeItem(COMIC_DIARY_HOME_DATE_KEY);
  localStorageClient.removeItem(COMIC_DIARY_HOME_SELECTION_KEY);
  localStorageClient.removeItem(COMIC_DIARY_STORAGE_KEY);
  clearComicNavigation();
});
afterEach(() => {
  localStorageClient.removeItem(COMIC_DIARY_HOME_DATE_KEY);
  localStorageClient.removeItem(COMIC_DIARY_HOME_SELECTION_KEY);
  localStorageClient.removeItem(COMIC_DIARY_STORAGE_KEY);
  clearComicNavigation();
});
const seed = (diaries = [old]) => saveComicDiaryLibrary({ version: 1, diaries, activeId: old.id, migratedLegacyKeys: [] });

it('starts empty on a new day without deleting yesterday, including after another cold start', () => {
  seed();
  localStorageClient.setJson(COMIC_DIARY_HOME_DATE_KEY, '2026-10-28');
  saveComicNavigation(old.characterId, 'picker', old.id);
  const home = loadComicDiaryHome('2026-10-29', title);
  expect(home.activeId).toBeNull();
  expect(home.diaries).toEqual([old]);
  expect(loadComicNavigation()).toBeNull();
  expect(loadComicDiaryHome('2026-10-29', title).activeId).toBeNull();
});
it('opens the latest diary created today, ignoring recent edits to yesterday', () => {
  const morning = { ...old, id: 'morning', title: 'Morning', createdAt: new Date(2026, 9, 29, 8).getTime() };
  const evening = { ...old, id: 'evening', title: 'Evening', createdAt: new Date(2026, 9, 29, 18).getTime() };
  seed([{ ...old, updatedAt: new Date(2026, 9, 30).getTime() }, morning, evening]);
  expect(loadComicDiaryHome('2026-10-29', title).activeId).toBe(evening.id);
});
it('keeps explicitly opened history across remounts on the same day', () => {
  seed();
  loadComicDiaryHome('2026-10-29', title);
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY)!;
  rememberComicDiaryHistorySelection('2026-10-29', old.id);
  saveComicDiaryLibrary({ ...library, activeId: old.id });
  saveComicNavigation(old.characterId, 'board', old.id);
  expect(loadComicDiaryHome('2026-10-29', title).activeId).toBe(old.id);
  expect(loadComicNavigation()?.diaryId).toBe(old.id);
  expect(loadComicDiaryHome('2026-10-30', title).activeId).toBeNull();
});
it('shows the empty home for an unfinished empty diary when a day is first opened', () => {
  seed([{ ...old, id: 'empty', createdAt: new Date(2026, 9, 29, 8).getTime(), scenes: [] }]);
  expect(loadComicDiaryHome('2026-10-29', title).activeId).toBeNull();
});


it('repairs a stale previous-day selection even if another render already advanced the home date marker', () => {
  seed();
  localStorageClient.setJson(COMIC_DIARY_HOME_DATE_KEY, '2026-10-30');
  saveComicNavigation(old.characterId, 'board', old.id);
  expect(loadComicDiaryHome('2026-10-30', title).activeId).toBeNull();
  expect(loadComicNavigation()).toBeNull();
  expect(loadComicDiaryHome('2026-10-30', title).diaries).toEqual([old]);
});
