import { resolveAnnouncementLocales } from './resolveAnnouncementLocales';

describe('resolveAnnouncementLocales', () => {
  it('returns preferred then en for ko/ja', () => {
    expect(resolveAnnouncementLocales('ko')).toEqual(['ko', 'en']);
    expect(resolveAnnouncementLocales('ja')).toEqual(['ja', 'en']);
  });

  it('returns only en for en', () => {
    expect(resolveAnnouncementLocales('en')).toEqual(['en']);
  });
});
