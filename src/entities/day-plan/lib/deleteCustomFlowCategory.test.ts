import {
  isStandardCatalogKeyHidden,
  loadGoalDetailCategoryConfig,
  localStorageClient,
  saveGoalDetailCategoryConfig,
  StorageKeys,
} from '@shared/lib/storage';

import { deleteCatalogCategory, type DeleteCatalogCategoryDeps } from './deleteCustomFlowCategory';

function createDeps(order: string[]): DeleteCatalogCategoryDeps & { order: string[] } {
  const state = { order: [...order], sections: [...order] };
  return {
    get order() {
      return state.order;
    },
    hydrateFixedFlowSets: () => {},
    getTodayAppliedCategoryKeys: () => [...state.order],
    reloadFixedFlowSetsFromStorage: () => {},
    notifyFixedFlowApplyScheduleChanged: () => {},
    getPriorityCategoryOrder: () => state.order,
    setPriorityCategoryOrder: (next) => {
      state.order = next;
    },
    getPrioritySectionsCategoryOrder: () => state.sections,
    setPrioritySectionsCategoryOrder: (next) => {
      state.sections = next;
    },
    filterCompletedFocusKeysToPriorityOrder: () => {},
    registerOtherCategoryResolverFromStorage: () => {},
    bumpCategoryLabelEpoch: () => {},
  };
}

describe('deleteCatalogCategory', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  });

  it('deletes a standard catalog item instead of leaving it visible', () => {
    saveGoalDetailCategoryConfig('fasting', { displayName: '체중조절', currentWeightKg: 70 });
    const deps = createDeps(['fasting', 'healthIntake']);

    expect(deleteCatalogCategory('fasting', deps)).toBe(true);
    expect(isStandardCatalogKeyHidden('fasting')).toBe(true);
    expect(loadGoalDetailCategoryConfig('fasting')).toBeNull();
    expect(deps.order).toEqual(['healthIntake']);
  });

  it('hides the tutorial routine so it is not re-seeded', () => {
    saveGoalDetailCategoryConfig('customFlow:preset_pokit_week_tour', {
      displayName: '포킷 빠르게 둘러보기',
    });
    const deps = createDeps(['customFlow:preset_pokit_week_tour', 'healthIntake']);

    expect(deleteCatalogCategory('customFlow:preset_pokit_week_tour', deps)).toBe(true);
    expect(isStandardCatalogKeyHidden('customFlow:preset_pokit_week_tour')).toBe(true);
    expect(loadGoalDetailCategoryConfig('customFlow:preset_pokit_week_tour')).toBeNull();
    expect(deps.order).toEqual(['healthIntake']);
  });
});
