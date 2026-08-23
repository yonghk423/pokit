import type { DayMealSlot } from '@shared/lib/storage/dayMealSlotScheduleStorage';
import type { DayPlanLayoutModeVisibility } from '@shared/lib/storage/dayPlanLayoutModeVisibility';

import type { DayPlanBlock } from '../model/types';

import { filterDayPlanFlowBlocks, filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import { resolveBlockCategoryKey } from './dayPlanRuntimeTime';
import { buildPrioritySectionCompletionKey } from './prioritySectionCompletionKey';
import {
  isSpineBlockScheduleWithinPriorityWindow,
  resolveSpinePriorityWindow,
} from './spinePriorityWindow';

export type PendingRoutineCountsByLayout = {
  bag: number;
  sections: number;
  spine: number;
};

export type CountPendingRoutinesByLayoutInput = {
  visibility: DayPlanLayoutModeVisibility;
  priorityCategoryOrder: readonly string[];
  prioritySectionsCategoryOrder: readonly string[];
  prioritySectionsMealSlots: Readonly<Record<string, readonly DayMealSlot[]>>;
  completedFocusCategoryKeys: readonly string[];
  planCompletionDismissedKeys: readonly string[];
  isFocusStarted: boolean;
  priorityStart: string;
  priorityEnd: string;
  blocks: readonly DayPlanBlock[];
  completedBlockIds: readonly string[];
  skippedBlockIds: readonly string[];
};

/**
 * 오늘 화면에 실제로 배치된 루틴을 레이아웃별로 독립 집계한다.
 *
 * - 목록: 루틴 occurrence key 하나가 한 건
 * - 시간대: 같은 루틴도 배치된 시간대마다 한 건
 * - 타임라인: spineTimeline 블록 하나가 한 건
 * - 설정에서 숨긴 모드는 알림 집계에서 제외
 */
export function countPendingRoutinesByLayout(
  input: CountPendingRoutinesByLayoutInput,
): PendingRoutineCountsByLayout {
  const completedFocus = new Set(input.completedFocusCategoryKeys);
  const dismissed = new Set(input.planCompletionDismissedKeys);
  const doneBlockIds = new Set([...input.completedBlockIds, ...input.skippedBlockIds]);
  const completedPlanCategoryKeys = new Set(
    filterDayPlanFlowBlocks([...input.blocks])
      .filter((block) => doneBlockIds.has(block.id))
      .map(resolveBlockCategoryKey)
      .filter((key): key is string => Boolean(key)),
  );
  const isDraftRoutineCompleted = (completionKey: string, categoryKey: string): boolean => {
    if (completedFocus.has(completionKey)) return true;
    if (!input.isFocusStarted || dismissed.has(completionKey)) return false;
    return completedPlanCategoryKeys.has(categoryKey);
  };

  const bag = input.visibility.bag
    ? input.priorityCategoryOrder.filter((key) => !isDraftRoutineCompleted(key, key)).length
    : 0;

  const sections = input.visibility.sections
    ? input.prioritySectionsCategoryOrder.reduce((count, categoryKey) => {
        const slots = input.prioritySectionsMealSlots[categoryKey] ?? [];
        return (
          count +
          slots.filter(
            (slot) =>
              !isDraftRoutineCompleted(
                buildPrioritySectionCompletionKey(categoryKey, slot),
                categoryKey,
              ),
          ).length
        );
      }, 0)
    : 0;

  const spineWindow = resolveSpinePriorityWindow(input.priorityStart, input.priorityEnd);
  const seenSpineBlockIds = new Set<string>();
  const spine =
    input.visibility.spine && spineWindow
      ? filterSpineTimelineBlocks([...input.blocks]).filter((block) => {
          if (seenSpineBlockIds.has(block.id) || doneBlockIds.has(block.id)) return false;
          if (!isSpineBlockScheduleWithinPriorityWindow(block, spineWindow)) return false;
          seenSpineBlockIds.add(block.id);
          return true;
        }).length
      : 0;

  return { bag, sections, spine };
}

export function totalPendingRoutinesByLayout(counts: PendingRoutineCountsByLayout): number {
  return counts.bag + counts.sections + counts.spine;
}
