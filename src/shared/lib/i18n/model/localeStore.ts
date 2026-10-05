import { create } from 'zustand';

import { i18n } from './i18nInstance';
import {
  detectDeviceLanguageTag,
  resolveAppLocaleFromLanguageTag,
  type AppLocale,
} from './locale';

type AppLocaleState = {
  locale: AppLocale;
  hydrateFromDevice: () => void;
  setLocale: (locale: AppLocale) => void;
};

function applyLocale(locale: AppLocale): void {
  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }
}

export const useAppLocaleStore = create<AppLocaleState>((set) => ({
  locale: 'ko',
  setLocale: (locale) => {
    applyLocale(locale);
    set({ locale });
  },
  hydrateFromDevice: () => {
    const languageTag = detectDeviceLanguageTag();
    const locale = resolveAppLocaleFromLanguageTag(languageTag);
    applyLocale(locale);
    set({ locale });
  },
}));

export function getAppLocale(): AppLocale {
  return useAppLocaleStore.getState().locale;
}

/**
 * 테스트 등에서 `setState({ locale })`만 쓸 때도 i18next 언어를 맞춘다.
 * (프로덕션 hydrate/setLocale은 이미 applyLocale을 호출한다.)
 */
useAppLocaleStore.subscribe((state, prev) => {
  if (state.locale !== prev.locale) {
    applyLocale(state.locale);
  }
});
