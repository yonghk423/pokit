jest.mock('react-native-purchases', () => ({ __esModule: true, default: {} }));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('../lib/configurePurchases', () => ({ configurePurchases: jest.fn(), isPurchasesConfigured: () => false }));
import { Platform } from 'react-native';
import { selectIsPro, selectCanTestProStoreItems, selectProExpirationDate, useSubscriptionStore } from './subscriptionStore';

const originalDev = __DEV__;
const originalOS = Platform.OS;
afterEach(() => {
  Object.assign(globalThis, { __DEV__: originalDev });
  Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  jest.requireMock('expo-device').isDevice = false;
});
it.each([
  [true, 'ios', false, false],
  [true, 'ios', true, false],
  [false, 'ios', false, false],
  [false, 'ios', true, false],
  [true, 'web', false, false],
  [true, 'android', false, false],
])('requires actual entitlements on all devices (%s, %s, device=%s)', (dev, os, device, expected) => {
  Object.assign(globalThis, { __DEV__: dev });
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  jest.requireMock('expo-device').isDevice = device;
  const state = { ...useSubscriptionStore.getState(), customerInfo: null };
  expect(selectIsPro(state)).toBe(expected);
  expect(selectCanTestProStoreItems(state)).toBe(expected);
  expect(selectProExpirationDate(state)).toBeNull();
  expect(state.customerInfo).toBeNull();
});
