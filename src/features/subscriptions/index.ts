export { REVENUECAT_ENTITLEMENT_PRO, REVENUECAT_PRODUCT_IDS } from '@shared/config/revenueCat';

export { configurePurchases, isPurchasesConfigured } from './lib/configurePurchases';
export { getActiveProEntitlement, isProEntitlementActive } from './lib/entitlement';
export { presentCustomerCenter } from './lib/presentCustomerCenter';
export { presentPaywall, presentPaywallIfNeeded } from './lib/presentPaywall';
export type { PresentPaywallOutcome } from './lib/presentPaywall';
export { restorePurchases } from './lib/restorePurchases';
export type { RestorePurchasesResult } from './lib/restorePurchases';
export {
  selectIsPro,
  selectProExpirationDate,
  useSubscriptionStore,
} from './model/subscriptionStore';
