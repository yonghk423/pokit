import { useAppLocaleStore } from '@shared/lib/i18n';

import { loadPuzzleHistoryState } from '../../puzzleHistoryStorage';
import { localStorageClient } from '../../localStorageClient';
import { StorageKeys } from '../../storageKeys';

import {
  PUZZLE_MOCK_ID_PREFIX,
  clearPuzzleHistoryMockData,
  puzzleHistoryMockSeed,
  seedPuzzleHistoryMockData,
} from './puzzleHistoryMockSeed';

describe('puzzleHistoryMockSeed', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
    localStorageClient.removeItem(StorageKeys.puzzleHistory);
  });

  it('seeds several active puzzles plus a full album of completed histories', async () => {
    const result = await puzzleHistoryMockSeed.seed();

    expect(result.puzzleHistories).toBe(11);
    expect(result.puzzleActive).toBe(4);
    expect(result.puzzleAlbum).toBe(7);

    const state = loadPuzzleHistoryState();
    expect(state.activeHistoryId).toBe(`${PUZZLE_MOCK_ID_PREFIX}active_10_kitty`);
    const actives = state.histories.filter((h) => h.status === 'active');
    expect(actives).toHaveLength(4);
    const focused = state.histories.find((h) => h.id === state.activeHistoryId);
    expect(focused?.status).toBe('active');
    expect(focused?.targetCount).toBe(10);
    expect(focused?.completedCount).toBe(4);
    expect(focused?.title).toBe('야옹이랑 놀아주기');

    const album = state.histories.filter((h) => h.status === 'completed');
    expect(album).toHaveLength(7);
    expect(album.every((h) => h.completedCount === h.totalPieces)).toBe(true);
    expect(album.some((h) => h.targetCount === 100)).toBe(true);
    expect(album.some((h) => h.targetCount === 50)).toBe(true);
  });

  it('covers the full photo when completed (no leftover units)', () => {
    seedPuzzleHistoryMockData();
    const state = loadPuzzleHistoryState();
    for (const history of state.histories) {
      expect(history.pieces).toHaveLength(history.targetCount);
      if (history.status === 'completed') {
        expect(history.pieces.every((r) => r.completed)).toBe(true);
      }
    }
  });

  it('clear removes only mock puzzle rows', async () => {
    await puzzleHistoryMockSeed.seed();
    clearPuzzleHistoryMockData();
    const state = loadPuzzleHistoryState();
    expect(state.histories.every((h) => !h.id.startsWith(PUZZLE_MOCK_ID_PREFIX))).toBe(true);
    expect(state.histories).toHaveLength(0);
  });
});
