import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './messages/en.json';
import ja from './messages/ja.json';
import ko from './messages/ko.json';

/**
 * pokit i18next 싱글톤.
 * - 사전은 평탄 키(`tabs.dayPlan`)라 keySeparator 비활성
 * - 보간은 기존 `{name}` 문법 유지 (i18next 기본 `{{name}}` 아님)
 */
void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: 'ko',
  fallbackLng: 'en',
  supportedLngs: ['ko', 'en', 'ja'],
  nonExplicitSupportedLngs: true,
  defaultNS: 'translation',
  ns: ['translation'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: {
    escapeValue: false,
    prefix: '{',
    suffix: '}',
  },
  returnNull: false,
  /** EN의 `countSuffix: ""` 처럼 의도적 빈 문자열을 키/폴백으로 바꾸지 않음 */
  returnEmptyString: true,
  compatibilityJSON: 'v4',
  react: {
    useSuspense: false,
  },
});

export { i18n };
export default i18n;
