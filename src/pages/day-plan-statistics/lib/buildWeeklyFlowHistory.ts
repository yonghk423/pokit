import {
  categoryReminderIconName,
  categoryReminderLabelKo,
} from '@entities/day-plan';
import {
  addDaysToHistoryDateKey,
  historyStartOfWeekMonday,
  parseHistoryDateKey,
} from '@entities/history/lib/historyDateKey';
import { getCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';
import type { HistoryDailyStat } from '@entities/history/model/types';
import {
  normalizeHistoryRecordKey,
  parseRoutineHistoryRecordKey,
  ROUTINE_HISTORY_LAYOUT_META,
  type RoutineHistoryLayoutMode,
} from '@shared/lib/routineHistoryLayoutKey';

import { resolveTopCategoryLabels } from './resolveTopCategoryLabels';

export type WeeklyHistorySummary = {
  activeDays: number;
  daysInWeek: number;
  totalCompletions: number;
  progressPercent: number;
  topCategoryLabels: string[];
};

export type WeeklyFlowHistoryRow = {
  historyKey: string;
  categoryKey: string;
  layoutMode: RoutineHistoryLayoutMode;
  layoutIcon: string;
  layoutLabel: string;
  label: string;
  icon: string;
  /** 월=0 … 일=6 */
  weekdayDone: boolean[];
  completedDays: number;
  timeLabel?: string;
  startDateLabel?: string;
};

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export { WEEKDAY_LABELS };

export function historyWeekdayIndexMondayZero(dateKey: string): number {
  const date = parseHistoryDateKey(dateKey);
  if (!date) return 0;
  return (date.getDay() + 6) % 7;
}

export function buildWeekDateKeys(weekStartDateKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToHistoryDateKey(weekStartDateKey, index));
}

export function formatHistoryMonthDayKo(dateKey: string): string {
  const date = parseHistoryDateKey(dateKey);
  if (!date) return dateKey;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatWeekRangeLabelKo(weekStartDateKey: string): string {
  const weekEndDateKey = addDaysToHistoryDateKey(weekStartDateKey, 6);
  return `${formatHistoryMonthDayKo(weekStartDateKey)} — ${formatHistoryMonthDayKo(weekEndDateKey)}`;
}

function findFirstCompletionDateKey(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  historyKey: string,
): string | undefined {
  const keys = Object.keys(dailyStatsByDate).sort((a, b) => a.localeCompare(b));
  for (const dateKey of keys) {
    const count = getCategoryCompletions(dailyStatsByDate[dateKey] ?? {})[historyKey] ?? 0;
    if (count > 0) return dateKey;
  }
  return undefined;
}

export function buildWeeklyFlowHistory(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  weekStartDateKey: string;
  trackedCategoryKeys?: readonly string[];
  timeLabelByCategoryKey?: Readonly<Record<string, string | undefined>>;
}): WeeklyFlowHistoryRow[] {
  const weekDateKeys = buildWeekDateKeys(input.weekStartDateKey);
  const historyKeys = new Set<string>(
    (input.trackedCategoryKeys ?? []).map((key) => normalizeHistoryRecordKey(key)),
  );

  for (const dateKey of weekDateKeys) {
    const row = input.dailyStatsByDate[dateKey];
    if (!row) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count > 0) historyKeys.add(key);
    }
  }

  const rows: WeeklyFlowHistoryRow[] = [];

  for (const historyKey of historyKeys) {
    const { categoryKey, layoutMode } = parseRoutineHistoryRecordKey(historyKey);
    if (!categoryKey) continue;
    const weekdayDone = weekDateKeys.map((dateKey) => {
      const count = getCategoryCompletions(input.dailyStatsByDate[dateKey] ?? {})[historyKey] ?? 0;
      return count > 0;
    });
    const completedDays = weekdayDone.filter(Boolean).length;
    if (completedDays <= 0) continue;
    const firstDateKey = findFirstCompletionDateKey(input.dailyStatsByDate, historyKey);
    const layoutMeta = ROUTINE_HISTORY_LAYOUT_META[layoutMode];

    rows.push({
      historyKey,
      categoryKey,
      layoutMode,
      layoutIcon: layoutMeta.icon,
      layoutLabel: layoutMeta.labelKo,
      label: categoryReminderLabelKo(categoryKey),
      icon: categoryReminderIconName(categoryKey),
      weekdayDone,
      completedDays,
      timeLabel: input.timeLabelByCategoryKey?.[categoryKey],
      startDateLabel: firstDateKey ? formatHistoryMonthDayKo(firstDateKey) : undefined,
    });
  }

  rows.sort(
    (a, b) =>
      a.categoryKey.localeCompare(b.categoryKey, 'ko') ||
      a.layoutMode.localeCompare(b.layoutMode) ||
      b.completedDays - a.completedDays,
  );

  return rows;
}

export function buildWeeklyHistorySummary(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  weekStartDateKey: string;
}): WeeklyHistorySummary {
  const weekDateKeys = buildWeekDateKeys(input.weekStartDateKey);
  const daysInWeek = weekDateKeys.length;
  const totalsByCategory = new Map<string, number>();

  let activeDays = 0;
  let totalCompletions = 0;

  for (const dateKey of weekDateKeys) {
    const row = input.dailyStatsByDate[dateKey];
    if (!row) continue;
    const dayTotal = row.completedFlowCount > 0 ? row.completedFlowCount : 0;
    const categoryTotal = Object.values(getCategoryCompletions(row)).reduce((sum, n) => sum + n, 0);
    const completions = Math.max(dayTotal, categoryTotal);
    if (completions <= 0) continue;
    activeDays += 1;
    totalCompletions += completions;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count <= 0) continue;
      totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + count);
    }
  }

  const progressPercent = daysInWeek > 0 ? Math.round((activeDays / daysInWeek) * 100) : 0;

  return {
    activeDays,
    daysInWeek,
    totalCompletions,
    progressPercent,
    topCategoryLabels: resolveTopCategoryLabels(totalsByCategory),
  };
}

export function resolveWeekStartForAnchor(anchorDateKey: string): string {
  return historyStartOfWeekMonday(anchorDateKey);
}

export { addDaysToHistoryDateKey };
