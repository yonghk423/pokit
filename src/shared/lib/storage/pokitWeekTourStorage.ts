import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  POKIT_WEEK_TOUR_STEP_COUNT,
} from './defaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';

type PersistedPokitWeekTourSeed = {
  seeded: boolean;
};

type PersistedPokitWeekTourFirstTip = {
  seen: boolean;
};

export function loadPokitWeekTourSeeded(): boolean {
  const v = localStorageClient.getJson<PersistedPokitWeekTourSeed>(StorageKeys.pokitWeekTourSeeded);
  return v?.seeded === true;
}

export function markPokitWeekTourSeeded(): void {
  localStorageClient.setJson<PersistedPokitWeekTourSeed>(StorageKeys.pokitWeekTourSeeded, {
    seeded: true,
  });
}

/** 첫 포스트잇을 닫기/알겠어요로 본 적 있는지 */
export function loadPokitWeekTourFirstTipSeen(): boolean {
  const v = localStorageClient.getJson<PersistedPokitWeekTourFirstTip>(
    StorageKeys.pokitWeekTourFirstTipSeen,
  );
  return v?.seen === true;
}

export function markPokitWeekTourFirstTipSeen(): void {
  localStorageClient.setJson<PersistedPokitWeekTourFirstTip>(StorageKeys.pokitWeekTourFirstTipSeen, {
    seen: true,
  });
}

/** 체크리스트 7단계가 모두 완료됐는지 — 완료 후에는 빈 담기에 다시 넣지 않는다. */
export function isPokitWeekTourChecklistComplete(): boolean {
  const raw = loadGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
  if (!raw || typeof raw !== 'object') return false;
  const checklist = (raw as { checklist?: unknown }).checklist;
  if (!Array.isArray(checklist) || checklist.length === 0) return false;
  const doneCount = checklist.filter(
    (item) => item && typeof item === 'object' && (item as { done?: unknown }).done === true,
  ).length;
  return doneCount >= Math.min(checklist.length, POKIT_WEEK_TOUR_STEP_COUNT);
}

/**
 * 오늘 담기가 비어 있으면 튜토리얼 루틴을 넣어야 하는지.
 * 시드 플래그와 무관 — 빈 담기 + 미완료면 다시 넣는다 (롤오버·이전 실패 복구).
 * 실제 반영 후에 `markPokitWeekTourSeeded`를 호출한다.
 */
export function nextOrderWithPokitWeekTourSeed(order: readonly string[]): string[] | null {
  if (order.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) return null;
  if (order.length > 0) return null;
  if (isPokitWeekTourChecklistComplete()) return null;
  return [BUILTIN_POKIT_WEEK_TOUR_FLOW_ID];
}
