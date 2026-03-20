import { create } from 'zustand';

import type { Routine } from '@entities/routine';

import { loadRoutines, saveRoutines } from '@shared/lib/storage';

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const idx = items.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...items, item];
  return items.map((x) => (x.id === item.id ? item : x));
}

export type RoutineStoreState = {
  routines: Routine[];
  currentRoutineId: string | null;
  isHydrated: boolean;

  hydrate: () => void;

  setCurrentRoutineId: (routineId: string | null) => void;
  upsertRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
};

export const useRoutineStore = create<RoutineStoreState>((set, get) => ({
  routines: [],
  currentRoutineId: null,
  isHydrated: false,

  hydrate: () => {
    const { isHydrated } = get();
    if (isHydrated) return;

    const routines = loadRoutines<Routine>();
    set({ routines, isHydrated: true });
  },

  setCurrentRoutineId: (routineId) => {
    set({ currentRoutineId: routineId });
  },

  upsertRoutine: (routine) => {
    const next = upsertById(get().routines, routine);
    set({ routines: next });
    saveRoutines<Routine>(next);
  },

  deleteRoutine: (routineId) => {
    const next = get().routines.filter((r) => r.id !== routineId);
    const currentRoutineId =
      get().currentRoutineId === routineId ? null : get().currentRoutineId;
    set({ routines: next, currentRoutineId });
    saveRoutines<Routine>(next);
  },
}));

