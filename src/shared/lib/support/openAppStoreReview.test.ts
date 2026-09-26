import { Alert, Linking, Platform } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: { canOpenURL: jest.fn(), openURL: jest.fn() },
}));

jest.mock('@shared/lib/i18n', () => ({
  t: (key: string) => key,
  useAppLocaleStore: {
    getState: () => ({ locale: 'ko' }),
  },
}));

import { openAppStoreWriteReview } from './openAppStoreReview';
import { getAppStoreWriteReviewUrl } from './storeUrls';

const mockCanOpenURL = Linking.canOpenURL as jest.MockedFunction<typeof Linking.canOpenURL>;
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
});

describe('openAppStoreWriteReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
  });

  it('opens the write-review URL when available', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined as never);

    await openAppStoreWriteReview();

    expect(mockCanOpenURL).toHaveBeenCalledWith(
      'https://apps.apple.com/kr/app/id6762331629?action=write-review',
    );
    expect(mockOpenURL).toHaveBeenCalledWith(
      'https://apps.apple.com/kr/app/id6762331629?action=write-review',
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('alerts when the URL cannot be opened', async () => {
    mockCanOpenURL.mockResolvedValue(false);

    await openAppStoreWriteReview();

    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
