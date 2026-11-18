import type { CustomerInfo } from 'react-native-purchases';

import { REVENUECAT_ENTITLEMENT_PRO } from '@shared/config/revenueCat';

/** CustomerInfo 에 Pro 엔타이틀먼트가 활성인지 */
export function isProEntitlementActive(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId: string = REVENUECAT_ENTITLEMENT_PRO,
): boolean {
  return getActiveProEntitlement(customerInfo, entitlementId) !== null;
}

export function getActiveProEntitlement(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId: string = REVENUECAT_ENTITLEMENT_PRO,
) {
  if (!customerInfo) return null;
  const active = customerInfo.entitlements.active;
  return active[entitlementId] ?? (entitlementId === REVENUECAT_ENTITLEMENT_PRO ? active.yourday_pro : undefined) ?? null;
}
