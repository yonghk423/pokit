import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { saveHeroOriginalPhotoMetadata, loadHeroOriginalPhotoLibrary, deleteHeroOriginalPhotoLibraryImages } from './heroOriginalPhoto';
import { saveHeroOriginalPhoto } from './heroOriginalPhoto';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///Documents/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: true, isDirectory: false, size: 100, modificationTime: 100 })),
  readDirectoryAsync: jest.fn(async () => []),
}));
beforeEach(() => { jest.clearAllMocks(); localStorageClient.removeItem('pokit:original-photo-library-deleted:v1'); });

it('copies the selected photo into durable storage without resizing or conversion', async () => {
  const uri = await saveHeroOriginalPhoto('file:///cache/photo.HEIC', 'original.HEIC');
  expect(uri).toMatch(/^file:\/\/\/Documents\/hero-photos\/photo-[a-z0-9-]+\.heic$/);
  expect(fs.makeDirectoryAsync).toHaveBeenCalledWith('file:///Documents/hero-photos/', { intermediates: true });
  expect(fs.copyAsync).toHaveBeenCalledWith({ from: 'file:///cache/photo.HEIC', to: uri });
});

it('uses the picked file representation rather than the original asset filename', async () => {
  expect(await saveHeroOriginalPhoto('file:///cache/converted.jpg', 'original.HEIC')).toMatch(/\.jpg$/);
});

it('reports a failed persistent copy instead of returning a temporary cache path', async () => {
  jest.mocked(fs.copyAsync).mockRejectedValueOnce(new Error('disk full'));
  await expect(saveHeroOriginalPhoto('file:///cache/photo.jpg')).rejects.toThrow('disk full');
});

it('loads older uploads with diary captions and keeps collection deletion independent of diary files', async () => {
  const name = 'photo-100-old.jpg';
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue([name, 'photo-200-new.png', 'unrelated.txt']);
  localStorageClient.setJson('pokit:comic-diaries:v1', { diaries: [{ scenes: [{ artworkUri: `file:///old/Documents/hero-photos/${name}`, title: '이전 사진', memo: '기록' }] }] });
  const recentUri = 'file:///Documents/hero-photos/photo-200-new.png';
  saveHeroOriginalPhotoMetadata({ uri: recentUri, title: '최근 사진', createdAt: 200000 });
  const images = await loadHeroOriginalPhotoLibrary();
  expect(images.map(image => image.uri)).toEqual([recentUri, `file:///Documents/hero-photos/${name}`]);
  expect(images[1]).toEqual(expect.objectContaining({ title: '이전 사진', memo: '기록' }));
  deleteHeroOriginalPhotoLibraryImages([recentUri]);
  expect((await loadHeroOriginalPhotoLibrary()).map(image => image.uri)).toEqual([`file:///Documents/hero-photos/${name}`]);
  expect(localStorageClient.getJson('pokit:comic-diaries:v1')).toEqual({ diaries: [{ scenes: [{ artworkUri: `file:///old/Documents/hero-photos/${name}`, title: '이전 사진', memo: '기록' }] }] });
});
