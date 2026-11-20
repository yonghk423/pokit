import { prepareDevelopmentMockArtwork } from './mockArtwork';
import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('expo-asset', () => ({ Asset: { fromModule: () => ({ downloadAsync: async () => ({ localUri: 'file:///bundled.webp' }) }) } }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///current/Documents/', cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(), getInfoAsync: jest.fn(), copyAsync: jest.fn(),
  deleteAsync: jest.fn(), readDirectoryAsync: jest.fn(), writeAsStringAsync: jest.fn(),
}));
jest.mock('@shared/lib/storage/localStorageClient', () => ({
  getDevelopmentStorageProfile: () => 'ko',
  localStorageClient: { getJson: jest.fn(), setJson: jest.fn() },
}));

const oldPortrait = 'file:///previous/Documents/hero-photos/selected-v2-extra-01.webp';
const personalPhoto = 'file:///current/Documents/hero-photos/photo-user-123.webp';
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fs.getInfoAsync).mockResolvedValue({ exists: false } as never);
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['selected-v2-extra-01.webp.webp', 'photo-user-123.webp.webp']);
  jest.mocked(localStorageClient.getJson).mockReturnValue({
    activeId: 'mock-calendar:test', custom: 'retained', diaries: [{ id: 'mock-calendar:test', title: 'My diary', scenes: [
      { id: 'portrait', image: 'p6-04-lunch-rooftop', artworkUri: oldPortrait, originalArtworkUri: oldPortrait, memo: 'My edited writing', polaroidSettings: { photoFit: 'contain' } },
      { id: 'personal', artworkUri: personalPhoto, memo: 'My photo' },
    ] }],
  });
});

it('replaces the actual former portrait URI, preserves writing and personal photos, then removes old copies and previews', async () => {
  await prepareDevelopmentMockArtwork();
  const saved = jest.mocked(localStorageClient.setJson).mock.calls[0][1] as { custom: string; activeId: string; diaries: { scenes: { artworkUri: string; originalArtworkUri?: string; memo: string; polaroidSettings?: { photoFit: string } }[] }[] };
  const scenes = saved.diaries[0].scenes;
  expect(saved.custom).toBe('retained');
  expect(saved.activeId).toBe('mock-calendar:test');
  expect(scenes[0]).toMatchObject({ artworkUri: 'file:///current/Documents/hero-photos/selected-ai-v1-extra-01.webp', originalArtworkUri: 'file:///current/Documents/hero-photos/selected-ai-v1-extra-01.webp', memo: 'My edited writing', polaroidSettings: { photoFit: 'contain' } });
  expect(scenes[1].artworkUri).toBe(personalPhoto);
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///current/Documents/hero-photos/selected-v2-extra-01.webp', { idempotent: true });
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///cache/hero-previews-v1/selected-v2-extra-01.webp.webp', { idempotent: true });
  expect(fs.deleteAsync).not.toHaveBeenCalledWith(expect.stringContaining('photo-user-123'), expect.anything());
});

it('retains old copies when a replacement cannot be installed, allowing a later bootstrap to retry', async () => {
  jest.mocked(fs.copyAsync).mockImplementation(async ({ to }) => { if (to.includes('selected-ai-v1-extra-01')) throw new Error('disk unavailable'); });
  await prepareDevelopmentMockArtwork();
  expect(localStorageClient.setJson).not.toHaveBeenCalled();
  expect(fs.deleteAsync).not.toHaveBeenCalled();
  expect(fs.writeAsStringAsync).not.toHaveBeenCalled();
});
