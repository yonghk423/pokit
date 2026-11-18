/** Only call with the user ID returned by Supabase auth.getUser. */
export async function checkProAccess(userId: string, secret: string | undefined, entitlementId?: string): Promise<null | { status: number; error: string }> {
  const unavailable = { status: 503, error: 'subscription_verification_unavailable' };
  const denied = { status: 403, error: 'subscription_required' };
  if (!secret || !userId) return unavailable;
  try {
    const response = await fetch(`https://api.revenuecat.com/v2/projects/proj12204b57/customers/${encodeURIComponent(userId)}/active_entitlements?limit=100`, {
      headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) return denied;
    if (!response.ok) return unavailable;
    const customer = await response.json();
    if (!Array.isArray(customer.items)) return unavailable;
    // Verified RevenueCat IDs: Daylight Pro and the legacy yourday_pro entitlement.
    const ids = ['entld55880b331', 'entl6dedc07f76', entitlementId].filter(Boolean);
    return customer.items.some((item: { entitlement_id?: string; expires_at?: number | null }) =>
      item && ids.includes(item.entitlement_id) && (item.expires_at === null ||
        (typeof item.expires_at === 'number' && item.expires_at > Date.now()))) ? null : denied;
  } catch {
    return unavailable;
  }
}
