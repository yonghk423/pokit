import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn() } }));
import * as fs from 'expo-file-system/legacy';
import { loadPremiumPack, deletePremiumPack } from './heroPremiumPack';
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', readAsStringAsync: jest.fn(), getInfoAsync: jest.fn(), readDirectoryAsync: jest.fn(), deleteAsync: jest.fn() }));
jest.mock('react-native-purchases', () => ({ logIn: jest.fn() }));
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({ getHeroAiAccessToken: jest.fn(), getHeroAiAuthClient: jest.fn() }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ useSubscriptionStore: { getState: jest.fn() }, selectIsPro: jest.fn() }));
jest.mock('@features/subscriptions/lib/presentPaywall', () => ({ presentPaywall: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
it('restores only the representative using the current document directory', async () => {
  (fs.readAsStringAsync as jest.Mock).mockResolvedValue('["p7-01.webp","p7-02.webp"]');
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
