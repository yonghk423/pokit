import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { getActiveProEntitlement, manageSubscription, restorePurchases, selectIsPro, useSubscriptionStore } from '@features/subscriptions';

export type ProPlan = 'monthly' | 'yearly';
async function refreshAfterManagement() {
  if (!FEATURE_FLAGS.proSubscriptions) return;
  try {
    await Purchases.invalidateCustomerInfoCache();
  } catch {
    // Still attempt the normal refresh when cache invalidation is unavailable.
  }
  await useSubscriptionStore.getState().refreshCustomerInfo();
}
export function useProSubscription() {
  const [packages, setPackages] = useState<Partial<Record<ProPlan, PurchasesPackage>>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const isPro = useSubscriptionStore(selectIsPro);
  const customerInfo = useSubscriptionStore(s => s.customerInfo);
  const entitlement = getActiveProEntitlement(customerInfo);
  const currentPlan = (['monthly', 'yearly'] as const).find(key => {
    const product = packages[key]?.product;
    if (!product || !entitlement) return false;
    const [id, basePlan] = product.identifier.split(':');
    return id === entitlement.productIdentifier && (!basePlan || basePlan === entitlement.productPlanIdentifier);
  }) ?? null;
  const load = useCallback(async () => {
    if (!FEATURE_FLAGS.proSubscriptions) { setStatus('unavailable'); return; }
    if (lock.current) return;
    lock.current = true;
    try {
      await useSubscriptionStore.getState().hydrate();
      if (mounted.current) setStatus('loading');
      if (!useSubscriptionStore.getState().isConfigured) {
        if (mounted.current) { setPackages({}); setStatus('unavailable'); }
        return;
      }
      const { current } = await Purchases.getOfferings();
      if (mounted.current) {
        setPackages({ monthly: current?.monthly ?? undefined, yearly: current?.annual ?? undefined });
        setStatus(current?.monthly || current?.annual ? 'ready' : 'unavailable');
      }
    } catch {
      if (mounted.current) { setPackages({}); setStatus('error'); }
    } finally { lock.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => {
      if (mounted.current) return load();
    });
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshAfterManagement();
    });
    return () => { mounted.current = false; listener.remove(); };
  }, [load]);

  const transact = async (plan?: ProPlan): Promise<'active' | 'none' | 'cancelled' | 'error' | 'unavailable'> => {
    if (!FEATURE_FLAGS.proSubscriptions) return 'unavailable';
    if (lock.current) return 'cancelled';
    // Existing subscribers change plans in the purchasing store, never through a second new purchase.
    if (plan && selectIsPro(useSubscriptionStore.getState())) return 'unavailable';
    if (!useSubscriptionStore.getState().isConfigured || (plan && !packages[plan])) return 'unavailable';
    lock.current = true;
    setBusy(true);
    try {
      if (plan) {
        const result = await Purchases.purchasePackage(packages[plan]!);
        useSubscriptionStore.getState().applyCustomerInfo(result.customerInfo);
      } else {
        const result = await restorePurchases();
        if (!result.ok) return result.reason === 'skipped' ? 'unavailable' : 'error';
        useSubscriptionStore.getState().applyCustomerInfo(result.customerInfo);
      }
      return selectIsPro(useSubscriptionStore.getState()) ? 'active' : 'none';
    } catch (error) {
      if (error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled) return 'cancelled';
      return 'error';
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const manage = async () => {
    if (!FEATURE_FLAGS.proSubscriptions || lock.current) return 'unavailable' as const;
    lock.current = true;
    setBusy(true);
    try {
      const result = await manageSubscription(useSubscriptionStore.getState().customerInfo);
      if (result === 'opened') await refreshAfterManagement();
      return result;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { packages, status, busy, isPro, entitlement, currentPlan, reload: load, transact, manage };
}
