import { isCustomFlowCategoryKey, resolveCategoryCatalogIcon } from '@entities/day-plan';
import type { CustomCatalogGroup, CustomFlowCatalogEntry } from '@shared/lib/storage';
import { listAllCustomFlowCatalogEntries, listCustomCatalogGroups } from '@shared/lib/storage';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
  type PickerCategoryItem,
} from './dayPlanEditorShared';
import { buildPriorityCatalogSections, filterCatalogPickerCategories } from './priorityCatalogSections';

export type PriorityCatalogRow = {
  key: string;
  label: string;
  icon: string;
  isCustom: boolean;
};

export type AddablePriorityCatalogSection = {
  groupKey: string;
  title: string;
  items: PriorityCatalogRow[];
};

function pickerItemToRow(item: PickerCategoryItem): PriorityCatalogRow {
  const resolved = getPickerCategoryItem(item.key);
  return {
    key: item.key,
    label: item.label,
    icon: (resolved?.icon ?? item.icon) as string,
    isCustom: isCustomFlowCategoryKey(item.key),
  };
}

function dedupeRowsByKey(rows: PriorityCatalogRow[]): PriorityCatalogRow[] {
  const seen = new Set<string>();
  const out: PriorityCatalogRow[] = [];
  for (const row of rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    out.push(row);
  }
  return out;
}

/** 담기·나만의 탭이 공유하는 카탈로그 행 목록 */
export function buildPriorityCatalogRows(): PriorityCatalogRow[] {
  const base = filterCatalogPickerCategories(PICKER_CATEGORIES).map((cat) =>
    pickerItemToRow({
      ...cat,
      label: getPickerCategoryLabel(cat.key),
    }),
  );
  const customs = listAllCustomFlowCatalogEntries().map((entry) =>
    pickerItemToRow({
      key: entry.id,
      label: getPickerCategoryLabel(entry.id),
      icon: (getPickerCategoryItem(entry.id)?.icon ?? 'person.fill') as typeof PICKER_CATEGORIES[number]['icon'],
    }),
  );
  return dedupeRowsByKey([...base, ...customs]);
}

export function buildPriorityCatalogByKey(): Map<string, PriorityCatalogRow> {
  return new Map(buildPriorityCatalogRows().map((row) => [row.key, row]));
}

/** 스파인 일정 편집 — 루틴 탭과 동일한 그룹·항목 목록 */
export function buildRoutineTabPickerSections(catalogLabelEpoch = 0): {
  title: string;
  items: PriorityCatalogRow[];
}[] {
  void catalogLabelEpoch;
  const customFlowEntries = listAllCustomFlowCatalogEntries();
  const customGroups = listCustomCatalogGroups();
  const available = filterCatalogPickerCategories(PICKER_CATEGORIES).map((item) => ({
    ...item,
    label: getPickerCategoryLabel(item.key),
  }));
  const customFlowPickerItems: PickerCategoryItem[] = customFlowEntries.map((entry) => {
    const item = getPickerCategoryItem(entry.id);
    return {
      key: entry.id,
      label: getPickerCategoryLabel(entry.id),
      icon: (item?.icon ?? 'person.fill') as typeof PICKER_CATEGORIES[number]['icon'],
    };
  });
  const { groupSections } = buildPriorityCatalogSections({
    available,
    customFlowPickerItems,
    customFlowEntries,
    customGroups,
  });
  return groupSections
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        key: item.key,
        label: item.label,
        icon: resolveCategoryCatalogIcon(item.key),
        isCustom: isCustomFlowCategoryKey(item.key),
      })),
    }));
}

export function getPriorityCatalogPickerItems(): PickerCategoryItem[] {
  return filterCatalogPickerCategories(PICKER_CATEGORIES);
}

function buildRoutineTabCatalogPickerItems(
  customFlowEntries: CustomFlowCatalogEntry[],
): PickerCategoryItem[] {
  return customFlowEntries.map((entry) => {
    const item = getPickerCategoryItem(entry.id);
    return {
      key: entry.id,
      label: getPickerCategoryLabel(entry.id),
      icon: (item?.icon ?? 'person.fill') as typeof PICKER_CATEGORIES[number]['icon'],
    };
  });
}

/** 루틴 탭과 동일한 상위 그룹 구조 — 나만의 루틴 항목 추가 모달용 */
export function buildAddablePriorityCatalogSections(input: {
  excludedKeys: ReadonlySet<string>;
  customFlowEntries: CustomFlowCatalogEntry[];
  customGroups: CustomCatalogGroup[];
}): AddablePriorityCatalogSection[] {
  const userCreatedGroupKeys = new Set(
    input.customGroups
      .filter(
        (group) =>
          !group.key.startsWith('customGroup:preset_') &&
          !group.key.startsWith('customGroup:builtin_'),
      )
      .map((group) => group.key),
  );
  const visibleCatalogCategories = filterCatalogPickerCategories(PICKER_CATEGORIES).map((item) => ({
    ...item,
    label: getPickerCategoryLabel(item.key),
  }));

  const customFlowPickerItems = buildRoutineTabCatalogPickerItems(input.customFlowEntries);

  const { groupSections } = buildPriorityCatalogSections({
    available: visibleCatalogCategories,
    customFlowPickerItems,
    customFlowEntries: input.customFlowEntries,
    customGroups: input.customGroups,
  });

  return groupSections
    .map((section) => ({
      groupKey: section.groupKey,
      title: section.title,
      items: section.items
        .filter((item) => !input.excludedKeys.has(item.key))
        .map((item) => pickerItemToRow(item)),
    }))
    .filter((section) => section.items.length > 0)
    .sort((a, b) => {
      const aRank = userCreatedGroupKeys.has(a.groupKey) ? 0 : 1;
      const bRank = userCreatedGroupKeys.has(b.groupKey) ? 0 : 1;
      return aRank - bRank;
    });
}

/** @deprecated 항목 추가 모달은 `buildAddablePriorityCatalogSections` 사용 */
export function sortAddablePriorityCatalogRows(rows: PriorityCatalogRow[]): PriorityCatalogRow[] {
  const userCustom: PriorityCatalogRow[] = [];
  const standard: PriorityCatalogRow[] = [];
  const builtinCustom: PriorityCatalogRow[] = [];

  for (const row of rows) {
    if (!row.isCustom) {
      standard.push(row);
      continue;
    }
    if (row.key.includes('builtin_')) {
      builtinCustom.push(row);
      continue;
    }
    userCustom.push(row);
  }

  return [...userCustom, ...standard, ...builtinCustom];
}
