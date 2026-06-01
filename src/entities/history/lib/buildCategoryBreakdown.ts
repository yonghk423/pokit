import { getCategoryCompletions } from './historyCompletionMetrics';

import type { HistoryCategoryBreakdownRow, HistoryDailyStat, HistoryRange } from '../model/types';

function clampInt(value: unknown, fallback = 0): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function isBetween(dateKey: string, range: HistoryRange): boolean {
  return dateKey >= range.startDateKey && dateKey <= range.endDateKey;
}

export function buildCategoryBreakdown(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  range: HistoryRange,
): HistoryCategoryBreakdownRow[] {
  const completionsByCategory: Record<string, number> = {};
  let total = 0;

  for (const row of Object.values(dailyStatsByDate)) {
    if (!isBetween(row.dateKey, range)) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      const n = clampInt(count, 0);
      if (n <= 0) continue;
      completionsByCategory[key] = (completionsByCategory[key] || 0) + n;
      total += n;
    }
  }

  if (total <= 0) return [];

  return Object.entries(completionsByCategory)
    .map(([categoryKey, completions]) => ({
      categoryKey,
      completions,
      ratio: completions / total,
    }))
    .sort((a, b) => b.completions - a.completions);
}
