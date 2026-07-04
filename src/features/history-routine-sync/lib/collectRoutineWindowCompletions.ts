import {
  filterDayPlanFlowBlocks,
  getFlowCompletionCategoryKeysForBlock,
  getLocalDateKey,
  toRoutineHistoryCategoryKey,
  useDayPlanDraftStore,
  useDayPlanStore,
} from '@entities/day-plan';

export type RoutineWindowCompletionSnapshot = {
  categoryKeys: string[];
  plannedCountForDay: number;
};

/** 히스토리 동기화 대상(루틴 담기·집중 완료) 카테고리 범위 */
export function getRoutineScopeCategoryKeys(dateKey: string): string[] {
  const draft = useDayPlanDraftStore.getState();
  const keys = new Set<string>();
  for (const key of draft.routineHistoryPlannedKeysByDate[dateKey] ?? []) {
    keys.add(key);
  }
  if (dateKey === getLocalDateKey()) {
    for (const key of draft.priorityCategoryOrder) {
      keys.add(key);
    }
  }
  return [...keys];
}

/** 루틴 시간대에 완료된 항목(담기 체크·우선순위 세션 블록)을 모읍니다. */
export function collectRoutineWindowCompletions(dateKey: string): RoutineWindowCompletionSnapshot {
  const draft = useDayPlanDraftStore.getState();
  const dayPlan = useDayPlanStore.getState();
  const today = getLocalDateKey();

  const keys = new Set<string>();

  for (const key of draft.routineHistoryPendingByDate[dateKey] ?? []) {
    keys.add(key);
  }

  if (dateKey === today) {
    for (const key of draft.completedFocusCategoryKeys) {
      keys.add(toRoutineHistoryCategoryKey(key));
    }
  }

  if (dayPlan.dateKey === dateKey) {
    const doneBlockIds = new Set([...dayPlan.completedBlockIds, ...dayPlan.skippedBlockIds]);
    for (const block of filterDayPlanFlowBlocks(dayPlan.blocks)) {
      if (block.blockOrigin !== 'prioritySession') continue;
      if (block.planDateKey && block.planDateKey !== dateKey) continue;
      if (!doneBlockIds.has(block.id)) continue;
      for (const key of getFlowCompletionCategoryKeysForBlock(block)) {
        keys.add(key);
      }
    }
  }

  const plannedFromSnapshot = draft.routineHistoryPlannedKeysByDate[dateKey]?.length ?? 0;
  const plannedFromBag = dateKey === today ? draft.priorityCategoryOrder.length : 0;
  const categoryKeys = [...keys];
  const plannedCountForDay = Math.max(plannedFromSnapshot, plannedFromBag, categoryKeys.length, 1);

  return { categoryKeys, plannedCountForDay };
}
