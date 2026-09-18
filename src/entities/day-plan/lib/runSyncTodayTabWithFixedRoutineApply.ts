import {
  loadRoutineCatalogSelectionKeys,
  resolveActiveFixedFlowApplyForLayoutMode,
  type FixedRoutineActiveMealSlotsByLayoutMode,
  type FixedRoutineActiveSetIdsByLayoutMode,
  type FixedRoutineApplyLayoutMode,
} from '@shared/lib/storage';

import { getClockNow } from '@shared/lib/time/appClock';

import { resolveEndedTodayCategoryKeys } from './endedTodayCategoryKeys';
import { resolveTodayFixedRoutineKeys } from './resolveTodayFixedRoutineKeys';
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
  priorityEndedTodayKeys: string[];
  priorityEndedTodayDateKey: string;
};

type FixedSyncState = {
  isHydrated: boolean;
  todayAppliedCategoryKeys: string[];
  activeSetIds: string[];
  activeMealSlotsBySetId: Record<string, import('@shared/lib/storage').DayMealSlot[]>;
  activeSetIdsByLayoutMode: FixedRoutineActiveSetIdsByLayoutMode;
  activeMealSlotsBySetIdByLayoutMode: FixedRoutineActiveMealSlotsByLayoutMode;
  scheduledMealSlotLayoutEnabled: boolean;
  fixedRoutineApplyLayoutMode: FixedRoutineApplyLayoutMode;
  sets: import('@shared/lib/storage').FixedFlowSet[];
};

type DayPlanSyncState = {
  isHydrated: boolean;
  blocks: DayPlanBlock[];
};

let getDraftSyncState: (() => DraftSyncState) | null = null;
let setDraftSyncPatch: ((patch: SyncTodayTabWithFixedRoutinePatch) => void) | null = null;
let getFixedSyncState: (() => FixedSyncState) | null = null;
let refreshFixedSyncStateForDate: ((now: Date) => void) | null = null;
let getDayPlanSyncState: (() => DayPlanSyncState) | null = null;
let setDayPlanSyncPatch: ((blocks: DayPlanBlock[]) => void) | null = null;
let resetDayPlanSyncStateForDate: ((dateKey: string) => void) | null = null;

export function registerDraftSyncTodayTabAccessors(
  getState: () => DraftSyncState,
  applyPatch: (patch: SyncTodayTabWithFixedRoutinePatch) => void,
): void {
  getDraftSyncState = getState;
  setDraftSyncPatch = applyPatch;
}

export function registerFixedSyncTodayTabAccessor(
  getState: () => FixedSyncState,
  refreshForDate: (now: Date) => void,
): void {
  getFixedSyncState = getState;
  refreshFixedSyncStateForDate = refreshForDate;
}

export function registerDayPlanSyncTodayTabAccessors(
  getState: () => DayPlanSyncState,
  applyBlocks: (blocks: DayPlanBlock[]) => void,
  resetForDate: (dateKey: string) => void,
): void {
  getDayPlanSyncState = getState;
  setDayPlanSyncPatch = applyBlocks;
  resetDayPlanSyncStateForDate = resetForDate;
}

/**
 * 새 날짜의 오늘 탭을 만들기 전, 요일별 고정 루틴을 다시 계산하고
 * 이전 날짜의 타임라인·빠른 메모·진행 상태를 비운다.
 */
export function prepareTodayTabForDateRoll(dateKey: string, now: Date): void {
  refreshFixedRoutineApplyForDate(now);
  resetDayPlanSyncStateForDate?.(dateKey);
}

/** 새 날짜·요일 기준으로 「오늘 적용」 고정 루틴 키를 다시 계산한다. */
export function refreshFixedRoutineApplyForDate(now: Date): void {
  refreshFixedSyncStateForDate?.(now);
}

/** 오늘의 루틴「오늘 적용」→ 오늘 탭 담기·구간·타임라인 동기화 */
export function syncTodayTabWithFixedRoutineApply(now: Date = getClockNow()): void {
  if (!getDraftSyncState || !setDraftSyncPatch || !getFixedSyncState || !getDayPlanSyncState || !setDayPlanSyncPatch) {
    return;
  }

  const draft = getDraftSyncState();
  if (!draft.isHydrated) return;

  const fixed = getFixedSyncState();
  if (!fixed.isHydrated) return;

  const dayPlan = getDayPlanSyncState();
  if (!dayPlan.isHydrated) return;

  const effectiveLayoutMode: FixedRoutineApplyLayoutMode = draft.prioritySpineLayoutEnabled
    ? 'spine'
    : draft.priorityMealSlotLayoutEnabled
      ? 'sections'
      : 'bag';

  // 오늘 탭 보기 모드의 적용 상태만 사용 (고정 루틴 화면의 현재 편집 모드와 독립)
  const modeApply = resolveActiveFixedFlowApplyForLayoutMode(fixed, effectiveLayoutMode);
  const todayAppliedCategoryKeys = resolveTodayFixedRoutineKeys({
    activeSetIds: modeApply.activeSetIds,
    activeMealSlotsBySetId: modeApply.activeMealSlotsBySetId,
    sets: fixed.sets,
  }, { now });

  const patch = computeSyncTodayTabWithFixedRoutineApply({
    priorityCategoryOrder: draft.priorityCategoryOrder,
    priorityMealSlotOverrides: draft.priorityMealSlotOverrides,
    prioritySectionsCategoryOrder: draft.prioritySectionsCategoryOrder,
    prioritySectionsMealSlots: draft.prioritySectionsMealSlots,
    priorityStart: draft.priorityStart,
    priorityEnd: draft.priorityEnd,
    planBlocks: dayPlan.blocks,
    todayAppliedCategoryKeys,
    activeSetIds: modeApply.activeSetIds,
    activeMealSlotsBySetId: modeApply.activeMealSlotsBySetId,
    scheduledMealSlotLayoutEnabled: fixed.scheduledMealSlotLayoutEnabled,
    fixedRoutineApplyLayoutMode: effectiveLayoutMode,
    fixedFlowSets: fixed.sets,
    routineCatalogSelectionKeys: loadRoutineCatalogSelectionKeys(),
    endedTodayCategoryKeys: resolveEndedTodayCategoryKeys(
      draft.priorityEndedTodayKeys,
      draft.priorityEndedTodayDateKey,
    ),
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
