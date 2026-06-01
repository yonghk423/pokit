import { getCategoryCompletions, sumCategoryCompletions } from './historyCompletionMetrics';
import { historyWeekday } from './historyDateKey';

import type { HistoryDailyStat, HistoryRange, HistoryWeekdayConsistencyRow } from '../model/types';

function effectiveCompletedFlowCount(row: HistoryDailyStat): number {
  const fromField = Math.max(0, Math.floor(Number(row.completedFlowCount) || 0));
  const fromCategories = sumCategoryCompletions(getCategoryCompletions(row));
  return Math.max(fromField, fromCategories);
}

function clampRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isBetween(dateKey: string, range: HistoryRange): boolean {
  return dateKey >= range.startDateKey && dateKey <= range.endDateKey;
}

export function buildConsistencyByWeekday(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  range: HistoryRange,
): HistoryWeekdayConsistencyRow[] {
  const bucket: Record<number, { days: number; completions: number; completionRateTotal: number }> = {};
  for (let i = 0; i < 7; i += 1) {
    bucket[i] = { days: 0, completions: 0, completionRateTotal: 0 };
  }

  for (const row of Object.values(dailyStatsByDate)) {
    if (!isBetween(row.dateKey, range)) continue;
    const weekday = historyWeekday(row.dateKey);
    bucket[weekday].days += 1;
    bucket[weekday].completions += effectiveCompletedFlowCount(row);
    bucket[weekday].completionRateTotal += row.completionRate;
  }

  const out: HistoryWeekdayConsistencyRow[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const item = bucket[weekday];
    const days = item.days;
    out.push({
      weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      averageCompletions: days > 0 ? Math.round(item.completions / days) : 0,
      averageCompletionRate: days > 0 ? clampRate(item.completionRateTotal / days) : 0,
    });
  }
  return out;
}
