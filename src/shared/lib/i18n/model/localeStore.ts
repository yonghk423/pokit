import { create } from 'zustand';

import {
  detectDeviceLanguageTag,
  resolveAppLocaleFromLanguageTag,
  type AppLocale,
} from './locale';

type AppLocaleState = {
  locale: AppLocale;
  hydrateFromDevice: () => void;
};

export const useAppLocaleStore = create<AppLocaleState>((set) => ({
  locale: 'ko',
  hydrateFromDevice: () => {
    const languageTag = detectDeviceLanguageTag();
    set({ locale: resolveAppLocaleFromLanguageTag(languageTag) });
  },
}));

export function getAppLocale(): AppLocale {
  return useAppLocaleStore.getState().locale;
}
