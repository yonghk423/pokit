import type { HistoryDailyStat } from '@entities/history/model/types';
import { categoryReminderLabelKo } from '@entities/day-plan';
import { getCategoryCompletions } from '@entities/history/lib/historyCompletionMetrics';

import {
  buildWeeklyFlowHistory,
  buildWeeklyHistorySummary,
  formatWeekRangeLabelKo,
  historyWeekdayIndexMondayZero,
} from './buildWeeklyFlowHistory';

function stat(dateKey: string, completions: Record<string, number>): HistoryDailyStat {
  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: Object.values(completions).reduce((sum, n) => sum + n, 0),
    sessionCount: 1,
    completionRate: 0.5,
    categoryMinutes: {},
    categoryCompletions: completions,
  };
}

describe('buildWeeklyFlowHistory', () => {
  it('marks weekday completion for the current week', () => {
    const mondayStart = '2026-06-29';
    const rows = buildWeeklyFlowHistory({
      weekStartDateKey: mondayStart,
      dailyStatsByDate: {
        '2026-07-01': stat('2026-07-01', { 'bag:reading': 1 }),
        '2026-07-03': stat('2026-07-03', { reading: 1 }),
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.historyKey).toBe('reading');
    expect(rows[0]?.completedDays).toBe(2);
    expect(rows[0]?.weekdayDone[historyWeekdayIndexMondayZero('2026-07-01')]).toBe(true);
    expect(rows[0]?.weekdayDone[historyWeekdayIndexMondayZero('2026-07-03')]).toBe(true);
    expect(rows[0]?.startDateLabel).toBe('7월 1일');
    expect(formatWeekRangeLabelKo(mondayStart, 'ko')).toContain('6월');
    expect(formatWeekRangeLabelKo(mondayStart, 'en')).toMatch(/Jun|Jul/);
  });

  it('merges legacy layout-prefixed keys into one category row', () => {
    const rows = buildWeeklyFlowHistory({
      weekStartDateKey: '2026-06-29',
      dailyStatsByDate: {
        '2026-06-29': stat('2026-06-29', {
          'bag:fasting': 1,
          'sections:fasting': 1,
          'spine:fasting': 1,
        }),
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.historyKey).toBe('fasting');
    expect(rows[0]?.completedDays).toBe(1);
  });

  it('summarizes weekly activity for the selected week', () => {
    const summary = buildWeeklyHistorySummary({
      weekStartDateKey: '2026-06-29',
      dailyStatsByDate: {
        '2026-06-29': stat('2026-06-29', { reading: 1 }),
        '2026-07-01': stat('2026-07-01', { reading: 1 }),
      },
    });

    expect(summary.activeDays).toBe(2);
    expect(summary.daysInWeek).toBe(7);
    expect(summary.totalCompletions).toBe(2);
    expect(summary.progressPercent).toBe(Math.round((2 / 7) * 100));
  });

  it('includes all tied top categories in summary', () => {
    const summary = buildWeeklyHistorySummary({
      weekStartDateKey: '2026-06-29',
      dailyStatsByDate: {
        '2026-06-29': stat('2026-06-29', {
          water: 2,
          medicine: 2,
          fasting: 2,
          reading: 1,
        }),
      },
    });

    expect(summary.topCategoryLabels).toHaveLength(3);
    expect(summary.topCategoryLabels).toEqual(
      expect.arrayContaining([
        categoryReminderLabelKo('water'),
        categoryReminderLabelKo('medicine'),
        categoryReminderLabelKo('fasting'),
      ]),
    );
  });
});
