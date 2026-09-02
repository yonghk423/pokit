import {
  resolveAppLocaleFromLanguageTag,
  SUPPORTED_APP_LOCALES,
} from './locale';

describe('resolveAppLocaleFromLanguageTag', () => {
  it('supports ko, en, and ja', () => {
    expect(SUPPORTED_APP_LOCALES).toEqual(['ko', 'en', 'ja']);
    expect(resolveAppLocaleFromLanguageTag('ko-KR')).toBe('ko');
    expect(resolveAppLocaleFromLanguageTag('en-US')).toBe('en');
    expect(resolveAppLocaleFromLanguageTag('ja-JP')).toBe('ja');
    expect(resolveAppLocaleFromLanguageTag('ja')).toBe('ja');
    expect(resolveAppLocaleFromLanguageTag('fr-FR')).toBe('en');
  });
});
