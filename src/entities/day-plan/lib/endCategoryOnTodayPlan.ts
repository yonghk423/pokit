import { removeRoutineCatalogSelectionKey } from '@shared/lib/storage';

import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanStore } from '../model/dayPlanStore';

/** 오늘 일정에서 루틴을 완전히 종료 — 고정 루틴 적용 동기화가 다시 넣지 않음 */
export function endCategoryOnTodayPlan(categoryKey: string): void {
  const key = resolvePriorityRoutineCategoryKey(categoryKey.trim()) || categoryKey.trim();
  if (!key) return;

  useDayPlanDraftStore.getState().finishPriorityCategoryForToday(key);
  removeRoutineCatalogSelectionKey(key);

  const plan = useDayPlanStore.getState();
  for (const block of plan.blocks) {
    const blockKey = block.categoryKey?.trim();
    if (!blockKey) continue;
    if (resolvePriorityRoutineCategoryKey(blockKey) === key) {
      useDayPlanStore.getState().removeBlock(block.id);
    }
  }
}
