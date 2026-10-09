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

  it('seeds a full album of completed puzzles', async () => {
    const result = await puzzleHistoryMockSeed.seed();

    expect(result.puzzleHistories).toBe(9);
    expect(result.puzzleActive).toBe(0);
    expect(result.puzzleAlbum).toBe(9);

    const state = loadPuzzleHistoryState();
    expect(state.activeHistoryId).toBeNull();
    expect(state.histories).toHaveLength(9);
    expect(state.histories.every((h) => h.status === 'completed')).toBe(true);
    expect(state.histories.every((h) => h.completedCount === h.totalPieces)).toBe(true);
    const titles = state.histories.map((h) => h.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        '한 슛',
        '하트 실루엣',
        '책상 스트레칭',
        '호수 점프',
        '식탁 준비',
        '차고 케틀벨',
        '펼친 책',
        '그림자 브이',
        '반짝이는 해안',
      ]),
    );
    expect(state.histories.some((h) => h.targetCount === 100)).toBe(true);
    expect(state.histories.some((h) => h.targetCount === 50)).toBe(true);
    expect(state.histories.some((h) => h.targetCount === 20)).toBe(true);
    expect(state.histories.some((h) => h.targetCount === 10)).toBe(true);
  });

  it('covers the full photo when completed (no leftover units)', () => {
    seedPuzzleHistoryMockData();
    const state = loadPuzzleHistoryState();
    for (const history of state.histories) {
      expect(history.pieces).toHaveLength(history.targetCount);
      expect(history.pieces.every((r) => r.completed)).toBe(true);
    }
  });

  it('assigns a completedAt date to every opened piece for the day list', () => {
    seedPuzzleHistoryMockData(new Date('2026-10-09T12:00:00.000Z'));
    const state = loadPuzzleHistoryState();
    for (const history of state.histories) {
      const opened = history.pieces.filter((r) => r.completed);
      expect(opened.every((r) => typeof r.completedAt === 'string')).toBe(true);
      if (opened.length >= 2) {
        expect(opened[0]!.completedAt! < opened[opened.length - 1]!.completedAt!).toBe(true);
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
