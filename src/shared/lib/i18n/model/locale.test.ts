import ko from './messages/ko.json';
import en from './messages/en.json';
import ja from './messages/ja.json';
import zhTW from './messages/zh-TW.json';
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

  it('keeps the same keys in every locale catalog', () => {
    const keys = Object.keys(ko).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(ja).sort()).toEqual(keys);
    expect(Object.keys(zhTW).sort()).toEqual(keys);
  });
});
