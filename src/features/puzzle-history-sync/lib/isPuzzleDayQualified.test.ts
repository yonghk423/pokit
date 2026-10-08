import type { HistoryDailyStat } from '@entities/history';

import { isPuzzleDayQualified } from './isPuzzleDayQualified';

function row(partial: Partial<HistoryDailyStat> & { dateKey: string }): HistoryDailyStat {
  return {
    focusMinutes: 0,
    completedFlowCount: 0,
    sessionCount: 0,
    completionRate: 0,
    categoryMinutes: {},
    categoryCompletions: {},
    ...partial,
  };
}

describe('isPuzzleDayQualified', () => {
  it('legacy: any completion opens the day', () => {
    expect(
      isPuzzleDayQualified(
        undefined,
        row({ dateKey: '2026-10-08', completedFlowCount: 1, categoryCompletions: { reading: 1 } }),
      ),
    ).toBe(true);
    expect(isPuzzleDayQualified([], row({ dateKey: '2026-10-08', completedFlowCount: 0 }))).toBe(
      false,
    );
  });

  it('linked: any selected routine completion qualifies', () => {
    const day = row({
      dateKey: '2026-10-08',
      completedFlowCount: 1,
      categoryCompletions: { reading: 1 },
    });
    expect(isPuzzleDayQualified(['reading', 'stretch'], day)).toBe(true);
    expect(isPuzzleDayQualified(['water'], day)).toBe(false);
    expect(isPuzzleDayQualified(['reading'], day)).toBe(true);
  });
});
