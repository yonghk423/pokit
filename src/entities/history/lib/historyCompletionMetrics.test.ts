import type { HistoryDailyStat } from '@entities/history/model/types';

import { getCategoryCompletions, sumCategoryCompletions } from './historyCompletionMetrics';

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
});
