import { appendRoutineCatalogSelectionKeys } from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanStore } from '../model/dayPlanStore';
import { useFixedFlowSetsStore } from '../model/fixedFlowSetsStore';
import {
  isEndedTodayCategoryKey,
  resolveEndedTodayCategoryKeys,
} from './endedTodayCategoryKeys';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

/** 오늘 담기·구간·적용 세트·일정 블록에 있는 카테고리 키 */
export function listTodayPlanCategoryKeys(): string[] {
  const draft = useDayPlanDraftStore.getState();
  const plan = useDayPlanStore.getState();
  const applied = useFixedFlowSetsStore.getState().todayAppliedCategoryKeys ?? [];
  const endedToday = resolveEndedTodayCategoryKeys(
    draft.priorityEndedTodayKeys,
    draft.priorityEndedTodayDateKey,
  );
  const keys = new Set<string>();

  for (const raw of [...draft.priorityCategoryOrder, ...draft.prioritySectionsCategoryOrder]) {
    const resolved = resolvePriorityRoutineCategoryKey(raw) || String(raw).trim();
    if (resolved) keys.add(resolved);
  }
  for (const raw of applied) {
    const resolved = resolvePriorityRoutineCategoryKey(raw) || String(raw).trim();
    if (resolved && !isEndedTodayCategoryKey(resolved, endedToday)) keys.add(resolved);
  }
  for (const block of plan.blocks) {
    const k = typeof block.categoryKey === 'string' ? block.categoryKey.trim() : '';
    if (k && !isEndedTodayCategoryKey(k, endedToday)) keys.add(k);
  }
  return [...keys];
}

export function isCategoryOnTodayPlan(categoryKey: string): boolean {
  const key = categoryKey.trim();
  if (!key) return false;
  return listTodayPlanCategoryKeys().includes(key);
}

/** 오늘 담기(루틴)에 넣기 — 이미 있으면 유지 */
export function addCategoryToTodayRoutine(categoryKey: string): boolean {
  const key = categoryKey.trim();
  if (!key) return false;
  const draft = useDayPlanDraftStore.getState();
  if (!draft.priorityCategoryOrder.includes(key)) {
    draft.setPriorityCategoryOrder([...draft.priorityCategoryOrder, key]);
  } else {
    draft.releaseEndedTodayCategoryKeys([key]);
  }
  appendRoutineCatalogSelectionKeys([key]);
  return true;
}
