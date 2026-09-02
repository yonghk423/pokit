import { useAppLocaleStore } from '../model/localeStore';
import { t as translate, type I18nKey, type TParams } from '../model/translate';

/** React 컴포넌트에서 locale 구독 + 번역 */
export function useTranslation() {
  const locale = useAppLocaleStore((s) => s.locale);
  return {
    locale,
    t: (key: I18nKey, params?: TParams) => translate(key, locale, params),
  };
}
