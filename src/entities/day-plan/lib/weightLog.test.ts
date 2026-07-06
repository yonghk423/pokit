import {
  buildWeightChartSeries,
  latestWeightFromLogs,
  normalizeFastingWeightLogs,
  setFastingWeightLog,
  sortedWeightLogEntries,
  weightProgressRatioFromLogs,
} from './weightLog';

describe('weightLog', () => {
  it('normalizes and sorts logs', () => {
    const logs = normalizeFastingWeightLogs({
      '2026-07-03': 69.5,
      bad: 50,
      '2026-07-01': 70,
    });
    expect(sortedWeightLogEntries(logs)).toEqual([
      { dateKey: '2026-07-01', weightKg: 70 },
      { dateKey: '2026-07-03', weightKg: 69.5 },
    ]);
  });

  it('computes latest weight and progress', () => {
    const logs = setFastingWeightLog({}, '2026-07-01', 70);
    const withSecond = setFastingWeightLog(logs, '2026-07-06', 68);
    expect(latestWeightFromLogs(withSecond, 72)).toBe(68);
    expect(weightProgressRatioFromLogs(withSecond, 65, 70)).toBeCloseTo(0.4, 1);
    expect(buildWeightChartSeries(withSecond)).toHaveLength(2);
  });
});
