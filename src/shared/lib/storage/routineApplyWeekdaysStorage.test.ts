import { localStorageClient } from './localStorageClient';
import {
  collectAutoScheduledCategoryKeys,
  loadCategoryApplyWeekdays,
  saveCategoryApplyWeekdays,
} from './routineApplyWeekdaysStorage';
import { StorageKeys } from './storageKeys';

describe('routineApplyWeekdaysStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  });

  it('saves and loads category apply weekdays', () => {
    saveCategoryApplyWeekdays('exercise', [1, 3]);
    expect(loadCategoryApplyWeekdays('exercise')).toEqual([1, 3]);
  });

  it('collects keys matched for today', () => {
    saveCategoryApplyWeekdays('exercise', [1, 3]);
    saveCategoryApplyWeekdays('reading', [0, 6]);
    expect(collectAutoScheduledCategoryKeys(new Date('2026-07-06T09:00:00+09:00'))).toEqual(['exercise']);
    expect(collectAutoScheduledCategoryKeys(new Date('2026-07-04T09:00:00+09:00'))).toEqual(['reading']);
  });
});
