import type { HistoryDailyStat } from '@entities/history';

import {
  buildCompletionTrendChartPaths,
  buildGrowthTrendChartPaths,
} from './completionTrendChart';

function stat(dateKey: string, completionRate: number): HistoryDailyStat {
  return {
    dateKey,
    completionRate,
    completedFlowCount: 1,
    categoryCompletions: {},
    focusMinutes: 0,
    updatedAt: dateKey,
  };
}

describe('completionTrendChart', () => {
  it('builds line and area paths with fixed 0-1 scale', () => {
    const dailyStatsByDate: Record<string, HistoryDailyStat> = {
      '2026-06-01': stat('2026-06-01', 0.2),
      '2026-06-15': stat('2026-06-15', 0.8),
      '2026-06-29': stat('2026-06-29', 0.5),
    };
    const paths = buildCompletionTrendChartPaths(
      dailyStatsByDate,
      '2026-06-01',
      '2026-06-29',
      6,
    );
    expect(paths.lineD.startsWith('M ')).toBe(true);
    expect(paths.areaD.length).toBeGreaterThan(0);
    expect(paths.endY).toBeLessThan(68);
  });

  it('builds growth sparkline paths', () => {
    const paths = buildGrowthTrendChartPaths(
      { '2026-06-29': stat('2026-06-29', 0.6) },
      '2026-06-29',
      4,
    );
    expect(paths.lineD.length).toBeGreaterThan(0);
  });
});
