import { Alert, Linking, Platform } from 'react-native';

import { t, useAppLocaleStore } from '@shared/lib/i18n';

import { getAppStoreWriteReviewUrl } from './storeUrls';

/**
 * App Store / Play Store 리뷰 작성 화면을 연다.
 * iOS는 `action=write-review`로 평점·리뷰 작성 시트가 열린다.
 */
export async function openAppStoreWriteReview(): Promise<void> {
  const locale = useAppLocaleStore.getState().locale;
  const url = getAppStoreWriteReviewUrl(Platform.OS, { locale });

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(t('settings.review.openFailedTitle', locale), t('settings.review.openFailedBody', locale));
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(t('settings.review.openFailedTitle', locale), t('settings.review.openFailedBody', locale));
  }
}
