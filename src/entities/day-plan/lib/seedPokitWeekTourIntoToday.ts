import {
  appendCustomFlowCatalogEntry,
  appendRoutineCatalogSelectionKeys,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  clearPokitWeekTourSeeded,
  ensureDefaultPriorityCatalog,
  loadDailyRhythmOnboardingCompleted,
  loadPokitWeekTourSeeded,
  markPokitWeekTourSeeded,
  nextOrderWithPokitWeekTourSeed,
} from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';

function markSeededIfOnboardingDone(): void {
  // 하루 주기 온보딩 전에는 잠그지 않음 — 담기가 비워져도 최초 시드를 다시 시도할 수 있게
  if (!loadDailyRhythmOnboardingCompleted()) return;
  markPokitWeekTourSeeded();
}

/** 오늘 탭이 비어 있고, 아직 한 번도 시드하지 않은 최초 사용자면 「포킷 빠르게 둘러보기」를 담는다. */
export function seedPokitWeekTourIntoTodayIfNeeded(): void {
  const draft = useDayPlanDraftStore.getState();
  if (!draft.isHydrated) return;

  // 온보딩 중인데 이전에 시드 잠금만 남은 경우 — 초기 담기를 위해 잠금 해제
  if (!loadDailyRhythmOnboardingCompleted() && loadPokitWeekTourSeeded()) {
    clearPokitWeekTourSeeded();
  }

  const { priorityCategoryOrder, setPriorityCategoryOrder } = draft;
  if (priorityCategoryOrder.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) {
    markSeededIfOnboardingDone();
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
    appendRoutineCatalogSelectionKeys([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID]);
    markSeededIfOnboardingDone();
  }
}
