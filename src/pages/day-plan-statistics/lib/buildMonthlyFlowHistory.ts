import {
  categoryReminderIconName,
  categoryReminderLabelKo,
} from '@entities/day-plan';
import { getCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';
import type { HistoryDailyStat } from '@entities/history/model/types';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

import { formatHistoryMonthDayKo } from './buildWeeklyFlowHistory';
import {
  buildMonthDateKeys,
  countDaysInMonth,
  type HistoryPeriod,
} from './historyPeriodRange';
import { resolveTopCategoryLabels } from './resolveTopCategoryLabels';

export type MonthlyFlowHistoryRow = {
  historyKey: string;
  categoryKey: string;
  label: string;
  icon: string;
  /** 1일=index 0 */
  dayDone: boolean[];
  completedDays: number;
  daysInMonth: number;
  totalCompletions: number;
  timeLabel?: string;
  startDateLabel?: string;
};

export type MonthlyHistorySummary = {
  activeDays: number;
  daysInMonth: number;
  totalCompletions: number;
  progressPercent: number;
  topCategoryLabels: string[];
};

function mergeCategoryCompletions(stat: HistoryDailyStat | undefined): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const [key, count] of Object.entries(getCategoryCompletions(stat ?? { categoryMinutes: {} }))) {
    if (count <= 0) continue;
    const categoryKey = normalizeHistoryRecordKey(key);
    if (!categoryKey) continue;
    merged[categoryKey] = (merged[categoryKey] ?? 0) + count;
  }
  return merged;
}

function findFirstCompletionDateKey(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  categoryKey: string,
  monthDateKeys: string[],
): string | undefined {
  for (const dateKey of monthDateKeys) {
    const count = mergeCategoryCompletions(dailyStatsByDate[dateKey])[categoryKey] ?? 0;
    if (count > 0) return dateKey;
  }
  return undefined;
}

export function buildMonthlyFlowHistory(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  monthPrefix: string;
  trackedCategoryKeys?: readonly string[];
  timeLabelByCategoryKey?: Readonly<Record<string, string | undefined>>;
}): MonthlyFlowHistoryRow[] {
  const monthDateKeys = buildMonthDateKeys(input.monthPrefix);
  const daysInMonth = countDaysInMonth(input.monthPrefix);
  const historyKeys = new Set<string>(
    (input.trackedCategoryKeys ?? []).map((key) => normalizeHistoryRecordKey(key)).filter(Boolean),
  );

  for (const dateKey of monthDateKeys) {
    for (const key of Object.keys(mergeCategoryCompletions(input.dailyStatsByDate[dateKey]))) {
      historyKeys.add(key);
    }
  }

  const rows: MonthlyFlowHistoryRow[] = [];

  for (const categoryKey of historyKeys) {
    if (!categoryKey) continue;
    let totalCompletions = 0;
    const dayDone = monthDateKeys.map((dateKey) => {
      const count = mergeCategoryCompletions(input.dailyStatsByDate[dateKey])[categoryKey] ?? 0;
      totalCompletions += count;
      return count > 0;
    });
    const completedDays = dayDone.filter(Boolean).length;
    if (completedDays <= 0) continue;
    const firstDateKey = findFirstCompletionDateKey(input.dailyStatsByDate, categoryKey, monthDateKeys);

    rows.push({
      historyKey: categoryKey,
      categoryKey,
      label: categoryReminderLabelKo(categoryKey),
      icon: categoryReminderIconName(categoryKey),
      dayDone,
      completedDays,
      daysInMonth,
      totalCompletions,
      timeLabel: input.timeLabelByCategoryKey?.[categoryKey],
      startDateLabel: firstDateKey ? formatHistoryMonthDayKo(firstDateKey) : undefined,
    });
  }

  rows.sort(
    (a, b) =>
      b.completedDays - a.completedDays || a.label.localeCompare(b.label, 'ko'),
  );

  return rows;
}

export function buildMonthlyHistorySummary(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  monthPrefix: string;
}): MonthlyHistorySummary {
  const monthDateKeys = buildMonthDateKeys(input.monthPrefix);
  const daysInMonth = countDaysInMonth(input.monthPrefix);
  const totalsByCategory = new Map<string, number>();

  let activeDays = 0;
  let totalCompletions = 0;

  for (const dateKey of monthDateKeys) {
    const row = input.dailyStatsByDate[dateKey];
    const merged = mergeCategoryCompletions(row);
    const categoryTotal = Object.values(merged).reduce((sum, n) => sum + n, 0);
    const dayTotal = row && row.completedFlowCount > 0 ? row.completedFlowCount : 0;
    const completions = Math.max(dayTotal, categoryTotal);
    if (completions <= 0) continue;
    activeDays += 1;
    totalCompletions += completions;
    for (const [key, count] of Object.entries(merged)) {
      if (count <= 0) continue;
      totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + count);
    }
  }

  const progressPercent = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;

  return {
    activeDays,
    daysInMonth,
    totalCompletions,
    progressPercent,
    topCategoryLabels: resolveTopCategoryLabels(totalsByCategory),
  };
}

export function historyPeriodDescription(period: HistoryPeriod): string {
  return period === 'week'
    ? '이번 주 완료 기록을 요일별로 모아 볼 수 있어요.'
    : '이번 달 완료 기록을 날짜별로 모아 볼 수 있어요.';
}
