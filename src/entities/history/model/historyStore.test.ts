import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { useHistoryStore } from './historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.historyDailyStats);
    localStorageClient.removeItem(StorageKeys.historyAchievements);
    localStorageClient.removeItem(StorageKeys.historyMeta);
    useHistoryStore.setState({
      dailyStatsByDate: {},
      achievements: [],
      lastUpdatedAt: '',
      isHydrated: false,
    });
  });

  it('hydrates from storage on every hydrate call', () => {
    localStorageClient.setJson(StorageKeys.historyDailyStats, {
      v: 1,
      rows: [
        {
          dateKey: '2025-05-25',
          focusMinutes: 0,
          completedFlowCount: 2,
          sessionCount: 1,
          completionRate: 0.5,
          categoryMinutes: {},
          categoryCompletions: { reading: 2 },
        },
      ],
    });
    useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().isHydrated).toBe(true);
    expect(useHistoryStore.getState().dailyStatsByDate['2025-05-25']?.completedFlowCount).toBe(2);

    localStorageClient.setJson(StorageKeys.historyDailyStats, {
      v: 1,
      rows: [
        {
          dateKey: '2025-05-26',
          focusMinutes: 0,
          completedFlowCount: 4,
          sessionCount: 1,
          completionRate: 0.8,
          categoryMinutes: {},
          categoryCompletions: { reading: 4 },
        },
      ],
    });
    useHistoryStore.getState().hydrate();
    expect(useHistoryStore.getState().dailyStatsByDate['2025-05-26']?.completedFlowCount).toBe(4);
    expect(useHistoryStore.getState().dailyStatsByDate['2025-05-25']).toBeUndefined();
  });

  it('records focus session and updates completion rate', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().recordFocusSession({
      dateKey: '2025-05-26',
      categoryKey: 'reading',
      completed: true,
      plannedCountForDay: 4,
    });
    const row = useHistoryStore.getState().dailyStatsByDate['2025-05-26'];
    expect(row?.sessionCount).toBe(1);
    expect(row?.completedFlowCount).toBe(1);
    expect(row?.completionRate).toBe(0.25);
    expect(row?.categoryCompletions?.reading).toBe(1);
  });

  it('computes streak from consecutive active days', () => {
    useHistoryStore.setState({ isHydrated: true });
    for (const dateKey of ['2025-05-24', '2025-05-25', '2025-05-26']) {
      useHistoryStore.getState().upsertDailyStat({
        dateKey,
        focusMinutes: 0,
        completedFlowCount: 1,
        sessionCount: 1,
        completionRate: 1,
        categoryMinutes: {},
        categoryCompletions: { reading: 1 },
      });
    }
    expect(useHistoryStore.getState().selectCurrentStreak('2025-05-26')).toBe(3);
  });

  it('builds heat map cells ending on anchor date', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-26',
      focusMinutes: 0,
      completedFlowCount: 5,
      sessionCount: 2,
      completionRate: 0.9,
      categoryMinutes: {},
      categoryCompletions: {},
    });
    const heat = useHistoryStore.getState().selectWeeklyHeatMap(1, '2025-05-26');
    expect(heat.length).toBe(7);
    expect(heat.some((c) => c.dateKey === '2025-05-26' && c.level >= 2)).toBe(true);
    expect(heat.at(-1)?.dateKey).toBe('2025-05-26');
  });

  it('falls back to category completion counts when completedFlowCount is zero', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-26',
      focusMinutes: 0,
      completedFlowCount: 0,
      sessionCount: 0,
      completionRate: 0,
      categoryMinutes: {},
      categoryCompletions: { reading: 3, water: 2 },
    });

    const growth = useHistoryStore.getState().selectGrowthVsPreviousWeek('2025-05-26');
    expect(growth.currentWeekCompletions).toBeGreaterThanOrEqual(5);

    const consistency = useHistoryStore.getState().selectConsistencyByWeekday({
      startDateKey: '2025-05-20',
      endDateKey: '2025-05-26',
    });
    expect(consistency.some((r) => r.averageCompletions >= 1)).toBe(true);
  });

  it('reloads from storage after external writes', () => {
    localStorageClient.setJson(StorageKeys.historyDailyStats, {
      v: 1,
      rows: [
        {
          dateKey: '2025-05-25',
          focusMinutes: 0,
          completedFlowCount: 3,
          sessionCount: 1,
          completionRate: 0.75,
          categoryMinutes: {},
          categoryCompletions: { reading: 3 },
        },
      ],
    });
    useHistoryStore.setState({ isHydrated: true, dailyStatsByDate: {} });
    useHistoryStore.getState().reloadFromStorage();
    expect(useHistoryStore.getState().dailyStatsByDate['2025-05-25']?.completedFlowCount).toBe(3);
  });

  it('aggregates category breakdown in range', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-25',
      focusMinutes: 0,
      completedFlowCount: 2,
      sessionCount: 1,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 2, water: 1 },
    });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-26',
      focusMinutes: 0,
      completedFlowCount: 1,
      sessionCount: 1,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 1 },
    });
    const rows = useHistoryStore.getState().selectCategoryBreakdown({
      startDateKey: '2025-05-25',
      endDateKey: '2025-05-26',
    });
    expect(rows[0]?.categoryKey).toBe('reading');
    expect(rows[0]?.completions).toBe(3);
  });

  it('recomputes streak achievements', () => {
    useHistoryStore.setState({ isHydrated: true });
    const today = getLocalDateKey();
    for (let i = 0; i < 7; i += 1) {
      const dateKey = addDaysToLocalDateKey(today, -i);
      useHistoryStore.getState().upsertDailyStat({
        dateKey,
        focusMinutes: 0,
        completedFlowCount: 1,
        sessionCount: 1,
        completionRate: 1,
        categoryMinutes: {},
        categoryCompletions: { reading: 1 },
      });
    }
    useHistoryStore.getState().recomputeAchievements();
    expect(useHistoryStore.getState().achievements.some((a) => a.id === 'streak-7')).toBe(true);
  });

  it('ignores invalid achievements on record', () => {
    useHistoryStore.setState({ isHydrated: true, achievements: [] });
    useHistoryStore.getState().recordAchievement({
      id: '   ',
      kind: 'streak',
      unlockedAt: '2025-05-26T00:00:00.000Z',
      title: '무효',
    });
    expect(useHistoryStore.getState().achievements).toHaveLength(0);
  });

  it('builds weekday consistency rows', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-26',
      focusMinutes: 0,
      completedFlowCount: 4,
      sessionCount: 2,
      completionRate: 0.8,
      categoryMinutes: {},
      categoryCompletions: {},
    });
    const rows = useHistoryStore.getState().selectConsistencyByWeekday({
      startDateKey: '2025-05-20',
      endDateKey: '2025-05-26',
    });
    expect(rows).toHaveLength(7);
    expect(rows.some((r) => r.averageCompletions >= 0)).toBe(true);
  });

  it('unlocks milestone achievements on recompute', () => {
    useHistoryStore.setState({ isHydrated: true });
    const today = getLocalDateKey();
    for (let i = 0; i < 30; i += 1) {
      const dateKey = addDaysToLocalDateKey(today, -i);
      useHistoryStore.getState().upsertDailyStat({
        dateKey,
        focusMinutes: 0,
        completedFlowCount: 2,
        sessionCount: 1,
        completionRate: 1,
        categoryMinutes: {},
        categoryCompletions: { reading: 2 },
      });
    }
    useHistoryStore.getState().recomputeAchievements();
    const ids = useHistoryStore.getState().achievements.map((a) => a.id);
    expect(ids).toContain('streak-30');
    expect(ids).toContain('completions-50');
  });

  it('compares growth vs previous week', () => {
    useHistoryStore.setState({ isHydrated: true });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-20',
      focusMinutes: 0,
      completedFlowCount: 2,
      sessionCount: 1,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: {},
    });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2025-05-26',
      focusMinutes: 0,
      completedFlowCount: 5,
      sessionCount: 2,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: {},
    });
    const growth = useHistoryStore.getState().selectGrowthVsPreviousWeek('2025-05-26');
    expect(growth.currentWeekCompletions).toBeGreaterThanOrEqual(5);
    expect(growth.diffCompletions).toBeGreaterThan(0);
  });
});
