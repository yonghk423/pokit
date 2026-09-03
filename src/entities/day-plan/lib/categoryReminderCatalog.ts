import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowCategoryLabelKo } from './customFlowDisplayLabel';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';
import {
  getPriorityCatalogPickerLabel,
  PRIORITY_CATALOG_PICKER_LABELS,
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
    const picker = getPriorityCatalogPickerLabel(categoryKey);
    const koPicker = PRIORITY_CATALOG_PICKER_LABELS[categoryKey];
    // 저장명이 한국어 카탈로그 기본값이면 현재 로케일 라벨 사용
    if (koPicker && customName === koPicker) return picker;
    return customName;
  }
  return getPriorityCatalogPickerLabel(categoryKey);
}

export function categoryReminderIconName(key: string): string {
  return resolveCategoryCatalogIcon(key);
}
