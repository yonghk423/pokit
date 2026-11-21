import { Environment } from 'npm:@apple/app-store-server-library@3.1.0';
import { SignedDataVerifier, VerificationException, VerificationStatus } from './apple-verifier/jws_verification.ts';
import { createAppleTransactionClient } from './appleWebCrypto.ts';
import { Buffer } from 'node:buffer';
import { appleRootG3 } from './appleRoot.ts';
import { authorizeApplePurchaseWithReviewSupport } from './applePurchasePolicy.ts';

type Dependencies = { verifier: SignedDataVerifier; client: ReturnType<typeof createAppleTransactionClient>; environment: Environment };
const dependencies = new Map<Environment, Dependencies>();
function setup(environment: Environment) {
  const cached = dependencies.get(environment);
  if (cached) return cached;
  const privateKey = Deno.env.get('APPLE_IAP_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID'), issuerId = Deno.env.get('APPLE_IAP_ISSUER_ID');
  if (!privateKey || !keyId || !issuerId) throw new Error('purchase_verification_unavailable');
  // Environment is chosen by the entry point or a fully verified Apple environment mismatch.
  const verifier = new SignedDataVerifier([Buffer.from(appleRootG3, 'base64')], true, environment, 'com.yonghee.pokit', 6762331629);
  const client = createAppleTransactionClient(privateKey, keyId, issuerId, environment);
  const configured = { verifier, client, environment };
  dependencies.set(environment, configured);
  return configured;
}
export async function checkApplePurchaseAccess(proofs: unknown): Promise<null | { status: number; error: string }> {
  return checkAccess(proofs, Environment.PRODUCTION, true);
}
export async function checkSandboxPurchaseAccess(proofs: unknown): Promise<null | { status: number; error: string }> {
  return checkAccess(proofs, Environment.SANDBOX);
}
async function checkAccess(proofs: unknown, selectedEnvironment: Environment, allowReviewSandbox = false): Promise<null | { status: number; error: string }> {
  if (!Array.isArray(proofs) || !proofs.length) {
    console.warn('apple_purchase_denied', { environment: selectedEnvironment, reason: 'missing_proof' });
    return { status: 403, error: 'subscription_required' };
  }
  try {
    const active = await authorizeApplePurchaseWithReviewSupport(proofs, selectedEnvironment, allowReviewSandbox, selected => {
      const { verifier, client, environment } = setup(selected as Environment);
      return { verify: async proof => {
        try { return await verifier.verifyAndDecodeTransaction(proof); }
        catch (error) {
          const failure = error as { status?: number; cause?: { name?: string; code?: string; message?: string } };
          console.warn('apple_purchase_signature_rejected', {
            environment, status: failure.status, cause: failure.cause?.name,
            causeMessage: failure.cause?.message?.replace(/[A-Za-z0-9+/_=-]{32,}/g, '[redacted]').slice(0, 160),
            unsupportedRuntime: /not implemented|not supported/i.test(failure.cause?.message ?? ''),
          });
          if (failure.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE ||
              /not implemented|not supported/i.test(failure.cause?.message ?? '')) {
            throw Object.assign(new Error('purchase_verification_unavailable'), { retryable: true });
          }
          throw error;
        }
      }, latest: async id => {
        const response = await client.getTransactionInfo(id);
        if (!response.signedTransactionInfo) throw new Error('transaction_unavailable');
        return response.signedTransactionInfo;
      } };
    }, error => error instanceof VerificationException &&
      error.status === VerificationStatus.INVALID_ENVIRONMENT);
    if (!active) console.warn('apple_purchase_denied', { environment: selectedEnvironment, reason: 'no_active_verified_purchase', proofCount: proofs.length });
    return active ? null : { status: 403, error: 'subscription_required' };
  } catch { return { status: 503, error: 'subscription_verification_unavailable' }; }
}
