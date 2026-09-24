import {
  hideStandardCatalogKey,
  removeCustomFlowCatalogId,
  removeGoalDetailCategoryConfig,
  removeRoutineCatalogSelectionKey,
  savePriorityCatalogFixedRoutineKeys,
} from '@shared/lib/storage';
import { isBuiltinPresetCustomFlowId } from '@shared/lib/storage/defaultPriorityCatalog';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

export type DeleteCatalogCategoryDeps = {
  hydrateFixedFlowSets: () => void;
  getTodayAppliedCategoryKeys: () => string[];
  reloadFixedFlowSetsFromStorage: () => void;
  notifyFixedFlowApplyScheduleChanged: () => void;
  getPriorityCategoryOrder: () => string[];
  setPriorityCategoryOrder: (order: string[]) => void;
  getPrioritySectionsCategoryOrder: () => string[];
  setPrioritySectionsCategoryOrder: (order: string[]) => void;
  filterCompletedFocusKeysToPriorityOrder: (order: string[]) => void;
  registerOtherCategoryResolverFromStorage: () => void;
};

function purgeCatalogCategoryFromPlan(categoryKey: string, deps: DeleteCatalogCategoryDeps): void {
  removeRoutineCatalogSelectionKey(categoryKey);

  deps.hydrateFixedFlowSets();
  const nextFixed = [
    ...new Set(deps.getTodayAppliedCategoryKeys().filter((k) => k !== categoryKey)),
  ];
  savePriorityCatalogFixedRoutineKeys(nextFixed);
  deps.reloadFixedFlowSetsFromStorage();
  deps.notifyFixedFlowApplyScheduleChanged();

  const nextOrder = deps
    .getPriorityCategoryOrder()
    .filter((k) => resolvePriorityRoutineCategoryKey(k) !== categoryKey);
  deps.setPriorityCategoryOrder(nextOrder);
  deps.filterCompletedFocusKeysToPriorityOrder(nextOrder);

  const nextSectionsOrder = deps
    .getPrioritySectionsCategoryOrder()
    .filter((k) => resolvePriorityRoutineCategoryKey(k) !== categoryKey);
  if (nextSectionsOrder.length !== deps.getPrioritySectionsCategoryOrder().length) {
    deps.setPrioritySectionsCategoryOrder(nextSectionsOrder);
  }

  deps.registerOtherCategoryResolverFromStorage();
}

/** 담기 항목 삭제 — 사용자 루틴은 제거, 표준 항목은 재시드되지 않게 숨김 후 설정·일정에서 제거 */
export function deleteCatalogCategory(
  categoryKey: string,
  deps: DeleteCatalogCategoryDeps,
): boolean {
  const key = categoryKey.trim();
  if (!key) return false;

  if (isCustomFlowCategoryKey(key)) {
    if (isBuiltinPresetCustomFlowId(key)) {
      hideStandardCatalogKey(key);
    }
    removeCustomFlowCatalogId(key);
    removeGoalDetailCategoryConfig(key);
    purgeCatalogCategoryFromPlan(key, deps);
    return true;
  }

  hideStandardCatalogKey(key);
  removeGoalDetailCategoryConfig(key);
  purgeCatalogCategoryFromPlan(key, deps);
  return true;
}

/** 사용자 플로우(customFlow) 삭제 — 담기·설정·고정 루틴·오늘 순서에서 제거 */
export function deleteCustomFlowCategory(
  categoryKey: string,
  deps: DeleteCatalogCategoryDeps,
): boolean {
  if (!isCustomFlowCategoryKey(categoryKey)) return false;
  return deleteCatalogCategory(categoryKey, deps);
}
