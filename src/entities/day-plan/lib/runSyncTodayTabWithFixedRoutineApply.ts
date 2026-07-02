import {
  computeSyncTodayTabWithFixedRoutineApply,
  type SyncTodayTabWithFixedRoutinePatch,
} from './syncTodayTabWithFixedRoutineApply';

type DraftSyncState = {
  isHydrated: boolean;
  priorityCategoryOrder: string[];
  priorityMealSlotOverrides: Record<string, import('@shared/lib/storage').DayMealSlot>;
  priorityMealSlotLayoutEnabled: boolean;
  priorityBagDismissedDateKey: string;
  priorityBagDismissedKeys: string[];
};

type FixedSyncState = {
  isHydrated: boolean;
  todayAppliedCategoryKeys: string[];
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, import('@shared/lib/storage').DayMealSlot[]>;
  scheduledMealSlotLayoutEnabled: boolean;
  sets: import('@shared/lib/storage').FixedFlowSet[];
};

let getDraftSyncState: (() => DraftSyncState) | null = null;
let setDraftSyncPatch: ((patch: SyncTodayTabWithFixedRoutinePatch) => void) | null = null;
let getFixedSyncState: (() => FixedSyncState) | null = null;

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

/** 오늘의 루틴「오늘 적용」→ 오늘 탭 담기·구간 오버라이드 동기화 */
export function syncTodayTabWithFixedRoutineApply(): void {
  if (!getDraftSyncState || !setDraftSyncPatch || !getFixedSyncState) return;

  const draft = getDraftSyncState();
  if (!draft.isHydrated) return;

  const fixed = getFixedSyncState();
  if (!fixed.isHydrated) return;

  const patch = computeSyncTodayTabWithFixedRoutineApply({
    priorityCategoryOrder: draft.priorityCategoryOrder,
    priorityMealSlotOverrides: draft.priorityMealSlotOverrides,
    priorityBagDismissedDateKey: draft.priorityBagDismissedDateKey,
    priorityBagDismissedKeys: draft.priorityBagDismissedKeys,
    todayAppliedCategoryKeys: fixed.todayAppliedCategoryKeys,
    activeSetIds: fixed.activeSetIds,
    activeMealSlotsBySetId: fixed.activeMealSlotsBySetId,
    scheduledMealSlotLayoutEnabled: fixed.scheduledMealSlotLayoutEnabled,
    fixedFlowSets: fixed.sets,
  });

  if (patch) setDraftSyncPatch(patch);
}
