import { create } from 'zustand';

import {
  getScheduledCategoryKeysForDate,
  loadScheduledRoutinePlan,
  saveScheduledRoutinePlan,
  setScheduledCategoryKeysForDate,
  type ScheduledRoutineAssignment,
} from '@shared/lib/storage';

type ScheduledRoutinePlanState = {
  assignmentsByDate: Record<string, ScheduledRoutineAssignment>;
  isHydrated: boolean;
  hydrate: () => void;
  getKeysForDate: (dateKey: string) => string[];
  setKeysForDate: (dateKey: string, categoryKeys: string[]) => void;
  hasAssignmentOnDate: (dateKey: string) => boolean;
};

function persist(state: ScheduledRoutinePlanState): void {
  if (!state.isHydrated) return;
  saveScheduledRoutinePlan({ assignmentsByDate: state.assignmentsByDate });
}

export const useScheduledRoutinePlanStore = create<ScheduledRoutinePlanState>((set, get) => ({
  assignmentsByDate: {},
  isHydrated: false,

  hydrate: () => {
    const plan = loadScheduledRoutinePlan();
    set({
      assignmentsByDate: plan.assignmentsByDate,
      isHydrated: true,
    });
  },

  getKeysForDate: (dateKey) =>
    getScheduledCategoryKeysForDate({ assignmentsByDate: get().assignmentsByDate }, dateKey),

  setKeysForDate: (dateKey, categoryKeys) => {
    const next = setScheduledCategoryKeysForDate(
      { assignmentsByDate: get().assignmentsByDate },
      dateKey,
      categoryKeys,
    );
    set({ assignmentsByDate: next.assignmentsByDate });
    persist(get());
  },

  hasAssignmentOnDate: (dateKey) => get().getKeysForDate(dateKey).length > 0,
}));
