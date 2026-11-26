import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { configurePurchases, isPurchasesConfigured, resetPurchasesConfiguredForTests } from './configurePurchases';
const mockConfig = { enabled: true, key: 'appl_test' as string | null };
jest.mock('@shared/config/revenueCat', () => ({ get REVENUECAT_ENABLED() { return mockConfig.enabled; }, getRevenueCatApiKey: () => mockConfig.key }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => { throw new Error('Subscription must not import Supabase auth'); });
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { configure: jest.fn(), setLogLevel: jest.fn(), setLogHandler: jest.fn(), isAnonymous: jest.fn(), logOut: jest.fn() }, LOG_LEVEL: { DEBUG: 'DEBUG' } }));
beforeEach(() => { resetPurchasesConfiguredForTests(); jest.clearAllMocks(); mockConfig.enabled = true; mockConfig.key = 'appl_test'; Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true }); jest.mocked(Purchases.isAnonymous).mockResolvedValue(true); });
it('configures without a custom user ID and reuses the anonymous identity', async () => {
  expect(await configurePurchases()).toBe(true);
  expect(await configurePurchases()).toBe(true);
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
  expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test' });
  expect(Purchases.logOut).not.toHaveBeenCalled();
});
it('migrates an old identified installation to anonymous once', async () => {
  jest.mocked(Purchases.isAnonymous).mockResolvedValue(false);
  expect(await configurePurchases()).toBe(true);
  expect(Purchases.logOut).toHaveBeenCalledTimes(1);
});
it('disables purchase actions when disabled or missing a key', async () => {
  mockConfig.enabled = false; expect(await configurePurchases()).toBe(false);
  mockConfig.enabled = true; mockConfig.key = null; expect(await configurePurchases()).toBe(false);
  expect(isPurchasesConfigured()).toBe(false); expect(Purchases.configure).not.toHaveBeenCalled();
});
it('coalesces concurrent startup calls without changing identity twice', async () => {
  await Promise.all([configurePurchases(), configurePurchases(), configurePurchases()]);
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
  expect(Purchases.isAnonymous).toHaveBeenCalledTimes(1);
});
it('retries failed identity migration without reconfiguring the SDK', async () => {
  jest.mocked(Purchases.isAnonymous).mockRejectedValueOnce(new Error('unavailable'));
  expect(await configurePurchases()).toBe(false);
  expect(isPurchasesConfigured()).toBe(false);
  expect(await configurePurchases()).toBe(true);
  expect(Purchases.configure).toHaveBeenCalledTimes(1);
});
