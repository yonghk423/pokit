import type { HistoryDailyStat, HistoryDailyStatInput } from '../model/types';

export type HistoryDailyStatCategorySource = Pick<
  HistoryDailyStat,
  'categoryMinutes'
> & Pick<HistoryDailyStatInput, 'categoryCompletions'>;

/** 해당 날짜에 루틴 달성 기록이 있는지 */
export function dayHasCompletionActivity(row: HistoryDailyStat | undefined): boolean {
  if (!row) return false;
  const completionsFromCategories = sumCategoryCompletions(getCategoryCompletions(row));
  return row.completedFlowCount > 0 || completionsFromCategories > 0 || row.completionRate > 0;
}

/** 카테고리별 완료 횟수(구버전 categoryMinutes는 1회로 환산) */
export function getCategoryCompletions(row: HistoryDailyStatCategorySource): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(row.categoryCompletions ?? {})) {
    const k = key.trim();
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    if (!k || n <= 0) continue;
    out[k] = n;
  }
  if (Object.keys(out).length > 0) return out;

  for (const [key] of Object.entries(row.categoryMinutes ?? {})) {
    const k = key.trim();
    if (!k) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function sumCategoryCompletions(map: Record<string, number>): number {
  return Object.values(map).reduce((sum, n) => sum + Math.max(0, n), 0);
}
