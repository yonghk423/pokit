import { create } from 'zustand';

import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan';

import {
  defaultPriorityWindowFromNow,
  isOvernightHhmmRange,
  type PlanMode,
} from '../lib/dayPlanEditorShared';

type DayPlanDraftState = {
  planMode: PlanMode;
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  /** 우선순위 플로우 적용 기간 시작일 (YYYY-MM-DD) */
  priorityPlanDateKey: string;
  /** 우선순위 플로우 적용 기간 종료일 (YYYY-MM-DD) */
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
  quickMemoDraft: string;
  setPlanMode: (mode: PlanMode) => void;
  setIsFocusStarted: (value: boolean) => void;
  toggleFocusCategoryCompleted: (categoryKey: string) => void;
  clearCompletedFocusCategoryKeys: () => void;
  setPriorityPlanDateKey: (value: string) => void;
  setPriorityPlanDateKeyEnd: (value: string) => void;
  /** 달력 적용 시 명시 구간·자동 플래그까지 한 번에 */
  applyPriorityPlanCalendarRange: (lo: string, hi: string) => void;
  /** 시작·종료 시각과 단일/다중일 플래그에 맞춰 종료일 자동 보정 */
  syncOvernightPriorityPlanDates: () => void;
  setPriorityStart: (value: string) => void;
  setPriorityEnd: (value: string) => void;
  setPriorityCategoryOrder: (value: string[]) => void;
  setQuickMemoDraft: (value: string) => void;
};

function createInitialPriorityWindow() {
  const w = defaultPriorityWindowFromNow();
  return { priorityStart: w.startTime, priorityEnd: w.endTime };
}

export const useDayPlanDraftStore = create<DayPlanDraftState>((set, get) => ({
  planMode: 'priority',
  isFocusStarted: false,
  completedFocusCategoryKeys: [],
  priorityPlanDateKey: getLocalDateKey(),
  priorityPlanDateKeyEnd: getLocalDateKey(),
  priorityPlanExplicitMultiDay: false,
  priorityOvernightEndAuto: false,
  ...createInitialPriorityWindow(),
  priorityCategoryOrder: [],
  quickMemoDraft: '',
  setPlanMode: (mode) => set({ planMode: mode }),
  setIsFocusStarted: (value) => set({ isFocusStarted: value }),
  toggleFocusCategoryCompleted: (categoryKey) =>
    set((s) => ({
      completedFocusCategoryKeys: s.completedFocusCategoryKeys.includes(categoryKey)
        ? s.completedFocusCategoryKeys.filter((k) => k !== categoryKey)
        : [...s.completedFocusCategoryKeys, categoryKey],
    })),
  clearCompletedFocusCategoryKeys: () => set({ completedFocusCategoryKeys: [] }),
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
  setPriorityCategoryOrder: (value) => set({ priorityCategoryOrder: value }),
  setQuickMemoDraft: (value) => set({ quickMemoDraft: value }),
}));

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

