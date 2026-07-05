import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { useHistoryStore } from './historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.historyDailyStats);
    localStorageClient.removeItem(StorageKeys.historyMeta);
    useHistoryStore.setState({
      dailyStatsByDate: {},
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

  it('upserts daily stat with category completion counts', () => {
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
    const row = useHistoryStore.getState().dailyStatsByDate['2025-05-26'];
    expect(row?.completedFlowCount).toBe(5);
    expect(row?.categoryCompletions).toEqual({ reading: 3, water: 2 });
  });
});
