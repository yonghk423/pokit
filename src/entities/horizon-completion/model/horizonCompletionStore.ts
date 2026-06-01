import { create } from 'zustand';

import {
  clearMonthlyCompletion,
  clearWeeklyCompletion,
  listMonthlyCompletions,
  listWeeklyCompletions,
  loadMonthlyCompletion,
  loadWeeklyCompletion,
  saveMonthlyCompletion,
  saveWeeklyCompletion,
  type HorizonCompletionEntry,
} from '@shared/lib/storage/horizonCompletionsStorage';

type State = {
  isHydrated: boolean;
  weeklyByKey: Record<string, HorizonCompletionEntry>;
  monthlyByKey: Record<string, HorizonCompletionEntry>;
};

type Actions = {
  hydrate: () => void;
  reloadFromStorage: () => void;
  markWeeklyComplete: (entry: HorizonCompletionEntry) => void;
  markMonthlyComplete: (entry: HorizonCompletionEntry) => void;
  cancelWeeklyComplete: (weekStartKey: string) => void;
  cancelMonthlyComplete: (monthKey: string) => void;
  selectWeeklyComplete: (weekStartKey: string) => HorizonCompletionEntry | null;
  selectMonthlyComplete: (monthKey: string) => HorizonCompletionEntry | null;
  selectWeeklyList: () => HorizonCompletionEntry[];
  selectMonthlyList: () => HorizonCompletionEntry[];
};

export type HorizonCompletionStore = State & Actions;

function toMap(list: HorizonCompletionEntry[]): Record<string, HorizonCompletionEntry> {
  const out: Record<string, HorizonCompletionEntry> = {};
  for (const row of list) {
    out[row.periodKey] = row;
  }
  return out;
}

export const useHorizonCompletionStore = create<HorizonCompletionStore>((set, get) => ({
  isHydrated: false,
  weeklyByKey: {},
  monthlyByKey: {},

  reloadFromStorage: () => {
    const weekly = listWeeklyCompletions();
    const monthly = listMonthlyCompletions();
    set({
      isHydrated: true,
      weeklyByKey: toMap(weekly),
      monthlyByKey: toMap(monthly),
    });
  },

  hydrate: () => {
    get().reloadFromStorage();
  },

  markWeeklyComplete: (entry) => {
    saveWeeklyCompletion(entry);
    set((s) => ({
      weeklyByKey: { ...s.weeklyByKey, [entry.periodKey]: entry },
    }));
  },

  markMonthlyComplete: (entry) => {
    saveMonthlyCompletion(entry);
    set((s) => ({
      monthlyByKey: { ...s.monthlyByKey, [entry.periodKey]: entry },
    }));
  },

  cancelWeeklyComplete: (weekStartKey) => {
    clearWeeklyCompletion(weekStartKey);
    set((s) => {
      const next = { ...s.weeklyByKey };
      delete next[weekStartKey];
      return { weeklyByKey: next };
    });
  },

  cancelMonthlyComplete: (monthKey) => {
    clearMonthlyCompletion(monthKey);
    set((s) => {
      const next = { ...s.monthlyByKey };
      delete next[monthKey];
      return { monthlyByKey: next };
    });
  },

  selectWeeklyComplete: (weekStartKey) => {
    const hit = get().weeklyByKey[weekStartKey];
    if (hit) return hit;
    return loadWeeklyCompletion(weekStartKey);
  },

  selectMonthlyComplete: (monthKey) => {
    const hit = get().monthlyByKey[monthKey];
    if (hit) return hit;
    return loadMonthlyCompletion(monthKey);
  },

  selectWeeklyList: () => {
    const rows = Object.values(get().weeklyByKey);
    return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },

  selectMonthlyList: () => {
    const rows = Object.values(get().monthlyByKey);
    return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },
}));
