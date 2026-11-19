import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn() } }));
import * as fs from 'expo-file-system/legacy';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';
import { loadPremiumPack, deletePremiumPack, downloadPremiumPack } from './heroPremiumPack';
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', makeDirectoryAsync: jest.fn(), downloadAsync: jest.fn(), moveAsync: jest.fn(), writeAsStringAsync: jest.fn(), readAsStringAsync: jest.fn(), getInfoAsync: jest.fn(), readDirectoryAsync: jest.fn(), deleteAsync: jest.fn() }));
jest.mock('react-native-purchases', () => ({ logIn: jest.fn() }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({ getHeroAiAccessToken: jest.fn(), getHeroAiAuthClient: jest.fn() }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ useSubscriptionStore: { getState: jest.fn() }, selectIsPro: jest.fn() }));
jest.mock('@features/subscriptions/lib/presentPaywall', () => ({ presentPaywall: jest.fn() }));
beforeEach(() => { jest.resetAllMocks(); jest.mocked(fs.deleteAsync).mockResolvedValue(undefined); });
it('restores only the representative using the current document directory', async () => {
  (fs.readAsStringAsync as jest.Mock).mockImplementation(async (uri: string) => uri.endsWith('revision.txt') ? 'detail-restoration-v6-release' : '["p7-01.webp","p7-02.webp"]');
  (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false, size: 300 });
  expect(await loadPremiumPack()).toEqual([{ id: 'p7-01', uri: 'file:///documents/character-packs/protagonist-7/p7-01.webp' }]);
});
it('does not mark an incomplete download as installed', async () => {
  (fs.readAsStringAsync as jest.Mock).mockResolvedValue('["p7-01.webp","p7-02.webp"]');
  (fs.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
  expect(await loadPremiumPack()).toEqual([]);
});
it('rejects filenames outside the pack directory', async () => {
  (fs.readAsStringAsync as jest.Mock).mockResolvedValue('["../other.webp"]');
  expect(await loadPremiumPack()).toEqual([]);
  expect(fs.getInfoAsync).not.toHaveBeenCalled();
});

it('deletes the installed pack but preserves artwork referenced by diaries', async () => {
  (localStorageClient.getJson as jest.Mock).mockReturnValue({ diaries: [{ scenes: [{ artworkUri: 'file:///old-container/character-packs/protagonist-7/p7-01.webp' }] }] });
  (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
  (fs.readDirectoryAsync as jest.Mock).mockResolvedValue(['p7-01.webp', 'p7-02.webp', 'p7-03.webp.part', 'manifest.json']);
  await deletePremiumPack();
  expect(fs.deleteAsync).not.toHaveBeenCalledWith(expect.stringContaining('p7-01.webp'), expect.anything());
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///documents/character-packs/protagonist-7/p7-02.webp', { idempotent: true });
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///documents/character-packs/protagonist-7/manifest.json', { idempotent: true });
  await deletePremiumPack();
  expect(fs.deleteAsync).toHaveBeenCalledTimes(6);
});


it('coalesces restored scene downloads and writes the revision only after a valid WebP arrives', async () => {
  jest.mocked(getHeroAiAccessToken).mockResolvedValue('token');
  jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke: jest.fn(async () => ({ data: { files: [{ name: 'p7-01.webp', url: 'https://example.com/storage/v1/object/sign/character-illustrations/protagonist-7/card-960/p7-01.webp?token=test' }] }, error: null })) } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
  jest.mocked(fs.downloadAsync).mockResolvedValue({ status: 200, headers: { 'Content-Type': 'image/webp' } } as never);
  jest.mocked(fs.getInfoAsync).mockResolvedValue({ exists: true, size: 1234 } as never);
  const task = downloadPremiumPack();
  expect(downloadPremiumPack()).toBe(task);
  await task;
  expect(fs.moveAsync).toHaveBeenCalledWith({ from: 'file:///documents/character-packs/protagonist-7/p7-01.webp.part', to: 'file:///documents/character-packs/protagonist-7/p7-01.webp' });
  expect(fs.writeAsStringAsync).toHaveBeenCalledWith('file:///documents/character-packs/protagonist-7/revision.txt', 'detail-restoration-v6-release');
});

it('keeps the previous scene untouched if the restored download fails', async () => {
  jest.mocked(getHeroAiAccessToken).mockResolvedValue('token');
  jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke: jest.fn(async () => ({ data: { files: [{ name: 'p7-01.webp', url: 'https://example.com/protagonist-7/card-960/p7-01.webp' }] }, error: null })) } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
  jest.mocked(fs.downloadAsync).mockResolvedValue({ status: 503, headers: {} } as never);
  jest.mocked(fs.getInfoAsync).mockResolvedValue({ exists: true, size: 1 } as never);
  await expect(downloadPremiumPack()).rejects.toThrow('invalid_pack');
  expect(fs.moveAsync).not.toHaveBeenCalled();
  expect(fs.writeAsStringAsync).not.toHaveBeenCalled();
  expect(fs.deleteAsync).toHaveBeenCalledWith(expect.stringContaining('.part'), { idempotent: true });
});
