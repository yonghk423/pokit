// Identity always comes from verified Supabase auth, never from request JSON.
export function isDeveloperProUser(userId: string, allowlist = '') {
  return !!userId && allowlist.split(',').map(id => id.trim()).filter(Boolean).includes(userId);
}

export async function activateDeveloperPro(userId: string, options: {
  allowlist?: string;
  readKey?: string;
  grantKey?: string;
  fetcher?: typeof fetch;
}) {
  if (!isDeveloperProUser(userId, options.allowlist)) return { eligible: false, active: false };
  const fetcher = options.fetcher ?? fetch;
  const base = `https://api.revenuecat.com/v2/projects/proj12204b57/customers/${encodeURIComponent(userId)}`;
  const entitlementId = 'entld55880b331'; // Existing daylight_pro identifier; never create/rename it.
  const readKey = options.readKey || options.grantKey;
  if (!readKey) throw new Error('developer_pro_unavailable');
  const check = async () => {
    const response = await fetcher(`${base}/active_entitlements?limit=100`, {
      headers: { Authorization: `Bearer ${readKey}` }, signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) return false;
    if (!response.ok) throw new Error('developer_pro_unavailable');
    const body = await response.json();
    if (!Array.isArray(body.items)) throw new Error('developer_pro_unavailable');
    return body.items.some((item: { entitlement_id: string; expires_at: number | null }) =>
      item.entitlement_id === entitlementId && (item.expires_at === null || item.expires_at > Date.now()));
  };
  // Repeated taps never stack grants or extend an already-active entitlement.
  if (await check()) return { eligible: true, active: true };
  if (!options.grantKey) throw new Error('developer_pro_grant_unavailable');
  const response = await fetcher(`${base}/actions/grant_entitlement`, {
    method: 'POST', headers: { Authorization: `Bearer ${options.grantKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entitlement_id: entitlementId, expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !await check()) throw new Error('developer_pro_grant_unavailable');
  return { eligible: true, active: true };
}
