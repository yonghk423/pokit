import type { DayPlanStatsDayRow } from '@shared/lib/storage/dayPlanStatsHistoryStorage';

export function mergeHistoryWithTodayRow(
  history: DayPlanStatsDayRow[],
  today: DayPlanStatsDayRow,
): DayPlanStatsDayRow[] {
  const m = new Map<string, DayPlanStatsDayRow>();
  for (const r of history) {
    m.set(r.dateKey, r);
  }
  m.set(today.dateKey, today);
  return [...m.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export type CategoryAggregateRow = {
  categoryKey: string;
  totalCompletions: number;
  /** 완료가 1회라도 있었던 서로 다른 날짜 수 */
  daysWithCompletion: number;
};

export function aggregateByCategory(rows: DayPlanStatsDayRow[]): CategoryAggregateRow[] {
  const totals = new Map<string, number>();
  const days = new Map<string, Set<string>>();

  for (const row of rows) {
    for (const [key, raw] of Object.entries(row.completedByCategory)) {
      const n = Math.max(0, Math.floor(Number(raw) || 0));
      if (n <= 0) continue;
      totals.set(key, (totals.get(key) ?? 0) + n);
      let set = days.get(key);
      if (!set) {
        set = new Set();
        days.set(key, set);
      }
      set.add(row.dateKey);
    }
  }

  const out: CategoryAggregateRow[] = [...totals.entries()].map(([categoryKey, totalCompletions]) => ({
    categoryKey,
    totalCompletions,
    daysWithCompletion: days.get(categoryKey)?.size ?? 0,
  }));
  out.sort((a, b) => b.totalCompletions - a.totalCompletions);
  return out;
}
