import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlanDraft = {
  planMode: 'priority' | 'quickMemo';
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  planCompletionDismissedKeys: string[];
  priorityPlanDateKey: string;
  priorityPlanDateKeyEnd: string;
  priorityPlanExplicitMultiDay: boolean;
  priorityOvernightEndAuto: boolean;
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  quickMemoDraft: string;
};

export function loadDayPlanDraft(): PersistedDayPlanDraft | null {
  return localStorageClient.getJson<PersistedDayPlanDraft>(StorageKeys.dayPlanDraft);
}

export function saveDayPlanDraft(data: PersistedDayPlanDraft): void {
  localStorageClient.setJson(StorageKeys.dayPlanDraft, data);
}
