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
  setHideDailyQuote: (hide: boolean) => void;
  setCompleteInAccordion: (enabled: boolean) => void;
  setShowTopAnnouncementsButton: (show: boolean) => void;
  setShowTopContactButton: (show: boolean) => void;
  setHideAppUpdateNudge: (hide: boolean) => void;
};

function chromeSettingsEqual(a: DayPlanChromeSettings, b: DayPlanChromeSettings): boolean {
  return (
    a.hideDailyQuote === b.hideDailyQuote &&
    a.completeInAccordion === b.completeInAccordion &&
    a.showTopAnnouncementsButton === b.showTopAnnouncementsButton &&
    a.showTopContactButton === b.showTopContactButton &&
    a.hideAppUpdateNudge === b.hideAppUpdateNudge
  );
}

export const useDayPlanChromeSettingsStore = create<DayPlanChromeSettingsState>((set, get) => ({
  settings: { ...DEFAULT_DAY_PLAN_CHROME_SETTINGS },
  hydrate: () => {
    const next = loadDayPlanChromeSettings();
    if (chromeSettingsEqual(get().settings, next)) return;
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
  setShowTopAnnouncementsButton: (show) => {
    const next = { ...get().settings, showTopAnnouncementsButton: show };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
  setShowTopContactButton: (show) => {
    const next = { ...get().settings, showTopContactButton: show };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
  setHideAppUpdateNudge: (hide) => {
    const next = { ...get().settings, hideAppUpdateNudge: hide };
    saveDayPlanChromeSettings(next);
    set({ settings: next });
  },
}));
