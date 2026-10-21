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
  };
}

describe('deleteCatalogCategory', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  });

  it.each(['healthIntake', 'reading', 'fasting'])('keeps the essential %s category, settings and plan intact', (key) => {
    const config = { displayName: '기본 항목', currentWeightKg: 70 };
    saveGoalDetailCategoryConfig(key, config);
    const deps = createDeps([key, 'customFlow:user']);
    expect(deleteCatalogCategory(key, deps)).toBe(false);
    expect(isStandardCatalogKeyHidden(key)).toBe(false);
    expect(loadGoalDetailCategoryConfig(key)).toEqual(config);
    expect(deps.order).toEqual([key, 'customFlow:user']);
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
