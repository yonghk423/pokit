import type { HistoryDailyStat, HistoryDailyStatInput } from '../model/types';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

import { addDaysToHistoryDateKey } from './historyDateKey';

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

/**
 * endDateKey 포함 최근 dayCount일 categoryCompletions 합산.
 * 키는 normalizeHistoryRecordKey 기준.
 */
export function sumCategoryCompletionsInRange(
  dailyStatsByDate: Record<string, HistoryDailyStat | undefined>,
  endDateKey: string,
  dayCount: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  const days = Math.max(1, Math.floor(dayCount));
  for (let i = 0; i < days; i++) {
    const dateKey = addDaysToHistoryDateKey(endDateKey, -i);
    const row = dailyStatsByDate[dateKey];
    if (!row) continue;
    for (const [categoryKey, count] of Object.entries(getCategoryCompletions(row))) {
      out[categoryKey] = (out[categoryKey] ?? 0) + count;
    }
  }
  return out;
}

export function lookupCategoryCompletionCount(
  frequencyByKey: Record<string, number>,
  categoryKey: string,
): number {
  const normalized = normalizeHistoryRecordKey(categoryKey);
  if (normalized && frequencyByKey[normalized] != null) return frequencyByKey[normalized]!;
  return frequencyByKey[categoryKey] ?? 0;
}
