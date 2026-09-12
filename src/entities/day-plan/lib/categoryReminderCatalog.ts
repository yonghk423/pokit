import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowCategoryLabelKo } from './customFlowDisplayLabel';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';
import {
  getPriorityCatalogPickerLabel,
  resolveStandardCatalogDisplayLabel,
} from './priorityCatalogPickerLabels';

/** 카테고리별 반복 알림 설정 UI·스케줄에 쓰는 키 순서 */
export const CATEGORY_REMINDER_KEYS = [
  'healthIntake',
  'reading',
  'fasting',
  'other',
] as const;

export type CategoryReminderCatalogKey = (typeof CATEGORY_REMINDER_KEYS)[number];

export function builtinCategoryLabelKo(key: string): string {
  return getPriorityCatalogPickerLabel(key);
}

export function categoryReminderLabelKo(key: string): string {
  const categoryKey = resolvePriorityRoutineCategoryKey(key);
  if (isCustomFlowCategoryKey(categoryKey)) {
    return resolveCustomFlowCategoryLabelKo(categoryKey);
  }
  const customName = readRoutineDisplayNameFromConfig(
    loadGoalDetailCategoryConfig(categoryKey),
  );
  if (customName.length > 0) {
    return resolveStandardCatalogDisplayLabel(categoryKey, customName);
  }
  return getPriorityCatalogPickerLabel(categoryKey);
}

export function categoryReminderIconName(key: string): string {
  return resolveCategoryCatalogIcon(key);
}
