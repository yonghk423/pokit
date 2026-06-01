import { getCategoryCompletions, sumCategoryCompletions } from './historyCompletionMetrics';
import { addDaysToHistoryDateKey } from './historyDateKey';

import type { HistoryDailyStat, HistoryHeatMapCell } from '../model/types';

function effectiveCompletedFlowCount(row: HistoryDailyStat | undefined): number {
  if (!row) return 0;
  const fromField = Math.max(0, Math.floor(Number(row.completedFlowCount) || 0));
  const fromCategories = sumCategoryCompletions(getCategoryCompletions(row));
  return Math.max(fromField, fromCategories);
}

function heatLevel(completedCount: number, completionRate: number): 0 | 1 | 2 | 3 {
  if (completedCount <= 0 && completionRate <= 0) return 0;
  if (completionRate >= 0.85 || completedCount >= 5) return 3;
  if (completionRate >= 0.55 || completedCount >= 3) return 2;
  return 1;
}

export function buildWeeklyHeatMapCells(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  weeks = 4,
  anchorDateKey: string,
): HistoryHeatMapCell[] {
  const anchor = anchorDateKey.trim();
  const totalDays = Math.max(1, Math.floor(Number(weeks) || 1) * 7);
  const firstDay = addDaysToHistoryDateKey(anchor, -(totalDays - 1));
  const out: HistoryHeatMapCell[] = [];

  for (let i = 0; i < totalDays; i += 1) {
    const dateKey = addDaysToHistoryDateKey(firstDay, i);
    const row = dailyStatsByDate[dateKey];
    const completedFlowCount = effectiveCompletedFlowCount(row);
    const completionRate = row?.completionRate ?? 0;
    out.push({
      dateKey,
      completedFlowCount,
      completionRate,
      level: heatLevel(completedFlowCount, completionRate),
    });
  }
  return out;
}
