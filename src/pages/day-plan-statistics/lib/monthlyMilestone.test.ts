import {
  buildMonthlyHeatCells,
  buildMonthlyRateDeltaLabel,
  buildMonthlyTopFlow,
  chunkHeatRows,
} from './monthlyMilestone';

describe('monthlyMilestone', () => {
  it('builds 30 heat cells in 7-column rows', () => {
    const cells = buildMonthlyHeatCells('2026-06-03', {
      '2026-06-03': {
        dateKey: '2026-06-03',
        focusMinutes: 0,
        completedFlowCount: 5,
        sessionCount: 1,
        completionRate: 0.8,
        categoryMinutes: {},
        categoryCompletions: { reading: 2 },
      },
    });
    expect(cells).toHaveLength(30);
    const rows = chunkHeatRows(cells, 7);
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('formats rate delta label', () => {
    expect(buildMonthlyRateDeltaLabel(0.92, 0.8)).toBe('+15%');
  });

  it('picks top flow by hit days', () => {
    const top = buildMonthlyTopFlow(
      {
        '2026-06-01': {
          dateKey: '2026-06-01',
          focusMinutes: 0,
          completedFlowCount: 2,
          sessionCount: 1,
          completionRate: 0.5,
          categoryMinutes: {},
          categoryCompletions: { reading: 1 },
        },
        '2026-06-02': {
          dateKey: '2026-06-02',
          focusMinutes: 0,
          completedFlowCount: 1,
          sessionCount: 1,
          completionRate: 0.4,
          categoryMinutes: {},
          categoryCompletions: { water: 1 },
        },
      },
      '2026-06-02',
      (key) => key,
      2,
    );
    expect(top?.categoryKey).toBe('reading');
    expect(top?.hitDays).toBe(1);
  });
});
