import { translateUiText } from './translateUiText';
import { t } from '../model/translate';
import { useAppLocaleStore } from '../model/localeStore';
import { SUPPORTED_APP_LOCALES } from '../model/locale';
import keys from '../model/uiTextKeys.json';
import ko from '../model/messages/ko.json';
import en from '../model/messages/en.json';
import ja from '../model/messages/ja.json';
import zh from '../model/messages/zh-TW.json';
import { proDiaryCatalog } from '../../../../pages/day-plan/model/proDiaryCatalog';
import { CITY_CALENDAR_THEMES } from '../../../../pages/day-plan/model/heroCalendarDesign';
const dictionaries = { ko, en, ja, 'zh-TW': zh };
afterEach(() => useAppLocaleStore.setState({ locale: 'ko' }));
it('has every translation key in all four languages', () => {
  for (const locale of SUPPORTED_APP_LOCALES) expect(Object.keys(dictionaries[locale]).sort()).toEqual(Object.keys(ko).sort());
  for (const key of Object.values(keys)) for (const locale of SUPPORTED_APP_LOCALES) expect(Object.hasOwn(dictionaries[locale], key)).toBe(true);
});
it('translates editor tools and interpolated progress without English fallback', () => {
  const expected = { ko: '밝기', en: 'Brightness', ja: '明るさ', 'zh-TW': '亮度' };
  for (const locale of SUPPORTED_APP_LOCALES) {
    useAppLocaleStore.setState({ locale });
    expect(t('polaroid.editor.brightness')).toBe(expected[locale]);
    expect(translateUiText('다운로드 중 {count}/{total}', { count: 2, total: 50 })).toContain('2/50');
    expect(translateUiText('다운로드 중 {count}/{total}', { count: 2, total: 50 })).not.toContain('{');
  }
});
it('resolves existing item and theme titles after switching language without reimporting', () => {
  const item = proDiaryCatalog.find(item => item.id === 'wall-mail')!;
  useAppLocaleStore.setState({ locale: 'ja' });
  expect(item.title).toBe('お手紙壁飾り');
  for (const theme of CITY_CALENDAR_THEMES) expect(theme.title).not.toMatch(/[가-힣]/);
  useAppLocaleStore.setState({ locale: 'zh-TW' });
  expect(item.title).toBe('信件牆面裝飾');
  for (const theme of CITY_CALENDAR_THEMES) expect(theme.title).not.toMatch(/[가-힣]/);
  expect(translateUiText('Plans & notes')).toBe('Plans & notes');
});

it('calls the illustration calendar a calendar in every locale', () => {
  const labels = { ko: '일러스트 캘린더', en: 'Illustration calendar', ja: 'イラストカレンダー', 'zh-TW': '插畫月曆' };
  for (const locale of SUPPORTED_APP_LOCALES) {
    useAppLocaleStore.setState({ locale });
    expect(translateUiText('일러스트 캘린더')).toBe(labels[locale]);
  }
});
