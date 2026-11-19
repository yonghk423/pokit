import Purchases from 'react-native-purchases';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';
import { isProEntitlementActive } from './entitlement';

/** Release purchases never call the developer endpoint. Server allowlist is authoritative. */
export async function activateDeveloperProForPurchase() {
  if (!__DEV__) return null;
  const token = await getHeroAiAccessToken();
  const client = getHeroAiAuthClient();
  const session = await client.auth.getSession();
  const userId = session.data.session?.user.id;
  if (!userId || await Purchases.getAppUserID() !== userId) throw new Error('subscription_identity_mismatch');
  const { data, error } = await client.functions.invoke('developer-pro', {
    body: {}, headers: { Authorization: `Bearer ${token}` },
  });
  // Never send a developer into a paid purchase when activation/verification failed.
  if (error || typeof data?.eligible !== 'boolean') throw new Error('developer_pro_unavailable');
  if (!data.eligible) return null;
  if (data.active !== true) throw new Error('developer_pro_unavailable');
  await Purchases.invalidateCustomerInfoCache();
  const info = await Purchases.getCustomerInfo();
  if (!isProEntitlementActive(info)) throw new Error('developer_pro_sync_pending');
  return info;
}
