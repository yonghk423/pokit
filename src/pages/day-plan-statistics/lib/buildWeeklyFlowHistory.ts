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

export type WeeklyFlowHistoryRow = {
  categoryKey: string;
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
  categoryKey: string,
): string | undefined {
  const keys = Object.keys(dailyStatsByDate).sort((a, b) => a.localeCompare(b));
  for (const dateKey of keys) {
    const count = getCategoryCompletions(dailyStatsByDate[dateKey] ?? {})[categoryKey] ?? 0;
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
  const categoryKeys = new Set<string>(input.trackedCategoryKeys ?? []);

  for (const dateKey of weekDateKeys) {
    const row = input.dailyStatsByDate[dateKey];
    if (!row) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count > 0) categoryKeys.add(key);
    }
  }

  const rows: WeeklyFlowHistoryRow[] = [];

  for (const categoryKey of categoryKeys) {
    const weekdayDone = weekDateKeys.map((dateKey) => {
      const count = getCategoryCompletions(input.dailyStatsByDate[dateKey] ?? {})[categoryKey] ?? 0;
      return count > 0;
    });
    const completedDays = weekdayDone.filter(Boolean).length;
    const firstDateKey = findFirstCompletionDateKey(input.dailyStatsByDate, categoryKey);

    rows.push({
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
      b.completedDays - a.completedDays ||
      a.label.localeCompare(b.label, 'ko'),
  );

  return rows;
}

export function buildMonthlyProgressPercent(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  anchorDateKey: string,
): number {
  const anchor = parseHistoryDateKey(anchorDateKey);
  if (!anchor) return 0;

  const monthPrefix = anchorDateKey.slice(0, 7);
  const monthDays = Object.values(dailyStatsByDate).filter((row) => row.dateKey.startsWith(monthPrefix));
  if (monthDays.length === 0) return 0;

  const activeDays = monthDays.filter((row) => row.completedFlowCount > 0).length;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Math.round((activeDays / daysInMonth) * 100);
}

export function resolveWeekStartForAnchor(anchorDateKey: string): string {
  return historyStartOfWeekMonday(anchorDateKey);
}

export { addDaysToHistoryDateKey };
