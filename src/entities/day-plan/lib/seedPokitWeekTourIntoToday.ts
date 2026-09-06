import {
  appendCustomFlowCatalogEntry,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  ensureDefaultPriorityCatalog,
  markPokitWeekTourSeeded,
  nextOrderWithPokitWeekTourSeed,
} from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';

/** 오늘 탭이 비어 있으면 「포킷 빠르게 둘러보기」를 담는다. */
export function seedPokitWeekTourIntoTodayIfNeeded(): void {
  const draft = useDayPlanDraftStore.getState();
  if (!draft.isHydrated) return;

  const { priorityCategoryOrder, setPriorityCategoryOrder } = draft;
  if (priorityCategoryOrder.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) {
    markPokitWeekTourSeeded();
    return;
  }

  const next = nextOrderWithPokitWeekTourSeed(priorityCategoryOrder);
  if (!next) return;

  // sanitize가 카탈로그 미등록 키를 걸러내지 않도록 시드 직전 보장
  ensureDefaultPriorityCatalog();
  appendCustomFlowCatalogEntry({
    id: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    groupKey: BUILTIN_TUTORIAL_GROUP_KEY,
  });

  setPriorityCategoryOrder(next);

  const after = useDayPlanDraftStore.getState().priorityCategoryOrder;
  if (!after.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) {
    // 한 번 더 — ensure 직후 허용 키 세트가 갱신되지 않은 경우 대비
    ensureDefaultPriorityCatalog();
    appendCustomFlowCatalogEntry({
      id: BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
      groupKey: BUILTIN_TUTORIAL_GROUP_KEY,
    });
    setPriorityCategoryOrder(next);
  }

  if (
    useDayPlanDraftStore.getState().priorityCategoryOrder.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)
  ) {
    markPokitWeekTourSeeded();
  }
}
