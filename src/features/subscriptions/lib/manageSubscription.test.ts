import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { manageSubscription } from './manageSubscription';
import { REVENUECAT_ENTITLEMENT_PRO } from '@shared/config/revenueCat';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: { showManageSubscriptions: jest.fn() } }));
const originalPlatform = Platform.OS;
function info(store: string, url: string | null = null): CustomerInfo {
  return { managementURL: url, entitlements: { active: { [REVENUECAT_ENTITLEMENT_PRO]: { store } } } } as unknown as CustomerInfo;
}
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined); });
afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true }); });
it('opens the RevenueCat management URL', async () => {
  expect(await manageSubscription(info('PLAY_STORE', 'https://play.google.com/store/account/subscriptions'))).toBe('opened');
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
});
it('falls back to the native Apple subscription sheet', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  expect(await manageSubscription(info('APP_STORE'))).toBe('opened');
  expect(Purchases.showManageSubscriptions).toHaveBeenCalledTimes(1);
});
it('does not send Test Store subscribers to a real store', async () => {
  expect(await manageSubscription(info('TEST_STORE'))).toBe('test_store');
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(Purchases.showManageSubscriptions).not.toHaveBeenCalled();
});
it('handles missing entitlements and store failures', async () => {
  expect(await manageSubscription(null)).toBe('unavailable');
  jest.mocked(Linking.openURL).mockRejectedValue(new Error('unavailable'));
  expect(await manageSubscription(info('PLAY_STORE'))).toBe('error');
});
