import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { getRevenueCatApiKey } from '@shared/config/revenueCat';

let configured = false;

/** 앱 기동 시 1회. 웹·키 없음은 no-op. */
export async function configurePurchases(): Promise<boolean> {
  if (configured) return true;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  const apiKey = getRevenueCatApiKey(Platform.OS);
  if (!apiKey) {
    console.warn('[subscriptions] RevenueCat API key missing; skip configure');
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (error) {
    console.warn('[subscriptions] Purchases.configure failed', error);
    return false;
  }
}

export function isPurchasesConfigured(): boolean {
  return configured;
}

/** 테스트용 */
export function resetPurchasesConfiguredForTests(): void {
  configured = false;
}
