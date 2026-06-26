import {
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  listCustomFlowCatalogEntries,
  listGoalDetailCategoryConfigKeys,
  type CustomFlowCatalogEntry,
} from '@shared/lib/storage';

import {
  getPickerCategoryItem,
  getPickerCategoryLabel,
  PICKER_CATEGORIES,
  type PickerCategoryItem,
} from './dayPlanEditorShared';
import { filterCatalogPickerCategories } from './priorityCatalogSections';

export type PriorityCatalogRow = {
  key: string;
  label: string;
  icon: string;
  isCustom: boolean;
};

/**
 * catalog 항목이 누락되었지만 config에는 존재하는 customFlow를 보강한 뒤 반환.
 * PriorityCatalogPage.reloadCatalogData 의 legacy 보강 로직과 동일.
 */
function listAllCustomFlowEntries(): CustomFlowCatalogEntry[] {
  const stored = listCustomFlowCatalogEntries();
  const known = new Map(stored.map((e) => [e.id, e] as const));
  for (const id of listGoalDetailCategoryConfigKeys()) {
    if (!id.startsWith('customFlow:') || known.has(id)) continue;
    known.set(id, { id, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
  }
  return [...known.values()];
}

/** 담기·나만의 탭이 공유하는 카탈로그 행 목록 */
export function buildPriorityCatalogRows(): PriorityCatalogRow[] {
  const base = filterCatalogPickerCategories(PICKER_CATEGORIES).map((cat) => ({
    key: cat.key,
    label: cat.label,
    icon: cat.icon as string,
    isCustom: false,
  }));
  const customs = listAllCustomFlowEntries().map((entry) => ({
    key: entry.id,
    label: getPickerCategoryLabel(entry.id),
    icon: getPickerCategoryItem(entry.id)?.icon ?? 'person.fill',
    isCustom: true,
  }));
  return [...base, ...customs];
}

export function buildPriorityCatalogByKey(): Map<string, PriorityCatalogRow> {
  return new Map(buildPriorityCatalogRows().map((row) => [row.key, row]));
}

export function getPriorityCatalogPickerItems(): PickerCategoryItem[] {
  return filterCatalogPickerCategories(PICKER_CATEGORIES);
}
