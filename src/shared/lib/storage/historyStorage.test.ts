import { localStorageClient } from './localStorageClient';
import {
  clearHistoryStorage,
  loadHistoryAchievements,
  loadHistoryDailyStats,
  loadHistoryMeta,
  saveHistoryAchievements,
  saveHistoryDailyStats,
  saveHistoryMeta,
} from './historyStorage';
import { StorageKeys } from './storageKeys';

describe('historyStorage', () => {
  beforeEach(() => {
    clearHistoryStorage();
  });

  it('normalizes and sorts daily stats by date key', () => {
    saveHistoryDailyStats([
      {
        dateKey: '2025-05-26',
        focusMinutes: 99,
        completedFlowCount: 2,
        sessionCount: 1,
        completionRate: 1.5,
        categoryMinutes: { reading: 30 },
        categoryCompletions: { reading: 2 },
      },
      {
        dateKey: '2025-05-25',
        focusMinutes: 10,
        completedFlowCount: 1,
        sessionCount: 1,
        completionRate: 0.5,
        categoryMinutes: {},
      },
    ]);
    const rows = loadHistoryDailyStats();
    expect(rows.map((r) => r.dateKey)).toEqual(['2025-05-25', '2025-05-26']);
    expect(rows[1]?.completionRate).toBe(1);
    expect(rows[1]?.categoryCompletions).toEqual({ reading: 2 });
    expect(rows[1]?.focusMinutes).toBe(0);
  });

  it('dedupes daily stats by date key on save', () => {
    saveHistoryDailyStats([
      {
        dateKey: '2025-05-26',
        focusMinutes: 0,
        completedFlowCount: 1,
        sessionCount: 1,
        completionRate: 0,
        categoryMinutes: {},
      },
      {
        dateKey: '2025-05-26',
        focusMinutes: 0,
        completedFlowCount: 3,
        sessionCount: 2,
        completionRate: 0,
        categoryMinutes: {},
      },
    ]);
    expect(loadHistoryDailyStats()).toHaveLength(1);
    expect(loadHistoryDailyStats()[0]?.completedFlowCount).toBe(3);
  });

  it('filters invalid achievements', () => {
    saveHistoryAchievements([
      {
        id: 'a1',
        kind: 'streak',
        unlockedAt: '2025-05-20T00:00:00.000Z',
        title: '3일 연속',
      },
      {
        id: '',
        kind: 'minutes',
        unlockedAt: '2025-05-21T00:00:00.000Z',
        title: '무효',
      },
    ]);
    expect(loadHistoryAchievements()).toHaveLength(1);
    expect(loadHistoryAchievements()[0]?.id).toBe('a1');
  });

  it('persists meta and clears all history keys', () => {
    saveHistoryMeta({ lastUpdatedAt: '2025-05-26T12:00:00.000Z', schemaVersion: 1 });
    expect(loadHistoryMeta()?.schemaVersion).toBe(1);
    clearHistoryStorage();
    expect(loadHistoryMeta()).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.historyDailyStats)).toBeNull();
  });
});
