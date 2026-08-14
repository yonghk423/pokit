import type { CustomerInfo } from 'react-native-purchases';

import { REVENUECAT_ENTITLEMENT_PRO } from '@shared/config/revenueCat';

/** CustomerInfo 에 Pro 엔타이틀먼트가 활성인지 */
export function isProEntitlementActive(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId: string = REVENUECAT_ENTITLEMENT_PRO,
): boolean {
  if (!customerInfo) return false;
  return typeof customerInfo.entitlements.active[entitlementId] !== 'undefined';
}

export function getActiveProEntitlement(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId: string = REVENUECAT_ENTITLEMENT_PRO,
) {
  if (!customerInfo) return null;
  return customerInfo.entitlements.active[entitlementId] ?? null;
}
