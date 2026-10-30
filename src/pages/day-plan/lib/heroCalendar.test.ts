import { calendarCover, comicCalendarDays, comicDiaryDate, groupCalendarDiaries } from './heroCalendar';
import type { ComicDiary } from './heroDiaryStorage';
import { newComicScene } from './heroDayStorage';
function diary(id: string, day: number, scenes = [newComicScene('scene')]): ComicDiary {
  return { id, title: id, characterId: 'protagonist-1', scenes, createdAt: new Date(2026, 9, day, 23, 50).getTime(), updatedAt: new Date(2026, 10, 4).getTime() };
}
it('groups every diary by local creation day, ignores later edits and preserves dated imports', () => {
  const first = diary('first', 13), second = diary('second', 13), next = diary('next', 14);
  const groups = groupCalendarDiaries([next, second, diary('empty', 13, []), first]);
  expect(groups.get('2026-10-13')?.map(item => item.id)).toEqual(['first', 'second']);
  expect(groups.get('2026-10-14')).toEqual([next]);
  expect(comicDiaryDate({ ...first, id: 'legacy:protagonist-1:2026-09-12' })).toBe('2026-09-12');
  expect(comicDiaryDate({ ...first, createdAt: NaN })).toBeNull();
});
it('keeps the first scene as cover and falls back when a chosen scene is deleted', () => {
  const first = diary('first', 13), second = diary('second', 13);
  expect(calendarCover([first, second])?.scene.id).toBe(first.scenes[0].id);
  const chosen = { diaryId: second.id, sceneId: second.scenes[0].id };
  expect(calendarCover([first, second], chosen)?.scene.id).toBe(second.scenes[0].id);
  expect(calendarCover([first], chosen)?.scene.id).toBe(first.scenes[0].id);
  expect(calendarCover([])).toBeNull();
});
it('lays out all dates under the correct Sunday-first weekday including leap years and six-week months', () => {
  const october = comicCalendarDays(new Date(2026, 9, 1));
  expect(october.slice(0, 7)).toEqual([null, null, null, null, 1, 2, 3]);
  expect(october).toHaveLength(35);
  expect(october.filter(Boolean)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  expect(comicCalendarDays(new Date(2024, 1, 1)).filter(Boolean)).toHaveLength(29);
  expect(comicCalendarDays(new Date(2026, 7, 1))).toHaveLength(42);
  expect(comicCalendarDays(new Date(2026, 1, 1))).toHaveLength(28);
});
