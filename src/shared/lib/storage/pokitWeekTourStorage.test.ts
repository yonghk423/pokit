import { localStorageClient } from './localStorageClient';
import {
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  hideStandardCatalogKey,
  loadPokitWeekTourSeeded,
  markPokitWeekTourSeeded,
  nextOrderWithPokitWeekTourSeed,
  saveGoalDetailCategoryConfig,
} from './index';
import { StorageKeys } from './storageKeys';

describe('pokitWeekTourStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.pokitWeekTourSeeded);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
  });

  it('seeds tour into empty bag for first-time users only', () => {
    expect(loadPokitWeekTourSeeded()).toBe(false);
    expect(nextOrderWithPokitWeekTourSeed([])).toEqual([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID]);
  });

  it('re-seeds empty bag when tutorial is not finished, even after seeded flag', () => {
    markPokitWeekTourSeeded('2026-09-18');
    expect(loadPokitWeekTourSeeded()).toBe(true);
    expect(nextOrderWithPokitWeekTourSeed([], '2026-09-18')).toEqual([
      BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    ]);
  });

  it('does not re-seed empty bag on a later day after it was already seeded', () => {
    markPokitWeekTourSeeded('2026-09-18');
    expect(nextOrderWithPokitWeekTourSeed([], '2026-09-19')).toBeNull();
  });

  it('does not seed when bag already has items', () => {
    expect(nextOrderWithPokitWeekTourSeed(['healthIntake'])).toBeNull();
  });

  it('does not duplicate when tour is already in the bag', () => {
    expect(nextOrderWithPokitWeekTourSeed([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID])).toBeNull();
  });

  it('does not seed when checklist is fully complete', () => {
    saveGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID, {
      displayName: '포킷 빠르게 둘러보기',
      checklist: Array.from({ length: 7 }, (_, i) => ({
        id: `${BUILTIN_POKIT_WEEK_TOUR_FLOW_ID}_item_${i}`,
        text: `step ${i}`,
        done: true,
      })),
    });
    expect(nextOrderWithPokitWeekTourSeed([])).toBeNull();
  });

  it('does not seed when the tutorial routine was deleted', () => {
    hideStandardCatalogKey(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
    expect(nextOrderWithPokitWeekTourSeed([])).toBeNull();
  });
});
