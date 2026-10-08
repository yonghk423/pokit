import type { HistoryDailyStat } from '@entities/history';

import {
  countCompletionsByCategory,
  countLinkedCompletions,
  desiredPuzzleCompletions,
  linkedRoutineContributionCounts,
} from './countLinkedCompletions';

function row(
  dateKey: string,
  categoryCompletions: Record<string, number>,
  completedFlowCount = 0,
): HistoryDailyStat {
  return {
    dateKey,
    focusMinutes: 0,
    completedFlowCount,
    sessionCount: completedFlowCount,
    completionRate: 0,
    categoryMinutes: {},
    categoryCompletions,
  };
}

describe('countLinkedCompletions', () => {
  it('sums each linked routine completion', () => {
    const map = {
      '2026-10-08': row('2026-10-08', { reading: 2, stretch: 1 }),
      '2026-10-09': row('2026-10-09', { reading: 1 }),
    };
    expect(countLinkedCompletions(['reading', 'stretch'], map)).toBe(4);
    expect(countLinkedCompletions(['reading'], map)).toBe(3);
  });

  it('subtracts baseline for desired count', () => {
    const map = {
      '2026-10-08': row('2026-10-08', { reading: 5 }),
    };
    expect(
      desiredPuzzleCompletions({
        linkedCategoryKeys: ['reading'],
        completionBaseline: 3,
        dailyStatsByDate: map,
      }),
    ).toBe(2);
  });

  it('counts per linked category', () => {
    const map = {
      '2026-10-08': row('2026-10-08', { reading: 2, stretch: 1 }),
      '2026-10-09': row('2026-10-09', { reading: 1 }),
    };
    expect(countCompletionsByCategory(['reading', 'stretch'], map)).toEqual({
      reading: 3,
      stretch: 1,
    });
  });

  it('subtracts per-category baseline for contributions', () => {
    const map = {
      '2026-10-08': row('2026-10-08', { reading: 5, stretch: 2 }),
    };
    expect(
      linkedRoutineContributionCounts({
        linkedCategoryKeys: ['reading', 'stretch'],
        completionBaselineByCategory: { reading: 3, stretch: 1 },
        dailyStatsByDate: map,
      }),
    ).toEqual([
      { categoryKey: 'reading', count: 2 },
      { categoryKey: 'stretch', count: 1 },
    ]);
  });
});
