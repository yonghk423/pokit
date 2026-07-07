import {
  filterDayPlanFlowBlocks,
  filterSpineTimelineBlocks,
  getFlowCompletionCategoryKeysForBlock,
  getLocalDateKey,
  resolveFocusCompletionHistoryLayoutMode,
  toRoutineHistoryCategoryKey,
  useDayPlanDraftStore,
  useDayPlanStore,
} from '@entities/day-plan';
import type { DayPlanBlock } from '@entities/day-plan/model/types';
import {
  buildRoutineHistoryRecordKey,
  normalizeHistoryRecordKey,
  type RoutineHistoryLayoutMode,
} from '@shared/lib/routineHistoryLayoutKey';

export type RoutineWindowCompletionSnapshot = {
  categoryKeys: string[];
  plannedCountForDay: number;
};

const LAYOUT_PREFIX = /^(bag|sections|spine):/;

function layoutModeForBlockOrigin(
  origin: DayPlanBlock['blockOrigin'] | undefined,
): RoutineHistoryLayoutMode {
  if (origin === 'spineTimeline') return 'spine';
  return 'bag';
}

function addLayoutVariants(keys: Set<string>, baseCategoryKey: string) {
  const base = baseCategoryKey.trim();
  if (!base) return;
  keys.add(buildRoutineHistoryRecordKey(base, 'bag'));
  keys.add(buildRoutineHistoryRecordKey(base, 'sections'));
  keys.add(buildRoutineHistoryRecordKey(base, 'spine'));
}

function collectSpineCategoryKeysFromBlocks(blocks: DayPlanBlock[]): string[] {
  const keys = new Set<string>();
  for (const block of filterSpineTimelineBlocks(blocks)) {
    for (const key of getFlowCompletionCategoryKeysForBlock(block)) {
      if (key.trim()) keys.add(key.trim());
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
    const trimmed = key.trim();
    if (!trimmed) continue;
    if (LAYOUT_PREFIX.test(trimmed)) {
      keys.add(normalizeHistoryRecordKey(trimmed));
      continue;
    }
    addLayoutVariants(keys, trimmed);
  }

  for (const key of draft.routineHistoryPendingByDate[dateKey] ?? []) {
    keys.add(normalizeHistoryRecordKey(key));
  }

  if (dateKey === getLocalDateKey()) {
    for (const key of draft.priorityCategoryOrder) {
      addLayoutVariants(keys, key);
    }
    for (const key of draft.prioritySectionsCategoryOrder) {
      addLayoutVariants(keys, key);
    }
    for (const key of collectSpineCategoryKeysFromBlocks(dayPlan.blocks)) {
      addLayoutVariants(keys, key);
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
      keys.add(
        buildRoutineHistoryRecordKey(
          toRoutineHistoryCategoryKey(completionKey),
          resolveFocusCompletionHistoryLayoutMode(
            completionKey,
            draft.prioritySectionsCategoryOrder,
          ),
        ),
      );
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
      const layoutMode = layoutModeForBlockOrigin(block.blockOrigin);
      for (const key of getFlowCompletionCategoryKeysForBlock(block)) {
        keys.add(buildRoutineHistoryRecordKey(key, layoutMode));
      }
    }
  }

  const plannedFromSnapshot = draft.routineHistoryPlannedKeysByDate[dateKey]?.length ?? 0;
  const plannedFromBag = dateKey === today ? draft.priorityCategoryOrder.length : 0;
  const plannedFromSections = dateKey === today ? draft.prioritySectionsCategoryOrder.length : 0;
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
