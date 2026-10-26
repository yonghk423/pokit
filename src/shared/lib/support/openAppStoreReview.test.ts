import { AppAlert as Alert } from '@shared/lib/app-alert';
import { Linking, Platform } from 'react-native';

jest.mock('@shared/lib/app-alert', () => ({ AppAlert: { alert: jest.fn() } }));

jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: jest.fn() },
  Platform: { OS: 'ios' },
  Linking: { canOpenURL: jest.fn(), openURL: jest.fn() },
}));

jest.mock('@shared/lib/i18n', () => ({
  t: (key: string) => key,
  useAppLocaleStore: {
    getState: () => ({ locale: 'ko' }),
  },
}));

import { openAppStoreWriteReview } from './openAppStoreReview';
import { getAppStoreWriteReviewItmsUrl, getAppStoreWriteReviewUrl } from './storeUrls';

const mockOpenURL = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

describe('getAppStoreWriteReviewUrl', () => {
  it('returns localized iOS write-review URL', () => {
    expect(getAppStoreWriteReviewUrl('ios', { locale: 'ko' })).toBe(
      'https://apps.apple.com/kr/app/id6762331629?action=write-review',
    );
    expect(getAppStoreWriteReviewUrl('ios', { locale: 'ja' })).toBe(
      'https://apps.apple.com/jp/app/id6762331629?action=write-review',
    );
  });

  it('returns Play Store details URL on Android', () => {
    expect(getAppStoreWriteReviewUrl('android', { locale: 'en' })).toBe(
      'https://play.google.com/store/apps/details?id=com.yonghee.pokit',
    );
  });

  it('returns itms-apps write-review deep link', () => {
    expect(getAppStoreWriteReviewItmsUrl()).toBe(
      'itms-apps://itunes.apple.com/app/id6762331629?action=write-review',
    );
  });
});

describe('openAppStoreWriteReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
  });

  it('opens the https write-review URL first', async () => {
    mockOpenURL.mockResolvedValue(undefined as never);

    await openAppStoreWriteReview();

    expect(mockOpenURL).toHaveBeenCalledWith(
      'https://apps.apple.com/kr/app/id6762331629?action=write-review',
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('falls back to itms-apps when https open fails on iOS', async () => {
    mockOpenURL
      .mockRejectedValueOnce(new Error('https blocked'))
      .mockResolvedValueOnce(undefined as never);

    await openAppStoreWriteReview();

    expect(mockOpenURL).toHaveBeenNthCalledWith(
      1,
      'https://apps.apple.com/kr/app/id6762331629?action=write-review',
    );
    expect(mockOpenURL).toHaveBeenNthCalledWith(
      2,
      'itms-apps://itunes.apple.com/app/id6762331629?action=write-review',
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('alerts when every open attempt fails', async () => {
    mockOpenURL.mockRejectedValue(new Error('no store'));

    await openAppStoreWriteReview();

    expect(Alert.alert).toHaveBeenCalled();
  });
});
