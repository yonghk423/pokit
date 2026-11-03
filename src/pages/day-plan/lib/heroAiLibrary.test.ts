import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { deleteHeroAiLibraryImages, loadHeroAiLibrary, saveHeroAiLibraryMetadata, subscribeHeroAiLibrary } from './heroAiLibrary';
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///new-container/Documents/', getInfoAsync: jest.fn(), readDirectoryAsync: jest.fn() }));
it('recovers older finished photos independently of diary records and ignores inputs and incomplete files', async () => {
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['hero-old-0.png', 'hero-new-1.png', 'hero-new-inputs.json', 'hero-new-2.png.download', 'hero-empty-0.png']);
  jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: true, isDirectory: uri.endsWith('/'), uri, size: uri.includes('empty') ? 0 : 100, modificationTime: uri.includes('new-1') ? 20 : 10 }));
  expect(await loadHeroAiLibrary()).toEqual([{ uri: 'file:///new-container/Documents/hero-ai/hero-new-1.png', createdAt: 20000 }, { uri: 'file:///new-container/Documents/hero-ai/hero-old-0.png', createdAt: 10000 }]);
});
it('returns an empty library before the first generation', async () => {
  jest.mocked(fs.getInfoAsync).mockResolvedValue({ exists: false, uri: '', isDirectory: false });
  expect(await loadHeroAiLibrary()).toEqual([]);
});

it('keeps original generation captions independently of diary changes and container paths', async () => {
  const uri = 'file:///old/Documents/hero-ai/hero-caption-0.png';
  saveHeroAiLibraryMetadata(uri, { id: 'hero-caption', mode: 'photo', scenes: [], count: 1, inputsPath: '', createdAt: 123456, story: { source: 'photo', title: '해변', text: '태닝하고 싶다' } });
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['hero-caption-0.png']);
  jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: true, isDirectory: uri.endsWith('/'), uri, size: 100, modificationTime: 20 }));
  expect(await loadHeroAiLibrary()).toEqual([{ uri: 'file:///new-container/Documents/hero-ai/hero-caption-0.png', title: '해변', memo: '태닝하고 싶다', createdAt: 123456 }]);
  localStorageClient.removeItem('pokit:hero-ai-caption:hero-caption-0.png');
});
it('recovers old captions only from their matching artwork and leaves unmatched files blank', async () => {
  localStorageClient.setJson('pokit:comic-diaries:v1', { diaries: [{ createdAt: 54321, scenes: [{ artworkUri: 'file:///old/Documents/hero-ai/hero-old-0.png', title: '나의 하루', memo: '쉬고 싶다' }] }] });
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['hero-old-0.png', 'hero-other-0.png']);
  jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: true, isDirectory: uri.endsWith('/'), uri, size: 100, modificationTime: 20 }));
  const images = await loadHeroAiLibrary();
  expect(images.find(image => image.uri.endsWith('hero-old-0.png'))).toMatchObject({ title: '나의 하루', memo: '쉬고 싶다', createdAt: 54321 });
  expect(images.find(image => image.uri.endsWith('hero-other-0.png'))?.title).toBeUndefined();
  localStorageClient.removeItem('pokit:comic-diaries:v1');
});

it('persists collection deletion across container changes without removing diary artwork', async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeHeroAiLibrary(listener);
  try {
    deleteHeroAiLibraryImages(['file:///old-container/Documents/hero-ai/hero-deleted-0.png']);
    expect(listener).toHaveBeenCalledTimes(1);
    jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['hero-deleted-0.png', 'hero-kept-0.png']);
    jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: true, isDirectory: uri.endsWith('/'), uri, size: 100, modificationTime: 20 }));
    expect((await loadHeroAiLibrary()).map(image => image.uri)).toEqual(['file:///new-container/Documents/hero-ai/hero-kept-0.png']);
    expect((await loadHeroAiLibrary()).map(image => image.uri)).toEqual(['file:///new-container/Documents/hero-ai/hero-kept-0.png']);
  } finally {
    unsubscribe();
    localStorageClient.removeItem('pokit:hero-ai-library-deleted:v1');
  }
});
