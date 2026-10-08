import { localStorageClient } from './localStorageClient';
import {
  clearPuzzleHistoryStorage,
  loadPuzzleHistoryState,
  savePuzzleHistoryState,
} from './puzzleHistoryStorage';
import { StorageKeys } from './storageKeys';

describe('puzzleHistoryStorage', () => {
  beforeEach(() => {
    clearPuzzleHistoryStorage();
  });

  it('round-trips a valid completion-count state', () => {
    savePuzzleHistoryState({
      schemaVersion: 2,
      activeHistoryId: 'h1',
      histories: [
        {
          id: 'h1',
          title: 'test',
          imageUri: 'file:///a.jpg',
          targetCount: 10,
          totalPieces: 10,
          completedCount: 1,
          status: 'active',
          createdAt: '2026-10-08T00:00:00.000Z',
          completionBaseline: 0,
          pieces: Array.from({ length: 10 }, (_, i) => ({
            puzzleIndex: i,
            completed: i === 0,
          })),
        },
      ],
    });
    const loaded = loadPuzzleHistoryState();
    expect(loaded.activeHistoryId).toBe('h1');
    expect(loaded.histories[0]?.targetCount).toBe(10);
    expect(loaded.histories[0]?.completedCount).toBe(1);
  });

  it('migrates legacy day-based histories', () => {
    localStorageClient.setJson(StorageKeys.puzzleHistory, {
      v: 1,
      state: {
        schemaVersion: 1,
        activeHistoryId: 'h1',
        histories: [
          {
            id: 'h1',
            title: 'legacy',
            imageUri: 'file:///a.jpg',
            duration: 7,
            startDateKey: '2026-10-08',
            endDateKey: '2026-10-14',
            totalDays: 7,
            completedDays: 2,
            status: 'active',
            createdAt: '2026-10-08T00:00:00.000Z',
            dailyRecords: Array.from({ length: 7 }, (_, i) => ({
              dateKey: `2026-10-${String(8 + i).padStart(2, '0')}`,
              puzzleIndex: i,
              completed: i < 2,
            })),
          },
        ],
      },
    });
    const loaded = loadPuzzleHistoryState();
    expect(loaded.histories[0]?.targetCount).toBe(10);
    expect(loaded.histories[0]?.completedCount).toBe(2);
    expect(loaded.histories[0]?.pieces).toHaveLength(10);
  });

  it('drops corrupted histories without crashing', () => {
    localStorageClient.setJson(StorageKeys.puzzleHistory, {
      v: 1,
      state: {
        schemaVersion: 1,
        activeHistoryId: 'x',
        histories: [{ id: 'broken' }],
      },
    });
    const loaded = loadPuzzleHistoryState();
    expect(loaded.histories).toEqual([]);
    expect(loaded.activeHistoryId).toBeNull();
  });
});
