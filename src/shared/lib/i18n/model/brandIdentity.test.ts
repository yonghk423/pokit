import en from './messages/en.json';
import ko from './messages/ko.json';
import ja from './messages/ja.json';
import zh from './messages/zh-TW.json';
import nativeEn from '../../../../../locales/en.json';
import nativeKo from '../../../../../locales/ko.json';
import nativeJa from '../../../../../locales/ja.json';
import nativeZh from '../../../../../locales/zh-TW.json';
it('keeps the Daylight brand consistent in every translated brand mention', () => {
  for (const [key, text] of Object.entries(en)) {
    if (!text.includes('Daylight')) continue;
    for (const messages of [ko, ja, zh]) expect((messages as Record<string, string>)[key]).not.toMatch(/yourday|YOUR DAY|오늘의 주인공|今日的主角/i);
  }
  for (const messages of [en, ko, ja, zh]) {
    expect(messages['settings.section.pro']).toBe('Daylight Pro');
    expect(messages['alert.pro.title']).toBe('Daylight Pro');
  }
});
it('keeps the installed app name consistent across system locales', () => {
  for (const locale of [nativeEn, nativeKo, nativeJa, nativeZh]) {
    expect(locale.ios.CFBundleDisplayName).toBe('Daylight');
    expect(locale.android.app_name).toBe('Daylight');
  }
});
