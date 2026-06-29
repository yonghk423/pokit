import { resolveCustomFlowCatalogIcon, loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowCategoryLabelKo } from './customFlowDisplayLabel';
import { GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS } from './goalDetailChecklistCategoryKeys';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';
import { getPriorityCatalogPickerLabel } from './priorityCatalogPickerLabels';

/** 카테고리별 반복 알림 설정 UI·스케줄에 쓰는 키 순서 */
export const CATEGORY_REMINDER_KEYS = [
  'work',
  'reading',
  'meditation',
  'yoga',
  'fasting',
  'water',
  'medicine',
  'other',
  ...GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS,
] as const;

export type CategoryReminderCatalogKey = (typeof CATEGORY_REMINDER_KEYS)[number];

/** SF Symbol 이름 — 담기·데이플랜 카탈로그와 동일 매핑 */
const ICONS: Record<string, string> = {
  water: 'drop.fill',
  medicine: 'cross.case.fill',
  vitamins: 'pill.fill',
  fasting: 'figure.stand',
  stretching: 'figure.run',
  straightenBack: 'figure.yoga',
  neckPosture: 'tortoise.fill',
  posture: 'figure.stand.line.dotted.figure.stand',
  meditation: 'brain.head.profile',
  workout: 'dumbbell.fill',
  walking: 'figure.walk',
  yoga: 'figure.mind.and.body',
  sleep: 'moon.fill',
  breathing: 'wind',
  skincare: 'sparkles',
  eyerest: 'eye',
  reading: 'book.fill',
  study: 'graduationcap.fill',
  planning: 'calendar.badge.clock',
  writing: 'square.and.pencil',
  language: 'character.bubble',
  creative: 'paintpalette.fill',
  deepwork: 'brain',
  journal: 'book.closed.fill',
  pomodoro: 'timer',
  review: 'arrow.counterclockwise',
  news: 'newspaper.fill',
  organize: 'tray.and.arrow.down.fill',
  podcast: 'headphones',
  inbox: 'tray.2.fill',
  work: 'bag.fill',
  coding: 'chevron.left.forwardslash.chevron.right',
  other: 'person.fill',
};

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
  if (isCustomFlowCategoryKey(key)) return resolveCustomFlowCatalogIcon(key);
  return ICONS[key] ?? 'star.fill';
}
