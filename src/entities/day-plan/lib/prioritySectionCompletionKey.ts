import { DAY_MEAL_SLOT_ORDER, type DayMealSlot } from '@shared/lib/storage';

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
  return parsePrioritySectionCompletionKey(completionKey).categoryKey;
}
