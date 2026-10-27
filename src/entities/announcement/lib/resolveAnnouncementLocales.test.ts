import { resolveAnnouncementLocales, toAnnouncementLocale } from './resolveAnnouncementLocales';

describe('resolveAnnouncementLocales', () => {
  it('returns preferred then en for ko/ja', () => {
    expect(resolveAnnouncementLocales('ko')).toEqual(['ko', 'en']);
    expect(resolveAnnouncementLocales('ja')).toEqual(['ja', 'en']);
  });

  it('returns only en for en', () => {
    expect(resolveAnnouncementLocales('en')).toEqual(['en']);
  });

  it('shows English announcements for Traditional Chinese until that locale is published', () => {
    expect(toAnnouncementLocale('zh-TW')).toBe('en');
    expect(toAnnouncementLocale('ko')).toBe('ko');
  });
});
