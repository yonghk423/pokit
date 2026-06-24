import {
  HEALTH_GROUP_SYSTEM_ORDER,
  isCustomFlowCategoryKey,
  isSystemCatalogGroupKey,
  PRODUCTIVITY_GROUP_SYSTEM_ORDER,
} from '@entities/day-plan';
import type {
  CustomCatalogGroup,
  CustomFlowCatalogEntry,
} from '@shared/lib/storage';
import {
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  loadStandardCatalogGroupOverrides,
  resolveSystemCatalogGroupLabel,
  resolveSystemCatalogGroupSubtitle,
} from '@shared/lib/storage';

import { PICKER_CATEGORIES, type PickerCategoryItem } from './dayPlanEditorShared';

export type { PickerCategoryItem };

export { CATALOG_REMOVED_KEYS } from '@entities/day-plan';
export {
  defaultSystemGroupForCatalogKey,
  HEALTH_GROUP_SYSTEM_ORDER,
  PRODUCTIVITY_GROUP_SYSTEM_ORDER,
} from '@entities/day-plan';

import { CATALOG_REMOVED_KEYS, defaultSystemGroupForCatalogKey } from '@entities/day-plan';

const DEFAULT_CUSTOM_GROUP_SUBTITLE_KO =
  '직접 만든 묶음이에요. 아래에 두고 싶은 루틴을 오른쪽 아래 + 버튼으로 추가할 수 있어요.';

export function filterCatalogPickerCategories(cats: PickerCategoryItem[]): PickerCategoryItem[] {
  return cats.filter((c) => !CATALOG_REMOVED_KEYS.has(c.key));
}

export type PriorityCatalogGroupSection = {
  groupKey: string;
  title: string;
  subtitle?: string;
  items: PickerCategoryItem[];
  /** 사용자 정의 그룹은 비어 있어도 노출(편집 가능) */
  isCustomGroup: boolean;
};

export type PriorityCatalogSectionsResult = {
  groupSections: PriorityCatalogGroupSection[];
};

export type PriorityCatalogSectionsInput = {
  available: PickerCategoryItem[];
  customFlowPickerItems: PickerCategoryItem[];
  customFlowEntries: CustomFlowCatalogEntry[];
  customGroups: CustomCatalogGroup[];
};

function orderCategoryItemsInGroup(
  items: PickerCategoryItem[],
  preferredOrder: readonly string[],
): PickerCategoryItem[] {
  const byKey = new Map(items.map((c) => [c.key, c]));
  const out: PickerCategoryItem[] = [];
  const used = new Set<string>();
  for (const k of preferredOrder) {
    const item = byKey.get(k);
    if (!item) continue;
    out.push(item);
    used.add(k);
  }
  for (const item of items) {
    if (used.has(item.key)) continue;
    out.push(item);
  }
  return out;
}

function isKnownCatalogGroupKey(
  groupKey: string,
  customGroups: CustomCatalogGroup[],
): boolean {
  if (isSystemCatalogGroupKey(groupKey)) return true;
  return customGroups.some((g) => g.key === groupKey);
}

function resolveStandardCatalogItemGroupKey(categoryKey: string): string {
  const overrides = loadStandardCatalogGroupOverrides();
  return overrides[categoryKey] ?? defaultSystemGroupForCatalogKey(categoryKey);
}

/**
 * 담기 카탈로그를 상위 그룹별 항목으로 묶는다.
 *
 * - 시스템 그룹(`health`, `productivity`)은 항목이 없어도 노출
 * - 사용자 정의 그룹은 항목이 없어도 노출(이름·항목 편집을 위해)
 * - 표준 항목은 저장된 그룹 재배치 + 기본 시스템 그룹으로 소속 결정
 */
export function buildPriorityCatalogSections(
  input: PriorityCatalogSectionsInput,
): PriorityCatalogSectionsResult {
  const visibleAvailable = filterCatalogPickerCategories(input.available);

  const groupByCustomFlowId = new Map<string, string>();
  for (const entry of input.customFlowEntries) {
    groupByCustomFlowId.set(entry.id, entry.groupKey);
  }

  const standardByGroup = new Map<string, PickerCategoryItem[]>();
  for (const item of visibleAvailable) {
    let groupKey = resolveStandardCatalogItemGroupKey(item.key);
    if (!isKnownCatalogGroupKey(groupKey, input.customGroups)) {
      groupKey = 'productivity';
    }
    const list = standardByGroup.get(groupKey) ?? [];
    list.push(item);
    standardByGroup.set(groupKey, list);
  }

  const customByGroup = new Map<string, PickerCategoryItem[]>();
  const orphanCustomFlows: PickerCategoryItem[] = [];
  for (const item of input.customFlowPickerItems) {
    if (!item.key) continue;
    let groupKey =
      groupByCustomFlowId.get(item.key) ??
      (isCustomFlowCategoryKey(item.key)
        ? DEFAULT_CUSTOM_FLOW_GROUP_KEY
        : resolveStandardCatalogItemGroupKey(item.key));
    if (!isKnownCatalogGroupKey(groupKey, input.customGroups)) {
      orphanCustomFlows.push(item);
      continue;
    }
    const list = customByGroup.get(groupKey) ?? [];
    list.push(item);
    customByGroup.set(groupKey, list);
  }

  const sections: PriorityCatalogGroupSection[] = [];

  const healthStandardItems = orderCategoryItemsInGroup(
    standardByGroup.get('health') ?? [],
    HEALTH_GROUP_SYSTEM_ORDER,
  );
  const healthCustomItems = customByGroup.get('health') ?? [];
  sections.push({
    groupKey: 'health',
    title: resolveSystemCatalogGroupLabel('health'),
    subtitle: resolveSystemCatalogGroupSubtitle('health'),
    items: [...healthStandardItems, ...healthCustomItems],
    isCustomGroup: false,
  });

  const productivityStandardItems = orderCategoryItemsInGroup(
    standardByGroup.get('productivity') ?? [],
    PRODUCTIVITY_GROUP_SYSTEM_ORDER,
  );
  const productivityCustomItems = customByGroup.get('productivity') ?? [];
  sections.push({
    groupKey: 'productivity',
    title: resolveSystemCatalogGroupLabel('productivity'),
    subtitle: resolveSystemCatalogGroupSubtitle('productivity'),
    items: [
      ...productivityStandardItems,
      ...productivityCustomItems,
      ...orphanCustomFlows,
    ],
    isCustomGroup: false,
  });

  for (const g of input.customGroups) {
    const standardItems = orderCategoryItemsInGroup(standardByGroup.get(g.key) ?? [], []);
    const customItems = customByGroup.get(g.key) ?? [];
    sections.push({
      groupKey: g.key,
      title: g.label,
      subtitle: g.subtitle ?? DEFAULT_CUSTOM_GROUP_SUBTITLE_KO,
      items: [...standardItems, ...customItems],
      isCustomGroup: true,
    });
  }

  return { groupSections: sections };
}

// Re-export for tests and callers that import picker categories from here.
export { PICKER_CATEGORIES };
