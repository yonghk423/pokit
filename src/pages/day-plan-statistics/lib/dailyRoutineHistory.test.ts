jest.mock('@entities/history', () => {
  const actualMetrics = jest.requireActual('@entities/history/lib/historyCompletionMetrics');
  const actualStreak = jest.requireActual('@entities/history/lib/categoryCompletionStreak');
  return {
    getCategoryCompletions: actualMetrics.getCategoryCompletions,
    computeCategoryCompletionStreak: actualStreak.computeCategoryCompletionStreak,
    formatCategoryStreakLabel: actualStreak.formatCategoryStreakLabel,
  };
});

import {
  buildDailyRoutineHistory,
  resolveDailyRoutinePlannedKeys,
} from './dailyRoutineHistory';

describe('dailyRoutineHistory', () => {
  it('returns only completions for the selected date', () => {
    const rows = buildDailyRoutineHistory({
      dateKey: '2026-06-14',
      categoryLabel: (key) => key,
      plannedCategoryKeys: [],
      dailyStatsByDate: {
        '2026-06-14': {
          dateKey: '2026-06-14',
          categoryCompletions: { reading: 2, water: 1 },
        } as any,
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ categoryKey: 'reading', status: 'completed', statusLabel: '완료' });
    expect(rows[1]).toMatchObject({ categoryKey: 'water', status: 'completed', statusLabel: '완료' });
  });

  it('marks planned items without completion as incomplete', () => {
    const rows = buildDailyRoutineHistory({
      dateKey: '2026-06-14',
      categoryLabel: (key) => key,
      plannedCategoryKeys: ['reading', 'water', 'meditation'],
      dailyStatsByDate: {
        '2026-06-14': {
          dateKey: '2026-06-14',
          categoryCompletions: { reading: 1 },
        } as any,
      },
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ categoryKey: 'reading', statusLabel: '완료' });
    expect(rows[1]).toMatchObject({ categoryKey: 'water', statusLabel: '미완료' });
    expect(rows[2]).toMatchObject({ categoryKey: 'meditation', statusLabel: '미완료' });
  });

  it('resolves planned keys from snapshot and today order', () => {
    expect(
      resolveDailyRoutinePlannedKeys({
        dateKey: '2026-06-14',
        todayDateKey: '2026-06-17',
        plannedKeysByDate: { '2026-06-14': ['reading', 'water'] },
        priorityCategoryOrder: ['meditation'],
        completedCategoryKeys: ['stretch'],
      }),
    ).toEqual(['reading', 'water', 'stretch']);

    expect(
      resolveDailyRoutinePlannedKeys({
        dateKey: '2026-06-17',
        todayDateKey: '2026-06-17',
        plannedKeysByDate: {},
        priorityCategoryOrder: ['reading', 'water'],
        completedCategoryKeys: [],
      }),
    ).toEqual(['reading', 'water']);
  });

  it('includes per-routine consecutive streak from anchor date', () => {
    const rows = buildDailyRoutineHistory({
      dateKey: '2026-06-17',
      categoryLabel: (key) => key,
      plannedCategoryKeys: ['reading', 'water'],
      dailyStatsByDate: {
        '2026-06-15': { dateKey: '2026-06-15', categoryCompletions: { reading: 1 } } as any,
        '2026-06-16': { dateKey: '2026-06-16', categoryCompletions: { reading: 1 } } as any,
        '2026-06-17': { dateKey: '2026-06-17', categoryCompletions: { reading: 1 } } as any,
      },
    });

    expect(rows[0]).toMatchObject({
      categoryKey: 'reading',
      consecutiveDays: 3,
      streakLabel: '연속 3일',
    });
    expect(rows[1]).toMatchObject({
      categoryKey: 'water',
      consecutiveDays: 0,
      streakLabel: '연속 없음',
    });
  });

  it('uses the same icon mapping as the routine catalog', () => {
    const rows = buildDailyRoutineHistory({
      dateKey: '2026-06-18',
      categoryLabel: (key) => key,
      plannedCategoryKeys: ['vitamins', 'walking', 'stretching', 'neckPosture', 'fasting'],
      dailyStatsByDate: {
        '2026-06-18': {
          dateKey: '2026-06-18',
          categoryCompletions: {
            vitamins: 1,
            walking: 1,
            stretching: 1,
            neckPosture: 1,
            fasting: 1,
          },
        } as any,
      },
    });

    expect(rows.map((row) => ({ key: row.categoryKey, icon: row.icon }))).toEqual([
      { key: 'vitamins', icon: 'pill.fill' },
      { key: 'walking', icon: 'figure.walk' },
      { key: 'stretching', icon: 'figure.run' },
      { key: 'neckPosture', icon: 'tortoise.fill' },
      { key: 'fasting', icon: 'figure.stand' },
    ]);
  });

  it('returns empty when the day has no record and no plan', () => {
    expect(
      buildDailyRoutineHistory({
        dateKey: '2026-06-14',
        categoryLabel: (key) => key,
        plannedCategoryKeys: [],
        dailyStatsByDate: {},
      }),
    ).toEqual([]);
  });
});
