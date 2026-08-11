import { loadDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';
import type { PersistedDayPlan } from '@shared/lib/storage/dayPlanStorage';

import type { DayPlanBlock } from '../model/types';
import { getBlockTimelineIcon } from './blockIcons';
import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { resolveBlockCategoryKey } from './dayPlanRuntimeTime';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

export type WidgetPriorityRoutineItem = {
  categoryKey: string;
  iconName: string;
  isCompleted: boolean;
};

export type WidgetDayPlanPayload = PersistedDayPlan & {
  /** 오늘 탭 담기 목록 — `dayPlanDraftStore.priorityCategoryOrder` */
  priorityCategoryKeys: string[];
  /** 우선순위 모드에서 완료한 담기 항목 — `dayPlanDraftStore.completedFocusCategoryKeys` */
  completedFocusCategoryKeys: string[];
  /** 빠른 메모 입력 중 초안 — `dayPlanDraftStore.quickMemoDraft` */
  quickMemoDraft: string;
  /** 담기·블록 순서 + 앱과 동일 SF Symbol — 위젯은 이 배열을 우선 사용 */
  priorityRoutineItems: WidgetPriorityRoutineItem[];
};

function sortedFlowBlocks(blocks: DayPlanBlock[]): DayPlanBlock[] {
  return blocks
    .filter((block) => (block.blockOrigin ?? 'flow') !== 'quickMemo')
    .slice()
    .sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.order - b.order;
    });
}

function buildRoutineItemsFromPriorityList(
  priorityCategoryKeys: string[],
  completedFocusCategoryKeys: string[],
): WidgetPriorityRoutineItem[] {
  const completed = new Set(completedFocusCategoryKeys);
  return priorityCategoryKeys.map((routineKey) => {
    const categoryKey = resolvePriorityRoutineCategoryKey(routineKey);
    return {
      categoryKey,
      iconName: resolveCategoryCatalogIcon(categoryKey),
      isCompleted: completed.has(routineKey),
    };
  });
}

function buildRoutineItemsFromBlocks(
  snapshot: PersistedDayPlan<DayPlanBlock>,
): WidgetPriorityRoutineItem[] {
  const completedIds = new Set(snapshot.completedBlockIds);
  const skippedIds = new Set(snapshot.skippedBlockIds);
  return sortedFlowBlocks(snapshot.blocks)
    .filter((block) => !skippedIds.has(block.id))
    .map((block) => {
      const categoryKey = resolveBlockCategoryKey(block) ?? block.id;
      return {
        categoryKey,
        iconName: String(getBlockTimelineIcon(block)),
        isCompleted: completedIds.has(block.id),
      };
    });
}

export function buildWidgetDayPlanPayload(
  snapshot: PersistedDayPlan<DayPlanBlock>,
): WidgetDayPlanPayload {
  const draft = loadDayPlanDraft();
  const priorityCategoryKeys = Array.isArray(draft?.priorityCategoryOrder)
    ? draft.priorityCategoryOrder.filter((key) => typeof key === 'string' && key.trim().length > 0)
    : [];
  const completedFocusCategoryKeys = Array.isArray(draft?.completedFocusCategoryKeys)
    ? draft.completedFocusCategoryKeys.filter((key) => typeof key === 'string' && key.trim().length > 0)
    : [];
  const quickMemoDraft = typeof draft?.quickMemoDraft === 'string' ? draft.quickMemoDraft : '';
  const priorityRoutineItems =
    priorityCategoryKeys.length > 0
      ? buildRoutineItemsFromPriorityList(priorityCategoryKeys, completedFocusCategoryKeys)
      : buildRoutineItemsFromBlocks(snapshot);

  return {
    ...snapshot,
    priorityCategoryKeys,
    completedFocusCategoryKeys,
    quickMemoDraft,
    priorityRoutineItems,
  };
}
