import Purchases, { type CustomerInfo, type PurchasesError } from 'react-native-purchases';
import { create } from 'zustand';

import { configurePurchases, isPurchasesConfigured } from '../lib/configurePurchases';
import { getActiveProEntitlement, isProEntitlementActive } from '../lib/entitlement';

type SubscriptionState = {
  isConfigured: boolean;
  isHydrated: boolean;
  customerInfo: CustomerInfo | null;
  lastError: string | null;
  /** SDK configure + 최초 CustomerInfo 로드 */
  hydrate: () => Promise<void>;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  applyCustomerInfo: (info: CustomerInfo | null) => void;
};

let customerInfoListenerAttached = false;

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isConfigured: false,
  isHydrated: false,
  customerInfo: null,
  lastError: null,

  applyCustomerInfo: (info) => {
    set({ customerInfo: info, lastError: null });
  },

  refreshCustomerInfo: async () => {
    if (!isPurchasesConfigured()) {
      set({ customerInfo: null });
      return null;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      get().applyCustomerInfo(info);
      return info;
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as PurchasesError).message)
          : '구독 정보를 불러오지 못했어요.';
      set({ lastError: message });
      console.warn('[subscriptions] getCustomerInfo failed', error);
      return null;
    }
  },

  hydrate: async () => {
    try {
      const ok = await configurePurchases();
      set({ isConfigured: ok });

      if (!ok) {
        set({ customerInfo: null });
        return;
      }

      if (!customerInfoListenerAttached) {
        Purchases.addCustomerInfoUpdateListener((info) => {
          get().applyCustomerInfo(info);
        });
        customerInfoListenerAttached = true;
      }

      await get().refreshCustomerInfo();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as PurchasesError).message)
          : '구독 정보를 불러오지 못했어요.';
      set({ isConfigured: false, customerInfo: null, lastError: message });
      console.warn('[subscriptions] hydrate failed', error);
    } finally {
      set({ isHydrated: true });
    }
  },
}));

export function selectIsPro(state: SubscriptionState): boolean {
  return isProEntitlementActive(state.customerInfo);
}

export function selectProExpirationDate(state: SubscriptionState): string | null {
  return getActiveProEntitlement(state.customerInfo)?.expirationDate ?? null;
}
