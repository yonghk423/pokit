import { create } from 'zustand';

import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan';
import { loadDayPlanDraft, saveDayPlanDraft } from '@shared/lib/storage';

import {
  defaultPriorityWindowFromNow,
  isOvernightHhmmRange,
  type PlanMode,
} from '../lib/dayPlanEditorShared';

type DayPlanDraftState = {
  planMode: PlanMode;
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  /** 우선순위에서 항목을 뺐다가 다시 담을 때 플랜 완료만으로 취소선이 남지 않게 막는 키 */
  planCompletionDismissedKeys: string[];
  /** 우선 순위 일정 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  /** 우선 순위 일정 적용 기간 종료일 (YYYY-MM-DD) */
  priorityPlanDateKeyEnd: string;
  /**
   * 달력에서 시작·끝을 다르게 잡은 적 있음(여러 날짜 구간).
   * true면 자정 넘김에 따른 종료일 자동 보정을 하지 않음.
   */
  priorityPlanExplicitMultiDay: boolean;
  /** 자정 넘김으로 종료일을 자동으로 +1일 한 상태(시간을 다시 당일 안으로 돌리면 같은 날로 접음) */
  priorityOvernightEndAuto: boolean;
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  /** 고정 루틴 저장소가 바뀌면 증가 — 당일 자동 병합 effect가 다시 돈다 */
  priorityCatalogFixedRoutineEpoch: number;
  quickMemoDraft: string;
  isHydrated: boolean;
  hydrate: () => void;
  setPlanMode: (mode: PlanMode) => void;
  setIsFocusStarted: (value: boolean) => void;
  toggleFocusCategoryCompleted: (categoryKey: string) => void;
  /** 완료 체크(한 번만 추가) — 우선순위 행 완료 UI */
  addFocusCategoryCompleted: (categoryKey: string) => void;
  /** 우선순위 목록 변경 시 목록 밖 키 제거 */
  filterCompletedFocusKeysToPriorityOrder: (order: string[]) => void;
  clearCompletedFocusCategoryKeys: () => void;
  /**
   * 완료(취소선) 처리된 담기 행을 순서에서 제거하고, 체크 완료 기록을 지움.
   * 집중 중이면 일정 완료만으로 취소선이 남는 경우를 위해 `planCompletionDismissForKeys`에 넣은 키는 담기 화면에서도 완료 표시를 끈다.
   */
  removeCompletedPriorityBagRows: (
    removeKeys: string[],
    planCompletionDismissForKeys: string[],
  ) => void;
  addPlanCompletionDismissedKey: (key: string) => void;
  clearPlanCompletionDismissedKeys: () => void;
  setPriorityPlanDateKey: (value: string) => void;
  setPriorityPlanDateKeyEnd: (value: string) => void;
  /** 달력 적용 시 명시 구간·자동 플래그까지 한 번에 */
  applyPriorityPlanCalendarRange: (lo: string, hi: string) => void;
  /** 시작·종료 시각과 단일/다중일 플래그에 맞춰 종료일 자동 보정 */
  syncOvernightPriorityPlanDates: () => void;
  setPriorityStart: (value: string) => void;
  setPriorityEnd: (value: string) => void;
  setPriorityCategoryOrder: (value: string[] | ((prev: string[]) => string[])) => void;
  bumpPriorityCatalogFixedRoutineEpoch: () => void;
  setQuickMemoDraft: (value: string) => void;
};

function createInitialPriorityWindow() {
  const w = defaultPriorityWindowFromNow();
  return { priorityStart: w.startTime, priorityEnd: w.endTime };
}

function createInitialState() {
  return {
    planMode: 'priority' as PlanMode,
    isFocusStarted: false,
    completedFocusCategoryKeys: [] as string[],
    planCompletionDismissedKeys: [] as string[],
    priorityPlanDateKey: getLocalDateKey(),
    priorityPlanDateKeyEnd: getLocalDateKey(),
    priorityPlanExplicitMultiDay: false,
    priorityOvernightEndAuto: false,
    ...createInitialPriorityWindow(),
    priorityCategoryOrder: [] as string[],
    priorityCatalogFixedRoutineEpoch: 0,
    quickMemoDraft: '',
  };
}

export const useDayPlanDraftStore = create<DayPlanDraftState>((set, get) => ({
  ...createInitialState(),
  isHydrated: false,
  hydrate: () => {
    if (get().isHydrated) return;
    const raw = loadDayPlanDraft();
    if (!raw) {
      set({ isHydrated: true });
      return;
    }

    const today = getLocalDateKey();
    const rangeLo =
      raw.priorityPlanDateKey <= raw.priorityPlanDateKeyEnd
        ? raw.priorityPlanDateKey
        : raw.priorityPlanDateKeyEnd;
    const rangeHi =
      raw.priorityPlanDateKey <= raw.priorityPlanDateKeyEnd
        ? raw.priorityPlanDateKeyEnd
        : raw.priorityPlanDateKey;
    const keepRange = rangeHi >= today;

    set({
      planMode: raw.planMode === 'quickMemo' ? 'quickMemo' : 'priority',
      isFocusStarted: Boolean(raw.isFocusStarted),
      completedFocusCategoryKeys: Array.isArray(raw.completedFocusCategoryKeys)
        ? raw.completedFocusCategoryKeys
        : [],
      planCompletionDismissedKeys: Array.isArray(raw.planCompletionDismissedKeys)
        ? raw.planCompletionDismissedKeys
        : [],
      priorityPlanDateKey: keepRange ? raw.priorityPlanDateKey : today,
      priorityPlanDateKeyEnd: keepRange ? raw.priorityPlanDateKeyEnd : today,
      priorityPlanExplicitMultiDay: keepRange ? Boolean(raw.priorityPlanExplicitMultiDay) : false,
      priorityOvernightEndAuto: keepRange ? Boolean(raw.priorityOvernightEndAuto) : false,
      priorityStart: typeof raw.priorityStart === 'string' ? raw.priorityStart : get().priorityStart,
      priorityEnd: typeof raw.priorityEnd === 'string' ? raw.priorityEnd : get().priorityEnd,
      priorityCategoryOrder: Array.isArray(raw.priorityCategoryOrder) ? raw.priorityCategoryOrder : [],
      quickMemoDraft: typeof raw.quickMemoDraft === 'string' ? raw.quickMemoDraft : '',
      isHydrated: true,
    });
  },
  setPlanMode: (mode) => {
    set({ planMode: mode });
    persistDayPlanDraft();
  },
  setIsFocusStarted: (value) => {
    set({ isFocusStarted: value });
    persistDayPlanDraft();
  },
  toggleFocusCategoryCompleted: (categoryKey) =>
    set((s) => {
      const next = {
        completedFocusCategoryKeys: s.completedFocusCategoryKeys.includes(categoryKey)
          ? s.completedFocusCategoryKeys.filter((k) => k !== categoryKey)
          : [...s.completedFocusCategoryKeys, categoryKey],
      };
      return next;
    }),
  addFocusCategoryCompleted: (categoryKey) =>
    set((s) => {
      if (s.completedFocusCategoryKeys.includes(categoryKey)) return s;
      return {
        completedFocusCategoryKeys: [...s.completedFocusCategoryKeys, categoryKey],
      };
    }),
  filterCompletedFocusKeysToPriorityOrder: (order) =>
    set((s) => ({
      completedFocusCategoryKeys: s.completedFocusCategoryKeys.filter((k) => order.includes(k)),
    })),
  clearCompletedFocusCategoryKeys: () => set({ completedFocusCategoryKeys: [] }),
  removeCompletedPriorityBagRows: (removeKeys, planCompletionDismissForKeys) =>
    set((s) => {
      if (removeKeys.length === 0) return s;
      const remove = new Set(removeKeys);
      const nextOrder = s.priorityCategoryOrder.filter((k) => !remove.has(k));
      const nextFocus = s.completedFocusCategoryKeys.filter((k) => !remove.has(k));
      const nextDismissed = [...s.planCompletionDismissedKeys];
      for (const k of planCompletionDismissForKeys) {
        if (!nextDismissed.includes(k)) nextDismissed.push(k);
      }
      return {
        priorityCategoryOrder: nextOrder,
        completedFocusCategoryKeys: nextFocus,
        planCompletionDismissedKeys: nextDismissed,
      };
    }),
  addPlanCompletionDismissedKey: (key) =>
    set((s) => ({
      planCompletionDismissedKeys: s.planCompletionDismissedKeys.includes(key)
        ? s.planCompletionDismissedKeys
        : [...s.planCompletionDismissedKeys, key],
    })),
  clearPlanCompletionDismissedKeys: () => set({ planCompletionDismissedKeys: [] }),
  setPriorityPlanDateKey: (value) => set({ priorityPlanDateKey: value }),
  setPriorityPlanDateKeyEnd: (value) => set({ priorityPlanDateKeyEnd: value }),
  applyPriorityPlanCalendarRange: (lo, hi) =>
    set({
      priorityPlanDateKey: lo,
      priorityPlanDateKeyEnd: hi,
      priorityPlanExplicitMultiDay: lo !== hi,
      priorityOvernightEndAuto: false,
    }),
  syncOvernightPriorityPlanDates: () => {
    const s = get();
    if (s.priorityPlanExplicitMultiDay) return;
    const rangeLo =
      s.priorityPlanDateKey <= s.priorityPlanDateKeyEnd
        ? s.priorityPlanDateKey
        : s.priorityPlanDateKeyEnd;
    const rangeHi =
      s.priorityPlanDateKey <= s.priorityPlanDateKeyEnd
        ? s.priorityPlanDateKeyEnd
        : s.priorityPlanDateKey;
    const overnight = isOvernightHhmmRange(s.priorityStart, s.priorityEnd);
    if (overnight) {
      if (rangeLo === rangeHi) {
        const wantEnd = addDaysToLocalDateKey(rangeLo, 1);
        if (rangeHi !== wantEnd) {
          set({
            priorityPlanDateKey: rangeLo,
            priorityPlanDateKeyEnd: wantEnd,
            priorityOvernightEndAuto: true,
          });
        }
      }
    } else if (
      s.priorityOvernightEndAuto &&
      rangeHi === addDaysToLocalDateKey(rangeLo, 1)
    ) {
      set({
        priorityPlanDateKey: rangeLo,
        priorityPlanDateKeyEnd: rangeLo,
        priorityOvernightEndAuto: false,
      });
    }
  },
  setPriorityStart: (value) => set({ priorityStart: value }),
  setPriorityEnd: (value) => set({ priorityEnd: value }),
  setPriorityCategoryOrder: (value) =>
    set((s) => ({
      priorityCategoryOrder: typeof value === 'function' ? value(s.priorityCategoryOrder) : value,
    })),
  bumpPriorityCatalogFixedRoutineEpoch: () =>
    set((s) => ({ priorityCatalogFixedRoutineEpoch: s.priorityCatalogFixedRoutineEpoch + 1 })),
  setQuickMemoDraft: (value) => set({ quickMemoDraft: value }),
}));

useDayPlanDraftStore.subscribe((state) => {
  if (!state.isHydrated) return;
  saveDayPlanDraft({
    planMode: state.planMode,
    isFocusStarted: state.isFocusStarted,
    completedFocusCategoryKeys: state.completedFocusCategoryKeys,
    planCompletionDismissedKeys: state.planCompletionDismissedKeys,
    priorityPlanDateKey: state.priorityPlanDateKey,
    priorityPlanDateKeyEnd: state.priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay: state.priorityPlanExplicitMultiDay,
    priorityOvernightEndAuto: state.priorityOvernightEndAuto,
    priorityStart: state.priorityStart,
    priorityEnd: state.priorityEnd,
    priorityCategoryOrder: state.priorityCategoryOrder,
    quickMemoDraft: state.quickMemoDraft,
  });
});

function persistDayPlanDraft(): void {
  const s = useDayPlanDraftStore.getState();
  if (!s.isHydrated) return;
  saveDayPlanDraft({
    planMode: s.planMode,
    isFocusStarted: s.isFocusStarted,
    completedFocusCategoryKeys: s.completedFocusCategoryKeys,
    planCompletionDismissedKeys: s.planCompletionDismissedKeys,
    priorityPlanDateKey: s.priorityPlanDateKey,
    priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay: s.priorityPlanExplicitMultiDay,
    priorityOvernightEndAuto: s.priorityOvernightEndAuto,
    priorityStart: s.priorityStart,
    priorityEnd: s.priorityEnd,
    priorityCategoryOrder: s.priorityCategoryOrder,
    quickMemoDraft: s.quickMemoDraft,
  });
}

/** 목표 상세 설정 완료 시 오늘 우선순위 목록에 카테고리가 없으면 끝에 추가 */
export function appendPriorityCategoryKeysIfMissing(keys: string[]): void {
  const trimmed = keys.map((k) => k.trim()).filter(Boolean);
  if (trimmed.length === 0) return;
  const { priorityCategoryOrder, setPriorityCategoryOrder } = useDayPlanDraftStore.getState();
  const next = [...priorityCategoryOrder];
  let changed = false;
  for (const k of trimmed) {
    if (!next.includes(k)) {
      next.push(k);
      changed = true;
    }
  }
  if (changed) setPriorityCategoryOrder(next);
}

