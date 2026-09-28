import { create } from 'zustand';

import {
  loadRoutineStartTimes,
  saveRoutineStartTimes,
  type RoutineStartTimeEntry,
} from '@shared/lib/storage/routineStartTimesStorage';

type RoutineStartTimesStoreState = {
  byCategoryKey: Record<string, RoutineStartTimeEntry>;
  isHydrated: boolean;
  hydrate: () => void;
  /** 루틴 시작 시각 저장(덮어쓰기). categoryKey는 카탈로그 기준 키 */
  setRoutineStartTime: (
    categoryKey: string,
    entry: {
      startMinutes: number;
      endMinutes: number;
      endsNextCalendarDay?: boolean;
    },
  ) => boolean;
  clearRoutineStartTime: (categoryKey: string) => void;
  getRoutineStartTime: (categoryKey: string) => RoutineStartTimeEntry | null;
};

function persist(byCategoryKey: Record<string, RoutineStartTimeEntry>): void {
  saveRoutineStartTimes({ byCategoryKey });
}

export const useRoutineStartTimesStore = create<RoutineStartTimesStoreState>((set, get) => ({
  byCategoryKey: {},
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const loaded = loadRoutineStartTimes();
    set({
      byCategoryKey: loaded.byCategoryKey,
      isHydrated: true,
    });
  },

  setRoutineStartTime: (categoryKey, entry) => {
    const key = categoryKey.trim();
    if (!key) return false;
    const start = Math.floor(entry.startMinutes);
    const end = Math.floor(entry.endMinutes);
    const endsNext = entry.endsNextCalendarDay === true;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    if (start < 0 || end < 0 || start > 24 * 60 || end > 24 * 60) return false;
    if (endsNext) {
      if (start >= 24 * 60 || end >= 24 * 60 || 24 * 60 - start + end <= 0) return false;
    } else if (end <= start) {
      return false;
    }

    const nextEntry: RoutineStartTimeEntry = {
      startMinutes: start,
      endMinutes: end,
      ...(endsNext ? { endsNextCalendarDay: true as const } : {}),
    };
    const byCategoryKey = {
      ...get().byCategoryKey,
      [key]: nextEntry,
    };
    set({ byCategoryKey });
    persist(byCategoryKey);
    return true;
  },

  clearRoutineStartTime: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return;
    const prev = get().byCategoryKey;
    if (!(key in prev)) return;
    const { [key]: _removed, ...byCategoryKey } = prev;
    set({ byCategoryKey });
    persist(byCategoryKey);
  },

  getRoutineStartTime: (categoryKey) => {
    const key = categoryKey.trim();
    if (!key) return null;
    return get().byCategoryKey[key] ?? null;
  },
}));
