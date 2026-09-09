import {
  hideStandardCatalogKey,
  removeCustomFlowCatalogId,
  removeGoalDetailCategoryConfig,
  savePriorityCatalogFixedRoutineKeys,
} from '@shared/lib/storage';
import { isBuiltinPresetCustomFlowId } from '@shared/lib/storage/defaultPriorityCatalog';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

type DeleteCustomFlowDeps = {
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
  bumpCategoryLabelEpoch: () => void;
};

/** 사용자 플로우(customFlow) 삭제 — 담기·설정·고정 루틴·오늘 순서에서 제거 */
export function deleteCustomFlowCategory(
  categoryKey: string,
  deps: DeleteCustomFlowDeps,
): boolean {
  if (!isCustomFlowCategoryKey(categoryKey)) return false;

  removeCustomFlowCatalogId(categoryKey);
  removeGoalDetailCategoryConfig(categoryKey);
  // 기본 프리셋은 ensureDefault 시 다시 붙지 않도록 숨김 기록
  if (isBuiltinPresetCustomFlowId(categoryKey)) {
    hideStandardCatalogKey(categoryKey);
  }

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
  deps.bumpCategoryLabelEpoch();
  return true;
}
