import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowCategoryLabelKo } from './customFlowDisplayLabel';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';
import { getPriorityCatalogPickerLabel } from './priorityCatalogPickerLabels';

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
  const customName = readRoutineDisplayNameFromConfig(loadGoalDetailCategoryConfig(key));
  if (customName.length > 0) return customName;
  if (isCustomFlowCategoryKey(key)) return resolveCustomFlowCategoryLabelKo(key);
  return getPriorityCatalogPickerLabel(key);
}

export function categoryReminderIconName(key: string): string {
  return resolveCategoryCatalogIcon(key);
}
