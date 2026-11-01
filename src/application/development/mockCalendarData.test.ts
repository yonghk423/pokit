import { addDevelopmentCalendarMockData, buildCalendarMockDiaries } from './mockCalendarData';
import { ensureDevelopmentMockData } from './mockData';
import { groupCalendarDiaries } from '@pages/day-plan/lib/heroCalendar';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { normalizeComicScenes } from '@pages/day-plan/lib/heroDayStorage';
import { localStorageClient, setDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import type { AppLocale } from '@shared/lib/i18n';
afterEach(() => setDevelopmentStorageProfile(null));
it.each<AppLocale>(['ko', 'en', 'ja', 'zh-TW'])('builds dense editable %s calendar entries, with multiple diaries and many scenes per date', locale => {
  const diaries = buildCalendarMockDiaries(locale, '2026-10-29');
  const grouped = groupCalendarDiaries(diaries);
  expect(grouped.get('2026-10-13')).toHaveLength(6);
  expect(grouped.get('2026-10-29')).toHaveLength(locale === 'ko' ? 6 : 4);
  expect(grouped.has('2026-09-30')).toBe(true);
  expect(grouped.size).toBeGreaterThan(10);
  expect(diaries.some(diary => diary.scenes.length === 20)).toBe(true);
  expect(new Set(diaries.map(diary => diary.characterId))).toEqual(new Set(['protagonist-1', 'protagonist-2', 'protagonist-3', 'protagonist-4', 'protagonist-5', 'protagonist-6']));
  const scenes = diaries.flatMap(diary => diary.scenes);
  expect(normalizeComicScenes(scenes)).toEqual(scenes);
  expect(scenes.every(scene => scene.memo.length > 40 && scene.todos.length > 0)).toBe(true);
  const ids = diaries.flatMap(diary => [diary.id, ...diary.scenes.flatMap(scene => [scene.id, ...scene.todos.map(todo => todo.id)])]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(diaries).toEqual(buildCalendarMockDiaries(locale, '2026-10-29'));
});
it('adds to a selected mock profile once, preserving edits, active diary and real data', () => {
  setDevelopmentStorageProfile(null);
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { personal: true });
  expect(addDevelopmentCalendarMockData('2026-10-29')).toBe(false);
  setDevelopmentStorageProfile('ko');
  ensureDevelopmentMockData(true, '2026-10-29');
  const original = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY)!;
  expect(addDevelopmentCalendarMockData('2026-10-29')).toBe(true);
  const added = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY)!;
  expect(added.activeId).toBe(original.activeId);
  expect(added.diaries.slice(0, original.diaries.length)).toEqual(original.diaries);
  added.diaries.at(-1)!.scenes[0].memo = 'My own edited note';
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, added);
  expect(addDevelopmentCalendarMockData('2026-10-29')).toBe(false);
  expect(localStorageClient.getJson(COMIC_DIARY_STORAGE_KEY)).toEqual(added);
  setDevelopmentStorageProfile(null);
  expect(localStorageClient.getJson(COMIC_DIARY_STORAGE_KEY)).toEqual({ personal: true });
});
it('uses valid local dates at year and month boundaries without seeding future dates', () => {
  const diaries = buildCalendarMockDiaries('ko', '2027-01-02');
  expect([...groupCalendarDiaries(diaries).keys()].sort()).toEqual([
    ...Array.from({ length: 31 }, (_, index) => `2026-12-${String(index + 1).padStart(2, '0')}`), '2027-01-01', '2027-01-02',
  ]);
});
it.each([
  ['2026-11-01', '2026-10', 31],
  ['2027-03-01', '2027-02', 28],
  ['2028-03-01', '2028-02', 29],
] as const)('fills the entire previous Korean month for %s, including leap years', (date, previousMonth, days) => {
  const groups = groupCalendarDiaries(buildCalendarMockDiaries('ko', date));
  const previousDates = [...groups.keys()].filter(day => day.startsWith(previousMonth)).sort();
  expect(previousDates).toEqual(Array.from({ length: days }, (_, index) => `${previousMonth}-${String(index + 1).padStart(2, '0')}`));
  expect(new Set(previousDates.map(day => groups.get(day)![0].characterId)).size).toBe(6);
  expect([...groups.keys()].every(day => day <= date)).toBe(true);
});
it.each(['2026-11-01', '2027-01-01'])('includes all six Korean protagonists on %s, even before other dates exist in the month', date => {
  const today = groupCalendarDiaries(buildCalendarMockDiaries('ko', date)).get(date)!;
  expect(today.map(diary => diary.characterId)).toEqual(Array.from({ length: 6 }, (_, index) => `protagonist-${index + 1}`));
  for (const diary of today.slice(4)) {
    expect(diary.scenes.length).toBeGreaterThan(1);
    expect(diary.scenes.every(scene => scene.image.startsWith(diary.characterId === 'protagonist-5' ? 'p5-' : 'p6-') && scene.title.trim() && scene.memo.length > 40)).toBe(true);
  }
});
it('upgrades the saved four-entry Korean mock without losing custom diaries or written edits', () => {
  const date = '2026-11-01';
  setDevelopmentStorageProfile('ko');
  const samples = buildCalendarMockDiaries('ko', date);
  const retained = samples.filter(diary => !diary.id.endsWith(':4') && !diary.id.endsWith(':5')
    && (!diary.id.startsWith('mock-calendar:ko:2026-10-') || diary.id.startsWith('mock-calendar:ko:2026-10-31:')));
  retained[0].scenes[0].memo = '내가 직접 수정한 내용';
  const personalDiary = { ...retained[0], id: 'my-existing-diary', title: '그대로 남길 일기' };
  const library: ComicDiaryLibrary = { version: 1, diaries: [...retained, personalDiary], activeId: personalDiary.id, migratedLegacyKeys: [] };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, library);
  localStorageClient.setItemRaw('pokit:calendar-mock-character-version', '2');
  expect(addDevelopmentCalendarMockData(date)).toBe(true);
  const upgraded = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY)!;
  expect(upgraded.activeId).toBe(personalDiary.id);
  expect(upgraded.diaries.find(diary => diary.id === personalDiary.id)).toEqual(personalDiary);
  expect(upgraded.diaries.find(diary => diary.id === retained[0].id)!.scenes[0].memo).toBe('내가 직접 수정한 내용');
  expect(upgraded.diaries.find(diary => diary.id === `mock-calendar:ko:${date}:4`)!.characterId).toBe('protagonist-5');
  expect(upgraded.diaries.find(diary => diary.id === `mock-calendar:ko:${date}:5`)!.characterId).toBe('protagonist-6');
  expect([...groupCalendarDiaries(upgraded.diaries).keys()].filter(day => day.startsWith('2026-10-'))).toHaveLength(31);
  expect(addDevelopmentCalendarMockData(date)).toBe(false);
});
