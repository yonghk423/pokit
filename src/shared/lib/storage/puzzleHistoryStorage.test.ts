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

  it('keeps piece completedAt for completed histories (date list)', () => {
    savePuzzleHistoryState({
      schemaVersion: 2,
      activeHistoryId: null,
      histories: [
        {
          id: 'h-done',
          title: 'done',
          imageUri: 'file:///a.jpg',
          targetCount: 10,
          totalPieces: 10,
          completedCount: 10,
          status: 'completed',
          createdAt: '2026-09-20T12:00:00.000Z',
          completedAt: '2026-09-29T12:00:00.000Z',
          completionBaseline: 0,
          pieces: Array.from({ length: 10 }, (_, i) => ({
            puzzleIndex: i,
            completed: true,
            completedAt: `2026-09-${String(20 + i).padStart(2, '0')}T12:00:00.000Z`,
          })),
        },
      ],
    });
    const loaded = loadPuzzleHistoryState();
    const pieces = loaded.histories[0]?.pieces ?? [];
    expect(pieces).toHaveLength(10);
    expect(pieces.every((p) => p.completed && Boolean(p.completedAt))).toBe(true);
    expect(pieces[0]?.completedAt?.startsWith('2026-09-20')).toBe(true);
    expect(pieces[9]?.completedAt?.startsWith('2026-09-29')).toBe(true);
  });

  it('backfills completedAt when completed pieces lack dates', () => {
    localStorageClient.setJson(StorageKeys.puzzleHistory, {
      v: 1,
      state: {
        schemaVersion: 2,
        activeHistoryId: null,
        histories: [
          {
            id: 'h-nodate',
            title: 'nodate',
            imageUri: 'file:///a.jpg',
            targetCount: 10,
            totalPieces: 10,
            completedCount: 10,
            status: 'completed',
            createdAt: '2026-09-30T12:00:00.000Z',
            completedAt: '2026-10-09T12:00:00.000Z',
            pieces: Array.from({ length: 10 }, (_, i) => ({
              puzzleIndex: i,
              completed: true,
            })),
          },
        ],
      },
    });
    const loaded = loadPuzzleHistoryState();
    const pieces = loaded.histories[0]?.pieces ?? [];
    expect(pieces).toHaveLength(10);
    expect(pieces.every((p) => Boolean(p.completedAt))).toBe(true);
    expect(pieces[9]?.completedAt?.startsWith('2026-10-09')).toBe(true);
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
