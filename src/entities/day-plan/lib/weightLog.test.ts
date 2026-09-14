import {
  applyCurrentWeightToLogs,
  buildWeeklyLossGuideline,
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

  it('uses current weight minus weekly loss as this week’s goal', () => {
    const guideline = buildWeeklyLossGuideline(
      [
        { dateKey: '2026-07-01', weightKg: 71 },
        { dateKey: '2026-07-08', weightKg: 70.4 },
        { dateKey: '2026-07-15', weightKg: 70 },
      ],
      0.5,
      65,
    );
    expect(guideline.map((p) => p.weightKg)).toEqual([70, 70, 69.5]);
  });

  it('writes current weight onto the latest log date', () => {
    const logs = applyCurrentWeightToLogs(
      { '2026-07-01': 70, '2026-07-08': 69.4 },
      69.1,
      '2026-07-03',
    );
    expect(logs).toEqual({ '2026-07-01': 70, '2026-07-08': 69.1 });
  });

  it('creates today log when there are no records', () => {
    expect(applyCurrentWeightToLogs({}, 71.2, '2026-09-14')).toEqual({ '2026-09-14': 71.2 });
  });
});
