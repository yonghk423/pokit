import { isDevice } from 'expo-device';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getSupabasePublishableKey, getSupabaseUrl } from '@shared/config/supabase';

type ProofModule = { getSignedTransactions(): Promise<string[]> };
/** Production sends Apple proofs without Supabase Auth; local simulators use isolated test credentials. */
export async function invokeDownload(name: string, options: { body: Record<string, unknown> }) {
  const url = getSupabaseUrl(), key = getSupabasePublishableKey();
  if (!url || !key) throw new Error('download_unavailable');
  const native = Platform.OS === 'ios' ? requireOptionalNativeModule<ProofModule>('DaylightPurchaseProof') : null;
  const signedTransactions = native ? await native.getSignedTransactions() : [];
  const simulatorToken = __DEV__ && Platform.OS === 'ios' && !isDevice
    ? process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN : undefined;
  const simulatorHeaders: Record<string, string> = simulatorToken
    ? { 'x-simulator-token': simulatorToken, 'x-revenuecat-customer': await Purchases.getAppUserID() } : {};
  const suffix = simulatorToken || process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT === 'Sandbox' ? '-sandbox' : '';
  const response = await fetch(`${url}/functions/v1/${name}${suffix}`, {
    method: 'POST', signal: AbortSignal.timeout(20000), headers: { ...simulatorHeaders, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...options.body, signedTransactions }),
  });
  const data = await response.json();
  return response.ok ? { data, error: null } : { data: null, error: { context: { json: async () => data } } };
}
