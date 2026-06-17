import { getCategoryCompletions } from './historyCompletionMetrics';
import { addDaysToHistoryDateKey } from './historyDateKey';
import type { HistoryDailyStat } from '../model/types';

/** 선택한 날짜부터 거꾸로, 해당 카테고리를 완료한 연속 일수 */
export function computeCategoryCompletionStreak(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  categoryKey: string,
  anchorDateKey: string,
): number {
  const key = categoryKey.trim();
  const anchor = anchorDateKey.trim();
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return 0;

  const maxLookbackDays = 366 * 10;
  let streak = 0;
  let cursor = anchor;
  while (streak < maxLookbackDays) {
    const row = dailyStatsByDate[cursor];
    const count = row ? (getCategoryCompletions(row)[key] ?? 0) : 0;
    if (count <= 0) break;
    streak += 1;
    cursor = addDaysToHistoryDateKey(cursor, -1);
  }
  return streak;
}

export function formatCategoryStreakLabel(consecutiveDays: number): string {
  if (consecutiveDays <= 0) return '연속 없음';
  return `연속 ${consecutiveDays}일`;
}
