type Config = { customer?: string; token?: string; apiKey?: string };
/** undefined means the normal Apple Sandbox proof check must run. */
export async function checkSimulatorRevenueCatAccess(request: Request, config: Config, fetcher: typeof fetch = fetch) {
  const { customer, token, apiKey } = config;
  if (!customer || !token || token.length < 32 || !apiKey ||
      request.headers.get('x-simulator-token') !== token ||
      request.headers.get('x-revenuecat-customer') !== customer) return undefined;
  try {
    const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(customer)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { status: 503, error: 'subscription_verification_unavailable' };
    const data = await response.json();
    const entitlement = data.subscriber?.entitlements?.daylight_pro;
    if (!entitlement) return { status: 403, error: 'subscription_required' };
    const expires = entitlement.expires_date;
    return expires === null || (typeof expires === 'string' && Date.parse(expires) > Date.now())
      ? null : { status: 403, error: 'subscription_required' };
  } catch { return { status: 503, error: 'subscription_verification_unavailable' }; }
}
