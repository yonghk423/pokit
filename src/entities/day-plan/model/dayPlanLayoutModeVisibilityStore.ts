import { create } from 'zustand';

import {
  coerceDayPlanLayoutMode,
  DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY,
  loadDayPlanLayoutModeVisibility,
  saveDayPlanLayoutModeVisibility,
  type DayPlanLayoutMode,
  type DayPlanLayoutModeVisibility,
} from '@shared/lib/storage/dayPlanLayoutModeVisibility';

type DayPlanLayoutModeVisibilityState = {
  visibility: DayPlanLayoutModeVisibility;
  hydrate: () => void;
  setModeVisible: (mode: DayPlanLayoutMode, visible: boolean) => void;
  isModeVisible: (mode: DayPlanLayoutMode) => boolean;
  listVisibleModes: () => DayPlanLayoutMode[];
  coerceMode: (mode: DayPlanLayoutMode) => DayPlanLayoutMode;
};

function persistVisibility(visibility: DayPlanLayoutModeVisibility) {
  saveDayPlanLayoutModeVisibility(visibility);
}

export const useDayPlanLayoutModeVisibilityStore = create<DayPlanLayoutModeVisibilityState>(
  (set, get) => ({
    visibility: { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY },
    hydrate: () => {
      set({ visibility: loadDayPlanLayoutModeVisibility() });
    },
    setModeVisible: (mode, visible) => {
      // 시간대(sections)·타임라인(spine) 모드는 잠정 유보 — UI 토글 차단
      if (mode === 'spine' || mode === 'sections') return;
      const current = get().visibility;
      const next = { ...current, [mode]: visible };
      const enabledCount = (['bag', 'sections', 'spine'] as const).filter((key) => next[key]).length;
      if (enabledCount === 0) return;
      persistVisibility(next);
      set({ visibility: next });
    },
    isModeVisible: (mode) => get().visibility[mode],
    listVisibleModes: () => {
      const { visibility } = get();
      return (['bag', 'sections', 'spine'] as const).filter((mode) => visibility[mode]);
    },
    coerceMode: (mode) => coerceDayPlanLayoutMode(mode, get().visibility),
  }),
);
