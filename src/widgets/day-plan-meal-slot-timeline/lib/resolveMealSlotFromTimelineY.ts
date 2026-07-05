import { DAY_MEAL_SLOT_ORDER, type DayMealSlot } from '@shared/lib/storage';

export type MealSlotSectionBounds = {
  y: number;
  height: number;
};

/** 타임라인 트랙 기준 Y 좌표가 속한 구간을 반환합니다. */
export function resolveMealSlotFromTimelineY(
  pointerY: number,
  boundsBySlot: Partial<Record<DayMealSlot, MealSlotSectionBounds>>,
  fallbackSlot: DayMealSlot,
): DayMealSlot {
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const bounds = boundsBySlot[slot];
    if (!bounds || bounds.height <= 0) continue;
    if (pointerY >= bounds.y && pointerY < bounds.y + bounds.height) {
      return slot;
    }
  }

  let closest = fallbackSlot;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const bounds = boundsBySlot[slot];
    if (!bounds || bounds.height <= 0) continue;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.abs(pointerY - centerY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = slot;
    }
  }
  return closest;
}
