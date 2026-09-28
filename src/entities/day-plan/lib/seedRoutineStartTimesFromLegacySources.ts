import {
  loadDayPlan,
  loadFixedFlowSetsState,
  type RoutineStartTimeEntry,
} from '@shared/lib/storage';

import { useRoutineStartTimesStore } from '../model/routineStartTimesStore';

/**
 * 기존 고정 루틴 spine·오늘 일정 수동 오버라이드를
 * `pokit:routine-start-times` 전용 저장소로 한 번 이전한다.
 * 이미 전용 저장소에 있는 키는 덮지 않는다.
 */
export function seedRoutineStartTimesFromLegacySources(): void {
  const store = useRoutineStartTimesStore.getState();
  if (!store.isHydrated) return;

  const existing = { ...store.byCategoryKey };
  let changed = false;

  const putIfMissing = (categoryKey: string, entry: RoutineStartTimeEntry) => {
    const key = categoryKey.trim();
    if (!key || existing[key]) return;
    existing[key] = entry;
    changed = true;
  };

  const fixed = loadFixedFlowSetsState();
  for (const set of fixed.sets) {
    for (const item of set.items) {
      if (typeof item.spineStartMinutes !== 'number' || typeof item.spineEndMinutes !== 'number') {
        continue;
      }
      putIfMissing(item.categoryKey, {
        startMinutes: item.spineStartMinutes,
        endMinutes: item.spineEndMinutes,
        ...(item.spineEndsNextCalendarDay === true
          ? { endsNextCalendarDay: true as const }
          : {}),
      });
    }
  }

  const plan = loadDayPlan<{
    categoryKey?: string;
    startMinutes?: number;
    endMinutes?: number;
    endsNextCalendarDay?: boolean;
    hasManualScheduleOverride?: boolean;
  }>();
  for (const block of plan?.blocks ?? []) {
    if (block.hasManualScheduleOverride !== true) continue;
    const key = typeof block.categoryKey === 'string' ? block.categoryKey.trim() : '';
    if (!key) continue;
    if (typeof block.startMinutes !== 'number' || typeof block.endMinutes !== 'number') continue;
    putIfMissing(key, {
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      ...(block.endsNextCalendarDay === true ? { endsNextCalendarDay: true as const } : {}),
    });
  }

  if (!changed) return;
  for (const [key, entry] of Object.entries(existing)) {
    if (store.byCategoryKey[key]) continue;
    store.setRoutineStartTime(key, entry);
  }
}
