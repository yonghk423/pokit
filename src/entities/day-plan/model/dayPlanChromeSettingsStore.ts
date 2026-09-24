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
  setHideDailyQuote: (hide: boolean) => void;
  setCompleteInAccordion: (enabled: boolean) => void;
  setHideCompleteTape: (hide: boolean) => void;
};

function chromeSettingsEqual(a: DayPlanChromeSettings, b: DayPlanChromeSettings): boolean {
  return (
    a.hideLayoutIcons === b.hideLayoutIcons &&
    a.hideDailyQuote === b.hideDailyQuote &&
    a.completeInAccordion === b.completeInAccordion &&
    a.hideCompleteTape === b.hideCompleteTape
  );
}

export const useDayPlanChromeSettingsStore = create<DayPlanChromeSettingsState>((set, get) => ({
  settings: { ...DEFAULT_DAY_PLAN_CHROME_SETTINGS },
  hydrate: () => {
    const next = loadDayPlanChromeSettings();
    if (chromeSettingsEqual(get().settings, next)) return;
    set({ settings: next });
  },
  setHideLayoutIcons: (hide) => {
    const next = { ...get().settings, hideLayoutIcons: hide };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
  setHideDailyQuote: (hide) => {
    const next = { ...get().settings, hideDailyQuote: hide };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
  setCompleteInAccordion: (enabled) => {
    const next = { ...get().settings, completeInAccordion: enabled };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
  setHideCompleteTape: (hide) => {
    const next = { ...get().settings, hideCompleteTape: hide };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
}));
