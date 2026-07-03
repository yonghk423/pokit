import {
  categoryReminderIconName,
  categoryReminderLabelKo,
} from '@entities/day-plan';
import { getCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';
import type { HistoryDailyStat } from '@entities/history/model/types';

import { formatHistoryMonthDayKo } from './buildWeeklyFlowHistory';
import {
  buildMonthDateKeys,
  countDaysInMonth,
  type HistoryPeriod,
} from './historyPeriodRange';

export type MonthlyFlowHistoryRow = {
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
  topCategoryLabel?: string;
};

function findFirstCompletionDateKey(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  categoryKey: string,
): string | undefined {
  const keys = Object.keys(dailyStatsByDate).sort((a, b) => a.localeCompare(b));
  for (const dateKey of keys) {
    const count = getCategoryCompletions(dailyStatsByDate[dateKey] ?? {})[categoryKey] ?? 0;
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
  const categoryKeys = new Set<string>(input.trackedCategoryKeys ?? []);

  for (const dateKey of monthDateKeys) {
    const row = input.dailyStatsByDate[dateKey];
    if (!row) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count > 0) categoryKeys.add(key);
    }
  }

  const rows: MonthlyFlowHistoryRow[] = [];

  for (const categoryKey of categoryKeys) {
    let totalCompletions = 0;
    const dayDone = monthDateKeys.map((dateKey) => {
      const count = getCategoryCompletions(input.dailyStatsByDate[dateKey] ?? {})[categoryKey] ?? 0;
      totalCompletions += count;
      return count > 0;
    });
    const completedDays = dayDone.filter(Boolean).length;
    const firstDateKey = findFirstCompletionDateKey(input.dailyStatsByDate, categoryKey);

    rows.push({
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
      b.completedDays - a.completedDays ||
      b.totalCompletions - a.totalCompletions ||
      a.label.localeCompare(b.label, 'ko'),
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

  const topEntry = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const progressPercent = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;

  return {
    activeDays,
    daysInMonth,
    totalCompletions,
    progressPercent,
    topCategoryLabel: topEntry ? categoryReminderLabelKo(topEntry[0]) : undefined,
  };
}

export function historyPeriodDescription(period: HistoryPeriod): string {
  return period === 'week'
    ? '이번 주 완료 기록을 요일별로 모아 볼 수 있어요.'
    : '이번 달 완료 기록을 날짜별로 모아 볼 수 있어요.';
}
