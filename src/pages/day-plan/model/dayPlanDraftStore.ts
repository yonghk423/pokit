import { create } from 'zustand';

import { defaultPriorityWindowFromNow, type PlanMode } from '../lib/dayPlanEditorShared';

type DayPlanDraftState = {
  planMode: PlanMode;
  priorityStart: string;
  priorityEnd: string;
  priorityCategoryOrder: string[];
  quickMemoDraft: string;
  setPlanMode: (mode: PlanMode) => void;
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
  ...createInitialPriorityWindow(),
  priorityCategoryOrder: [],
  quickMemoDraft: '',
  setPlanMode: (mode) => set({ planMode: mode }),
  setPriorityStart: (value) => set({ priorityStart: value }),
  setPriorityEnd: (value) => set({ priorityEnd: value }),
  setPriorityCategoryOrder: (value) => set({ priorityCategoryOrder: value }),
  setQuickMemoDraft: (value) => set({ quickMemoDraft: value }),
}));

