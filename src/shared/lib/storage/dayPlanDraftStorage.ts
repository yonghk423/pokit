import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlanDraft = {
  planMode: 'priority' | 'weekly' | 'monthly' | 'quickMemo';
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  planCompletionDismissedKeys: string[];
  priorityBagDismissedDateKey?: string;
  priorityBagDismissedKeys?: string[];
  priorityPlanDateKey: string;
  priorityPlanDateKeyEnd: string;
  priorityPlanExplicitMultiDay: boolean;
  priorityOvernightEndAuto: boolean;
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  /** 히스토리 동기화 대기 — 루틴 시간대 담기 체크 완료 */
  routineHistoryPendingByDate?: Record<string, string[]>;
  /** 당일 담기 계획 스냅샷 — 완료율 분모 */
  routineHistoryPlannedKeysByDate?: Record<string, string[]>;
  quickMemoDraft: string;
};

export function loadDayPlanDraft(): PersistedDayPlanDraft | null {
  return localStorageClient.getJson<PersistedDayPlanDraft>(StorageKeys.dayPlanDraft);
}

export function saveDayPlanDraft(data: PersistedDayPlanDraft): void {
  localStorageClient.setJson(StorageKeys.dayPlanDraft, data);
}
