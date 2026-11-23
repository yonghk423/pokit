import { checkSandboxPurchaseAccess } from './applePurchaseAccess.ts';
import { checkSimulatorRevenueCatAccess } from './simulatorRevenueCatPolicy.ts';

/** Only sandbox entry points import this bridge. No Supabase user or profile is involved. */
export function sandboxAccessForRequest(request: Request) {
  return async (proofs: unknown) => {
    const result = await checkSimulatorRevenueCatAccess(request, {
      customer: Deno.env.get('SIMULATOR_REVENUECAT_CUSTOMER_ID'),
      localDeviceCustomers: Deno.env.get('LOCAL_TEST_REVENUECAT_CUSTOMER_IDS'),
      token: Deno.env.get('SIMULATOR_DOWNLOAD_TOKEN'),
      apiKey: Deno.env.get('SIMULATOR_REVENUECAT_SDK_KEY'),
    });
    return result === undefined ? checkSandboxPurchaseAccess(proofs) : result;
  };
}
