import type { HistoryDailyStat } from '@entities/history/model/types';

import { buildMonthlyFlowHistory, buildMonthlyHistorySummary } from './buildMonthlyFlowHistory';

function stat(dateKey: string, completions: Record<string, number>): HistoryDailyStat {
  const total = Object.values(completions).reduce((sum, n) => sum + n, 0);
  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount: total,
    sessionCount: 1,
    completionRate: 0.5,
    categoryMinutes: {},
    categoryCompletions: completions,
  };
}

describe('buildMonthlyFlowHistory', () => {
  it('aggregates completion days within a month', () => {
    const rows = buildMonthlyFlowHistory({
      monthPrefix: '2026-07',
      trackedCategoryKeys: ['reading'],
      dailyStatsByDate: {
        '2026-07-01': stat('2026-07-01', { reading: 1 }),
        '2026-07-03': stat('2026-07-03', { reading: 2 }),
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.completedDays).toBe(2);
    expect(rows[0]?.totalCompletions).toBe(3);
    expect(rows[0]?.daysInMonth).toBe(31);
    expect(rows[0]?.dayDone[0]).toBe(true);
    expect(rows[0]?.dayDone[2]).toBe(true);
  });

  it('summarizes monthly activity', () => {
    const summary = buildMonthlyHistorySummary({
      monthPrefix: '2026-07',
      dailyStatsByDate: {
        '2026-07-01': stat('2026-07-01', { reading: 1 }),
        '2026-07-02': stat('2026-07-02', { stretching: 1 }),
      },
    });

    expect(summary.activeDays).toBe(2);
    expect(summary.totalCompletions).toBe(2);
    expect(summary.progressPercent).toBe(Math.round((2 / 31) * 100));
    expect(summary.topCategoryLabel).toBeTruthy();
  });
});
