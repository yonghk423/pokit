jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getAppUserID: jest.fn(async () => 'simulator-customer') } }));
import { Platform } from 'react-native';
import { invokeDownload } from './downloadClient';
const mockProofs = jest.fn();
jest.mock('expo-modules-core', () => ({ ...jest.requireActual('expo-modules-core'), requireOptionalNativeModule: () => ({ getSignedTransactions: mockProofs }) }));
jest.mock('@shared/config/supabase', () => ({ getSupabaseUrl: () => 'https://storage.example', getSupabasePublishableKey: () => 'public-key' }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => { throw new Error('Download must not import Supabase auth'); });
const originalFetch = Object.getOwnPropertyDescriptor(global, 'fetch');
const originalToken = process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN;
const originalDev = __DEV__;
const originalEnvironment = process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT;
beforeEach(() => { delete process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT; delete process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN; });
afterEach(() => {
  Object.assign(globalThis, { __DEV__: originalDev });
  jest.requireMock('expo-device').isDevice = false;
  if (originalToken === undefined) delete process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN;
  else process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN = originalToken;
  if (originalEnvironment === undefined) delete process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT = originalEnvironment;
});
beforeEach(() => { Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true }); mockProofs.mockResolvedValue(['apple-signed-proof']); Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [] }) }) }); });
afterEach(() => { if (originalFetch) Object.defineProperty(global, 'fetch', originalFetch); });
it('sends StoreKit proofs without a customer ID or Supabase user JWT', async () => {
  await invokeDownload('calendar-theme', { body: { themeId: 'test' } });
  const [, init] = jest.mocked(fetch).mock.calls[0];
  expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://storage.example/functions/v1/calendar-theme');
  expect(JSON.parse(init!.body as string)).toEqual({ themeId: 'test', signedTransactions: ['apple-signed-proof'] });
  expect(init!.headers).toEqual({ apikey: 'public-key', 'Content-Type': 'application/json' });
});
it('routes a Sandbox build to the separate verification endpoint', async () => {
  process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT = 'Sandbox';
  await invokeDownload('calendar-theme', { body: { themeId: 'test' } });
  expect(jest.mocked(fetch).mock.calls[0][0]).toBe('https://storage.example/functions/v1/calendar-theme-sandbox');
});
it('preserves server denial for the download UI', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'subscription_required' }) } as Response);
  const result = await invokeDownload('store-download', { body: { id: 'paid' } });
  expect(await result.error!.context.json()).toEqual({ error: 'subscription_required' });
});
it('does not send a request when reading StoreKit fails', async () => {
  mockProofs.mockRejectedValueOnce(new Error('store_unavailable'));
  await expect(invokeDownload('store-download', { body: {} })).rejects.toThrow('store_unavailable');
  expect(fetch).not.toHaveBeenCalled();
});

it.each([[true, false, true], [true, true, false], [false, false, false]])('sends simulator credentials only in local simulator builds (dev=%s device=%s)', async (dev, device, allowed) => {
  Object.assign(globalThis, { __DEV__: dev });
  jest.requireMock('expo-device').isDevice = device;
  process.env.EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN = 'local-test-token';
  await invokeDownload('store-download', { body: { id: 'mini-ears' } });
  const [url, init] = jest.mocked(fetch).mock.calls[0];
  expect(url).toBe(`https://storage.example/functions/v1/store-download${allowed ? '-sandbox' : ''}`);
  const headers = init!.headers as Record<string, string>;
  expect(headers['x-simulator-token']).toBe(allowed ? 'local-test-token' : undefined);
  expect(headers['x-revenuecat-customer']).toBe(allowed ? 'simulator-customer' : undefined);
});
