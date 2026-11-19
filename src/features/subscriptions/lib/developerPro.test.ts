jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getAppUserID: jest.fn(), invalidateCustomerInfoCache: jest.fn(), getCustomerInfo: jest.fn() } }));
const mockInvoke = jest.fn();
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({ getHeroAiAccessToken: async () => 'token', getHeroAiAuthClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'verified-user' } } } }) }, functions: { invoke: mockInvoke } }) }));
import Purchases from 'react-native-purchases';
import { activateDeveloperProForPurchase } from './developerPro';
import { activateDeveloperPro } from '../../../../supabase/functions/_shared/developerPro';
const originalDev = __DEV__;
beforeEach(() => { jest.clearAllMocks(); Object.assign(globalThis, { __DEV__: true }); jest.mocked(Purchases.getAppUserID).mockResolvedValue('verified-user'); });
afterEach(() => { Object.assign(globalThis, { __DEV__: originalDev }); });
it('does not contact the developer service in release builds', async () => {
  Object.assign(globalThis, { __DEV__: false });
  expect(await activateDeveloperProForPurchase()).toBeNull();
  expect(mockInvoke).not.toHaveBeenCalled();
  expect(Purchases.getAppUserID).not.toHaveBeenCalled();
});
it('continues the ordinary purchase for a non-developer', async () => {
  mockInvoke.mockResolvedValue({ data: { eligible: false, active: false } });
  expect(await activateDeveloperProForPurchase()).toBeNull();
});
it('requires matching authenticated and SDK identities', async () => {
  jest.mocked(Purchases.getAppUserID).mockResolvedValue('old-user');
  await expect(activateDeveloperProForPurchase()).rejects.toThrow('identity_mismatch');
  expect(mockInvoke).not.toHaveBeenCalled();
});
it('refreshes and requires a real RevenueCat entitlement', async () => {
  mockInvoke.mockResolvedValue({ data: { eligible: true, active: true } });
  const info = { entitlements: { active: { daylight_pro: { identifier: 'daylight_pro' } } } };
  jest.mocked(Purchases.getCustomerInfo).mockResolvedValue(info as never);
  expect(await activateDeveloperProForPurchase()).toEqual(info);
  expect(Purchases.invalidateCustomerInfoCache).toHaveBeenCalled();
});
it('does not fall through to payment on a developer activation failure', async () => {
  mockInvoke.mockResolvedValue({ error: new Error('server error') });
  await expect(activateDeveloperProForPurchase()).rejects.toThrow('developer_pro_unavailable');
});
const response = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });
it('server rejects unregistered and partial IDs without calling RevenueCat', async () => {
  const fetcher = jest.fn();
  for (const userId of ['', 'dev', 'outsider']) {
    expect(await activateDeveloperPro(userId, { allowlist: 'dev-123', fetcher })).toEqual({ eligible: false, active: false });
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('reuses existing grants without a write operation', async () => {
  const fetcher = jest.fn().mockResolvedValue(response({ items: [{ entitlement_id: 'entld55880b331', expires_at: null }] }));
  expect(await activateDeveloperPro('dev', { allowlist: 'dev', readKey: 'read', fetcher })).toEqual({ eligible: true, active: true });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('grants only daylight_pro to the authenticated allowlisted ID then verifies it', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(response({ items: [] })).mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ items: [{ entitlement_id: 'entld55880b331', expires_at: null }] }));
  expect(await activateDeveloperPro('dev', { allowlist: 'dev', readKey: 'read', grantKey: 'write', fetcher })).toEqual({ eligible: true, active: true });
  const [url, request] = fetcher.mock.calls[1];
  expect(url).toContain('/customers/dev/actions/grant_entitlement');
  expect(JSON.parse(request.body).entitlement_id).toBe('entld55880b331');
});
it('fails closed on RevenueCat errors and missing grant credentials', async () => {
  const fetcher = jest.fn().mockResolvedValue(response({ items: [] }));
  await expect(activateDeveloperPro('dev', { allowlist: 'dev', readKey: 'read', fetcher })).rejects.toThrow('grant_unavailable');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
