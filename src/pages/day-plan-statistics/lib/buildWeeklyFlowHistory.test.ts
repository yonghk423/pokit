import type { HistoryDailyStat } from '@entities/history/model/types';

import {
  buildMonthlyProgressPercent,
  buildWeeklyFlowHistory,
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
      trackedCategoryKeys: ['reading'],
      dailyStatsByDate: {
        '2026-07-01': stat('2026-07-01', { reading: 1 }),
        '2026-07-03': stat('2026-07-03', { reading: 1 }),
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.completedDays).toBe(2);
    expect(rows[0]?.weekdayDone[historyWeekdayIndexMondayZero('2026-07-01')]).toBe(true);
    expect(rows[0]?.weekdayDone[historyWeekdayIndexMondayZero('2026-07-03')]).toBe(true);
    expect(rows[0]?.startDateLabel).toBe('7월 1일');
    expect(formatWeekRangeLabelKo(mondayStart)).toContain('6월');
  });

  it('computes monthly progress from active days', () => {
    const dailyStatsByDate = {
      '2026-07-01': stat('2026-07-01', { reading: 1 }),
      '2026-07-02': stat('2026-07-02', { reading: 1 }),
      '2026-07-03': stat('2026-07-03', { reading: 0 }),
    };
    const percent = buildMonthlyProgressPercent(dailyStatsByDate, '2026-07-03');
    expect(percent).toBe(Math.round((2 / 31) * 100));
  });
});
