import { create } from 'zustand';

import {
  getDefaultDayPlanNotificationSettings,
  loadDayPlanNotificationSettings,
  saveDayPlanNotificationSettings,
} from '@shared/lib/storage';

import type { DayPlanNotificationSettings, DayPlanStartNotificationTiming } from './types';

type DayPlanNotificationStoreState = {
  startNotifOn: boolean;
  endNotifOn: boolean;
  notifTiming: DayPlanStartNotificationTiming;
  isHydrated: boolean;

  hydrate: () => void;
  setStartNotifOn: (next: boolean) => void;
  setEndNotifOn: (next: boolean) => void;
  setNotifTiming: (next: DayPlanStartNotificationTiming) => void;
  toSettings: () => DayPlanNotificationSettings;
};

export const useDayPlanNotificationStore = create<DayPlanNotificationStoreState>((set, get) => {
  const persist = () => {
    saveDayPlanNotificationSettings(get().toSettings());
  };

  const defaults = getDefaultDayPlanNotificationSettings();

  return {
    startNotifOn: defaults.startEnabled,
    endNotifOn: defaults.endEnabled,
    notifTiming: defaults.startTiming,
    isHydrated: false,

    hydrate: () => {
      if (get().isHydrated) return;
      const loaded = loadDayPlanNotificationSettings();
      set({
        startNotifOn: loaded.startEnabled,
        endNotifOn: loaded.endEnabled,
        notifTiming: loaded.startTiming,
        isHydrated: true,
      });
    },

    setStartNotifOn: (next) => {
      set({ startNotifOn: next });
      persist();
    },

    setEndNotifOn: (next) => {
      set({ endNotifOn: next });
      persist();
    },

    setNotifTiming: (next) => {
      set({ notifTiming: next });
      persist();
    },

    toSettings: () => ({
      startEnabled: get().startNotifOn,
      endEnabled: get().endNotifOn,
      startTiming: get().notifTiming,
    }),
  };
});
