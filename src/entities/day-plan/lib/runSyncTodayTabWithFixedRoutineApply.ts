import { loadRoutineCatalogSelectionKeys } from '@shared/lib/storage';

import {
  computeSyncTodayTabWithFixedRoutineApply,
  type SyncTodayTabWithFixedRoutinePatch,
} from './syncTodayTabWithFixedRoutineApply';
import type { DayPlanBlock } from '../model/types';

type DraftSyncState = {
  isHydrated: boolean;
  priorityCategoryOrder: string[];
  priorityMealSlotOverrides: Record<string, import('@shared/lib/storage').DayMealSlot>;
  prioritySectionsCategoryOrder: string[];
  prioritySectionsMealSlots: Record<string, import('@shared/lib/storage').DayMealSlot[]>;
  priorityStart: string;
  priorityEnd: string;
  priorityMealSlotLayoutEnabled: boolean;
  prioritySpineLayoutEnabled: boolean;
};

type FixedSyncState = {
  isHydrated: boolean;
  todayAppliedCategoryKeys: string[];
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, import('@shared/lib/storage').DayMealSlot[]>;
  scheduledMealSlotLayoutEnabled: boolean;
  fixedRoutineApplyLayoutMode: import('@shared/lib/storage').FixedRoutineApplyLayoutMode;
  sets: import('@shared/lib/storage').FixedFlowSet[];
};

type DayPlanSyncState = {
  isHydrated: boolean;
  blocks: DayPlanBlock[];
};

let getDraftSyncState: (() => DraftSyncState) | null = null;
let setDraftSyncPatch: ((patch: SyncTodayTabWithFixedRoutinePatch) => void) | null = null;
let getFixedSyncState: (() => FixedSyncState) | null = null;
let getDayPlanSyncState: (() => DayPlanSyncState) | null = null;
let setDayPlanSyncPatch: ((blocks: DayPlanBlock[]) => void) | null = null;

export function registerDraftSyncTodayTabAccessors(
  getState: () => DraftSyncState,
  applyPatch: (patch: SyncTodayTabWithFixedRoutinePatch) => void,
): void {
  getDraftSyncState = getState;
  setDraftSyncPatch = applyPatch;
}

export function registerFixedSyncTodayTabAccessor(getState: () => FixedSyncState): void {
  getFixedSyncState = getState;
}

export function registerDayPlanSyncTodayTabAccessors(
  getState: () => DayPlanSyncState,
  applyBlocks: (blocks: DayPlanBlock[]) => void,
): void {
  getDayPlanSyncState = getState;
  setDayPlanSyncPatch = applyBlocks;
}

/** 오늘의 루틴「오늘 적용」→ 오늘 탭 담기·구간·타임라인 동기화 */
export function syncTodayTabWithFixedRoutineApply(): void {
  if (!getDraftSyncState || !setDraftSyncPatch || !getFixedSyncState || !getDayPlanSyncState || !setDayPlanSyncPatch) {
    return;
  }

  const draft = getDraftSyncState();
  if (!draft.isHydrated) return;

  const fixed = getFixedSyncState();
  if (!fixed.isHydrated) return;

  const dayPlan = getDayPlanSyncState();
  if (!dayPlan.isHydrated) return;

  const effectiveLayoutMode: import('@shared/lib/storage').FixedRoutineApplyLayoutMode =
    draft.prioritySpineLayoutEnabled
      ? 'spine'
      : draft.priorityMealSlotLayoutEnabled
        ? 'sections'
        : 'bag';

  const patch = computeSyncTodayTabWithFixedRoutineApply({
    priorityCategoryOrder: draft.priorityCategoryOrder,
    priorityMealSlotOverrides: draft.priorityMealSlotOverrides,
    prioritySectionsCategoryOrder: draft.prioritySectionsCategoryOrder,
    prioritySectionsMealSlots: draft.prioritySectionsMealSlots,
    priorityStart: draft.priorityStart,
    priorityEnd: draft.priorityEnd,
    planBlocks: dayPlan.blocks,
    todayAppliedCategoryKeys: fixed.todayAppliedCategoryKeys,
    activeSetIds: fixed.activeSetIds,
    activeMealSlotsBySetId: fixed.activeMealSlotsBySetId,
    scheduledMealSlotLayoutEnabled: fixed.scheduledMealSlotLayoutEnabled,
    fixedRoutineApplyLayoutMode: effectiveLayoutMode,
    fixedFlowSets: fixed.sets,
    routineCatalogSelectionKeys: loadRoutineCatalogSelectionKeys(),
  });

  if (!patch) return;

  const { planBlocks, ...draftPatch } = patch;
  if (Object.keys(draftPatch).length > 0) {
    setDraftSyncPatch(draftPatch);
  }
  if (planBlocks) {
    setDayPlanSyncPatch(planBlocks);
  }
}
