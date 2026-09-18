import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  POKIT_WEEK_TOUR_STEP_COUNT,
} from './defaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { isStandardCatalogKeyHidden } from './hiddenStandardCatalogStorage';

type PersistedPokitWeekTourSeed = {
  seeded: boolean;
  /** 시드한 로컬 날짜 `YYYY-MM-DD` — 다음날 빈 담기에 다시 넣지 않기 위함 */
  dateKey?: string;
};

type PersistedPokitWeekTourFirstTip = {
  seen: boolean;
};

export function loadPokitWeekTourSeeded(): boolean {
  const v = localStorageClient.getJson<PersistedPokitWeekTourSeed>(StorageKeys.pokitWeekTourSeeded);
  return v?.seeded === true;
}

export function markPokitWeekTourSeeded(dateKey?: string): void {
  const prev = localStorageClient.getJson<PersistedPokitWeekTourSeed>(
    StorageKeys.pokitWeekTourSeeded,
  );
  localStorageClient.setJson<PersistedPokitWeekTourSeed>(StorageKeys.pokitWeekTourSeeded, {
    seeded: true,
    dateKey: dateKey || prev?.dateKey,
  });
}

/** 튜토리얼을 오늘 담기에 넣은 날짜. 없으면 레거시(날짜 없음). */
export function loadPokitWeekTourSeededDate(): string | null {
  const v = localStorageClient.getJson<PersistedPokitWeekTourSeed>(StorageKeys.pokitWeekTourSeeded);
  const key = v?.dateKey?.trim();
  return key ? key : null;
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
 * 같은 날 탭 전환이 튜토리얼을 orphan으로 지운 경우만 복구한다.
 * 이미 시드한 뒤 날짜가 바뀌면(다음날 롤오버) 빈 담기에 다시 넣지 않는다.
 */
export function nextOrderWithPokitWeekTourSeed(
  order: readonly string[],
  todayKey?: string,
): string[] | null {
  if (isStandardCatalogKeyHidden(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) return null;
  if (order.includes(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)) return null;
  if (order.length > 0) return null;
  if (isPokitWeekTourChecklistComplete()) return null;
  if (todayKey) {
    const seededOn = loadPokitWeekTourSeededDate();
    if (seededOn && seededOn !== todayKey) return null;
  }
  return [BUILTIN_POKIT_WEEK_TOUR_FLOW_ID];
}
