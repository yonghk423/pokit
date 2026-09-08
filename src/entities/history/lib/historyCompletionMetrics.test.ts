import type { HistoryDailyStat } from '@entities/history/model/types';

import { getCategoryCompletions, lookupCategoryCompletionCount, sumCategoryCompletions, sumCategoryCompletionsInRange } from './historyCompletionMetrics';

describe('historyCompletionMetrics', () => {
  it('prefers categoryCompletions over legacy minutes', () => {
    const map = getCategoryCompletions({
      categoryCompletions: { reading: 2, water: 1 },
      categoryMinutes: { reading: 30 },
    });
    expect(map).toEqual({ reading: 2, water: 1 });
    expect(sumCategoryCompletions(map)).toBe(3);
  });

  it('falls back to categoryMinutes as count 1 each', () => {
    const map = getCategoryCompletions({
      categoryCompletions: {},
      categoryMinutes: { reading: 30, water: 10 },
    });
    expect(map).toEqual({ reading: 1, water: 1 });
  });

  it('sums completions across a date range', () => {
    const dailyStatsByDate = {
      '2026-03-08': {
        dateKey: '2026-03-08',
        completedFlowCount: 2,
        focusMinutes: 0,
        categoryMinutes: {},
        categoryCompletions: { reading: 2, stretch: 1 },
      } satisfies HistoryDailyStat,
      '2026-03-07': {
        dateKey: '2026-03-07',
        completedFlowCount: 1,
        focusMinutes: 0,
        categoryMinutes: {},
        categoryCompletions: { reading: 1 },
      } satisfies HistoryDailyStat,
    };
    expect(sumCategoryCompletionsInRange(dailyStatsByDate, '2026-03-08', 2)).toEqual({
      reading: 3,
      stretch: 1,
    });
    expect(lookupCategoryCompletionCount({ reading: 3 }, 'reading')).toBe(3);
  });
});
