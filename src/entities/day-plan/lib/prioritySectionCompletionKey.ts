import type { RoutineHistoryLayoutMode } from '@shared/lib/routineHistoryLayoutKey';
import { DAY_MEAL_SLOT_ORDER, type DayMealSlot } from '@shared/lib/storage';

import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

const MEAL_SLOT_SET = new Set<string>(DAY_MEAL_SLOT_ORDER);

/** 시간대별 보기에서 구간마다 독립 완료 체크를 위한 복합 키 */
export function buildPrioritySectionCompletionKey(
  categoryKey: string,
  slot: DayMealSlot,
): string {
  return `${categoryKey}@${slot}`;
}

export function parsePrioritySectionCompletionKey(completionKey: string): {
  categoryKey: string;
  slot?: DayMealSlot;
} {
  const at = completionKey.lastIndexOf('@');
  if (at <= 0) return { categoryKey: completionKey };
  const slotPart = completionKey.slice(at + 1);
  if (MEAL_SLOT_SET.has(slotPart)) {
    return {
      categoryKey: completionKey.slice(0, at),
      slot: slotPart as DayMealSlot,
    };
  }
  return { categoryKey: completionKey };
}

/** 히스토리·위젯 등 카테고리 단위 집계용 */
export function toRoutineHistoryCategoryKey(completionKey: string): string {
  return resolvePriorityRoutineCategoryKey(
    parsePrioritySectionCompletionKey(completionKey).categoryKey,
  );
}

/**
 * 집중 완료 키(`completedFocusCategoryKeys`)의 히스토리 레이아웃.
 * 현재 활성 탭이 아니라 완료 키 형식·sections 독립 목록으로 판별한다.
 * spine 완료는 블록 체크 경로에서만 기록한다.
 */
export function resolveFocusCompletionHistoryLayoutMode(
  completionKey: string,
  sectionsCategoryOrder: readonly string[] = [],
): RoutineHistoryLayoutMode {
  const { categoryKey, slot } = parsePrioritySectionCompletionKey(completionKey);
  if (slot) return 'sections';
  if (sectionsCategoryOrder.includes(categoryKey)) return 'sections';
  return 'bag';
}

export function migrateCompletionKeyInList(
  keys: readonly string[],
  fromKey: string,
  toKey: string,
): string[] {
  if (fromKey === toKey || !keys.includes(fromKey)) return [...keys];
  const withoutFrom = keys.filter((key) => key !== fromKey);
  if (withoutFrom.includes(toKey)) return withoutFrom;
  return [...withoutFrom, toKey];
}
