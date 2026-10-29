import { getHeroAiAccessToken } from './heroAiAuth';
const mockAuth = { getSession: jest.fn(), signInAnonymously: jest.fn(), startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() };
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mockAuth }) }));
jest.mock('./heroAiSecureStorage', () => ({ createHeroAiAuthStorage: () => ({}) }));
jest.mock('@shared/config/supabase', () => ({ getSupabaseUrl: () => 'https://example.supabase.co', getSupabasePublishableKey: () => 'public' }));
beforeEach(() => jest.clearAllMocks());
it('uses a restored session without creating a new anonymous user', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'restored-token' } }, error: null });
  expect(await getHeroAiAccessToken()).toBe('restored-token');
  expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
});
it('does not create another identity when session recovery reports an error', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('offline') });
  await expect(getHeroAiAccessToken()).rejects.toThrow('auth_unavailable');
  expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
});
it('creates only one anonymous identity for simultaneous first-use requests', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.signInAnonymously.mockResolvedValue({ data: { session: { access_token: 'first-token' } }, error: null });
  expect(await Promise.all([getHeroAiAccessToken(), getHeroAiAccessToken()])).toEqual(['first-token', 'first-token']);
  expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1);
});
