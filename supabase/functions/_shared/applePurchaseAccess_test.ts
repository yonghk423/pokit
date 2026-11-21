import { strict as assert } from 'node:assert';
import { checkApplePurchaseAccess } from './applePurchaseAccess.ts';
Deno.test('missing purchase proof is denied without server credentials', async () => {
  assert.deepEqual(await checkApplePurchaseAccess([]), { status: 403, error: 'subscription_required' });
});
Deno.test('unconfigured verification fails closed', async () => {
  Deno.env.delete('APPLE_IAP_PRIVATE_KEY');
  assert.deepEqual(await checkApplePurchaseAccess(['untrusted']), { status: 503, error: 'subscription_verification_unavailable' });
});
