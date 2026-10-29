import { createChunkedAuthStorage } from './heroAiSecureStorage';
function store() {
  const data = new Map<string, string>();
  return { data, getItem: jest.fn(async (key: string) => data.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { data.set(key, value); }), removeItem: jest.fn(async (key: string) => { data.delete(key); }) };
}
const key = 'pokit:hero-ai-auth-v1';
it('migrates the same session and recovers it after reinstall removes ordinary app storage', async () => {
  const secure = store(), legacy = store();
  const session = JSON.stringify({ user: { id: 'existing-user' }, refresh_token: 'existing-refresh-token' });
  legacy.data.set(key, session);
  expect(await createChunkedAuthStorage(secure, legacy, 'project').getItem(key)).toBe(session);
  expect(legacy.data.has(key)).toBe(false);
  const reinstalled = createChunkedAuthStorage(secure, store(), 'project');
  expect(await reinstalled.getItem(key)).toBe(session);
});
it('round trips large sessions with Unicode using small secure items', async () => {
  const secure = store(), adapter = createChunkedAuthStorage(secure, store(), 'project');
  const value = JSON.stringify({ token: 'a'.repeat(6000), name: '주인공😀'.repeat(500) });
  await adapter.setItem(key, value);
  expect(await adapter.getItem(key)).toBe(value);
  for (const [, chunk] of secure.setItem.mock.calls) expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(2000);
});
it('keeps the old session when token rotation fails before publishing its manifest', async () => {
  const secure = store(), adapter = createChunkedAuthStorage(secure, store(), 'project');
  await adapter.setItem(key, 'old-session');
  secure.setItem.mockRejectedValueOnce(new Error('locked'));
  await expect(adapter.setItem(key, 'new-session')).rejects.toThrow('locked');
  expect(await adapter.getItem(key)).toBe('old-session');
});
it('does not interpret unavailable or incomplete Keychain data as a new user', async () => {
  const secure = store(), adapter = createChunkedAuthStorage(secure, store(), 'project');
  secure.getItem.mockRejectedValueOnce(new Error('locked'));
  await expect(adapter.getItem(key)).rejects.toThrow('locked');
  await adapter.setItem(key, 'session');
  const chunk = [...secure.data.keys()].find(item => item.endsWith('.0'))!;
  secure.data.delete(chunk);
  await expect(adapter.getItem(key)).rejects.toThrow('auth_storage_incomplete');
});
it('does not remove legacy data if migration cannot be saved', async () => {
  const secure = store(), legacy = store(); legacy.data.set(key, 'existing');
  secure.setItem.mockRejectedValueOnce(new Error('full'));
  await expect(createChunkedAuthStorage(secure, legacy, 'project').getItem(key)).rejects.toThrow('full');
  expect(legacy.data.get(key)).toBe('existing');
});
it('serializes rotating tokens and never resurrects an explicitly removed legacy session', async () => {
  const secure = store(), legacy = store(), adapter = createChunkedAuthStorage(secure, legacy, 'project');
  await Promise.all([adapter.setItem(key, 'first'), adapter.setItem(key, 'latest')]);
  expect(await adapter.getItem(key)).toBe('latest');
  await adapter.removeItem(key);
  legacy.data.set(key, 'stale-backup');
  expect(await adapter.getItem(key)).toBeNull();
});
