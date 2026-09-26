import { Alert, Platform, Share } from 'react-native';

import { t, useAppLocaleStore } from '@shared/lib/i18n';

import { getAppStoreListingUrl } from './storeUrls';

/**
 * 시스템 공유 시트로 App Store / Play Store 링크를 공유한다.
 */
export async function shareAppWithFriends(): Promise<void> {
  const locale = useAppLocaleStore.getState().locale;
  const url = getAppStoreListingUrl(Platform.OS, { locale });
  const title = t('settings.shareApp.shareTitle', locale);
  const message = t('settings.shareApp.shareMessage', locale, { url });

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message, url, title }
        : { message, title },
    );
  } catch {
    Alert.alert(t('settings.shareApp.failedTitle', locale), t('settings.shareApp.failedBody', locale));
  }
}
