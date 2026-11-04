import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { getActiveProEntitlement } from './entitlement';

/** Opens the purchasing store; never treats closing the store sheet as a plan change. */
export async function manageSubscription(info: CustomerInfo | null): Promise<'opened' | 'test_store' | 'unavailable' | 'error'> {
  const entitlement = getActiveProEntitlement(info);
  if (!entitlement) return 'unavailable';
  if (entitlement.store === 'TEST_STORE') return 'test_store';
  try {
    if (info?.managementURL) {
      await Linking.openURL(info.managementURL);
      return 'opened';
    }
    if (entitlement.store === 'APP_STORE' && Platform.OS === 'ios') {
      await Purchases.showManageSubscriptions();
      return 'opened';
    }
    if (entitlement.store === 'PLAY_STORE') {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
      return 'opened';
    }
    return 'unavailable';
  } catch {
    return 'error';
  }
}
