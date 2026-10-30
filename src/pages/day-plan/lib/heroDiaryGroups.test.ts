import { groupDiaryLibrary, groupedDiaryTitle } from './heroDiaryGroups';
import type { ComicDiary } from './heroDiaryStorage';
const diary = (id: string, day: number, hour: number): ComicDiary => ({ id, title: `10/${day} · My title`, characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, day, hour).getTime(), updatedAt: new Date(2026, 10, 1).getTime() });
it('sorts days newest first and entries chronologically while keeping undated and empty diaries', () => {
  const morning = diary('morning', 13, 7), evening = diary('evening', 13, 20), next = diary('next', 14, 8);
  const undated = { ...morning, id: 'unknown', createdAt: 0 };
  const groups = groupDiaryLibrary([evening, undated, next, morning]);
  expect(groups.map(group => group.date)).toEqual(['2026-10-14', '2026-10-13', 'undated']);
  expect(groups[1].diaries.map(item => item.id)).toEqual(['morning', 'evening']);
  expect(groups[2].diaries).toEqual([undated]);
});
it('removes only matching display date prefixes without editing original titles', () => {
  const item = diary('a', 13, 7);
  expect(groupedDiaryTitle(item)).toBe('My title');
  expect(item.title).toBe('10/13 · My title');
  expect(groupedDiaryTitle({ ...item, title: '10/13 07:15 · Morning' })).toBe('Morning');
  expect(groupedDiaryTitle({ ...item, title: '10/12 · Keep this date' })).toBe('10/12 · Keep this date');
  expect(groupedDiaryTitle({ ...item, title: 'Untouched' })).toBe('Untouched');
});
