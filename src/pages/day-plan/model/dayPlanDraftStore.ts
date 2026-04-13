import { create } from 'zustand';

import { defaultPriorityWindowFromNow, type PlanMode } from '../lib/dayPlanEditorShared';

type DayPlanDraftState = {
  planMode: PlanMode;
  isFocusStarted: boolean;
  completedFocusCategoryKeys: string[];
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  quickMemoDraft: string;
  setPlanMode: (mode: PlanMode) => void;
  setIsFocusStarted: (value: boolean) => void;
  toggleFocusCategoryCompleted: (categoryKey: string) => void;
  clearCompletedFocusCategoryKeys: () => void;
  setPriorityStart: (value: string) => void;
  setPriorityEnd: (value: string) => void;
  setPriorityCategoryOrder: (value: string[]) => void;
  setQuickMemoDraft: (value: string) => void;
};

function createInitialPriorityWindow() {
  const w = defaultPriorityWindowFromNow();
  return { priorityStart: w.startTime, priorityEnd: w.endTime };
}

export const useDayPlanDraftStore = create<DayPlanDraftState>((set) => ({
  planMode: 'priority',
  isFocusStarted: false,
  completedFocusCategoryKeys: [],
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
  setPriorityStart: (value) => set({ priorityStart: value }),
  setPriorityEnd: (value) => set({ priorityEnd: value }),
  setPriorityCategoryOrder: (value) => set({ priorityCategoryOrder: value }),
  setQuickMemoDraft: (value) => set({ quickMemoDraft: value }),
}));

