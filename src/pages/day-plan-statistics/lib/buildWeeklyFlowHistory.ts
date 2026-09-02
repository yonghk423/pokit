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
import { formatDateKeyDisplay, formatWeekdayLabel, getAppLocale, type AppLocale } from '@shared/lib/i18n';
import { normalizeHistoryRecordKey } from '@shared/lib/routineHistoryLayoutKey';

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
  label: string;
  icon: string;
  /** 월=0 … 일=6 */
  weekdayDone: boolean[];
  completedDays: number;
  timeLabel?: string;
  startDateLabel?: string;
};

/** Monday-first weekday labels (ko). Prefer `getHistoryWeekdayLabels(locale)`. */
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export { WEEKDAY_LABELS };

/** Monday-first: Mon…Sun → Sunday-based indices for `formatWeekdayLabel` */
const WEEKDAY_SUNDAY_INDEX_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

export function getHistoryWeekdayLabels(locale?: AppLocale): string[] {
  const loc = locale ?? getAppLocale();
  return WEEKDAY_SUNDAY_INDEX_MONDAY_FIRST.map((index) => formatWeekdayLabel(index, loc));
}

export function historyWeekdayIndexMondayZero(dateKey: string): number {
  const date = parseHistoryDateKey(dateKey);
  if (!date) return 0;
  return (date.getDay() + 6) % 7;
}

export function buildWeekDateKeys(weekStartDateKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToHistoryDateKey(weekStartDateKey, index));
}

export function formatHistoryMonthDayKo(dateKey: string, locale?: AppLocale): string {
  return formatDateKeyDisplay(dateKey, locale ?? getAppLocale());
}

export function formatWeekRangeLabelKo(weekStartDateKey: string, locale?: AppLocale): string {
  const loc = locale ?? getAppLocale();
  const weekEndDateKey = addDaysToHistoryDateKey(weekStartDateKey, 6);
  return `${formatHistoryMonthDayKo(weekStartDateKey, loc)} — ${formatHistoryMonthDayKo(weekEndDateKey, loc)}`;
}

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
  weekDateKeys: string[],
): string | undefined {
  for (const dateKey of weekDateKeys) {
    const count = mergeCategoryCompletions(dailyStatsByDate[dateKey])[categoryKey] ?? 0;
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
    (input.trackedCategoryKeys ?? []).map((key) => normalizeHistoryRecordKey(key)).filter(Boolean),
  );

  for (const dateKey of weekDateKeys) {
    for (const key of Object.keys(mergeCategoryCompletions(input.dailyStatsByDate[dateKey]))) {
      historyKeys.add(key);
    }
  }

  const rows: WeeklyFlowHistoryRow[] = [];

  for (const categoryKey of historyKeys) {
    if (!categoryKey) continue;
    const weekdayDone = weekDateKeys.map((dateKey) => {
      const count = mergeCategoryCompletions(input.dailyStatsByDate[dateKey])[categoryKey] ?? 0;
      return count > 0;
    });
    const completedDays = weekdayDone.filter(Boolean).length;
    if (completedDays <= 0) continue;
    const firstDateKey = findFirstCompletionDateKey(input.dailyStatsByDate, categoryKey, weekDateKeys);

    rows.push({
      historyKey: categoryKey,
      categoryKey,
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
      b.completedDays - a.completedDays || a.label.localeCompare(b.label, 'ko'),
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
