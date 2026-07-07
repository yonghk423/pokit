import type { HistoryDailyStat, HistoryDailyStatInput } from '../model/types';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

export type HistoryDailyStatCategorySource = Pick<
  HistoryDailyStat,
  'categoryMinutes'
> & Pick<HistoryDailyStatInput, 'categoryCompletions'>;

/** 카테고리별 완료 횟수(구버전 categoryMinutes는 1회로 환산) */
export function getCategoryCompletions(row: HistoryDailyStatCategorySource): Record<string, number> {
  const merged: Record<string, number> = {};
  const mergeKey = (rawKey: string, count: number) => {
    const k = normalizeHistoryRecordKey(rawKey);
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (!k || n <= 0) return;
    merged[k] = (merged[k] ?? 0) + n;
  };

  for (const [key, raw] of Object.entries(row.categoryCompletions ?? {})) {
    mergeKey(key, raw);
  }
  if (Object.keys(merged).length > 0) return merged;

  for (const [key] of Object.entries(row.categoryMinutes ?? {})) {
    mergeKey(key, 1);
  }
  return merged;
}

export function sumCategoryCompletions(map: Record<string, number>): number {
  return Object.values(map).reduce((sum, n) => sum + Math.max(0, n), 0);
}
