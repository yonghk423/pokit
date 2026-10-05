import {
  categoryReminderIconName,
  categoryReminderLabelKo,
} from '@entities/day-plan';
import { getCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';
import type { HistoryDailyStat } from '@entities/history/model/types';
import { t } from '@shared/lib/i18n';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

import { formatHistoryMonthDayKo } from './buildWeeklyFlowHistory';
import {
  buildHistoryPeriodCompare,
  type HistoryPeriodCompare,
} from './historyPeriodCompare';
import {
  buildMonthDateKeys,
  countDaysInMonth,
  resolveMonthPrefix,
  shiftMonthPrefix,
  type HistoryPeriod,
} from './historyPeriodRange';
import { resolveDisplayStreak } from './historyStreak';
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
  /** 표시용 연속 완료 일수 (0이면 UI에서 숨김) */
  streakDays: number;
  timeLabel?: string;
  startDateLabel?: string;
};

export type MonthlyHistorySummary = {
  activeDays: number;
  daysInMonth: number;
  totalCompletions: number;
  progressPercent: number;
  topCategoryLabels: string[];
  compare: HistoryPeriodCompare;
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

function resolveStreakUpToIndex(
  monthPrefix: string,
  daysInMonth: number,
  todayDateKey?: string,
): number {
  if (!todayDateKey) return daysInMonth - 1;
  if (resolveMonthPrefix(todayDateKey) !== monthPrefix) return daysInMonth - 1;
  const day = Number(todayDateKey.slice(8, 10));
  if (!Number.isFinite(day) || day < 1) return daysInMonth - 1;
  return Math.min(daysInMonth - 1, day - 1);
}

export function buildMonthlyFlowHistory(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  monthPrefix: string;
  trackedCategoryKeys?: readonly string[];
  timeLabelByCategoryKey?: Readonly<Record<string, string | undefined>>;
  todayDateKey?: string;
}): MonthlyFlowHistoryRow[] {
  const monthDateKeys = buildMonthDateKeys(input.monthPrefix);
  const daysInMonth = countDaysInMonth(input.monthPrefix);
  const streakUpTo = resolveStreakUpToIndex(input.monthPrefix, daysInMonth, input.todayDateKey);
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
      streakDays: resolveDisplayStreak(dayDone, streakUpTo),
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

function summarizeMonthRange(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  monthPrefix: string,
): { activeDays: number; totalCompletions: number; totalsByCategory: Map<string, number> } {
  const monthDateKeys = buildMonthDateKeys(monthPrefix);
  const totalsByCategory = new Map<string, number>();
  let activeDays = 0;
  let totalCompletions = 0;

  for (const dateKey of monthDateKeys) {
    const row = dailyStatsByDate[dateKey];
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

  return { activeDays, totalCompletions, totalsByCategory };
}

export function buildMonthlyHistorySummary(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  monthPrefix: string;
}): MonthlyHistorySummary {
  const daysInMonth = countDaysInMonth(input.monthPrefix);
  const current = summarizeMonthRange(input.dailyStatsByDate, input.monthPrefix);
  const prev = summarizeMonthRange(
    input.dailyStatsByDate,
    shiftMonthPrefix(input.monthPrefix, -1),
  );
  const progressPercent = daysInMonth > 0 ? Math.round((current.activeDays / daysInMonth) * 100) : 0;

  return {
    activeDays: current.activeDays,
    daysInMonth,
    totalCompletions: current.totalCompletions,
    progressPercent,
    topCategoryLabels: resolveTopCategoryLabels(current.totalsByCategory),
    compare: buildHistoryPeriodCompare({
      activeDays: current.activeDays,
      totalCompletions: current.totalCompletions,
      prevActiveDays: prev.activeDays,
      prevTotalCompletions: prev.totalCompletions,
    }),
  };
}

export function historyPeriodDescription(period: HistoryPeriod): string {
  return period === 'week' ? t('history.desc.week') : t('history.desc.month');
}
