import { readIndependentNotes, saveIndependentNotes, saveCalendarNotes } from './calendarNotes';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const data = new Map();
  return { localStorageClient: { listKeys: (prefix: string) => [...data.keys()].filter(key => key.startsWith(prefix)), getJson: (key: string) => data.get(key), setJson: (key: string, value: unknown) => data.set(key, value) } };
});
it('merges monthly notes without colliding draft IDs or reimporting removed tasks', () => {
  saveCalendarNotes('2026-11', [{ id: 'draft', text: 'November', updatedAt: 1, todos: [{ id: 't', text: 'Task', completed: true }] }]);
  saveCalendarNotes('2026-12', [{ id: 'draft', text: 'December', updatedAt: 2 }]);
  const merged = readIndependentNotes();
  expect(merged.map(note => note.id)).toEqual(['2026-12:draft', '2026-11:draft']);
  expect(merged[1].todos?.[0].completed).toBe(true);
  saveIndependentNotes(merged.map(note => ({ ...note, todos: [] })));
  expect(readIndependentNotes()[1].todos).toEqual([]);
  expect(localStorageClient.getJson('pokit:calendar-notes:2026-11')).toHaveLength(1);
});
