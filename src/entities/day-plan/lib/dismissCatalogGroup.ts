import {
  dismissCatalogGroupKey,
  isCatalogGroupDismissed,
  isCustomCatalogGroupKey,
  listCustomFlowCatalogEntries,
  removeCustomCatalogGroup,
  reassignCustomFlowGroup,
  resolveCatalogItemGroupKey,
  updateCatalogItemGroup,
} from '@shared/lib/storage';

import { isSystemCatalogGroupKey, type SystemCatalogGroupKey } from './customCatalogGroup';
import { getPriorityCatalogStandardKeys } from './priorityCatalogRegistry';

function resolveFallbackSystemGroupKey(groupKey: SystemCatalogGroupKey): SystemCatalogGroupKey {
  return groupKey === 'health' ? 'productivity' : 'health';
}

/** 상위 묶음 삭제 — 항목을 다른 묶음으로 옮기고 담기 목록에서 숨김 */
export function dismissCatalogGroupWithItemReassign(groupKey: string): boolean {
  const key = groupKey.trim();
  if (!key || isCatalogGroupDismissed(key)) return false;

  const targetGroupKey = isSystemCatalogGroupKey(key)
    ? resolveFallbackSystemGroupKey(key)
    : 'productivity';

  if (isCatalogGroupDismissed(targetGroupKey)) {
    return false;
  }

  for (const categoryKey of getPriorityCatalogStandardKeys()) {
    if (resolveCatalogItemGroupKey(categoryKey) !== key) continue;
    updateCatalogItemGroup(categoryKey, targetGroupKey);
  }

  for (const entry of listCustomFlowCatalogEntries()) {
    if (entry.groupKey !== key) continue;
    updateCatalogItemGroup(entry.id, targetGroupKey);
  }

  reassignCustomFlowGroup(key, targetGroupKey);

  if (isCustomCatalogGroupKey(key)) {
    removeCustomCatalogGroup(key);
    return true;
  }

  dismissCatalogGroupKey(key);
  return true;
}
