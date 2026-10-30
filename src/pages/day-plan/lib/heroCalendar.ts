import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { ComicDiary } from './heroDiaryStorage';

export type CalendarCover = { diaryId: string; sceneId: string };
export function comicDiaryDate(diary: ComicDiary): string | null {
  // Dated imports retain their original day, independent of timezone or later edits.
  const legacy = /^legacy:.+:(\d{4}-\d{2}-\d{2})$/.exec(diary.id);
  if (legacy) return legacy[1];
  return Number.isFinite(diary.createdAt) && diary.createdAt > 0 ? getLocalDateKey(new Date(diary.createdAt)) : null;
}
export function groupCalendarDiaries(diaries: ComicDiary[]): Map<string, ComicDiary[]> {
  const groups = new Map<string, ComicDiary[]>();
  for (const diary of [...diaries].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))) {
    const key = comicDiaryDate(diary);
    if (!key || !diary.scenes.length) continue;
    groups.set(key, [...(groups.get(key) ?? []), diary]);
  }
  return groups;
}
export function calendarCover(diaries: ComicDiary[], chosen?: CalendarCover) {
  const selectedDiary = diaries.find(diary => diary.id === chosen?.diaryId);
  const selectedScene = selectedDiary?.scenes.find(scene => scene.id === chosen?.sceneId);
  if (selectedDiary && selectedScene) return { diary: selectedDiary, scene: selectedScene };
  const diary = diaries.find(item => item.scenes.length);
  return diary ? { diary, scene: diary.scenes[0] } : null;
}
/** Sunday-first, only the weeks occupied by this month. */
export function comicCalendarDays(month: Date): (number | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
  return Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, index) => index < first || index >= first + days ? null : index - first + 1);
}
