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

/** 시드 잠금 해제 — 온보딩 전·데이터 초기화 등 */
export function clearPokitWeekTourSeeded(): void {
  localStorageClient.removeItem(StorageKeys.pokitWeekTourSeeded);
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

/** 한 단계라도 체크했으면 이미 사용해 본 것으로 본다. */
export function hasPokitWeekTourProgress(): boolean {
  const raw = loadGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
  if (!raw || typeof raw !== 'object') return false;
  const checklist = (raw as { checklist?: unknown }).checklist;
  if (!Array.isArray(checklist)) return false;
  return checklist.some(
    (item) => item && typeof item === 'object' && (item as { done?: unknown }).done === true,
  );
}

/**
 * 오늘 담기가 비어 있을 때 튜토리얼 루틴을 넣을지.
 * 7단계를 모두 끝내지 않았으면 빈 담기에 다시 넣는다.
 * (탭 전환 동기화가 튜토리얼을 orphan으로 지운 경우 복구)
 */
export function nextOrderWithPokitWeekTourSeed(order: readonly string[]): string[] | null {
  if (order.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) return null;
  if (order.length > 0) return null;
  if (isPokitWeekTourChecklistComplete()) return null;
  return [BUILTIN_POKIT_WEEK_TOUR_FLOW_ID];
}
