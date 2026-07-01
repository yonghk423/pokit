import type { FixedFlowSetItem } from '@shared/lib/storage';

import { filterKeysToPriorityCatalog } from './priorityCatalogRegistry';

/** 세트 항목을 담기 카탈로그 허용 키만 남기고 순서·enabled 유지 */
export function sanitizeFixedFlowSetItems(items: FixedFlowSetItem[]): FixedFlowSetItem[] {
  const byKey = new Map(items.map((x) => [x.categoryKey, x]));
  const keys = filterKeysToPriorityCatalog(items.map((x) => x.categoryKey));
  return keys.map((categoryKey) => {
    const prev = byKey.get(categoryKey);
    return {
      categoryKey,
      enabled: prev?.enabled !== false,
      mealSlot: prev?.mealSlot,
    };
  });
}
