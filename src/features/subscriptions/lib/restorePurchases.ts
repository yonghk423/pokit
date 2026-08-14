import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { isPurchasesConfigured } from './configurePurchases';

export type RestorePurchasesResult =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; reason: 'skipped' | 'error'; message?: string };

export async function restorePurchases(): Promise<RestorePurchasesResult> {
  if (!isPurchasesConfigured()) {
    return { ok: false, reason: 'skipped' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { ok: true, customerInfo };
  } catch (error) {
    const message = error instanceof Error ? error.message : '구매 복원에 실패했어요.';
    console.warn('[subscriptions] restorePurchases failed', error);
    return { ok: false, reason: 'error', message };
  }
}
