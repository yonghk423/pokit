import { localStorageClient } from './localStorageClient';
import { loadDayPlan, saveDayPlan } from './dayPlanStorage';
import { StorageKeys } from './storageKeys';

describe('dayPlanStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dayPlan);
  });

  it('returns null when empty', () => {
    expect(loadDayPlan()).toBeNull();
  });

  it('persists day plan snapshot', () => {
    const snapshot = {
      dateKey: '2025-05-26',
      blocks: [{ id: 'b1', title: '독서', order: 0 }],
      completedBlockIds: [],
      skippedBlockIds: [],
      quickMemos: [],
    };
    saveDayPlan(snapshot);
    expect(loadDayPlan()).toEqual(snapshot);
  });
});
