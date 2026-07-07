import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlanDraft = {
  planMode: 'priority' | 'todoList' | 'reading' | 'quickMemo' | 'dayNote';
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
  /** 담기 목록 항목별 중요도 */
  priorityCategoryImportance?: Record<string, 'high' | 'medium' | 'low'>;
  /** 히스토리 동기화 대기 — 루틴 시간대 담기 체크 완료 */
  routineHistoryPendingByDate?: Record<string, string[]>;
  /** 당일 담기 계획 스냅샷 — 완료율 분모 */
  routineHistoryPlannedKeysByDate?: Record<string, string[]>;
  quickMemoDraft: string;
  /** 데일리 담기 — 아침·점심·저녁 구간 헤더 레이아웃 */
  priorityMealSlotLayoutEnabled?: boolean;
  /** 데일리 — 세로 스파인 타임라인 레이아웃 */
  prioritySpineLayoutEnabled?: boolean;
  /** 담기 목록 — 고정 루틴 외 항목의 시간대 지정 */
  priorityMealSlotOverrides?: Partial<Record<string, import('./dayMealSlotScheduleStorage').DayMealSlot>>;
  /** 구간(시간대) 보기 — 사용자가 모달·구간 UI에서 직접 지정한 시간대 (복수 선택 가능) */
  prioritySectionsMealSlots?: Partial<
    Record<string, import('./dayMealSlotScheduleStorage').DayMealSlot | import('./dayMealSlotScheduleStorage').DayMealSlot[]>
  >;
};

export function loadDayPlanDraft(): PersistedDayPlanDraft | null {
  return localStorageClient.getJson<PersistedDayPlanDraft>(StorageKeys.dayPlanDraft);
}

export function saveDayPlanDraft(data: PersistedDayPlanDraft): void {
  localStorageClient.setJson(StorageKeys.dayPlanDraft, data);
}
