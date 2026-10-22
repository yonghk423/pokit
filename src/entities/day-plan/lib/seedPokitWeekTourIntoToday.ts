import { isPokitWeekTourFlowId } from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';

/**
 * 빠르게 둘러보기는 더 이상 넣지 않는다.
 * 이미 담겨 있으면 오늘 목록에서 뺀다.
 */
export function seedPokitWeekTourIntoTodayIfNeeded(): void {
  const draft = useDayPlanDraftStore.getState();
  if (!draft.isHydrated) return;
  const next = draft.priorityCategoryOrder.filter((key) => !isPokitWeekTourFlowId(key));
  if (next.length === draft.priorityCategoryOrder.length) return;
  draft.setPriorityCategoryOrder(next);
}
