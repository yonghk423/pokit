import { comicDiaryDate } from './heroCalendar';
import type { ComicDiary } from './heroDiaryStorage';
export type DiaryDateGroup = { date: string; diaries: ComicDiary[] };
/** Keep undated/empty old diaries visible; group by creation day, like the calendar. */
export function groupDiaryLibrary(diaries: ComicDiary[]): DiaryDateGroup[] {
  const groups = new Map<string, ComicDiary[]>();
  for (const diary of diaries) {
    const date = comicDiaryDate(diary) ?? 'undated';
    groups.set(date, [...(groups.get(date) ?? []), diary]);
  }
  return [...groups].map(([date, items]) => ({ date, diaries: [...items].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.date === 'undated' ? (b.date === 'undated' ? 0 : 1) : b.date === 'undated' ? -1 : b.date.localeCompare(a.date));
}
export function groupedDiaryTitle(diary: ComicDiary): string {
  const key = comicDiaryDate(diary);
  if (!key) return diary.title;
  const month = Number(key.slice(5, 7)), day = Number(key.slice(8));
  // Strip only an existing date prefix for this diary's own day; never change saved titles.
  return diary.title.replace(new RegExp(`^0?${month}/0?${day}(?:\\s+\\d{1,2}:\\d{2})?\\s*[·・]\\s*`), '') || diary.title;
}
