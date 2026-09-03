import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanStore } from '../model/dayPlanStore';

function matchesCategoryKey(orderKey: string, categoryKey: string): boolean {
  return resolvePriorityRoutineCategoryKey(orderKey) === categoryKey;
}

/**
 * 고정 루틴에서 제거되어 더 이상「오늘 적용」이 아닌 카테고리를
 * 오늘 담기·시간대·타임라인에서 정리한다.
 * (sync 는 세트 밖 키를 수동 담기로 남겨 두므로 명시적으로 제거해야 함)
 */
export function purgeFixedRoutineCategoryFromTodayPlan(categoryKey: string): void {
  const key = categoryKey.trim();
  if (!key) return;

  const draft = useDayPlanDraftStore.getState();
  const bagHad = draft.priorityCategoryOrder.some((k) => matchesCategoryKey(k, key));
  const sectionsHad = draft.prioritySectionsCategoryOrder.some((k) => matchesCategoryKey(k, key));

  if (bagHad) {
    useDayPlanDraftStore.getState().finishPriorityCategoryForToday(key);
  }

  if (sectionsHad) {
    const nextSections = draft.prioritySectionsCategoryOrder.filter(
      (k) => !matchesCategoryKey(k, key),
    );
    useDayPlanDraftStore.getState().setPrioritySectionsCategoryOrder(nextSections);
  }

  const plan = useDayPlanStore.getState();
  const blocksToRemove = plan.blocks.filter((block) => {
    const blockKey = block.categoryKey?.trim();
    return Boolean(blockKey) && resolvePriorityRoutineCategoryKey(blockKey!) === key;
  });
  if (blocksToRemove.length === 0) return;

  for (const block of blocksToRemove) {
    useDayPlanStore.getState().removeBlock(block.id);
  }
}
