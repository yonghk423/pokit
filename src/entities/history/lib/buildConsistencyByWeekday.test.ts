import { buildConsistencyByWeekday } from './buildConsistencyByWeekday';

import type { HistoryDailyStat } from '../model/types';

describe('buildConsistencyByWeekday', () => {
  it('aggregates weekday averages from daily map', () => {
    const dailyStatsByDate: Record<string, HistoryDailyStat> = {
      '2026-05-26': {
        dateKey: '2026-05-26',
        focusMinutes: 0,
        completedFlowCount: 4,
        sessionCount: 4,
        completionRate: 0.8,
        categoryMinutes: {},
        categoryCompletions: { reading: 4 },
      },
      '2026-05-27': {
        dateKey: '2026-05-27',
        focusMinutes: 0,
        completedFlowCount: 0,
        sessionCount: 0,
        completionRate: 0,
        categoryMinutes: {},
        categoryCompletions: { water: 2 },
      },
    };

    const rows = buildConsistencyByWeekday(dailyStatsByDate, {
      startDateKey: '2026-05-26',
      endDateKey: '2026-05-27',
    });

    expect(rows.some((r) => r.averageCompletions >= 2)).toBe(true);
  });

  it('returns zero for weekdays without activity', () => {
    const rows = buildConsistencyByWeekday({}, {
      startDateKey: '2026-05-26',
      endDateKey: '2026-05-27',
    });
    expect(rows.every((r) => r.averageCompletions === 0)).toBe(true);
  });
});
