import RevenueCatUI from 'react-native-purchases-ui';

import { isPurchasesConfigured } from './configurePurchases';

/** 구독 관리·복원·해지 안내 (대시보드 Customer Center 설정 필요) */
export async function presentCustomerCenter(): Promise<'opened' | 'skipped' | 'error'> {
  if (!isPurchasesConfigured()) return 'skipped';
  try {
    await RevenueCatUI.presentCustomerCenter();
    return 'opened';
  } catch (error) {
    console.warn('[subscriptions] presentCustomerCenter failed', error);
    return 'error';
  }
}
