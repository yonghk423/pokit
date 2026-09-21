import { create } from 'zustand';

import {
  DEFAULT_DAY_PLAN_CHROME_SETTINGS,
  loadDayPlanChromeSettings,
  saveDayPlanChromeSettings,
  type DayPlanChromeSettings,
} from '@shared/lib/storage/dayPlanChromeSettings';

type DayPlanChromeSettingsState = {
  settings: DayPlanChromeSettings;
  hydrate: () => void;
  setHideLayoutIcons: (hide: boolean) => void;
};

export const useDayPlanChromeSettingsStore = create<DayPlanChromeSettingsState>((set, get) => ({
  settings: { ...DEFAULT_DAY_PLAN_CHROME_SETTINGS },
  hydrate: () => {
    const next = loadDayPlanChromeSettings();
    const current = get().settings;
    if (current.hideLayoutIcons === next.hideLayoutIcons) return;
    set({ settings: next });
  },
  setHideLayoutIcons: (hide) => {
    const next = { ...get().settings, hideLayoutIcons: hide };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
}));
