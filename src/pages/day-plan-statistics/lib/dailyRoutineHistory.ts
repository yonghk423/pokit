import { categoryReminderIconName } from '@entities/day-plan';
import {
  computeCategoryCompletionStreak,
  formatCategoryStreakLabel,
  getCategoryCompletions,
  type HistoryDailyStat,
} from '@entities/history';

export type DailyRoutineHistoryStatus = 'completed' | 'incomplete';

export type DailyRoutineHistoryRow = {
  categoryKey: string;
  title: string;
  icon: string;
  status: DailyRoutineHistoryStatus;
  statusLabel: '완료' | '미완료';
  consecutiveDays: number;
  streakLabel: string;
  barPercent: number;
};

export function resolveDailyRoutinePlannedKeys(input: {
  dateKey: string;
  todayDateKey: string;
  plannedKeysByDate: Record<string, string[]>;
  priorityCategoryOrder: string[];
  completedCategoryKeys: string[];
}): string[] {
  const fromSnapshot = input.plannedKeysByDate[input.dateKey] ?? [];
  const fromToday =
    input.dateKey === input.todayDateKey ? input.priorityCategoryOrder : [];
  const ordered = fromSnapshot.length > 0 ? fromSnapshot : fromToday;
  const keys = new Set<string>();
  for (const key of ordered) {
    const trimmed = key.trim();
    if (trimmed) keys.add(trimmed);
  }
  for (const key of input.completedCategoryKeys) {
    const trimmed = key.trim();
    if (trimmed) keys.add(trimmed);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of [...ordered, ...input.completedCategoryKeys]) {
    const trimmed = key.trim();
    if (!trimmed || seen.has(trimmed) || !keys.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** 달력에서 선택한 하루의 카테고리별 완료·미완료 기록 */
export function buildDailyRoutineHistory(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  dateKey: string;
  categoryLabel: (key: string) => string;
  plannedCategoryKeys: string[];
}): DailyRoutineHistoryRow[] {
  const dateKey = input.dateKey.trim();
  const row = input.dailyStatsByDate[dateKey];
  const completions = row ? getCategoryCompletions(row) : {};
  const completedKeys = Object.entries(completions)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([key]) => key);

  const categoryKeys =
    input.plannedCategoryKeys.length > 0
      ? input.plannedCategoryKeys
      : completedKeys;

  if (categoryKeys.length === 0) return [];

  return categoryKeys.map((categoryKey) => {
    const isCompleted = (completions[categoryKey] ?? 0) > 0;
    const consecutiveDays = computeCategoryCompletionStreak(
      input.dailyStatsByDate,
      categoryKey,
      dateKey,
    );
    return {
      categoryKey,
      title: input.categoryLabel(categoryKey),
      icon: categoryReminderIconName(categoryKey),
      status: isCompleted ? 'completed' : 'incomplete',
      statusLabel: isCompleted ? '완료' : '미완료',
      consecutiveDays,
      streakLabel: formatCategoryStreakLabel(consecutiveDays),
      barPercent: isCompleted ? 100 : 0,
    };
  });
}
