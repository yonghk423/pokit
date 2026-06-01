import { buildWeeklyHeatMapCells } from './buildWeeklyHeatMap';

import type { HistoryDailyStat } from '../model/types';

describe('buildWeeklyHeatMapCells', () => {
  it('colors cells from category completions when completedFlowCount is zero', () => {
    const dailyStatsByDate: Record<string, HistoryDailyStat> = {
      '2026-05-13': {
        dateKey: '2026-05-13',
        focusMinutes: 0,
        completedFlowCount: 0,
        sessionCount: 0,
        completionRate: 0,
        categoryMinutes: {},
        categoryCompletions: { reading: 2, planning: 1 },
      },
    };

    const heat = buildWeeklyHeatMapCells(dailyStatsByDate, 1, '2026-05-13');
    const cell = heat.find((c) => c.dateKey === '2026-05-13');
    expect(cell?.completedFlowCount).toBe(3);
    expect(cell?.level).toBeGreaterThanOrEqual(2);
  });

  it('ends on anchor date', () => {
    const heat = buildWeeklyHeatMapCells({}, 2, '2026-05-31');
    expect(heat.at(-1)?.dateKey).toBe('2026-05-31');
    expect(heat.length).toBe(14);
  });
});
