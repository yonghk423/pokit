import { checkSimulatorRevenueCatAccess } from '../../../../supabase/functions/_shared/simulatorRevenueCatPolicy';
const token = 'a'.repeat(64);
const config = { customer: 'simulator-customer', token, apiKey: 'appl_test' };
const request = (customer = config.customer, credential = token) => ({ headers: new Map([['x-revenuecat-customer', customer], ['x-simulator-token', credential]]) }) as unknown as Request;
it.each(['wrong', ''])('does not query RevenueCat for an invalid token', async credential => {
  const fetcher = jest.fn();
  expect(await checkSimulatorRevenueCatAccess(request(config.customer, credential), config, fetcher)).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});
it('does not authorize any other customer or an unconfigured server', async () => {
  const fetcher = jest.fn();
  expect(await checkSimulatorRevenueCatAccess(request('other'), config, fetcher)).toBeUndefined();
  expect(await checkSimulatorRevenueCatAccess(request(), {}, fetcher)).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([null, '2999-01-01T00:00:00Z', '2000-01-01T00:00:00Z', 'invalid', undefined])('checks granted entitlement expiration %s', async expires_date => {
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: { daylight_pro: { expires_date } } } }) })) as unknown as typeof fetch;
  const result = await checkSimulatorRevenueCatAccess(request(), config, fetcher);
  expect(result).toEqual(expires_date === null || expires_date?.startsWith('2999') ? null : { status: 403, error: 'subscription_required' });
});
it('rejects missing grants and fails closed when RevenueCat is unavailable', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ subscriber: { entitlements: {} } }) }).mockRejectedValueOnce(new Error('offline'));
  expect(await checkSimulatorRevenueCatAccess(request(), config, fetcher)).toEqual({ status: 403, error: 'subscription_required' });
  expect(await checkSimulatorRevenueCatAccess(request(), config, fetcher)).toEqual({ status: 503, error: 'subscription_verification_unavailable' });
});
