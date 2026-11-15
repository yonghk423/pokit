import { t, type I18nKey, type TParams } from '../model/translate';
import { getAppLocale } from '../model/localeStore';
import type { AppLocale } from '../model/locale';
import keys from '../model/uiTextKeys.json';
/** Localize legacy UI and catalog copy without changing persisted item IDs. */
export function translateUiText(text: string, params?: TParams, locale: AppLocale = getAppLocale()): string {
  const key = (keys as Record<string, string>)[text];
  return key ? t(key as I18nKey, locale, params) : text;
}
