import * as fs from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupDeletedHeroArtwork } from './heroArtworkCleanup';
const mockData = new Map<string, string>();
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///Documents/', deleteAsync: jest.fn(async () => undefined) }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ flushLocalStorageClientWrites: async () => {}, localStorageClient: {
  listKeys: () => [...mockData.keys()], getItemRaw: (key: string) => mockData.get(key) ?? null,
  removeItem: (key: string) => mockData.delete(key),
} }));
beforeEach(async () => { mockData.clear(); jest.clearAllMocks(); await AsyncStorage.clear(); });
it('removes deleted files only, retaining artwork referenced by durable diaries', async () => {
  mockData.set('pokit:hero-ai-library-deleted:v1', JSON.stringify(['hero-unused-0.png', 'hero-used-0.png', '../escape.png']));
  await AsyncStorage.setItem('pokit:comic-diaries:v1', JSON.stringify({ diaries: [{ scenes: [{ artworkUri: 'file:///old/Documents/hero-ai/hero-used-0.png' }] }] }));
  await cleanupDeletedHeroArtwork();
  expect(fs.deleteAsync).toHaveBeenCalledTimes(1);
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///Documents/hero-ai/hero-unused-0.png', { idempotent: true });
});
it('reclaims a deleted original after its last diary reference is removed', async () => {
  mockData.set('pokit:original-photo-library-deleted:v1', JSON.stringify(['photo-123-a.jpg']));
  mockData.set('pokit:comic-diaries:v1', 'photo-123-a.jpg');
  await cleanupDeletedHeroArtwork();
  expect(fs.deleteAsync).not.toHaveBeenCalled();
  mockData.set('pokit:comic-diaries:v1', '{}');
  await cleanupDeletedHeroArtwork();
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///Documents/hero-photos/photo-123-a.jpg', { idempotent: true });
});
it('does not delete files when durable storage cannot be read', async () => {
  mockData.set('pokit:hero-ai-library-deleted:v1', '["hero-unused-0.png"]');
  jest.mocked(AsyncStorage.getAllKeys).mockRejectedValueOnce(new Error('unavailable'));
  await cleanupDeletedHeroArtwork();
  expect(fs.deleteAsync).not.toHaveBeenCalled();
});
