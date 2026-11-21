type Transaction = {
  bundleId?: string; productId?: string; transactionId?: string; originalTransactionId?: string;
  environment?: string; expiresDate?: number; revocationDate?: number; isUpgraded?: boolean; type?: string;
};
export function isActiveDaylightPurchase(value: Transaction, environment: string, now = Date.now()): boolean {
  if (value.bundleId !== 'com.yonghee.pokit' || value.environment !== environment ||
      !value.transactionId || !value.originalTransactionId || value.revocationDate != null || value.isUpgraded) return false;
  if (value.productId === 'lifetime') return value.type === 'Non-Consumable';
  return ['monthly', 'yearly'].includes(value.productId ?? '') && value.type === 'Auto-Renewable Subscription' &&
    typeof value.expiresDate === 'number' && value.expiresDate > now;
}
export async function authorizeApplePurchase(proofs: unknown, environment: string,
  verify: (proof: string) => Promise<Transaction>, latest: (id: string) => Promise<string>) {
  return authorizeApplePurchaseWithReviewSupport(proofs, environment, false,
    () => ({ verify, latest }), () => false);
}

/** A fallback is allowed only after the primary verifier reports a signed environment mismatch.
 * No decoded request field or client-selected environment can authorize a purchase.
 */
export async function authorizeApplePurchaseWithReviewSupport(
  proofs: unknown,
  primary: string,
  allowReviewSandbox: boolean,
  dependencies: (environment: string) => {
    verify: (proof: string) => Promise<Transaction>;
    latest: (id: string) => Promise<string>;
  },
  isEnvironmentMismatch: (error: unknown) => boolean,
): Promise<boolean> {
  if (!Array.isArray(proofs) || proofs.length === 0 || proofs.length > 8 ||
      proofs.some(p => typeof p !== 'string' || p.length > 24000)) return false;
  for (const proof of proofs) {
    let environment = primary;
    let deps = dependencies(environment);
    let transaction: Transaction;
    try { transaction = await deps.verify(proof); }
    catch (error) {
      if (allowReviewSandbox && primary === 'Production' && isEnvironmentMismatch(error)) {
        environment = 'Sandbox';
        deps = dependencies(environment);
        try { transaction = await deps.verify(proof); }
        catch (fallbackError) {
          if (fallbackError instanceof Error && 'retryable' in fallbackError && fallbackError.retryable === true) throw fallbackError;
          continue;
        }
      } else {
        if (error instanceof Error && 'retryable' in error && error.retryable === true) throw error;
        continue;
      }
    }
    // The first proof was already verified; latest data must use the same environment.
    if (!isActiveDaylightPurchase(transaction, environment)) continue;
    const current = await deps.verify(await deps.latest(transaction.transactionId!));
    if (current.transactionId === transaction.transactionId &&
        current.originalTransactionId === transaction.originalTransactionId &&
        isActiveDaylightPurchase(current, environment)) return true;
  }
  return false;
}
