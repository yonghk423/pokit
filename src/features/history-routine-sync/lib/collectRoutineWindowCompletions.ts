import {
  filterDayPlanFlowBlocks,
  filterSpineTimelineBlocks,
  getFlowCompletionCategoryKeysForBlock,
  getLocalDateKey,
  toRoutineHistoryCategoryKey,
  useDayPlanDraftStore,
  useDayPlanStore,
} from '@entities/day-plan';
import type { DayPlanBlock } from '@entities/day-plan/model/types';
import {
  buildRoutineHistoryRecordKey,
  normalizeHistoryRecordKey,
} from '@shared/lib/routineHistoryLayoutKey';

export type RoutineWindowCompletionSnapshot = {
  categoryKeys: string[];
  plannedCountForDay: number;
};

function addCategoryKey(keys: Set<string>, rawKey: string) {
  const normalized = buildRoutineHistoryRecordKey(toRoutineHistoryCategoryKey(rawKey));
  if (normalized) keys.add(normalized);
}

function countUniqueRoutineCategoryKeys(rawKeys: readonly string[]): number {
  const keys = new Set<string>();
  for (const key of rawKeys) addCategoryKey(keys, key);
  return keys.size;
}

function collectSpineCategoryKeysFromBlocks(blocks: DayPlanBlock[]): string[] {
  const keys = new Set<string>();
  for (const block of filterSpineTimelineBlocks(blocks)) {
    for (const key of getFlowCompletionCategoryKeysForBlock(block)) {
      addCategoryKey(keys, key);
    }
  }
  return [...keys];
}

/** 히스토리 동기화 대상(루틴 담기·집중 완료) 카테고리 범위 */
export function getRoutineScopeCategoryKeys(dateKey: string): string[] {
  const draft = useDayPlanDraftStore.getState();
  const dayPlan = useDayPlanStore.getState();
  const keys = new Set<string>();

  for (const key of draft.routineHistoryPlannedKeysByDate[dateKey] ?? []) {
    addCategoryKey(keys, key);
  }

  for (const key of draft.routineHistoryPendingByDate[dateKey] ?? []) {
    keys.add(normalizeHistoryRecordKey(key));
  }

  if (dateKey === getLocalDateKey()) {
    for (const key of draft.priorityCategoryOrder) {
      addCategoryKey(keys, key);
    }
    for (const key of draft.prioritySectionsCategoryOrder) {
      addCategoryKey(keys, key);
    }
    for (const key of collectSpineCategoryKeysFromBlocks(dayPlan.blocks)) {
      addCategoryKey(keys, key);
    }
  }

  return [...keys];
}

/** 루틴 시간대에 완료된 항목(담기 체크·우선순위·타임라인 블록)을 모읍니다. */
export function collectRoutineWindowCompletions(dateKey: string): RoutineWindowCompletionSnapshot {
  const draft = useDayPlanDraftStore.getState();
  const dayPlan = useDayPlanStore.getState();
  const today = getLocalDateKey();

  const keys = new Set<string>();

  for (const key of draft.routineHistoryPendingByDate[dateKey] ?? []) {
    keys.add(normalizeHistoryRecordKey(key));
  }

  if (dateKey === today) {
    for (const completionKey of draft.completedFocusCategoryKeys) {
      addCategoryKey(keys, completionKey);
    }
  }

  if (dayPlan.dateKey === dateKey) {
    const doneBlockIds = new Set([...dayPlan.completedBlockIds, ...dayPlan.skippedBlockIds]);
    for (const block of filterDayPlanFlowBlocks(dayPlan.blocks)) {
      if (block.blockOrigin === 'quickMemo') continue;
      if (block.blockOrigin !== 'prioritySession' && block.blockOrigin !== 'spineTimeline') {
        continue;
      }
      if (block.planDateKey && block.planDateKey !== dateKey) continue;
      if (!doneBlockIds.has(block.id)) continue;
      for (const key of getFlowCompletionCategoryKeysForBlock(block)) {
        addCategoryKey(keys, key);
      }
    }
  }

  const plannedFromSnapshot = countUniqueRoutineCategoryKeys(
    draft.routineHistoryPlannedKeysByDate[dateKey] ?? [],
  );
  const plannedFromBag =
    dateKey === today
      ? countUniqueRoutineCategoryKeys(draft.priorityCategoryOrder)
      : 0;
  const plannedFromSections =
    dateKey === today
      ? countUniqueRoutineCategoryKeys(draft.prioritySectionsCategoryOrder)
      : 0;
  const plannedFromSpine =
    dateKey === today ? collectSpineCategoryKeysFromBlocks(dayPlan.blocks).length : 0;
  const categoryKeys = [...keys];
  const plannedCountForDay = Math.max(
    plannedFromSnapshot,
    plannedFromBag,
    plannedFromSections,
    plannedFromSpine,
    categoryKeys.length,
    1,
  );

  return { categoryKeys, plannedCountForDay };
}
