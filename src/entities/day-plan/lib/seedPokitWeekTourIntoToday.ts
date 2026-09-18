import {
  appendCustomFlowCatalogEntry,
  appendRoutineCatalogSelectionKeys,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  clearPokitWeekTourSeeded,
  ensureDefaultPriorityCatalog,
  isStandardCatalogKeyHidden,
  loadDailyRhythmOnboardingCompleted,
  loadPokitWeekTourSeeded,
  markPokitWeekTourSeeded,
  nextOrderWithPokitWeekTourSeed,
} from '@shared/lib/storage';

import { isEndedTodayCategoryKey, resolveEndedTodayCategoryKeys } from './endedTodayCategoryKeys';
import { getLocalDateKey } from './localDateKey';
import { isPriorityWindowEndedForToday } from './priorityWindowEligibility';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';

function markSeededIfOnboardingDone(dateKey: string): void {
  // 하루 주기 온보딩 전에는 잠그지 않음 — 담기가 비워져도 최초 시드를 다시 시도할 수 있게
  if (!loadDailyRhythmOnboardingCompleted()) return;
  markPokitWeekTourSeeded(dateKey);
}

/** 오늘 탭이 비어 있고, 아직 한 번도 시드하지 않은 최초 사용자면 「포킷 빠르게 둘러보기」를 담는다. */
export function seedPokitWeekTourIntoTodayIfNeeded(): void {
  const draft = useDayPlanDraftStore.getState();
  if (!draft.isHydrated) return;
  if (isStandardCatalogKeyHidden(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) return;

  const today = getLocalDateKey();
  const rangeLo =
    draft.priorityPlanDateKey <= draft.priorityPlanDateKeyEnd
      ? draft.priorityPlanDateKey
      : draft.priorityPlanDateKeyEnd;
  const rangeHi =
    draft.priorityPlanDateKey <= draft.priorityPlanDateKeyEnd
      ? draft.priorityPlanDateKeyEnd
      : draft.priorityPlanDateKey;
  // 기기 오늘이 구간 밖이면 넣지 않음 — 종료 롤오버(또는 Dev 날짜 넘김) 직후 재시드 방지
  if (today < rangeLo || today > rangeHi) {
    const leftover = draft.priorityCategoryOrder.filter(
      (key) => key !== BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    );
    if (leftover.length !== draft.priorityCategoryOrder.length) {
      draft.setPriorityCategoryOrder(leftover);
    }
    return;
  }

  // 집중 구간이 이미 끝났으면 재시드하지 않음 — 종료 리셋 직후 튜토리얼이 다시 붙는 것 방지
  if (
    isPriorityWindowEndedForToday({
      planMode: draft.planMode,
      priorityStart: draft.priorityStart,
      priorityEnd: draft.priorityEnd,
      priorityPlanDateKey: draft.priorityPlanDateKey,
      priorityPlanDateKeyEnd: draft.priorityPlanDateKeyEnd,
    })
  ) {
    return;
  }

  // 온보딩 중인데 이전에 시드 잠금만 남은 경우 — 초기 담기를 위해 잠금 해제
  if (!loadDailyRhythmOnboardingCompleted() && loadPokitWeekTourSeeded()) {
    clearPokitWeekTourSeeded();
  }

  const endedToday = resolveEndedTodayCategoryKeys(
    draft.priorityEndedTodayKeys,
    draft.priorityEndedTodayDateKey,
  );
  if (isEndedTodayCategoryKey(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID, endedToday)) return;

  const { priorityCategoryOrder, setPriorityCategoryOrder } = draft;
  if (priorityCategoryOrder.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) {
    markSeededIfOnboardingDone(today);
    return;
  }

  const next = nextOrderWithPokitWeekTourSeed(priorityCategoryOrder, today);
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
    markSeededIfOnboardingDone(today);
  }
}
