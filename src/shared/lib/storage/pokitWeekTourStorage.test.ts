import { localStorageClient } from './localStorageClient';
import {
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
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
  });

  it('seeds tour into empty bag even if seeded flag was set (rollover recovery)', () => {
    markPokitWeekTourSeeded();
    expect(loadPokitWeekTourSeeded()).toBe(true);
    expect(nextOrderWithPokitWeekTourSeed([])).toEqual([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID]);
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
});
