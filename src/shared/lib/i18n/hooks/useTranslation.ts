import { useTranslation as useI18nextTranslation } from 'react-i18next';

import { useAppLocaleStore } from '../model/localeStore';
import { t as translate, type I18nKey, type TParams } from '../model/translate';

/**
 * React 컴포넌트용 번역 훅.
 * - 앱 locale은 zustand가 단일 소스
 * - 엔진은 i18next / react-i18next (언어 변경 시 리렌더)
 */
export function useTranslation() {
  const locale = useAppLocaleStore((s) => s.locale);
  // i18n 인스턴스 언어 변경 구독 (I18nextProvider 하위·모듈 싱글톤 모두)
  useI18nextTranslation();

  return {
    locale,
    t: (key: I18nKey, params?: TParams) => translate(key, locale, params),
  };
}
