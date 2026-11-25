import type { PostItInkColorId } from '@shared/lib/storage/postItInkColorStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type CalendarTodo = { id: string; text: string; completed: boolean; inlineDocument?: { text: string; icons: string[] } };
export type CalendarNote = { id: string; text: string; todos?: CalendarTodo[]; inlineDocument?: { text: string; icons: string[] }; inkHex?: string; inkColorId?: PostItInkColorId | null; updatedAt: number };
const key = (month: string) => `pokit:calendar-notes:${month}`;
export function readCalendarNotes(month: string): CalendarNote[] {
  const value = localStorageClient.getJson<CalendarNote[]>(key(month));
  return Array.isArray(value) ? value.filter(note => note && typeof note.id === 'string' && typeof note.text === 'string') : [];
}
export function saveCalendarNotes(month: string, notes: CalendarNote[]) {
  localStorageClient.setJson(key(month), notes);
}

const independentKey = 'pokit:independent-notes';
/** Preserve old monthly records, including repeated draft IDs, without deleting originals. */
export function readIndependentNotes(): CalendarNote[] {
  const saved = localStorageClient.getJson<CalendarNote[]>(independentKey);
  if (Array.isArray(saved)) return saved;
  return localStorageClient.listKeys('pokit:calendar-notes:')
    .filter(storageKey => /^pokit:calendar-notes:\d{4}-\d{2}$/.test(storageKey))
    .flatMap(storageKey => {
      const month = storageKey.slice('pokit:calendar-notes:'.length);
      return readCalendarNotes(month).map(note => ({ ...note, id: `${month}:${note.id}` }));
    }).sort((a, b) => b.updatedAt - a.updatedAt);
}
export function saveIndependentNotes(notes: CalendarNote[]) {
  localStorageClient.setJson(independentKey, notes);
}
