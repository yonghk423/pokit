import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { usePuzzleHistoryStore } from './puzzleHistoryStore';

describe('puzzleHistoryStore', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.puzzleHistory);
    usePuzzleHistoryStore.setState({
      histories: [],
      activeHistoryId: null,
      isHydrated: true,
    });
  });

  it('starts one active history', () => {
    const created = usePuzzleHistoryStore.getState().startHistory({
      title: 'test',
      imageUri: 'file:///puzzle.jpg',
      targetCount: 10,
    });
    expect(created?.targetCount).toBe(10);
    expect(usePuzzleHistoryStore.getState().getActiveHistory()?.targetCount).toBe(10);
  });

  it('allows multiple active histories', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'a',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    const second = usePuzzleHistoryStore.getState().startHistory({
      title: 'b',
      imageUri: 'file:///b.jpg',
      targetCount: 20,
    });
    expect(second?.targetCount).toBe(20);
    expect(usePuzzleHistoryStore.getState().listActiveHistories()).toHaveLength(2);
    expect(usePuzzleHistoryStore.getState().activeHistoryId).toBe(second?.id);
  });

  it('removes a history', () => {
    const created = usePuzzleHistoryStore.getState().startHistory({
      title: 'a',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    expect(created).not.toBeNull();
    usePuzzleHistoryStore.getState().removeHistory(created!.id);
    expect(usePuzzleHistoryStore.getState().histories).toHaveLength(0);
    expect(usePuzzleHistoryStore.getState().activeHistoryId).toBeNull();
  });

  it('syncs sticky completion counts', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'a',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    usePuzzleHistoryStore.getState().syncCompletedPieceCount(2);
    expect(usePuzzleHistoryStore.getState().getActiveHistory()?.completedCount).toBe(2);
    usePuzzleHistoryStore.getState().syncCompletedPieceCount(1);
    expect(usePuzzleHistoryStore.getState().getActiveHistory()?.completedCount).toBe(2);
  });

  it('moves to album when target reached', () => {
    usePuzzleHistoryStore.getState().startHistory({
      title: 'a',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    usePuzzleHistoryStore.getState().syncCompletedPieceCount(10);
    expect(usePuzzleHistoryStore.getState().getActiveHistory()).toBeNull();
    expect(usePuzzleHistoryStore.getState().listAlbumHistories()).toHaveLength(1);
  });
});
