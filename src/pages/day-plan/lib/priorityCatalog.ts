import { listAllCustomFlowCatalogEntries } from '@shared/lib/storage';

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
    label: getPickerCategoryLabel(cat.key),
    icon: cat.icon as string,
    isCustom: false,
  }));
  const customs = listAllCustomFlowCatalogEntries().map((entry) => ({
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

/** 나만의 루틴 추가 모달 — 사용자 플로우를 상단에 두고 기본 항목은 그다음 */
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
