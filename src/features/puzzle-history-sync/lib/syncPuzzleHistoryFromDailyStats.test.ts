import { useHistoryStore } from '@entities/history';
import { resetPuzzleRevealSeenForTests, usePuzzleHistoryStore } from '@entities/puzzle-history';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { syncPuzzleHistoryFromDailyStats } from './syncPuzzleHistoryFromDailyStats';

describe('syncPuzzleHistoryFromDailyStats (completion count)', () => {
  beforeEach(() => {
    resetPuzzleRevealSeenForTests();
    localStorageClient.removeItem(StorageKeys.historyDailyStats);
    localStorageClient.removeItem(StorageKeys.historyMeta);
    localStorageClient.removeItem(StorageKeys.puzzleHistory);
    useHistoryStore.setState({
      dailyStatsByDate: {},
      lastUpdatedAt: '',
      isHydrated: true,
    });
    usePuzzleHistoryStore.setState({
      histories: [],
      activeHistoryId: null,
      isHydrated: true,
    });
  });

  it('credits each linked routine completion toward pieces', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'test',
      imageUri: 'file:///puzzle.jpg',
      targetCount: 10,
      linkedCategoryKeys: ['reading', 'stretch'],
      completionBaseline: 0,
    });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2026-10-08',
      focusMinutes: 0,
      completedFlowCount: 2,
      sessionCount: 2,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 1, stretch: 1 },
    });

    syncPuzzleHistoryFromDailyStats();

    const active = usePuzzleHistoryStore.getState().getActiveHistory();
    expect(active?.completedCount).toBe(2);
  });

  it('respects completionBaseline so past logs do not fill the board', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'test',
      imageUri: 'file:///puzzle.jpg',
      targetCount: 10,
      linkedCategoryKeys: ['reading'],
      completionBaseline: 5,
    });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2026-10-08',
      focusMinutes: 0,
      completedFlowCount: 5,
      sessionCount: 5,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 5 },
    });

    syncPuzzleHistoryFromDailyStats();
    expect(usePuzzleHistoryStore.getState().getActiveHistory()?.completedCount).toBe(0);

    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2026-10-09',
      focusMinutes: 0,
      completedFlowCount: 2,
      sessionCount: 2,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 2 },
    });
    syncPuzzleHistoryFromDailyStats();
    expect(usePuzzleHistoryStore.getState().getActiveHistory()?.completedCount).toBe(2);
  });

  it('completes history when target is reached', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'test',
      imageUri: 'file:///puzzle.jpg',
      targetCount: 10,
      linkedCategoryKeys: ['reading'],
      completionBaseline: 0,
    });
    useHistoryStore.getState().upsertDailyStat({
      dateKey: '2026-10-08',
      focusMinutes: 0,
      completedFlowCount: 10,
      sessionCount: 10,
      completionRate: 1,
      categoryMinutes: {},
      categoryCompletions: { reading: 10 },
    });

    syncPuzzleHistoryFromDailyStats();

    expect(usePuzzleHistoryStore.getState().getActiveHistory()).toBeNull();
    expect(usePuzzleHistoryStore.getState().listAlbumHistories()).toHaveLength(1);
  });
});
