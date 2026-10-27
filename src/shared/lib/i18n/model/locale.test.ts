import {
  resolveAppLocaleFromLanguageTag,
  SUPPORTED_APP_LOCALES,
} from './locale';

describe('resolveAppLocaleFromLanguageTag', () => {
  it('supports ko, en, and ja', () => {
    expect(SUPPORTED_APP_LOCALES).toEqual(['ko', 'en', 'ja', 'zh-TW']);
    expect(resolveAppLocaleFromLanguageTag('ko-KR')).toBe('ko');
    expect(resolveAppLocaleFromLanguageTag('en-US')).toBe('en');
    expect(resolveAppLocaleFromLanguageTag('ja-JP')).toBe('ja');
    expect(resolveAppLocaleFromLanguageTag('ja')).toBe('ja');
    expect(resolveAppLocaleFromLanguageTag('zh-TW')).toBe('zh-TW');
    expect(resolveAppLocaleFromLanguageTag('zh-Hant-TW')).toBe('zh-TW');
    expect(resolveAppLocaleFromLanguageTag('zh-HK')).toBe('zh-TW');
    expect(resolveAppLocaleFromLanguageTag('zh-CN')).toBe('en');
    expect(resolveAppLocaleFromLanguageTag('fr-FR')).toBe('en');
  });
});
