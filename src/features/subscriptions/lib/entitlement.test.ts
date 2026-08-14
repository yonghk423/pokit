import type { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

import { REVENUECAT_ENTITLEMENT_PRO } from '@shared/config/revenueCat';

import { getActiveProEntitlement, isProEntitlementActive } from './entitlement';

function stubEntitlement(identifier: string): PurchasesEntitlementInfo {
  return {
    identifier,
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    latestPurchaseDate: null,
    originalPurchaseDate: null,
    expirationDate: null,
    store: 'APP_STORE',
    productIdentifier: 'yearly',
    isSandbox: true,
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
    ownershipType: 'PURCHASED',
  } as unknown as PurchasesEntitlementInfo;
}

function stubCustomerInfo(activeKeys: string[]): CustomerInfo {
  const active: Record<string, PurchasesEntitlementInfo> = {};
  for (const key of activeKeys) {
    active[key] = stubEntitlement(key);
  }
  return {
    entitlements: {
      active,
      all: active,
      verification: 'NOT_REQUESTED',
    },
  } as CustomerInfo;
}

describe('isProEntitlementActive', () => {
  it('returns false for null info', () => {
    expect(isProEntitlementActive(null)).toBe(false);
  });

  it('returns true when pokit_pro is active', () => {
    expect(isProEntitlementActive(stubCustomerInfo([REVENUECAT_ENTITLEMENT_PRO]))).toBe(true);
  });

  it('returns false when other entitlements only', () => {
    expect(isProEntitlementActive(stubCustomerInfo(['other']))).toBe(false);
  });
});

describe('getActiveProEntitlement', () => {
  it('returns the active entitlement object', () => {
    const info = stubCustomerInfo([REVENUECAT_ENTITLEMENT_PRO]);
    expect(getActiveProEntitlement(info)?.identifier).toBe(REVENUECAT_ENTITLEMENT_PRO);
  });
});
