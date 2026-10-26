import { AppAlert as Alert } from '@shared/lib/app-alert';
import { Linking, Platform } from 'react-native';

import { t, useAppLocaleStore } from '@shared/lib/i18n';

import { getAppStoreWriteReviewItmsUrl, getAppStoreWriteReviewUrl } from './storeUrls';

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * App Store / Play Store 리뷰 작성 화면을 연다.
 * iOS는 `action=write-review`로 평점·리뷰 작성 시트가 열린다.
 *
 * `Linking.canOpenURL`은 https App Store URL에서 false를 자주 내서
 * 실제로는 열 수 있는데도 실패 알림만 뜨는 경우가 있다. openURL을 먼저 시도한다.
 */
export async function openAppStoreWriteReview(): Promise<void> {
  const locale = useAppLocaleStore.getState().locale;
  const httpsUrl = getAppStoreWriteReviewUrl(Platform.OS, { locale });

  if (await tryOpenUrl(httpsUrl)) return;

  if (Platform.OS === 'ios') {
    if (await tryOpenUrl(getAppStoreWriteReviewItmsUrl())) return;
  }

  Alert.alert(t('settings.review.openFailedTitle', locale), t('settings.review.openFailedBody', locale));
}
