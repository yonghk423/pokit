import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { REVENUECAT_ENTITLEMENT_PRO } from '@shared/config/revenueCat';

import { isPurchasesConfigured } from './configurePurchases';

export type PresentPaywallOutcome =
  | 'purchased'
  | 'restored'
  | 'cancelled'
  | 'not_presented'
  | 'error'
  | 'skipped';

function mapPaywallResult(result: PAYWALL_RESULT): PresentPaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'purchased';
    case PAYWALL_RESULT.RESTORED:
      return 'restored';
    case PAYWALL_RESULT.CANCELLED:
      return 'cancelled';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'not_presented';
    case PAYWALL_RESULT.ERROR:
    default:
      return 'error';
  }
}

/** 현재 Offering Paywall 을 표시한다. (대시보드에 Paywall 템플릿 필요) */
export async function presentPaywall(): Promise<PresentPaywallOutcome> {
  if (!isPurchasesConfigured()) return 'skipped';
  try {
    const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
    return mapPaywallResult(result);
  } catch (error) {
    console.warn('[subscriptions] presentPaywall failed', error);
    return 'error';
  }
}

/** Pro 가 없을 때만 Paywall 표시 */
export async function presentPaywallIfNeeded(
  entitlementId: string = REVENUECAT_ENTITLEMENT_PRO,
): Promise<PresentPaywallOutcome> {
  if (!isPurchasesConfigured()) return 'skipped';
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: entitlementId,
      displayCloseButton: true,
    });
    return mapPaywallResult(result);
  } catch (error) {
    console.warn('[subscriptions] presentPaywallIfNeeded failed', error);
    return 'error';
  }
}
