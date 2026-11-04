import { getRevenueCatApiKey } from './revenueCat';

const keys = ['EXPO_PUBLIC_REVENUECAT_TEST_API_KEY', 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', 'EXPO_PUBLIC_REVENUECAT_API_KEY'] as const;
const previous = keys.map(key => process.env[key]);
const originalDev = __DEV__;
beforeEach(() => { keys.forEach(key => delete process.env[key]); });
afterEach(() => {
  keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  Object.assign(globalThis, { __DEV__: originalDev });
});
it('uses the explicit Test Store key ahead of platform keys in development', () => {
  Object.assign(globalThis, { __DEV__: true });
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY = 'test_example';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_example';
  expect(getRevenueCatApiKey('ios')).toBe('test_example');
  expect(getRevenueCatApiKey('android')).toBe('test_example');
  expect(getRevenueCatApiKey('web')).toBeNull();
});
it('ignores the development key in release and retains the App Store key', () => {
  Object.assign(globalThis, { __DEV__: false });
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY = 'test_example';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'appl_example';
  expect(getRevenueCatApiKey('ios')).toBe('appl_example');
  expect(getRevenueCatApiKey('android')).toBeNull();
});
it('rejects a Test Store key in release platform configuration', () => {
  Object.assign(globalThis, { __DEV__: false });
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'test_example';
  expect(getRevenueCatApiKey('ios')).toBeNull();
});
