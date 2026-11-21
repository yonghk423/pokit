import { Platform } from 'react-native';
import { invokeDownload } from './downloadClient';
const mockProofs = jest.fn();
jest.mock('expo-modules-core', () => ({ ...jest.requireActual('expo-modules-core'), requireOptionalNativeModule: () => ({ getSignedTransactions: mockProofs }) }));
jest.mock('@shared/config/supabase', () => ({ getSupabaseUrl: () => 'https://storage.example', getSupabasePublishableKey: () => 'public-key' }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => { throw new Error('Download must not import Supabase auth'); });
const originalFetch = Object.getOwnPropertyDescriptor(global, 'fetch');
const originalEnvironment = process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT;
beforeEach(() => { delete process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT; });
afterEach(() => {
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
  const result = await invokeDownload('calendar-store', { body: { id: 'paid' } });
  expect(await result.error!.context.json()).toEqual({ error: 'subscription_required' });
});
it('does not send a request when reading StoreKit fails', async () => {
  mockProofs.mockRejectedValueOnce(new Error('store_unavailable'));
  await expect(invokeDownload('calendar-store', { body: {} })).rejects.toThrow('store_unavailable');
  expect(fetch).not.toHaveBeenCalled();
});
