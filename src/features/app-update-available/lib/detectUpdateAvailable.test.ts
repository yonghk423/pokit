import { detectUpdateAvailable } from './detectUpdateAvailable';
import { parseAppVersionManifest } from './appVersionManifest';

describe('parseAppVersionManifest', () => {
  it('parses valid manifest', () => {
    expect(
      parseAppVersionManifest({
        latestVersion: '1.5.0',
        highlights: ['새 기능'],
        storeUrls: { android: 'https://play.google.com/store/apps/details?id=com.yonghee.pokit' },
      }),
    ).toEqual({
      latestVersion: '1.5.0',
      highlights: ['새 기능'],
      storeUrls: { android: 'https://play.google.com/store/apps/details?id=com.yonghee.pokit' },
    });
  });

  it('prefers highlightsByLocale for the given locale', () => {
    expect(
      parseAppVersionManifest(
        {
          latestVersion: '1.7.3',
          highlights: ['한국어 폴백'],
          highlightsByLocale: {
            ko: ['한국어'],
            en: ['English'],
            ja: ['日本語'],
          },
        },
        'en',
      ),
    ).toEqual({
      latestVersion: '1.7.3',
      highlights: ['English'],
      storeUrls: {},
    });
  });

  it('rejects invalid manifest', () => {
    expect(parseAppVersionManifest({})).toBeNull();
    expect(parseAppVersionManifest(null)).toBeNull();
  });
});

describe('detectUpdateAvailable', () => {
  const manifest = parseAppVersionManifest({
    latestVersion: '1.5.0',
    highlights: ['개선'],
    storeUrls: { android: 'https://example.com' },
  })!;

  it('detects update available', () => {
    expect(detectUpdateAvailable('1.4.2', manifest)).toEqual({
      kind: 'update_available',
      currentVersion: '1.4.2',
      latestVersion: '1.5.0',
      highlights: ['개선'],
      storeUrls: { android: 'https://example.com' },
    });
  });

  it('detects up to date', () => {
    expect(detectUpdateAvailable('1.5.0', manifest)).toEqual({
      kind: 'up_to_date',
      currentVersion: '1.5.0',
      latestVersion: '1.5.0',
    });
  });
});
