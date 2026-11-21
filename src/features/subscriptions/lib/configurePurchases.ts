import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { getRevenueCatApiKey, REVENUECAT_ENABLED } from '@shared/config/revenueCat';

let configured = false;
let configuring: Promise<boolean> | null = null;
let sdkInitialized = false;

/** 앱 기동 시 1회. 웹·키 없음은 no-op. */
async function initializePurchases(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) return false;
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
    if (!sdkInitialized) { Purchases.configure({ apiKey }); sdkInitialized = true; }
    // An older build may have persisted its Supabase-derived identified customer.
    // This release intentionally moves to SDK-managed anonymous customers.
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    configured = true;
    return true;
  } catch (error) {
    console.warn('[subscriptions] Purchases.configure failed', error);
    return false;
  }
}

export function configurePurchases(): Promise<boolean> {
  if (configured) return Promise.resolve(true);
  if (!configuring) configuring = initializePurchases().finally(() => { configuring = null; });
  return configuring;
}

export function isPurchasesConfigured(): boolean {
  return REVENUECAT_ENABLED && configured;
}

/** 테스트용 */
export function resetPurchasesConfiguredForTests(): void {
  configured = false;
  configuring = null;
  sdkInitialized = false;
}
