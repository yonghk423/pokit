import { listCustomFlowCatalogEntries } from '@shared/lib/storage';

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

/** 담기·나만의 탭이 공유하는 카탈로그 행 목록 */
export function buildPriorityCatalogRows(): PriorityCatalogRow[] {
  const base = filterCatalogPickerCategories(PICKER_CATEGORIES).map((cat) => ({
    key: cat.key,
    label: cat.label,
    icon: cat.icon as string,
    isCustom: false,
  }));
  const customs = listCustomFlowCatalogEntries().map((entry) => ({
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
