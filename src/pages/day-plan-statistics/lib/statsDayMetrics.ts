import type { DayPlanStatsDayRow } from '@shared/lib/storage/dayPlanStatsHistoryStorage';

export function sumCompletionsForDay(row: DayPlanStatsDayRow | undefined): number {
  if (!row) return 0;
  return Object.values(row.completedByCategory).reduce((a, n) => a + (Number(n) || 0), 0);
}

export function distinctCategoriesWithCompletion(row: DayPlanStatsDayRow | undefined): number {
  if (!row) return 0;
  return Object.entries(row.completedByCategory).filter(([, n]) => (Number(n) || 0) > 0).length;
}
