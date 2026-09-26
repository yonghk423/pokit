import { Alert, Platform, Share } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Share: { share: jest.fn() },
}));

jest.mock('@shared/lib/i18n', () => ({
  t: (key: string, _locale?: string, params?: { url?: string }) => {
    if (key === 'settings.shareApp.shareMessage' && params?.url) {
      return `msg ${params.url}`;
    }
    return key;
  },
  useAppLocaleStore: {
    getState: () => ({ locale: 'ko' }),
  },
}));

import { shareAppWithFriends } from './shareApp';
import { appStoreStorefrontPath, getAppStoreListingUrl } from './storeUrls';

const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe('appStoreStorefrontPath', () => {
  it('maps app locales to storefront codes', () => {
    expect(appStoreStorefrontPath('ko')).toBe('kr');
    expect(appStoreStorefrontPath('ja')).toBe('jp');
    expect(appStoreStorefrontPath('en')).toBe('us');
  });
});

describe('getAppStoreListingUrl', () => {
  it('returns locale storefront App Store URL without write-review', () => {
    expect(getAppStoreListingUrl('ios', { locale: 'ko' })).toBe(
      'https://apps.apple.com/kr/app/id6762331629',
    );
    expect(getAppStoreListingUrl('ios', { locale: 'en' })).toBe(
      'https://apps.apple.com/us/app/id6762331629',
    );
    expect(getAppStoreListingUrl('ios', { locale: 'ja' })).toBe(
      'https://apps.apple.com/jp/app/id6762331629',
    );
  });

  it('returns Play Store details URL on Android', () => {
    expect(getAppStoreListingUrl('android', { locale: 'ko' })).toBe(
      'https://play.google.com/store/apps/details?id=com.yonghee.pokit',
    );
  });
});

describe('shareAppWithFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
  });

  it('opens the system share sheet with localized store URL on iOS', async () => {
    mockShare.mockResolvedValue({ action: Share.sharedAction } as never);

    await shareAppWithFriends();

    expect(mockShare).toHaveBeenCalledWith({
      message: 'msg https://apps.apple.com/kr/app/id6762331629',
      url: 'https://apps.apple.com/kr/app/id6762331629',
      title: 'settings.shareApp.shareTitle',
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('alerts when share fails', async () => {
    mockShare.mockRejectedValue(new Error('cancelled-or-failed'));

    await shareAppWithFriends();

    expect(Alert.alert).toHaveBeenCalled();
  });
});
